import Link from "next/link";
import { cn, BUDGET_FILTER_OPTIONS, type BudgetFilter } from "@/lib/utils";

interface BudgetFilterTabsProps {
  current: BudgetFilter;
  basePath: string;
  // Other search params on the page (e.g. the date range) that must
  // survive switching this filter, rather than being wiped out.
  preserveParams?: Record<string, string | undefined>;
}

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function BudgetFilterTabs({
  current,
  basePath,
  preserveParams = {},
}: BudgetFilterTabsProps) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-lg border p-0.5 text-sm">
      {BUDGET_FILTER_OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={buildHref(basePath, {
            ...preserveParams,
            budget: option.value === "all" ? undefined : option.value,
          })}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            current === option.value
              ? "bg-strong text-strong-accent"
              : "bg-card text-foreground hover:bg-muted"
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
