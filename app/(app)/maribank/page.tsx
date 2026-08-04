import { createClient, requireUser } from "@/lib/supabase/server";
import {
  addMaribankEntry,
  deleteMaribankEntry,
  updateMaribankEntry,
} from "@/actions/maribank";
import { EntryForm } from "@/components/entry-form";
import { SearchableEntryList } from "@/components/searchable-entry-list";
import { DateRangeFilter } from "@/components/date-range-filter";
import { AccountHeader } from "@/components/account-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatCurrency,
  isWithinDateRange,
  parseRangeSearchParams,
  sum,
  type PageSearchParams,
} from "@/lib/utils";
import { ACCOUNT_LABELS } from "@/lib/account-labels";
import type { MaribankEntry } from "@/lib/types";

export default async function MaribankPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  await requireUser();
  const supabase = await createClient();
  const { range, custom } = parseRangeSearchParams(await searchParams);

  const { data } = await supabase
    .from("maribank_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = (data ?? []) as MaribankEntry[];
  const balance = sum(entries.map((e) => e.amount));
  const filteredEntries = entries.filter((e) =>
    isWithinDateRange(e.entry_date, range, new Date(), custom)
  );

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <AccountHeader
        primary={ACCOUNT_LABELS.maribank.primary}
        tag={ACCOUNT_LABELS.maribank.tag}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Balance
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
          dialogTitle={`Add ${ACCOUNT_LABELS.maribank.primary} entry`}
        />
      </div>

      <DateRangeFilter
        current={range}
        basePath="/maribank"
        customFrom={custom.from}
        customTo={custom.to}
      />

      <Card>
        <CardContent className="px-4">
          <SearchableEntryList
            entries={filteredEntries}
            deleteAction={deleteMaribankEntry}
            updateAction={updateMaribankEntry}
            editDialogTitle={`Edit ${ACCOUNT_LABELS.maribank.primary} entry`}
            emptyMessage="No entries in this period."
          />
        </CardContent>
      </Card>
    </div>
  );
}
