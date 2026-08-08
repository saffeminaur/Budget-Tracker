"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from "@/components/ui/collapsible";
import { formatCurrency, formatDate, groupByDate, todayIsoDate } from "@/lib/utils";
import { ACCOUNT_LABELS } from "@/lib/account-labels";
import type { DbsEntry } from "@/lib/types";

interface RecentTransactionsListProps {
  entries: DbsEntry[];
}

// Collapsed by default, matching the other dashboard sections (Spending,
// Femina AI, Import Issues) — read-only, compact once expanded: a
// quick-glance feed, not entry management. Editing and deleting still
// happen on the Bank page itself.
export function RecentTransactionsList({ entries }: RecentTransactionsListProps) {
  const groups = groupByDate(entries, (e) => e.entry_date, todayIsoDate());

  return (
    <Collapsible>
      <Card className="py-0">
        <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 px-4 py-3">
          <span className="min-w-0 font-medium">
            Recent transactions ({entries.length})
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]/trigger:rotate-180" />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <div className="px-4 pb-4">
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No transactions yet.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <p className="pt-3 pb-1 text-xs font-medium text-muted-foreground first:pt-0">
                    {group.label}
                  </p>
                  <ul className="divide-y">
                    {group.entries.map((entry) => (
                      <li key={entry.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                              {entry.category ?? "Income"}
                            </span>
                            {entry.note && (
                              <span className="truncate text-sm">{entry.note}</span>
                            )}
                            {entry.category && !entry.counts_toward_budget && (
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                Excluded
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.entry_date)}
                          </span>
                        </div>
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
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}

            <Link
              href="/dbs"
              className="mt-4 block text-sm font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-4"
            >
              View {ACCOUNT_LABELS.dbs.primary} →
            </Link>
          </div>
        </CollapsiblePanel>
      </Card>
    </Collapsible>
  );
}
