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
  const { error } = await supabase
    .from("hsbc_contributions")
    .insert({ amount, note, entry_date });

  if (error) {
    console.error("addHsbcContribution failed:", error);
    throw new Error(`Couldn't save the contribution: ${error.message}`);
  }

  revalidatePath("/hsbc");
  revalidatePath("/");
}

export async function updateHsbcContribution(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id"));
  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));

  if (!id || !Number.isFinite(amount) || amount <= 0 || !entry_date) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("hsbc_contributions")
    .update({ amount, note, entry_date })
    .eq("id", id);

  if (error) {
    console.error("updateHsbcContribution failed:", error);
    throw new Error(`Couldn't save the contribution: ${error.message}`);
  }

  revalidatePath("/hsbc");
  revalidatePath("/");
}

export async function deleteHsbcContribution(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("hsbc_contributions").delete().eq("id", id);

  if (error) {
    console.error("deleteHsbcContribution failed:", error);
    throw new Error(`Couldn't delete the contribution: ${error.message}`);
  }

  revalidatePath("/hsbc");
  revalidatePath("/");
}

export async function addHsbcValuation(formData: FormData) {
  await requireUser();

  const value = Number(formData.get("amount"));
  const entry_date = String(formData.get("entry_date"));

  if (!Number.isFinite(value) || value < 0 || !entry_date) return;

  const supabase = await createClient();
  const { error } = await supabase.from("hsbc_valuations").insert({ value, entry_date });

  if (error) {
    console.error("addHsbcValuation failed:", error);
    throw new Error(`Couldn't save the valuation: ${error.message}`);
  }

  revalidatePath("/hsbc");
  revalidatePath("/");
}

export async function updateHsbcValuation(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id"));
  const value = Number(formData.get("amount"));
  const entry_date = String(formData.get("entry_date"));

  if (!id || !Number.isFinite(value) || value < 0 || !entry_date) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("hsbc_valuations")
    .update({ value, entry_date })
    .eq("id", id);

  if (error) {
    console.error("updateHsbcValuation failed:", error);
    throw new Error(`Couldn't save the valuation: ${error.message}`);
  }

  revalidatePath("/hsbc");
  revalidatePath("/");
}

export async function deleteHsbcValuation(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("hsbc_valuations").delete().eq("id", id);

  if (error) {
    console.error("deleteHsbcValuation failed:", error);
    throw new Error(`Couldn't delete the valuation: ${error.message}`);
  }

  revalidatePath("/hsbc");
  revalidatePath("/");
}
