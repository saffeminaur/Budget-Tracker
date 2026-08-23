import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GeminiUnavailableError, parseQuickAddText } from "@/lib/gemini";
import { sanitizeParsedEntry } from "@/lib/parse-quick-add";
import { todayIsoDate } from "@/lib/utils";
import type { QuickAddDraft, QuickAddType } from "@/lib/types";

// Shared by every path that turns a bank alert email into an entry: the
// initial POST /api/ingest-email call, the scheduled retry job, and a
// manual "Retry" from the dashboard's Import issues card. All four start
// from an already-known account (the sender's domain decided that once,
// at first ingestion) and just need to parse + validate + insert — the
// same three steps regardless of which caller is triggering them, or
// whether the Supabase client is session-scoped (a dashboard-initiated
// retry) or service-role (the unattended paths).

export type IngestAccount = "dbs" | "maribank";

export const INGEST_EXPECTED_TYPES: Record<IngestAccount, QuickAddType[]> = {
  dbs: ["dbs_income", "dbs_expense"],
  maribank: ["maribank_add", "maribank_subtract"],
};

export interface EmailImportInput {
  account: IngestAccount;
  subject: string;
  body: string;
}

export interface EmailImportResult {
  status: "success" | "failed" | "pending";
  reason: string | null;
  entryTable?: "dbs_entries" | "maribank_entries";
  entryId?: string;
}

export async function attemptEmailImport(
  supabase: SupabaseClient,
  userId: string,
  { account, subject, body }: EmailImportInput
): Promise<EmailImportResult> {
  const todayIso = todayIsoDate();
  const expectedTypes = INGEST_EXPECTED_TYPES[account];

  let raw;
  try {
    raw = await parseQuickAddText(
      `Bank email alert:\n\n${subject}\n\n${body}`,
      todayIso,
      expectedTypes
    );
  } catch (err) {
    if (err instanceof GeminiUnavailableError) {
      const summary =
        err.kind === "quota_exceeded"
          ? "Gemini's quota is temporarily exhausted"
          : "Gemini is temporarily overloaded";
      return {
        status: "pending",
        reason: `${summary} — will retry automatically. (${err.message})`,
      };
    }
    return {
      status: "failed",
      reason: err instanceof Error ? err.message : "Gemini parsing failed.",
    };
  }

  const drafts = raw
    .map((r) => sanitizeParsedEntry(r, todayIso))
    .filter((e): e is QuickAddDraft => e !== null);

  if (drafts.length !== 1) {
    return {
      status: "failed",
      reason:
        drafts.length === 0
          ? "Couldn't extract a valid transaction (no amount detected, or nothing recognizable)."
          : `Expected exactly one transaction in this email, parsed ${drafts.length}.`,
    };
  }

  const draft = drafts[0];

  // Belt-and-suspenders: the response schema already constrained Gemini
  // to expectedTypes, so this should be unreachable. Kept as a cheap
  // defensive check in case that guarantee is ever weakened.
  if (!expectedTypes.includes(draft.type)) {
    return {
      status: "failed",
      reason: `Parsed as "${draft.type}", which doesn't match the detected account (${account}).`,
    };
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
    return {
      status: "failed",
      reason: insertError?.message ?? "Insert failed for an unknown reason.",
    };
  }

  return { status: "success", reason: null, entryTable: table, entryId: inserted.id };
}
