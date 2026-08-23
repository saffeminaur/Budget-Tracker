"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { attemptEmailImport, type IngestAccount } from "@/lib/email-ingest";
import type { EmailIngestLogEntry } from "@/lib/types";

// Dashboard "Import issues" card — marks a failed ingestion as reviewed.
// Soft-dismiss (sets dismissed_at) rather than delete, so the row stays
// in email_ingest_log as an audit trail; the card just stops showing it.
export async function dismissIngestFailure(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_ingest_log")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("dismissIngestFailure failed:", error);
    throw new Error(`Couldn't dismiss the entry: ${error.message}`);
  }

  revalidatePath("/");
}

// Dashboard "Import issues" card — manual retry for a "failed" or
// "pending" row. Re-runs the exact same parse+insert path as the
// original ingestion (see lib/email-ingest.ts) against the raw
// subject/body/account already captured in the log row, so nothing
// about the original email needs to be re-sent. "pending" rows are also
// retried automatically on a schedule (see app/api/ingest-email/retry),
// but this lets the user force an immediate attempt instead of waiting.
export async function retryIngestFailure(formData: FormData) {
  const user = await requireUser();

  const id = String(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();

  const { data, error: fetchError } = await supabase
    .from("email_ingest_log")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !data) {
    throw new Error("Couldn't find that import log entry.");
  }
  const logRow = data as EmailIngestLogEntry;

  if (!logRow.account) {
    throw new Error("Can't retry — no account was recorded for this email.");
  }

  const result = await attemptEmailImport(supabase, user.id, {
    account: logRow.account as IngestAccount,
    subject: logRow.raw_subject ?? "",
    body: logRow.raw_body ?? "",
  });

  const { error: updateError } = await supabase
    .from("email_ingest_log")
    .update({
      status: result.status,
      reason: result.reason,
      entry_table: result.entryTable ?? null,
      entry_id: result.entryId ?? null,
      retry_count: (logRow.retry_count ?? 0) + 1,
      dismissed_at: result.status === "success" ? null : logRow.dismissed_at,
    })
    .eq("id", id);

  if (updateError) {
    console.error("retryIngestFailure: failed to update email_ingest_log:", updateError);
    throw new Error(`Retry ran but couldn't save the result: ${updateError.message}`);
  }

  revalidatePath("/");
  if (result.status === "success" && result.entryTable) {
    revalidatePath(result.entryTable === "dbs_entries" ? "/dbs" : "/maribank");
  }
}
