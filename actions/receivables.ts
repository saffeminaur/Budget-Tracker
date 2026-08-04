"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";

export async function addReceivableEntry(formData: FormData) {
  await requireUser();

  const amount = Number(formData.get("amount"));
  const sign = Number(formData.get("sign")) === -1 ? -1 : 1;
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));
  const person = String(formData.get("person") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0 || !entry_date || !person) return;

  const supabase = await createClient();
  const { error } = await supabase.from("receivables_entries").insert({
    amount: amount * sign,
    person,
    note,
    entry_date,
  });

  if (error) {
    console.error("addReceivableEntry failed:", error);
    throw new Error(`Couldn't save the entry: ${error.message}`);
  }

  revalidatePath("/receivables");
  revalidatePath("/");
}

export async function updateReceivableEntry(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id"));
  const amount = Number(formData.get("amount"));
  const sign = Number(formData.get("sign")) === -1 ? -1 : 1;
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));
  const person = String(formData.get("person") ?? "").trim();

  if (!id || !Number.isFinite(amount) || amount <= 0 || !entry_date || !person)
    return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("receivables_entries")
    .update({ amount: amount * sign, person, note, entry_date })
    .eq("id", id);

  if (error) {
    console.error("updateReceivableEntry failed:", error);
    throw new Error(`Couldn't save the entry: ${error.message}`);
  }

  revalidatePath("/receivables");
  revalidatePath("/");
}

export async function deleteReceivableEntry(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("receivables_entries").delete().eq("id", id);

  if (error) {
    console.error("deleteReceivableEntry failed:", error);
    throw new Error(`Couldn't delete the entry: ${error.message}`);
  }

  revalidatePath("/receivables");
  revalidatePath("/");
}
