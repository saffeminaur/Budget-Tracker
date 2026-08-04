"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";

export async function setMendakiLoanTotal(formData: FormData) {
  const user = await requireUser();

  const total_amount = Number(formData.get("total_amount"));
  if (!Number.isFinite(total_amount) || total_amount < 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("mendaki_loan")
    .upsert({ user_id: user.id, total_amount }, { onConflict: "user_id" });

  if (error) {
    console.error("setMendakiLoanTotal failed:", error);
    throw new Error(`Couldn't save the loan total: ${error.message}`);
  }

  revalidatePath("/mendaki");
  revalidatePath("/");
}

export async function addMendakiRepayment(formData: FormData) {
  await requireUser();

  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));

  if (!Number.isFinite(amount) || amount <= 0 || !entry_date) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("mendaki_repayments")
    .insert({ amount, note, entry_date });

  if (error) {
    console.error("addMendakiRepayment failed:", error);
    throw new Error(`Couldn't save the repayment: ${error.message}`);
  }

  revalidatePath("/mendaki");
  revalidatePath("/");
}

export async function updateMendakiRepayment(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id"));
  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const entry_date = String(formData.get("entry_date"));

  if (!id || !Number.isFinite(amount) || amount <= 0 || !entry_date) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("mendaki_repayments")
    .update({ amount, note, entry_date })
    .eq("id", id);

  if (error) {
    console.error("updateMendakiRepayment failed:", error);
    throw new Error(`Couldn't save the repayment: ${error.message}`);
  }

  revalidatePath("/mendaki");
  revalidatePath("/");
}

export async function deleteMendakiRepayment(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("mendaki_repayments").delete().eq("id", id);

  if (error) {
    console.error("deleteMendakiRepayment failed:", error);
    throw new Error(`Couldn't delete the repayment: ${error.message}`);
  }

  revalidatePath("/mendaki");
  revalidatePath("/");
}
