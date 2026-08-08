"use client";

import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from "@/components/ui/collapsible";
import { formatCurrency, formatDate, groupByDate, todayIsoDate } from "@/lib/utils";
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

// Collapsed by default, matching the other dashboard sections (Spending,
// Femina AI, Import Issues) — nothing to show means nothing rendered, same
// visibility rule as ImportIssuesCard.
export function AutoImportedList({
  entries,
  deleteDbsAction,
  deleteMaribankAction,
  toggleBudgetAction,
}: AutoImportedListProps) {
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) return null;

  const groups = groupByDate(entries, (e) => e.entry_date, todayIsoDate());

  function handleToggle(id: string, next: boolean) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("counts_toward_budget", String(next));
    startTransition(() => {
      toggleBudgetAction(formData);
    });
  }

  return (
    <Collapsible>
      <Card className="py-0">
        <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 px-4 py-3">
          <span className="min-w-0 font-medium">
            Recently auto-added ({entries.length})
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]/trigger:rotate-180" />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <div className="px-4 pb-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="pt-3 pb-1 text-xs font-medium text-muted-foreground first:pt-0">
                  {group.label}
                </p>
                <ul className="divide-y">
                  {group.entries.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            {ACCOUNT_LABELS[entry.account].tag}
                          </span>
                          {entry.note && (
                            <span className="truncate text-sm">{entry.note}</span>
                          )}
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
                          entry.amount < 0
                            ? "font-medium text-destructive"
                            : "font-medium text-success"
                        }
                      >
                        {entry.amount > 0 ? "+" : ""}
                        {formatCurrency(entry.amount)}
                      </span>

                      <form
                        action={entry.account === "dbs" ? deleteDbsAction : deleteMaribankAction}
                      >
                        <input type="hidden" name="id" value={entry.id} />
                        <DeleteEntryButton />
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CollapsiblePanel>
      </Card>
    </Collapsible>
  );
}
