"use client";

import { useState } from "react";
import { HsbcReminderBanner } from "@/components/hsbc-reminder-banner";
import { EntryForm } from "@/components/entry-form";

interface HsbcValuationSectionProps {
  showReminder: boolean;
  dueForMonth: Date;
  addValuationAction: (formData: FormData) => Promise<void>;
}

export function HsbcValuationSection({
  showReminder,
  dueForMonth,
  addValuationAction,
}: HsbcValuationSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {showReminder && (
        <HsbcReminderBanner
          dueForMonth={dueForMonth}
          onLogNow={() => setDialogOpen(true)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Portfolio value log</h2>
        <EntryForm
          action={addValuationAction}
          triggerLabel="Update"
          dialogTitle="Log portfolio value"
          signed={false}
          amountLabel="Portfolio value (S$)"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </>
  );
}
