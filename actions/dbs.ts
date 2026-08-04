"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { CATEGORIES, type Category } from "@/lib/types";

// Category only applies to Expenses (sign -1). Income entries (e.g. salary)
// always store a null category — returns null | a validated Category, or
// `undefined` to signal an invalid/missing category on an Expense.
function resolveCategory(sign: 1 | -1, formData: FormData): Category | null | undefined {
  if (sign === 1) return null;
  const category = String(formData.get("category") ?? "") as Category;
  return CATEGORIES.includes(category) ? category : undefined;
}

// "Count towards monthly budget" only applies to Expenses. The switch is a
// native-input-backed control, so absence from FormData means unchecked —
// same semantics as an unchecked checkbox.
function resolveCountsTowardBudget(sign: 1 | -1, formData: FormData): boolean {
  if (sign === 1) return true;
  return formData.has("counts_toward_budget");
}

export async function addDbsEntry(formData: FormData) {
  await requireUser();

  const amount = Number(formData.get("amount"));
  const sign = Number(formData.get("sign")) === -1 ? -1 : 1;
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));
  const category = resolveCategory(sign, formData);
  const counts_toward_budget = resolveCountsTowardBudget(sign, formData);

  if (!Number.isFinite(amount) || amount <= 0 || !entry_date) return;
  if (category === undefined) return;

  const supabase = await createClient();
  const { error } = await supabase.from("dbs_entries").insert({
    amount: amount * sign,
    category,
    note,
    entry_date,
    counts_toward_budget,
  });

  if (error) {
    console.error("addDbsEntry failed:", error);
    throw new Error(`Couldn't save the entry: ${error.message}`);
  }

  revalidatePath("/dbs");
  revalidatePath("/");
}

export async function updateDbsEntry(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id"));
  const amount = Number(formData.get("amount"));
  const sign = Number(formData.get("sign")) === -1 ? -1 : 1;
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));
  const category = resolveCategory(sign, formData);
  const counts_toward_budget = resolveCountsTowardBudget(sign, formData);

  if (!id || !Number.isFinite(amount) || amount <= 0 || !entry_date) return;
  if (category === undefined) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("dbs_entries")
    .update({
      amount: amount * sign,
      category,
      note,
      entry_date,
      counts_toward_budget,
    })
    .eq("id", id);

  if (error) {
    console.error("updateDbsEntry failed:", error);
    throw new Error(`Couldn't save the entry: ${error.message}`);
  }

  revalidatePath("/dbs");
  revalidatePath("/");
}

export async function deleteDbsEntry(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("dbs_entries").delete().eq("id", id);

  if (error) {
    console.error("deleteDbsEntry failed:", error);
    throw new Error(`Couldn't delete the entry: ${error.message}`);
  }

  revalidatePath("/dbs");
  revalidatePath("/");
}
