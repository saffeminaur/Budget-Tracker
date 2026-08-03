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
  await supabase.from("receivables_entries").insert({
    amount: amount * sign,
    person,
    note,
    entry_date,
  });

  revalidatePath("/receivables");
  revalidatePath("/");
}

export async function deleteReceivableEntry(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  await supabase.from("receivables_entries").delete().eq("id", id);

  revalidatePath("/receivables");
  revalidatePath("/");
}
