import { createClient, requireUser } from "@/lib/supabase/server";
import {
  addMendakiRepayment,
  deleteMendakiRepayment,
  updateMendakiRepayment,
} from "@/actions/mendaki";
import { EntryForm } from "@/components/entry-form";
import { SearchableEntryList } from "@/components/searchable-entry-list";
import { SetLoanTotalDialog } from "@/components/set-loan-total-dialog";
import { MendakiReminderBanner } from "@/components/mendaki-reminder-banner";
import { DateRangeFilter } from "@/components/date-range-filter";
import { AccountHeader } from "@/components/account-header";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  firstOfPreviousMonthIsoDate,
  formatCurrency,
  isSameMonth,
  isWithinDateRange,
  parseRangeSearchParams,
  sum,
  type PageSearchParams,
} from "@/lib/utils";
import { ACCOUNT_LABELS } from "@/lib/account-labels";
import type { MendakiLoan, MendakiRepayment } from "@/lib/types";

export default async function MendakiPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  await requireUser();
  const supabase = await createClient();
  const { range, custom } = parseRangeSearchParams(await searchParams);

  const [{ data: loanData }, { data: repaymentsData }] = await Promise.all([
    supabase.from("mendaki_loan").select("*").maybeSingle(),
    supabase
      .from("mendaki_repayments")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const loan = loanData as MendakiLoan | null;
  const repayments = (repaymentsData ?? []) as MendakiRepayment[];

  const totalAmount = loan?.total_amount ?? 0;
  const totalRepaid = sum(repayments.map((r) => r.amount));
  const remaining = totalAmount - totalRepaid;

  // Always checks the true current month, independent of the page's
  // date-range filter below.
  const now = new Date();
  const paidThisMonth = repayments.some((r) => isSameMonth(r.entry_date, now));
  const showReminder = totalAmount > 0 && remaining > 0 && !paidThisMonth;

  const filteredRepayments = repayments.filter((r) =>
    isWithinDateRange(r.entry_date, range, now, custom)
  );

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <AccountHeader
        primary={ACCOUNT_LABELS.mendaki.primary}
        tag={ACCOUNT_LABELS.mendaki.tag}
      />

      {showReminder && <MendakiReminderBanner dueForMonth={now} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total loan amount
          </CardTitle>
          <CardAction>
            <SetLoanTotalDialog currentTotal={totalAmount} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {formatCurrency(totalAmount)}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total repaid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {formatCurrency(totalRepaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Remaining balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {formatCurrency(remaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Repayments</h2>
        <EntryForm
          action={addMendakiRepayment}
          triggerLabel="Log a past payment"
          dialogTitle="Log a past payment"
          signed={false}
          defaultAmount={50}
          amountLabel="Amount (S$)"
          defaultDate={firstOfPreviousMonthIsoDate()}
        />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        This month&apos;s payment is only confirmed via the reminder banner
        above. Use &ldquo;Log a past payment&rdquo; to backfill repayments
        from before you started using this app.
      </p>
      <DateRangeFilter
        current={range}
        basePath="/mendaki"
        customFrom={custom.from}
        customTo={custom.to}
      />

      <Card>
        <CardContent className="px-4">
          <SearchableEntryList
            entries={filteredRepayments}
            deleteAction={deleteMendakiRepayment}
            updateAction={updateMendakiRepayment}
            showSign={false}
            emptyMessage="No repayments in this period."
            editDialogTitle="Edit repayment"
          />
        </CardContent>
      </Card>
    </div>
  );
}
