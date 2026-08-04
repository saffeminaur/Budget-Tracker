import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonthYear } from "@/lib/utils";

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

// Compact "pill" teasers — tapping one takes you to the page with the full
// confirm/log flow, rather than duplicating those forms here.
export function RemindersCard({
  dueForMonth,
  showLoanReminder,
  showInvestmentsReminder,
  hideWhenEmpty = false,
}: RemindersCardProps) {
  const hasAny = showLoanReminder || showInvestmentsReminder;

  if (!hasAny && hideWhenEmpty) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {showLoanReminder && (
          <Link
            href="/mendaki"
            className="block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Loan repayment due for {formatMonthYear(dueForMonth)}
          </Link>
        )}
        {showInvestmentsReminder && (
          <Link
            href="/hsbc"
            className="block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Update portfolio value for {formatMonthYear(dueForMonth)}
          </Link>
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
