import { createClient, requireUser } from "@/lib/supabase/server";
import { addDbsEntry, deleteDbsEntry, updateDbsEntry } from "@/actions/dbs";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  formatCurrency,
  isWithinDateRange,
  parseRangeSearchParams,
  sum,
  type PageSearchParams,
} from "@/lib/utils";
import { CATEGORIES, type DbsEntry } from "@/lib/types";
import { ACCOUNT_LABELS } from "@/lib/account-labels";

export default async function DbsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  await requireUser();
  const supabase = await createClient();
  const { range, custom } = parseRangeSearchParams(await searchParams);

  const { data } = await supabase
    .from("dbs_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = (data ?? []) as DbsEntry[];
  const balance = sum(entries.map((e) => e.amount));
  const filteredEntries = entries.filter((e) =>
    isWithinDateRange(e.entry_date, range, new Date(), custom)
  );

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <AccountHeader primary={ACCOUNT_LABELS.dbs.primary} tag={ACCOUNT_LABELS.dbs.tag} />

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
          action={addDbsEntry}
          triggerLabel="Add entry"
          dialogTitle={`Add ${ACCOUNT_LABELS.dbs.primary} entry`}
          positiveLabel="Income"
          negativeLabel="Expense"
          defaultSign={-1}
          extraFieldForSign={-1}
          extraField={
            <>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={CATEGORIES[0]} required>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                <Label htmlFor="counts_toward_budget" className="text-sm font-normal">
                  Count towards monthly budget
                </Label>
                <Switch
                  id="counts_toward_budget"
                  name="counts_toward_budget"
                  defaultChecked
                />
              </div>
            </>
          }
        />
      </div>

      <DateRangeFilter
        current={range}
        basePath="/dbs"
        customFrom={custom.from}
        customTo={custom.to}
      />

      <Card>
        <CardContent className="px-4">
          <SearchableEntryList
            entries={filteredEntries.map((e) => ({
              ...e,
              badge: e.category ?? "Income",
              countsTowardBudget: e.category ? e.counts_toward_budget : undefined,
            }))}
            deleteAction={deleteDbsEntry}
            updateAction={updateDbsEntry}
            editDialogTitle={`Edit ${ACCOUNT_LABELS.dbs.primary} entry`}
            editPositiveLabel="Income"
            editNegativeLabel="Expense"
            editExtraField="category"
            editExtraFieldForSign={-1}
            emptyMessage="No entries in this period."
          />
        </CardContent>
      </Card>
    </div>
  );
}
