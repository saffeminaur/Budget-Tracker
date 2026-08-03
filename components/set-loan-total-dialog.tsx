"use client";

import { useState } from "react";
import { setMendakiLoanTotal } from "@/actions/mendaki";
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
import { Pencil } from "lucide-react";

export function SetLoanTotalDialog({ currentTotal }: { currentTotal: number }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAction(formData: FormData) {
    setSubmitting(true);
    try {
      await setMendakiLoanTotal(formData);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" aria-label="Edit loan total" />}
      >
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set total loan amount</DialogTitle>
        </DialogHeader>
        <form action={handleAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="total_amount">Total amount loaned (S$)</Label>
            <Input
              id="total_amount"
              name="total_amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={currentTotal}
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
