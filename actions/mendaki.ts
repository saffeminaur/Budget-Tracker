"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";

export async function setMendakiLoanTotal(formData: FormData) {
  const user = await requireUser();

  const total_amount = Number(formData.get("total_amount"));
  if (!Number.isFinite(total_amount) || total_amount < 0) return;

  const supabase = await createClient();
  await supabase
    .from("mendaki_loan")
    .upsert({ user_id: user.id, total_amount }, { onConflict: "user_id" });

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
  await supabase.from("mendaki_repayments").insert({ amount, note, entry_date });

  revalidatePath("/mendaki");
  revalidatePath("/");
}

export async function deleteMendakiRepayment(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  await supabase.from("mendaki_repayments").delete().eq("id", id);

  revalidatePath("/mendaki");
  revalidatePath("/");
}
