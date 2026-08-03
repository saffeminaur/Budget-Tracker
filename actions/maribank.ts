"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";

export async function addMaribankEntry(formData: FormData) {
  await requireUser();

  const amount = Number(formData.get("amount"));
  const sign = Number(formData.get("sign")) === -1 ? -1 : 1;
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));

  if (!Number.isFinite(amount) || amount <= 0 || !entry_date) return;

  const supabase = await createClient();
  await supabase.from("maribank_entries").insert({
    amount: amount * sign,
    note,
    entry_date,
  });

  revalidatePath("/maribank");
  revalidatePath("/");
}

export async function deleteMaribankEntry(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  await supabase.from("maribank_entries").delete().eq("id", id);

  revalidatePath("/maribank");
  revalidatePath("/");
}
