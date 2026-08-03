import { createClient, requireUser } from "@/lib/supabase/server";
import { addMaribankEntry, deleteMaribankEntry } from "@/actions/maribank";
import { EntryForm } from "@/components/entry-form";
import { EntryList } from "@/components/entry-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, sum } from "@/lib/utils";
import type { MaribankEntry } from "@/lib/types";

export default async function MaribankPage() {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("maribank_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = (data ?? []) as MaribankEntry[];
  const balance = sum(entries.map((e) => e.amount));

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            MariBank balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{formatCurrency(balance)}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Entries</h2>
        <EntryForm
          action={addMaribankEntry}
          triggerLabel="Add entry"
          dialogTitle="Add MariBank entry"
        />
      </div>

      <Card>
        <CardContent className="px-4">
          <EntryList entries={entries} deleteAction={deleteMaribankEntry} />
        </CardContent>
      </Card>
    </div>
  );
}
