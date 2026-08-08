import "server-only";
import type { RawParsedEntry } from "@/lib/gemini";
import {
  CATEGORIES,
  QUICK_ADD_TYPES,
  QUICK_ADD_TYPE_META,
  type Category,
  type QuickAddDraft,
  type QuickAddType,
} from "@/lib/types";

// Shared between the Femina AI quick-add flow (actions/quick-add.ts) and
// the email ingestion endpoint (app/api/ingest-email/route.ts) — both
// feed free text through the same Gemini parser and need to turn its raw
// output into something safe to insert.

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function sanitizeParsedEntry(
  raw: RawParsedEntry,
  todayIso: string
): QuickAddDraft | null {
  if (!QUICK_ADD_TYPES.includes(raw.type as QuickAddType)) return null;
  const type = raw.type as QuickAddType;

  const amount = Number(raw.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const meta = QUICK_ADD_TYPE_META[type];

  let category: Category | undefined;
  if (meta.needsCategory) {
    category = CATEGORIES.includes(raw.category as Category)
      ? (raw.category as Category)
      : CATEGORIES[CATEGORIES.length - 1]; // "Other" — safe fallback, never drop the entry
  }

  let person: string | undefined;
  if (meta.needsPerson) {
    person = String(raw.person ?? "").trim();
    if (!person) return null; // can't usefully save a receivable with no one attached
  }

  return {
    id: crypto.randomUUID(),
    type,
    amount,
    category,
    person,
    note: String(raw.note ?? "").trim(),
    entry_date: isIsoDate(raw.date) ? raw.date : todayIso,
    countsTowardBudget: type === "dbs_expense" ? true : undefined,
  };
}
