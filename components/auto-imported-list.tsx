"use client";

import { useTransition } from "react";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ACCOUNT_LABELS } from "@/lib/account-labels";

export interface AutoImportedItem {
  id: string;
  account: "dbs" | "maribank";
  amount: number;
  note: string | null;
  entry_date: string;
  // DBS expenses only — undefined for DBS income and every MariBank entry.
  countsTowardBudget?: boolean;
}

interface AutoImportedListProps {
  entries: AutoImportedItem[];
  deleteDbsAction: (formData: FormData) => Promise<void>;
  deleteMaribankAction: (formData: FormData) => Promise<void>;
  toggleBudgetAction: (formData: FormData) => Promise<void>;
}

export function AutoImportedList({
  entries,
  deleteDbsAction,
  deleteMaribankAction,
  toggleBudgetAction,
}: AutoImportedListProps) {
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No auto-imported entries yet.
      </p>
    );
  }

  function handleToggle(id: string, next: boolean) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("counts_toward_budget", String(next));
    startTransition(() => {
      toggleBudgetAction(formData);
    });
  }

  return (
    <ul className="divide-y">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {ACCOUNT_LABELS[entry.account].tag}
              </span>
              {entry.note && <span className="truncate text-sm">{entry.note}</span>}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(entry.entry_date)}
            </span>
          </div>

          {entry.countsTowardBudget !== undefined && (
            <div className="flex shrink-0 items-center gap-1.5">
              <Label
                htmlFor={`auto-counts-${entry.id}`}
                className="text-[10px] text-muted-foreground"
              >
                Budget
              </Label>
              <Switch
                id={`auto-counts-${entry.id}`}
                size="sm"
                checked={entry.countsTowardBudget}
                disabled={isPending}
                onCheckedChange={(checked) => handleToggle(entry.id, checked)}
              />
            </div>
          )}

          <span
            className={
              entry.amount < 0 ? "font-medium text-destructive" : "font-medium text-success"
            }
          >
            {entry.amount > 0 ? "+" : ""}
            {formatCurrency(entry.amount)}
          </span>

          <form action={entry.account === "dbs" ? deleteDbsAction : deleteMaribankAction}>
            <input type="hidden" name="id" value={entry.id} />
            <DeleteEntryButton />
          </form>
        </li>
      ))}
    </ul>
  );
}
