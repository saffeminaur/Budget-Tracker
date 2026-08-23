import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { attemptEmailImport } from "@/lib/email-ingest";

// Trusted, unattended ingestion path for bank transaction alert emails.
// Called by a scheduled Google Apps Script watching Gmail — no browser,
// no session, no confirmation step. Auth is a single shared secret header
// instead of Supabase cookies, and writes go through the service-role
// client (see lib/supabase/service.ts) scoped to a fixed INGEST_USER_ID,
// since there's no session to derive a user from.
//
// Gives Gemini's own retry/backoff (lib/gemini.ts) room to run without
// this function being killed mid-request by the platform's default
// timeout.
export const maxDuration = 60;

type Account = "dbs" | "maribank";

interface IngestPayload {
  subject?: string;
  body?: string;
  from?: string;
  messageId?: string;
}

function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch rather than returning false,
  // and short-circuiting on length first is itself only a length leak,
  // not a content leak.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Sender domain is the source of truth for which account an email
// belongs to — far more reliable than asking Gemini to infer the bank
// from free text, and it lets us reject junk before spending an API call.
function detectAccount(from: string | undefined): Account | null {
  const sender = (from ?? "").toLowerCase();
  if (sender.includes("@dbs.com")) return "dbs";
  if (sender.includes("@maribank.sg")) return "maribank";
  return null;
}

// Known DBS/MariBank notification subjects that are never transactions —
// account-management confirmations, e-statement/eDocument notices, etc.
// They pass the sender-domain check (they're genuinely from the bank) but
// have no amount to extract. Recognized and skipped before ever calling
// Gemini, both to keep the dashboard's "Import issues" card free of
// non-actionable noise and to avoid burning a Gemini call on mail we
// already know isn't a transaction.
//
// Evidence-based, not guessed: only add a subject here once a real
// "Couldn't extract a valid transaction" case in email_ingest_log
// confirms it, or the subject is unambiguous on its own (an account-open
// congratulations or a profile-registration receipt can't contain a
// PayNow amount). Never add a subject that's also seen on a successful
// import (e.g. "iBanking Alerts" is a generic subject shared by real
// transaction emails, so it stays out of this list and goes to Gemini
// as usual).
const NON_TRANSACTIONAL_SUBJECTS = new Set([
  "manage card alert",
  "your edocument(s) are ready for viewing",
  "congrats, your mari savings account is open!",
  "digibank alert - paynow profile registered",
]);

function isNonTransactionalNotification(subject: string): boolean {
  return NON_TRANSACTIONAL_SUBJECTS.has(subject.trim().toLowerCase());
}

async function logIngest(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  fields: {
    messageId: string;
    status: "success" | "failed" | "skipped" | "pending";
    account: Account | null;
    reason: string | null;
    subject: string;
    body: string;
    entryTable?: "dbs_entries" | "maribank_entries";
    entryId?: string;
  }
) {
  const { error } = await supabase.from("email_ingest_log").insert({
    user_id: userId,
    message_id: fields.messageId,
    status: fields.status,
    account: fields.account,
    reason: fields.reason,
    raw_subject: fields.subject,
    raw_body: fields.body,
    entry_table: fields.entryTable ?? null,
    entry_id: fields.entryId ?? null,
  });

  if (error) {
    // The ingest itself may have already succeeded/failed correctly —
    // don't let a logging failure mask that. Just make sure it's visible.
    console.error("ingest-email: failed to write email_ingest_log:", error);
  }
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.INGEST_SECRET;
  const userId = process.env.INGEST_USER_ID;

  if (!expectedSecret || !userId || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "ingest-email: INGEST_SECRET, INGEST_USER_ID, or SUPABASE_SERVICE_ROLE_KEY is not configured."
    );
    return NextResponse.json(
      { error: "Email ingestion is not configured on the server." },
      { status: 500 }
    );
  }

  if (!secretsMatch(request.headers.get("x-ingest-secret"), expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: IngestPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const subject = String(payload.subject ?? "").trim();
  const body = String(payload.body ?? "").trim();
  const from = payload.from ? String(payload.from) : undefined;
  const messageId = String(payload.messageId ?? "").trim();

  if (!messageId) {
    return NextResponse.json({ error: "messageId is required." }, { status: 400 });
  }
  if (!subject && !body) {
    return NextResponse.json({ error: "subject or body is required." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Dedup guard: Apps Script retries / re-forwards should be a safe no-op,
  // not a duplicate entry. The (user_id, message_id) unique constraint on
  // email_ingest_log backs this up at the DB level too.
  const { data: existing } = await supabase
    .from("email_ingest_log")
    .select("id")
    .eq("user_id", userId)
    .eq("message_id", messageId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "Already processed this message." },
      { status: 200 }
    );
  }

  const account = detectAccount(from);
  if (!account) {
    const reason = `Unrecognized sender "${from ?? "(none)"}" — expected an @dbs.com or @maribank.sg address.`;
    await logIngest(supabase, userId, {
      messageId,
      status: "failed",
      account: null,
      reason,
      subject,
      body,
    });
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  if (isNonTransactionalNotification(subject)) {
    const reason = `Recognized as a non-transactional "${subject}" notification — not sent to Gemini.`;
    await logIngest(supabase, userId, {
      messageId,
      status: "skipped",
      account,
      reason,
      subject,
      body,
    });
    return NextResponse.json({ ok: true, skipped: true, reason }, { status: 200 });
  }

  // Sender domain already told us the account with certainty — Gemini's
  // job is only to work out direction/amount/category/note/date, not to
  // re-guess the account from ambiguous free text (a DBS PayNow alert
  // never actually says "DBS" anywhere in the body). attemptEmailImport
  // passes this through as a restricted type list that constrains the
  // response schema itself, so a cross-account mismatch is structurally
  // prevented rather than just checked for after the fact. If Gemini is
  // overloaded through every retry and the fallback model, it comes back
  // as status "pending" rather than "failed" — the raw email is already
  // captured below either way, so nothing is lost while it waits to be
  // retried (scheduled job, or a manual Retry from the dashboard).
  const result = await attemptEmailImport(supabase, userId, { account, subject, body });

  await logIngest(supabase, userId, {
    messageId,
    status: result.status,
    account,
    reason: result.reason,
    subject,
    body,
    entryTable: result.entryTable,
    entryId: result.entryId,
  });

  if (result.status === "failed") {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }

  revalidatePath("/");
  if (result.status === "pending") {
    return NextResponse.json({ ok: true, pending: true, reason: result.reason }, { status: 202 });
  }

  revalidatePath(account === "dbs" ? "/dbs" : "/maribank");
  return NextResponse.json({ ok: true, account, entryId: result.entryId }, { status: 201 });
}
