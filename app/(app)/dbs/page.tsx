import { createClient, requireUser } from "@/lib/supabase/server";
import { addDbsEntry, deleteDbsEntry } from "@/actions/dbs";
import { EntryForm } from "@/components/entry-form";
import { EntryList } from "@/components/entry-list";
import { CategoryBreakdownChart } from "@/components/category-breakdown-chart";
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
import { formatCurrency, sum } from "@/lib/utils";
import { CATEGORIES, type Category, type DbsEntry } from "@/lib/types";

export default async function DbsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("dbs_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = (data ?? []) as DbsEntry[];
  const balance = sum(entries.map((e) => e.amount));

  const categoryTotals: Partial<Record<Category, number>> = {};
  for (const entry of entries) {
    if (entry.amount < 0) {
      categoryTotals[entry.category] =
        (categoryTotals[entry.category] ?? 0) + Math.abs(entry.amount);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            DBS balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{formatCurrency(balance)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spending by category</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBreakdownChart totals={categoryTotals} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Entries</h2>
        <EntryForm
          action={addDbsEntry}
          triggerLabel="Add entry"
          dialogTitle="Add DBS entry"
          positiveLabel="Add"
          negativeLabel="Spend"
          extraField={
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
          }
        />
      </div>

      <Card>
        <CardContent className="px-4">
          <EntryList
            entries={entries.map((e) => ({ ...e, badge: e.category }))}
            deleteAction={deleteDbsEntry}
          />
        </CardContent>
      </Card>
    </div>
  );
}
