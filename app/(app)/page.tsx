import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import { NetWorthCard } from "@/components/net-worth-card";
import { AccountSummaryCard } from "@/components/account-summary-card";
import { QuickAdd } from "@/components/quick-add";
import { SpendingChartCard } from "@/components/spending-chart-card";
import { RemindersCard } from "@/components/reminders-card";
import { RecentTransactionsList } from "@/components/recent-transactions-list";
import { DashboardSection } from "@/components/dashboard-section";
import { DateRangeFilter } from "@/components/date-range-filter";
import { GranularityFilter } from "@/components/granularity-filter";
import {
  PortfolioTrendChart,
  type PortfolioTrendPoint,
} from "@/components/portfolio-trend-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  dateRangeLabel,
  formatCurrency,
  formatDate,
  formatMonthShort,
  isSameMonth,
  isWithinDateRange,
  lastNMonths,
  parseGranularity,
  parseRangeSearchParams,
  sum,
  type PageSearchParams,
} from "@/lib/utils";
import { ACCOUNT_LABELS } from "@/lib/account-labels";
import { PiggyBank, Wallet, TrendingUp, Landmark, Users } from "lucide-react";
import type {
  Category,
  DbsEntry,
  HsbcContribution,
  HsbcValuation,
  MaribankEntry,
  MendakiLoan,
  MendakiRepayment,
  ReceivableEntry,
} from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams & { granularity?: string }>;
}) {
  await requireUser();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const { range, custom } = parseRangeSearchParams(resolvedSearchParams);
  const granularity = parseGranularity(resolvedSearchParams.granularity);

  const [
    { data: maribankData },
    { data: dbsData },
    { data: receivablesData },
    { data: hsbcContributionsData },
    { data: hsbcValuationsData },
    { data: loanData },
    { data: repaymentsData },
  ] = await Promise.all([
    supabase.from("maribank_entries").select("*"),
    supabase
      .from("dbs_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("receivables_entries").select("*"),
    supabase.from("hsbc_contributions").select("*"),
    supabase
      .from("hsbc_valuations")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("mendaki_loan").select("*").maybeSingle(),
    supabase.from("mendaki_repayments").select("*"),
  ]);

  const maribankBalance = sum(((maribankData ?? []) as MaribankEntry[]).map((e) => e.amount));
  const dbsEntries = (dbsData ?? []) as DbsEntry[];
  const dbsBalance = sum(dbsEntries.map((e) => e.amount));
  const receivables = (receivablesData ?? []) as ReceivableEntry[];
  const receivablesTotal = sum(receivables.map((e) => e.amount));

  const hsbcContributions = (hsbcContributionsData ?? []) as HsbcContribution[];
  const hsbcValuations = (hsbcValuationsData ?? []) as HsbcValuation[];
  const hsbcCurrentValue = hsbcValuations[0]?.value ?? 0;
  const hsbcTotalContributed = sum(hsbcContributions.map((c) => c.amount));
  const hsbcGrowth = hsbcCurrentValue - hsbcTotalContributed;
  const hsbcGrowthPct =
    hsbcTotalContributed > 0 ? (hsbcGrowth / hsbcTotalContributed) * 100 : 0;

  const loan = loanData as MendakiLoan | null;
  const repayments = (repaymentsData ?? []) as MendakiRepayment[];
  const mendakiTotal = loan?.total_amount ?? 0;
  const mendakiRepaid = sum(repayments.map((r) => r.amount));
  const mendakiRemaining = mendakiTotal - mendakiRepaid;

  const netWorth =
    maribankBalance + dbsBalance + hsbcCurrentValue + receivablesTotal;

  const byPerson = new Map<string, number>();
  for (const entry of receivables) {
    byPerson.set(entry.person, (byPerson.get(entry.person) ?? 0) + entry.amount);
  }
  const people = [...byPerson.entries()].sort((a, b) => b[1] - a[1]);

  const now = new Date();
  const paidThisMonth = repayments.some((r) => isSameMonth(r.entry_date, now));
  const showLoanReminder = mendakiTotal > 0 && mendakiRemaining > 0 && !paidThisMonth;
  const valuedThisMonth = hsbcValuations.some((v) => isSameMonth(v.entry_date, now));
  const showInvestmentsReminder = !valuedThisMonth;

  // Investments growth chart: always the full valuation history, bucketed
  // by the chosen granularity — independent of the "Spending" date filter
  // below, which is a separate control for a separate card.
  const valuationsAsc = [...hsbcValuations].sort((a, b) =>
    a.entry_date.localeCompare(b.entry_date)
  );
  const contributionsAsc = [...hsbcContributions].sort((a, b) =>
    a.entry_date.localeCompare(b.entry_date)
  );

  function cumulativeContributedAsOf(dateIso: string) {
    return sum(
      contributionsAsc
        .filter((c) => c.entry_date <= dateIso)
        .map((c) => c.amount)
    );
  }

  function bucketKey(iso: string) {
    if (granularity === "monthly") return iso.slice(0, 7);
    if (granularity === "yearly") return iso.slice(0, 4);
    return iso;
  }

  const lastValuationPerBucket = new Map<string, HsbcValuation>();
  for (const v of valuationsAsc) {
    lastValuationPerBucket.set(bucketKey(v.entry_date), v);
  }

  const portfolioTrend: PortfolioTrendPoint[] = [...lastValuationPerBucket.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({
      label:
        granularity === "yearly"
          ? v.entry_date.slice(0, 4)
          : granularity === "monthly"
            ? formatMonthShort(new Date(`${v.entry_date}T00:00:00`))
            : formatDate(v.entry_date),
      value: v.value,
      contributed: cumulativeContributedAsOf(v.entry_date),
    }));

  // Spending card: only expenses marked "counts towards budget" factor into
  // any of these totals/charts — the account balance above is unaffected
  // (that's every entry, always).
  const filteredDbsEntries = dbsEntries.filter((e) =>
    isWithinDateRange(e.entry_date, range, now, custom)
  );
  const budgetExpenses = filteredDbsEntries.filter(
    (e) => e.amount < 0 && e.counts_toward_budget
  );

  const categoryTotals: Partial<Record<Category, number>> = {};
  for (const entry of budgetExpenses) {
    if (entry.category) {
      categoryTotals[entry.category] =
        (categoryTotals[entry.category] ?? 0) + Math.abs(entry.amount);
    }
  }

  const periodIncome = sum(
    filteredDbsEntries.filter((e) => e.amount > 0).map((e) => e.amount)
  );
  const periodExpenses = sum(budgetExpenses.map((e) => Math.abs(e.amount)));

  // Always the trailing 6 calendar months, independent of the date filter
  // above — a fixed trend window rather than a filtered view.
  const monthlyTrend = lastNMonths(6).map((monthDate) => {
    const row = {
      month: formatMonthShort(monthDate),
      Food: 0,
      Transport: 0,
      Shopping: 0,
      Bills: 0,
      Other: 0,
    };
    for (const entry of dbsEntries) {
      if (
        entry.amount < 0 &&
        entry.counts_toward_budget &&
        entry.category &&
        isSameMonth(entry.entry_date, monthDate)
      ) {
        row[entry.category] += Math.abs(entry.amount);
      }
    }
    return row;
  });

  const recentTransactions = dbsEntries.slice(0, 6);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <NetWorthCard
        netWorth={netWorth}
        breakdown={[
          { label: ACCOUNT_LABELS.maribank.primary, amount: maribankBalance },
          { label: ACCOUNT_LABELS.dbs.primary, amount: dbsBalance },
          {
            label: `${ACCOUNT_LABELS.hsbc.primary} (current value)`,
            amount: hsbcCurrentValue,
          },
          { label: "Receivables (owed to you)", amount: receivablesTotal },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AccountSummaryCard
          href="/maribank"
          label={ACCOUNT_LABELS.maribank.primary}
          tag={ACCOUNT_LABELS.maribank.tag}
          amount={maribankBalance}
          icon={PiggyBank}
        />
        <AccountSummaryCard
          href="/dbs"
          label={ACCOUNT_LABELS.dbs.primary}
          tag={ACCOUNT_LABELS.dbs.tag}
          amount={dbsBalance}
          icon={Wallet}
        />
        <AccountSummaryCard
          href="/hsbc"
          label={ACCOUNT_LABELS.hsbc.primary}
          tag={ACCOUNT_LABELS.hsbc.tag}
          amount={hsbcCurrentValue}
          icon={TrendingUp}
          highlight
        />
        <AccountSummaryCard
          href="/mendaki"
          label={ACCOUNT_LABELS.mendaki.primary}
          tag={ACCOUNT_LABELS.mendaki.tag}
          amount={-mendakiRemaining}
          icon={Landmark}
        />
      </div>

      {/* Mobile: only the essentials render eagerly (above); everything
          else is progressive disclosure so the first screen is scannable
          without a long scroll. Desktop keeps the original always-expanded
          layout, unchanged, in the block below. */}
      <div className="space-y-3 sm:hidden">
        <RemindersCard
          dueForMonth={now}
          showLoanReminder={showLoanReminder}
          showInvestmentsReminder={showInvestmentsReminder}
          hideWhenEmpty
        />

        <DashboardSection
          title="Femina AI"
          summary="Log a transaction with plain English"
        >
          <QuickAdd />
        </DashboardSection>

        <DashboardSection
          title="Spending"
          summary={`${dateRangeLabel(range, custom)} · ${formatCurrency(periodExpenses)}`}
        >
          <div className="space-y-4">
            <DateRangeFilter
              current={range}
              basePath="/"
              customFrom={custom.from}
              customTo={custom.to}
              preserveParams={{
                granularity: granularity === "monthly" ? undefined : granularity,
              }}
            />
            <SpendingChartCard
              periodLabel={dateRangeLabel(range, custom)}
              periodIncome={periodIncome}
              periodExpenses={periodExpenses}
              categoryTotals={categoryTotals}
              monthlyTrend={monthlyTrend}
            />
          </div>
        </DashboardSection>

        <DashboardSection
          title="Recent transactions"
          summary={`${recentTransactions.length} recent`}
        >
          <RecentTransactionsList entries={recentTransactions} />
          <Link
            href="/dbs"
            className="mt-4 block text-sm font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-4"
          >
            View {ACCOUNT_LABELS.dbs.primary} →
          </Link>
        </DashboardSection>

        <DashboardSection
          title="Investments"
          summary={`Current value · ${formatCurrency(hsbcCurrentValue)}`}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Portfolio value
              </span>
              <GranularityFilter
                current={granularity}
                basePath="/"
                preserveParams={{
                  range: range === "month" ? undefined : range,
                  from: custom.from,
                  to: custom.to,
                }}
              />
            </div>
            <PortfolioTrendChart data={portfolioTrend} />
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Contributed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">
                    {formatCurrency(hsbcTotalContributed)}
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
                    {formatCurrency(hsbcCurrentValue)}
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
                    {hsbcGrowth >= 0 ? "+" : ""}
                    {hsbcGrowthPct.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection
          title="Receivables"
          summary={`${formatCurrency(receivablesTotal)} owed to you`}
        >
          <div className="space-y-2">
            {people.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {people.map(([person, amount]) => (
                  <li key={person} className="flex justify-between">
                    <span className="text-muted-foreground">{person}</span>
                    <span>{formatCurrency(amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nobody owes you anything right now.
              </p>
            )}
            <Link
              href="/receivables"
              className="mt-2 block text-sm font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-4"
            >
              View Receivables →
            </Link>
          </div>
        </DashboardSection>
      </div>

      <div className="hidden space-y-4 sm:block">
        <QuickAdd />

        <DateRangeFilter
          current={range}
          basePath="/"
          customFrom={custom.from}
          customTo={custom.to}
          preserveParams={{
            granularity: granularity === "monthly" ? undefined : granularity,
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SpendingChartCard
            periodLabel={dateRangeLabel(range, custom)}
            periodIncome={periodIncome}
            periodExpenses={periodExpenses}
            categoryTotals={categoryTotals}
            monthlyTrend={monthlyTrend}
          />
          <RemindersCard
            dueForMonth={now}
            showLoanReminder={showLoanReminder}
            showInvestmentsReminder={showInvestmentsReminder}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent transactions</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <RecentTransactionsList entries={recentTransactions} />
          </CardContent>
          <div className="px-4 pb-4">
            <Link
              href="/dbs"
              className="text-sm font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-4"
            >
              View {ACCOUNT_LABELS.dbs.primary} →
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="min-w-0 truncate text-base">
                {ACCOUNT_LABELS.hsbc.primary} · portfolio value
              </CardTitle>
              <div className="shrink-0">
                <GranularityFilter
                  current={granularity}
                  basePath="/"
                  preserveParams={{
                    range: range === "month" ? undefined : range,
                    from: custom.from,
                    to: custom.to,
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PortfolioTrendChart data={portfolioTrend} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Contributed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {formatCurrency(hsbcTotalContributed)}
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
                {formatCurrency(hsbcCurrentValue)}
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
                {hsbcGrowth >= 0 ? "+" : ""}
                {hsbcGrowthPct.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Link href="/receivables">
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="size-4" />
                Receivables (included in net worth)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold">
                {formatCurrency(receivablesTotal)}
              </p>
              {people.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {people.map(([person, amount]) => (
                    <li key={person} className="flex justify-between">
                      <span className="text-muted-foreground">{person}</span>
                      <span>{formatCurrency(amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nobody owes you anything right now.
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
