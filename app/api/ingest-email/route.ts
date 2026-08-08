import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseQuickAddText } from "@/lib/gemini";
import { sanitizeParsedEntry } from "@/lib/parse-quick-add";
import { todayIsoDate } from "@/lib/utils";
import type { QuickAddDraft, QuickAddType } from "@/lib/types";

// Trusted, unattended ingestion path for bank transaction alert emails.
// Called by a scheduled Google Apps Script watching Gmail — no browser,
// no session, no confirmation step. Auth is a single shared secret header
// instead of Supabase cookies, and writes go through the service-role
// client (see lib/supabase/service.ts) scoped to a fixed INGEST_USER_ID,
// since there's no session to derive a user from.

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

async function logIngest(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  fields: {
    messageId: string;
    status: "success" | "failed";
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

  const todayIso = todayIsoDate();

  // Sender domain already told us the account with certainty — Gemini's
  // job is only to work out direction/amount/category/note/date, not to
  // re-guess the account from ambiguous free text (a DBS PayNow alert
  // never actually says "DBS" anywhere in the body). Passing this
  // restricted list constrains the response schema itself, so a
  // cross-account mismatch is structurally prevented rather than just
  // checked for after the fact.
  const expectedTypes: QuickAddType[] =
    account === "dbs" ? ["dbs_income", "dbs_expense"] : ["maribank_add", "maribank_subtract"];

  let raw;
  try {
    raw = await parseQuickAddText(
      `Bank email alert:\n\n${subject}\n\n${body}`,
      todayIso,
      expectedTypes
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Gemini parsing failed.";
    await logIngest(supabase, userId, {
      messageId,
      status: "failed",
      account,
      reason,
      subject,
      body,
    });
    return NextResponse.json({ error: reason }, { status: 502 });
  }

  const drafts = raw
    .map((r) => sanitizeParsedEntry(r, todayIso))
    .filter((e): e is QuickAddDraft => e !== null);

  if (drafts.length !== 1) {
    const reason =
      drafts.length === 0
        ? "Couldn't extract a valid transaction (no amount detected, or nothing recognizable)."
        : `Expected exactly one transaction in this email, parsed ${drafts.length}.`;
    await logIngest(supabase, userId, {
      messageId,
      status: "failed",
      account,
      reason,
      subject,
      body,
    });
    return NextResponse.json({ error: reason }, { status: 422 });
  }

  const draft = drafts[0];

  // Belt-and-suspenders: the response schema already constrained Gemini
  // to expectedTypes, so this should be unreachable. Kept as a cheap
  // defensive check in case that guarantee is ever weakened.
  if (!expectedTypes.includes(draft.type)) {
    const reason = `Parsed as "${draft.type}", which doesn't match the detected account (${account}).`;
    await logIngest(supabase, userId, {
      messageId,
      status: "failed",
      account,
      reason,
      subject,
      body,
    });
    return NextResponse.json({ error: reason }, { status: 422 });
  }

  const table = account === "dbs" ? "dbs_entries" : "maribank_entries";
  const insertPayload: Record<string, unknown> =
    account === "dbs"
      ? {
          user_id: userId,
          amount: draft.type === "dbs_expense" ? -draft.amount : draft.amount,
          category: draft.type === "dbs_expense" ? draft.category : null,
          note: draft.note || null,
          entry_date: draft.entry_date,
          // Opt-IN, not opt-out: most auto-imported DBS transactions
          // aren't personal spending, so they start excluded from budget
          // totals until manually toggled on from the dashboard.
          counts_toward_budget: draft.type === "dbs_expense" ? false : true,
          source: "auto_import",
        }
      : {
          user_id: userId,
          amount: draft.type === "maribank_subtract" ? -draft.amount : draft.amount,
          note: draft.note || null,
          entry_date: draft.entry_date,
          source: "auto_import",
        };

  const { data: inserted, error: insertError } = await supabase
    .from(table)
    .insert(insertPayload)
    .select()
    .single();

  if (insertError || !inserted) {
    const reason = insertError?.message ?? "Insert failed for an unknown reason.";
    await logIngest(supabase, userId, {
      messageId,
      status: "failed",
      account,
      reason,
      subject,
      body,
    });
    return NextResponse.json({ error: reason }, { status: 500 });
  }

  await logIngest(supabase, userId, {
    messageId,
    status: "success",
    account,
    reason: null,
    subject,
    body,
    entryTable: table,
    entryId: inserted.id,
  });

  revalidatePath(account === "dbs" ? "/dbs" : "/maribank");
  revalidatePath("/");

  return NextResponse.json({ ok: true, account, entry: inserted }, { status: 201 });
}
