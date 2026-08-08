"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";

// Dashboard "Import issues" card — marks a failed ingestion as reviewed.
// Soft-dismiss (sets dismissed_at) rather than delete, so the row stays
// in email_ingest_log as an audit trail; the card just stops showing it.
export async function dismissIngestFailure(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_ingest_log")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("dismissIngestFailure failed:", error);
    throw new Error(`Couldn't dismiss the entry: ${error.message}`);
  }

  revalidatePath("/");
}
