"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { parseQuickAddText, type RawParsedEntry } from "@/lib/gemini";
import { sanitizeParsedEntry, isIsoDate } from "@/lib/parse-quick-add";
import { todayIsoDate } from "@/lib/utils";
import { CATEGORIES, type Category, type QuickAddDraft } from "@/lib/types";

export type ParseQuickAddResult =
  | { ok: true; entries: QuickAddDraft[] }
  | { ok: false; error: string };

export async function parseQuickAdd(text: string): Promise<ParseQuickAddResult> {
  await requireUser();

  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Type something to parse first." };
  }

  const todayIso = todayIsoDate();

  let raw: RawParsedEntry[];
  try {
    raw = await parseQuickAddText(trimmed, todayIso);
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the AI parser. Try again, or use the manual forms below.",
    };
  }

  const entries = raw
    .map((r) => sanitizeParsedEntry(r, todayIso))
    .filter((e): e is QuickAddDraft => e !== null);

  if (entries.length === 0) {
    return {
      ok: false,
      error: "Couldn't find any entries in that — try rephrasing, e.g. \"spent $5 on lunch\".",
    };
  }

  return { ok: true, entries };
}

export interface SaveQuickAddResult {
  success: boolean;
  count: number;
  errors: string[];
}

export async function saveQuickAddEntries(
  entries: QuickAddDraft[]
): Promise<SaveQuickAddResult> {
  await requireUser();
  const supabase = await createClient();

  let count = 0;
  const errors: string[] = [];

  async function insert(table: string, payload: Record<string, unknown>) {
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      console.error(`saveQuickAddEntries: insert into ${table} failed:`, error);
      errors.push(error.message);
      return;
    }
    count++;
  }

  for (const entry of entries) {
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!isIsoDate(entry.entry_date)) continue;

    const note = String(entry.note ?? "").trim() || null;
    const entry_date = entry.entry_date;

    switch (entry.type) {
      case "maribank_add":
        await insert("maribank_entries", { amount, note, entry_date });
        break;
      case "maribank_subtract":
        await insert("maribank_entries", { amount: -amount, note, entry_date });
        break;
      case "dbs_income":
        await insert("dbs_entries", { amount, category: null, note, entry_date });
        break;
      case "dbs_expense": {
        if (!CATEGORIES.includes(entry.category as Category)) break;
        await insert("dbs_entries", {
          amount: -amount,
          category: entry.category,
          note,
          entry_date,
          counts_toward_budget: entry.countsTowardBudget ?? true,
        });
        break;
      }
      case "receivables_i_paid": {
        const person = String(entry.person ?? "").trim();
        if (!person) break;
        await insert("receivables_entries", { amount, person, note, entry_date });
        break;
      }
      case "receivables_they_paid_back": {
        const person = String(entry.person ?? "").trim();
        if (!person) break;
        await insert("receivables_entries", { amount: -amount, person, note, entry_date });
        break;
      }
      case "hsbc_contribution":
        await insert("hsbc_contributions", { amount, note, entry_date });
        break;
      case "hsbc_valuation":
        await insert("hsbc_valuations", { value: amount, entry_date });
        break;
      case "mendaki_repayment":
        await insert("mendaki_repayments", { amount, note, entry_date });
        break;
    }
  }

  revalidatePath("/");
  revalidatePath("/maribank");
  revalidatePath("/dbs");
  revalidatePath("/receivables");
  revalidatePath("/hsbc");
  revalidatePath("/mendaki");

  return { success: errors.length === 0, count, errors };
}
