import { createClient, requireUser } from "@/lib/supabase/server";
import {
  addHsbcContribution,
  deleteHsbcContribution,
  addHsbcValuation,
  deleteHsbcValuation,
} from "@/actions/hsbc";
import { EntryForm } from "@/components/entry-form";
import { EntryList } from "@/components/entry-list";
import { HsbcValuationSection } from "@/components/hsbc-valuation-section";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, isSameMonth, sum } from "@/lib/utils";
import type { HsbcContribution, HsbcValuation } from "@/lib/types";

export default async function HsbcPage() {
  await requireUser();
  const supabase = await createClient();

  const [{ data: contributionsData }, { data: valuationsData }] =
    await Promise.all([
      supabase
        .from("hsbc_contributions")
        .select("*")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("hsbc_valuations")
        .select("*")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  const contributions = (contributionsData ?? []) as HsbcContribution[];
  const valuations = (valuationsData ?? []) as HsbcValuation[];

  const totalContributed = sum(contributions.map((c) => c.amount));
  const currentValue = valuations[0]?.value ?? 0;
  const growth = currentValue - totalContributed;
  const growthPct =
    totalContributed > 0 ? (growth / totalContributed) * 100 : 0;

  const now = new Date();
  const valuedThisMonth = valuations.some((v) => isSameMonth(v.entry_date, now));

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total contributed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {formatCurrency(totalContributed)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Current value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {formatCurrency(currentValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Growth / return
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={
              growth < 0
                ? "text-2xl font-semibold text-destructive"
                : "text-2xl font-semibold text-emerald-600 dark:text-emerald-500"
            }
          >
            {growth >= 0 ? "+" : ""}
            {formatCurrency(growth)}{" "}
            <span className="text-base font-normal">
              ({growth >= 0 ? "+" : ""}
              {growthPct.toFixed(1)}%)
            </span>
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contributions</h2>
        <EntryForm
          action={addHsbcContribution}
          triggerLabel="Add"
          dialogTitle="Add HSBC contribution"
          signed={false}
          amountLabel="Amount added (S$)"
        />
      </div>
      <Card>
        <CardContent className="px-4">
          <EntryList
            entries={contributions}
            deleteAction={deleteHsbcContribution}
            showSign={false}
            emptyMessage="No contributions logged yet."
          />
        </CardContent>
      </Card>

      <HsbcValuationSection
        showReminder={!valuedThisMonth}
        dueForMonth={now}
        addValuationAction={addHsbcValuation}
      />
      <Card>
        <CardContent className="px-4">
          <EntryList
            entries={valuations.map((v) => ({
              id: v.id,
              amount: v.value,
              entry_date: v.entry_date,
            }))}
            deleteAction={deleteHsbcValuation}
            showSign={false}
            emptyMessage="No valuations logged yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
