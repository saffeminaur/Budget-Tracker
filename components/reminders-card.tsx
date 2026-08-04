import { addHsbcValuation } from "@/actions/hsbc";
import { EntryForm } from "@/components/entry-form";
import { MendakiReminderBanner } from "@/components/mendaki-reminder-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatMonthYear } from "@/lib/utils";

interface RemindersCardProps {
  dueForMonth: Date;
  showLoanReminder: boolean;
  showInvestmentsReminder: boolean;
  // Renders nothing at all (not even an empty-state card) when there's
  // nothing due — used on the mobile dashboard, where this card sits in
  // the always-visible top section and shouldn't take up space when
  // there's nothing to show.
  hideWhenEmpty?: boolean;
}

// Each reminder is actionable right here — confirming a loan repayment or
// logging a portfolio value doesn't require leaving the dashboard. The
// card gets an amber "needs attention" accent (never lime, which reads as
// "positive" everywhere else) whenever something's actually due.
export function RemindersCard({
  dueForMonth,
  showLoanReminder,
  showInvestmentsReminder,
  hideWhenEmpty = false,
}: RemindersCardProps) {
  const hasAny = showLoanReminder || showInvestmentsReminder;

  if (!hasAny && hideWhenEmpty) return null;

  return (
    <Card
      className={cn(
        "h-full",
        hasAny && "border-l-4 border-l-warning bg-warning/5"
      )}
    >
      <CardHeader>
        <CardTitle className="text-base">Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showLoanReminder && (
          <MendakiReminderBanner dueForMonth={dueForMonth} bare />
        )}

        {showInvestmentsReminder && (
          <div className={cn("space-y-2", showLoanReminder && "border-t pt-4")}>
            <p className="text-sm font-medium">
              Update portfolio value for {formatMonthYear(dueForMonth)}
            </p>
            <EntryForm
              action={addHsbcValuation}
              triggerLabel="Log now"
              dialogTitle="Log portfolio value"
              signed={false}
              amountLabel="Portfolio value (S$)"
              showNote={false}
            />
          </div>
        )}

        {!hasAny && (
          <p className="py-2 text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
