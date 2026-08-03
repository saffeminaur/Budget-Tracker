import { createClient, requireUser } from "@/lib/supabase/server";
import {
  addMendakiRepayment,
  deleteMendakiRepayment,
} from "@/actions/mendaki";
import { EntryForm } from "@/components/entry-form";
import { EntryList } from "@/components/entry-list";
import { SetLoanTotalDialog } from "@/components/set-loan-total-dialog";
import { MendakiReminderBanner } from "@/components/mendaki-reminder-banner";
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
  sum,
} from "@/lib/utils";
import type { MendakiLoan, MendakiRepayment } from "@/lib/types";

export default async function MendakiPage() {
  await requireUser();
  const supabase = await createClient();

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

  const now = new Date();
  const paidThisMonth = repayments.some((r) => isSameMonth(r.entry_date, now));
  const showReminder = totalAmount > 0 && remaining > 0 && !paidThisMonth;

  return (
    <div className="mx-auto max-w-lg space-y-4">
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
      <Card>
        <CardContent className="px-4">
          <EntryList
            entries={repayments}
            deleteAction={deleteMendakiRepayment}
            showSign={false}
            emptyMessage="No repayments logged yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
