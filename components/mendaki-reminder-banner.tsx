"use client";

import { useState } from "react";
import { addMendakiRepayment } from "@/actions/mendaki";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/amount-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatMonthYear, todayIsoDate } from "@/lib/utils";

interface MendakiReminderBannerProps {
  dueForMonth: Date;
  defaultAmount?: number;
}

// No dismiss action on purpose: visibility is entirely driven by whether a
// repayment has been logged for the current month (computed fresh from the
// database by the parent page on every load), so this banner shows on every
// page load/refresh for the whole month until that's true.
export function MendakiReminderBanner({
  dueForMonth,
  defaultAmount = 50,
}: MendakiReminderBannerProps) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      await addMendakiRepayment(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">
          Loan repayment due for {formatMonthYear(dueForMonth)}
        </p>

        {!confirming ? (
          <Button type="button" size="sm" onClick={() => setConfirming(true)}>
            Yes, I paid
          </Button>
        ) : (
          <form action={handleConfirm} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="reminder-amount" className="text-xs">
                  Amount (S$)
                </Label>
                <AmountInput
                  id="reminder-amount"
                  name="amount"
                  defaultValue={defaultAmount}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reminder-date" className="text-xs">
                  Date
                </Label>
                <Input
                  id="reminder-date"
                  name="entry_date"
                  type="date"
                  defaultValue={todayIsoDate()}
                  required
                />
              </div>
            </div>
            <input type="hidden" name="note" value="" />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Saving…" : "Confirm payment"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
