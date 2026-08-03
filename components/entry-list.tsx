import { DeleteEntryButton } from "@/components/delete-entry-button";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface EntryListItem {
  id: string;
  amount: number;
  entry_date: string;
  note?: string | null;
  badge?: string;
}

interface EntryListProps {
  entries: EntryListItem[];
  deleteAction: (formData: FormData) => Promise<void>;
  emptyMessage?: string;
  showSign?: boolean;
}

export function EntryList({
  entries,
  deleteAction,
  emptyMessage = "No entries yet.",
  showSign = true,
}: EntryListProps) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {entry.badge && (
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {entry.badge}
                </span>
              )}
              {entry.note && (
                <span className="truncate text-sm">{entry.note}</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(entry.entry_date)}
            </span>
          </div>
          <span
            className={
              showSign
                ? entry.amount < 0
                  ? "font-medium text-destructive"
                  : "font-medium text-emerald-600 dark:text-emerald-500"
                : "font-medium"
            }
          >
            {showSign && entry.amount > 0 ? "+" : ""}
            {formatCurrency(entry.amount)}
          </span>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={entry.id} />
            <DeleteEntryButton />
          </form>
        </li>
      ))}
    </ul>
  );
}
