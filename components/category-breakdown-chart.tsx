import { formatCurrency } from "@/lib/utils";
import type { Category } from "@/lib/types";

const CATEGORY_VAR: Record<Category, string> = {
  Food: "var(--cat-food)",
  Transport: "var(--cat-transport)",
  Shopping: "var(--cat-shopping)",
  Bills: "var(--cat-bills)",
  Other: "var(--cat-other)",
};

// Fixed identity order — never reordered by value.
const CATEGORY_ORDER: Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Other",
];

interface CategoryBreakdownChartProps {
  totals: Partial<Record<Category, number>>;
}

export function CategoryBreakdownChart({
  totals,
}: CategoryBreakdownChartProps) {
  const rows = CATEGORY_ORDER.map((category) => ({
    category,
    amount: totals[category] ?? 0,
  })).filter((row) => row.amount > 0);

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No spending logged yet.
      </p>
    );
  }

  const grandTotal = rows.reduce((t, r) => t + r.amount, 0);
  const max = Math.max(...rows.map((r) => r.amount));

  return (
    <div className="category-chart space-y-3">
      {rows.map(({ category, amount }) => {
        const widthPct = (amount / max) * 100;
        const sharePct = Math.round((amount / grandTotal) * 100);
        return (
          <div key={category} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{category}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatCurrency(amount)}{" "}
                <span className="text-xs">({sharePct}%)</span>
              </span>
            </div>
            <div className="h-2.5 w-full bg-muted">
              <div
                className="h-full rounded-r-[4px]"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: CATEGORY_VAR[category],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
