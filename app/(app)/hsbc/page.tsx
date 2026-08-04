import { createClient, requireUser } from "@/lib/supabase/server";
import {
  addHsbcContribution,
  deleteHsbcContribution,
  updateHsbcContribution,
  addHsbcValuation,
  deleteHsbcValuation,
  updateHsbcValuation,
} from "@/actions/hsbc";
import { EntryForm } from "@/components/entry-form";
import { EntryList } from "@/components/entry-list";
import { SearchableEntryList } from "@/components/searchable-entry-list";
import { HsbcValuationSection } from "@/components/hsbc-valuation-section";
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
  isSameMonth,
  isWithinDateRange,
  parseRangeSearchParams,
  sum,
  type PageSearchParams,
} from "@/lib/utils";
import type { HsbcContribution, HsbcValuation } from "@/lib/types";
import { ACCOUNT_LABELS } from "@/lib/account-labels";

export default async function HsbcPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  await requireUser();
  const supabase = await createClient();
  const { range, custom } = parseRangeSearchParams(await searchParams);

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

  // The reminder always checks the true current month, independent of the
  // page's date-range filter below.
  const now = new Date();
  const valuedThisMonth = valuations.some((v) => isSameMonth(v.entry_date, now));

  const filteredContributions = contributions.filter((c) =>
    isWithinDateRange(c.entry_date, range, now, custom)
  );
  const filteredValuations = valuations.filter((v) =>
    isWithinDateRange(v.entry_date, range, now, custom)
  );

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <AccountHeader primary={ACCOUNT_LABELS.hsbc.primary} tag={ACCOUNT_LABELS.hsbc.tag} />

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Contributed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
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
            <p className="text-lg font-semibold">
              {formatCurrency(currentValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-strong bg-strong text-strong-foreground">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-strong-foreground/70">
              Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-strong-accent">
              {growth >= 0 ? "+" : ""}
              {growthPct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <DateRangeFilter
        current={range}
        basePath="/hsbc"
        customFrom={custom.from}
        customTo={custom.to}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contributions</h2>
        <EntryForm
          action={addHsbcContribution}
          triggerLabel="Add"
          dialogTitle={`Add ${ACCOUNT_LABELS.hsbc.primary} contribution`}
          signed={false}
          amountLabel="Amount added (S$)"
        />
      </div>
      <Card>
        <CardContent className="px-4">
          <SearchableEntryList
            entries={filteredContributions}
            deleteAction={deleteHsbcContribution}
            updateAction={updateHsbcContribution}
            showSign={false}
            emptyMessage="No contributions in this period."
            editDialogTitle={`Edit ${ACCOUNT_LABELS.hsbc.primary} contribution`}
            editAmountLabel="Amount added (S$)"
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
            entries={filteredValuations.map((v) => ({
              id: v.id,
              amount: v.value,
              entry_date: v.entry_date,
            }))}
            deleteAction={deleteHsbcValuation}
            updateAction={updateHsbcValuation}
            showSign={false}
            emptyMessage="No valuations in this period."
            editDialogTitle="Edit portfolio value"
            editAmountLabel="Portfolio value (S$)"
            editShowNote={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
