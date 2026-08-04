"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/amount-input";
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
  defaultSign?: 1 | -1;
  amountLabel?: string;
  defaultDate?: string;
  defaultNote?: string;
  showNote?: boolean;
  extraField?: ReactNode;
  // When set, extraField only renders while the sign toggle matches this
  // value (e.g. a category picker that only makes sense for Expenses).
  extraFieldForSign?: 1 | -1;
  // Lets a parent (e.g. a reminder banner, or an edit icon) open this same
  // dialog from elsewhere. Uncontrolled (manages its own open state) when
  // both are omitted.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // "edit" adds a hidden `id` field and skips resetting the sign toggle
  // after a successful save (there's no "next entry" to prepare for).
  mode?: "create" | "edit";
  entryId?: string;
  // Renders no trigger button of its own — the parent supplies one and
  // controls `open`/`onOpenChange` instead. Used for edit icons.
  hideTrigger?: boolean;
}

export function EntryForm({
  action,
  triggerLabel = "Add entry",
  dialogTitle,
  signed = true,
  positiveLabel = "Add",
  negativeLabel = "Subtract",
  defaultAmount,
  defaultSign = 1,
  amountLabel = "Amount (S$)",
  defaultDate,
  defaultNote,
  showNote = true,
  extraField,
  extraFieldForSign,
  open: controlledOpen,
  onOpenChange,
  mode = "create",
  entryId,
  hideTrigger = false,
}: EntryFormProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
    if (next) setError(null);
  };
  const [sign, setSign] = useState<1 | -1>(defaultSign);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      await action(formData);
      setOpen(false);
      if (mode === "create") setSign(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger render={<Button size="sm" />}>
          <Plus className="size-4" />
          {triggerLabel}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle ?? triggerLabel}</DialogTitle>
        </DialogHeader>
        <form action={handleAction} className="space-y-4">
          {mode === "edit" && entryId && (
            <input type="hidden" name="id" value={entryId} />
          )}

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
            <AmountInput
              id="amount"
              name="amount"
              required
              defaultValue={defaultAmount}
            />
          </div>

          {(extraFieldForSign === undefined || sign === extraFieldForSign) &&
            extraField}

          {showNote && (
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                name="note"
                type="text"
                maxLength={200}
                defaultValue={defaultNote}
              />
            </div>
          )}

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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
