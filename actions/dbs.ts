"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { CATEGORIES, type Category } from "@/lib/types";

export async function addDbsEntry(formData: FormData) {
  await requireUser();

  const amount = Number(formData.get("amount"));
  const sign = Number(formData.get("sign")) === -1 ? -1 : 1;
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));
  const category = String(formData.get("category")) as Category;

  if (!Number.isFinite(amount) || amount <= 0 || !entry_date) return;
  if (!CATEGORIES.includes(category)) return;

  const supabase = await createClient();
  await supabase.from("dbs_entries").insert({
    amount: amount * sign,
    category,
    note,
    entry_date,
  });

  revalidatePath("/dbs");
  revalidatePath("/");
}

export async function deleteDbsEntry(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  await supabase.from("dbs_entries").delete().eq("id", id);

  revalidatePath("/dbs");
  revalidatePath("/");
}
