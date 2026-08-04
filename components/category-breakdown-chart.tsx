"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import type { Category } from "@/lib/types";

const CATEGORY_VAR: Record<Category, string> = {
  Food: "var(--cat-food)",
  Transport: "var(--cat-transport)",
  Shopping: "var(--cat-shopping)",
  Bills: "var(--cat-bills)",
  Other: "var(--cat-other)",
};

// Fixed identity order — never reordered by value. Alternates lime/black
// by this fixed position, so a given category always keeps the same
// color regardless of which others are present.
const CATEGORY_ORDER: Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Other",
];

interface Row {
  category: Category;
  amount: number;
  // Denormalized onto each row (rather than read from a closure) so the
  // tooltip below can stay a plain, stable component.
  grandTotal: number;
}

interface TooltipEntry {
  payload: Row;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  const sharePct = row.grandTotal > 0 ? Math.round((row.amount / row.grandTotal) * 100) : 0;

  return (
    <div className="rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: CATEGORY_VAR[row.category] }}
        />
        <span className="font-medium">{row.category}</span>
        <span className="ml-auto tabular-nums">{formatCurrency(row.amount)}</span>
      </div>
      <p className="mt-0.5 text-muted-foreground">{sharePct}% of spending</p>
    </div>
  );
}

interface CategoryBreakdownChartProps {
  totals: Partial<Record<Category, number>>;
}

export function CategoryBreakdownChart({
  totals,
}: CategoryBreakdownChartProps) {
  const baseRows = CATEGORY_ORDER.map((category) => ({
    category,
    amount: totals[category] ?? 0,
  })).filter((row) => row.amount > 0);

  if (baseRows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No spending logged yet.
      </p>
    );
  }

  const grandTotal = baseRows.reduce((t, r) => t + r.amount, 0);
  const rows: Row[] = baseRows.map((row) => ({ ...row, grandTotal }));

  return (
    <div className="category-chart">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 36, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--cat-grid)" strokeWidth={1} strokeDasharray="0" />
          <XAxis
            dataKey="category"
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={44}
            domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.25)]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => formatCompactCurrency(value)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} stroke="var(--foreground)" strokeWidth={1} maxBarSize={56}>
            {rows.map((row) => (
              <Cell key={row.category} fill={CATEGORY_VAR[row.category]} />
            ))}
            <LabelList
              dataKey="amount"
              position="top"
              offset={10}
              formatter={(value: unknown) => formatCompactCurrency(Number(value))}
              style={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
