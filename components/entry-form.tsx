"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { todayIsoDate } from "@/lib/utils";

interface EntryFormProps {
  action: (formData: FormData) => Promise<void>;
  triggerLabel?: string;
  dialogTitle?: string;
  signed?: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
  defaultAmount?: number;
  amountLabel?: string;
  defaultDate?: string;
  extraField?: ReactNode;
  // Lets a parent (e.g. a reminder banner) open this same dialog from
  // elsewhere. Uncontrolled (manages its own open state) when omitted.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EntryForm({
  action,
  triggerLabel = "Add entry",
  dialogTitle,
  signed = true,
  positiveLabel = "Add",
  negativeLabel = "Subtract",
  defaultAmount,
  amountLabel = "Amount (S$)",
  defaultDate,
  extraField,
  open: controlledOpen,
  onOpenChange,
}: EntryFormProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [sign, setSign] = useState<1 | -1>(1);
  const [submitting, setSubmitting] = useState(false);

  async function handleAction(formData: FormData) {
    setSubmitting(true);
    try {
      await action(formData);
      setOpen(false);
      setSign(1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle ?? triggerLabel}</DialogTitle>
        </DialogHeader>
        <form action={handleAction} className="space-y-4">
          {signed && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={sign === 1 ? "default" : "outline"}
                onClick={() => setSign(1)}
              >
                {positiveLabel}
              </Button>
              <Button
                type="button"
                variant={sign === -1 ? "default" : "outline"}
                onClick={() => setSign(-1)}
              >
                {negativeLabel}
              </Button>
              <input type="hidden" name="sign" value={sign} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">{amountLabel}</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              defaultValue={defaultAmount}
            />
          </div>

          {extraField}

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Input id="note" name="note" type="text" maxLength={200} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_date">Date</Label>
            <Input
              id="entry_date"
              name="entry_date"
              type="date"
              defaultValue={defaultDate ?? todayIsoDate()}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
