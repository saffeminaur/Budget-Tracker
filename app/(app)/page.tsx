import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import { NetWorthCard } from "@/components/net-worth-card";
import { AccountSummaryCard } from "@/components/account-summary-card";
import { MendakiReminderBanner } from "@/components/mendaki-reminder-banner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, isSameMonth, sum } from "@/lib/utils";
import { PiggyBank, Wallet, TrendingUp, Landmark, Users } from "lucide-react";
import type {
  DbsEntry,
  HsbcContribution,
  HsbcValuation,
  MaribankEntry,
  MendakiLoan,
  MendakiRepayment,
  ReceivableEntry,
} from "@/lib/types";

export default async function DashboardPage() {
  await requireUser();
  const supabase = await createClient();

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
    supabase.from("dbs_entries").select("*"),
    supabase.from("receivables_entries").select("*"),
    supabase.from("hsbc_contributions").select("*"),
    supabase
      .from("hsbc_valuations")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("mendaki_loan").select("*").maybeSingle(),
    supabase.from("mendaki_repayments").select("*"),
  ]);

  const maribankBalance = sum(((maribankData ?? []) as MaribankEntry[]).map((e) => e.amount));
  const dbsBalance = sum(((dbsData ?? []) as DbsEntry[]).map((e) => e.amount));
  const receivables = (receivablesData ?? []) as ReceivableEntry[];
  const receivablesTotal = sum(receivables.map((e) => e.amount));

  const totalContributed = sum(
    ((hsbcContributionsData ?? []) as HsbcContribution[]).map((c) => c.amount)
  );
  const hsbcCurrentValue =
    ((hsbcValuationsData ?? []) as HsbcValuation[])[0]?.value ?? 0;

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
  const showReminder = mendakiTotal > 0 && mendakiRemaining > 0 && !paidThisMonth;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {showReminder && <MendakiReminderBanner dueForMonth={now} />}

      <NetWorthCard
        netWorth={netWorth}
        breakdown={[
          { label: "MariBank", amount: maribankBalance },
          { label: "DBS", amount: dbsBalance },
          { label: "HSBC (current value)", amount: hsbcCurrentValue },
          { label: "Receivables (owed to you)", amount: receivablesTotal },
        ]}
      />

      <div className="grid grid-cols-2 gap-3">
        <AccountSummaryCard
          href="/maribank"
          label="MariBank"
          amount={maribankBalance}
          icon={PiggyBank}
        />
        <AccountSummaryCard
          href="/dbs"
          label="DBS"
          amount={dbsBalance}
          icon={Wallet}
        />
        <AccountSummaryCard
          href="/hsbc"
          label="HSBC"
          amount={hsbcCurrentValue}
          icon={TrendingUp}
          sublabel={`${formatCurrency(totalContributed)} contributed`}
        />
        <AccountSummaryCard
          href="/mendaki"
          label="Mendaki Loan"
          amount={-mendakiRemaining}
          icon={Landmark}
          sublabel="remaining balance"
        />
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
  );
}
