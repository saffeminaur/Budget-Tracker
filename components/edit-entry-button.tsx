"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EntryForm } from "@/components/entry-form";
import { Pencil } from "lucide-react";

interface EditEntryButtonProps {
  action: (formData: FormData) => Promise<void>;
  entryId: string;
  dialogTitle: string;
  amount: number;
  note?: string | null;
  entryDate: string;
  signed?: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
  amountLabel?: string;
  showNote?: boolean;
  extraField?: ReactNode;
  extraFieldForSign?: 1 | -1;
}

export function EditEntryButton({
  action,
  entryId,
  dialogTitle,
  amount,
  note,
  entryDate,
  signed = true,
  positiveLabel,
  negativeLabel,
  amountLabel,
  showNote = true,
  extraField,
  extraFieldForSign,
}: EditEntryButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Edit entry"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-4 text-muted-foreground" />
      </Button>
      <EntryForm
        action={action}
        mode="edit"
        entryId={entryId}
        hideTrigger
        open={open}
        onOpenChange={setOpen}
        dialogTitle={dialogTitle}
        signed={signed}
        positiveLabel={positiveLabel}
        negativeLabel={negativeLabel}
        amountLabel={amountLabel}
        showNote={showNote}
        defaultAmount={Math.abs(amount)}
        defaultSign={amount < 0 ? -1 : 1}
        defaultNote={note ?? undefined}
        defaultDate={entryDate}
        extraField={extraField}
        extraFieldForSign={extraFieldForSign}
      />
    </>
  );
}
