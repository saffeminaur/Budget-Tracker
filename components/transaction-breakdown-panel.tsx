import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export interface BreakdownEntry {
  id: string;
  note: string | null;
  amount: number;
  entry_date: string;
}

interface TransactionBreakdownPanelProps {
  title: string;
  subtitle?: string;
  entries: BreakdownEntry[];
  viewAllHref: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}

// The quick-glance popup shared by the "Budget spend" figure and the
// category chart bars — a lightweight list, not a full page, for "let me
// double check what's in this number" without leaving the dashboard.
export function TransactionBreakdownPanel({
  title,
  subtitle,
  entries,
  viewAllHref,
  onMouseEnter,
  onMouseLeave,
  className,
}: TransactionBreakdownPanelProps) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10",
        className
      )}
    >
      <p className="font-medium">{title}</p>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}

      <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
        {entries.length === 0 ? (
          <li className="text-muted-foreground">No transactions.</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{entry.note ?? "—"}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatDate(entry.entry_date)}
              </span>
              <span className="shrink-0 font-medium text-destructive">
                {formatCurrency(Math.abs(entry.amount))}
              </span>
            </li>
          ))
        )}
      </ul>

      <Link
        href={viewAllHref}
        className="mt-2 block text-xs font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-4"
      >
        View all →
      </Link>
    </div>
  );
}
