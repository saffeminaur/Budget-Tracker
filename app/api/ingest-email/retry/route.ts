import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { attemptEmailImport, type IngestAccount } from "@/lib/email-ingest";
import type { EmailIngestLogEntry } from "@/lib/types";

// Scheduled recovery for email_ingest_log rows saved with status
// "pending" — a transient Gemini outage (503/UNAVAILABLE) survived by
// every retry and the fallback model (see lib/gemini.ts), rather than a
// genuine parsing failure. The raw subject/body/account were already
// captured at first ingestion, so retrying here is the same
// attemptEmailImport call as the original request, just re-run later.
//
// Meant to be hit by Vercel Cron (see vercel.json) — Vercel attaches
// `Authorization: Bearer $CRON_SECRET` automatically when the CRON_SECRET
// env var is set, since cron config can't send custom headers. Also
// accepts the existing x-ingest-secret header, so this can be triggered
// manually (curl) or by a non-Vercel scheduler without a second secret.
export const maxDuration = 60;

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader && secretsMatch(authHeader, `Bearer ${cronSecret}`)) {
    return true;
  }

  const ingestSecret = process.env.INGEST_SECRET;
  const provided = request.headers.get("x-ingest-secret");
  if (ingestSecret && provided && secretsMatch(provided, ingestSecret)) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const userId = process.env.INGEST_USER_ID;

  if (!userId || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "ingest-email/retry: INGEST_USER_ID or SUPABASE_SERVICE_ROLE_KEY is not configured."
    );
    return NextResponse.json(
      { error: "Retry is not configured on the server." },
      { status: 500 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Defaults to "pending" only — a row that failed for a genuine parsing
  // reason (unrecognized sender, no amount detected) won't succeed just
  // by being retried unattended on a timer, so it waits for a manual
  // Retry from the dashboard instead. ?status=pending,failed processes
  // both in one call — useful right after a fix that could plausibly
  // resolve older failures too.
  const statuses = (request.nextUrl.searchParams.get("status") ?? "pending")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const supabase = createServiceClient();

  // Never touches a dismissed row — dismissing one is the user saying
  // "I've reviewed this, leave it" (see dismissIngestFailure), same rule
  // the dashboard's Import issues card query follows. Otherwise every
  // old, deliberately-set-aside failure would get silently reprocessed
  // (and billed against Gemini's quota) alongside the current ones.
  const { data, error } = await supabase
    .from("email_ingest_log")
    .select("*")
    .eq("user_id", userId)
    .in("status", statuses)
    .is("dismissed_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as EmailIngestLogEntry[];
  const results: { id: string; status: string }[] = [];

  // Sequential, not parallel — stays within Gemini's rate limits and
  // keeps each row's own backoff delay from stacking concurrently with
  // every other row's.
  for (const row of rows) {
    if (!row.account) {
      results.push({ id: row.id, status: "skipped-no-account" });
      continue;
    }

    const result = await attemptEmailImport(supabase, userId, {
      account: row.account as IngestAccount,
      subject: row.raw_subject ?? "",
      body: row.raw_body ?? "",
    });

    await supabase
      .from("email_ingest_log")
      .update({
        status: result.status,
        reason: result.reason,
        entry_table: result.entryTable ?? null,
        entry_id: result.entryId ?? null,
        retry_count: (row.retry_count ?? 0) + 1,
        dismissed_at: result.status === "success" ? null : row.dismissed_at,
      })
      .eq("id", row.id);

    results.push({ id: row.id, status: result.status });
  }

  if (results.some((r) => r.status === "success")) {
    revalidatePath("/");
    revalidatePath("/dbs");
    revalidatePath("/maribank");
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
