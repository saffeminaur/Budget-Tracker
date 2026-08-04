"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";

export async function updateDisplayName(formData: FormData) {
  await requireUser();

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  if (error) {
    console.error("updateDisplayName failed:", error);
    throw new Error(`Couldn't save your name: ${error.message}`);
  }

  revalidatePath("/", "layout");
}
