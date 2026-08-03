"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";

export async function addHsbcContribution(formData: FormData) {
  await requireUser();

  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));

  if (!Number.isFinite(amount) || amount <= 0 || !entry_date) return;

  const supabase = await createClient();
  await supabase.from("hsbc_contributions").insert({ amount, note, entry_date });

  revalidatePath("/hsbc");
  revalidatePath("/");
}

export async function deleteHsbcContribution(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  await supabase.from("hsbc_contributions").delete().eq("id", id);

  revalidatePath("/hsbc");
  revalidatePath("/");
}

export async function addHsbcValuation(formData: FormData) {
  await requireUser();

  const value = Number(formData.get("amount"));
  const entry_date = String(formData.get("entry_date"));

  if (!Number.isFinite(value) || value < 0 || !entry_date) return;

  const supabase = await createClient();
  await supabase.from("hsbc_valuations").insert({ value, entry_date });

  revalidatePath("/hsbc");
  revalidatePath("/");
}

export async function deleteHsbcValuation(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  await supabase.from("hsbc_valuations").delete().eq("id", id);

  revalidatePath("/hsbc");
  revalidatePath("/");
}
