"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMonthYear } from "@/lib/utils";

interface HsbcReminderBannerProps {
  dueForMonth: Date;
  onLogNow: () => void;
}

// No dismiss action, same as the Mendaki banner: visibility is entirely
// driven by whether a valuation has been logged for the current month
// (computed fresh from the database by the parent page on every load), so
// this shows on every page load/refresh for the whole month until that's
// true. Unlike Mendaki, this is a reminder only — the regular "Update" and
// "Add" forms stay available regardless.
export function HsbcReminderBanner({
  dueForMonth,
  onLogNow,
}: HsbcReminderBannerProps) {
  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">
          Time to update your HSBC portfolio value for{" "}
          {formatMonthYear(dueForMonth)}
        </p>
        <Button type="button" size="sm" onClick={onLogNow}>
          Log now
        </Button>
      </CardContent>
    </Card>
  );
}
