import { formatCurrency, formatDate } from "@/lib/utils";
import type { DbsEntry } from "@/lib/types";

interface RecentTransactionsListProps {
  entries: DbsEntry[];
}

// Read-only, compact — a quick-glance feed, not entry management. Editing
// and deleting still happen on the Bank page itself.
export function RecentTransactionsList({ entries }: RecentTransactionsListProps) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No transactions yet.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry) => (
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
  );
}
