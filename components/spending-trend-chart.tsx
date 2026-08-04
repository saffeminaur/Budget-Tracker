"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORIES, type Category } from "@/lib/types";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

export interface MonthlySpend {
  month: string;
  Food: number;
  Transport: number;
  Shopping: number;
  Bills: number;
  Other: number;
}

const CATEGORY_VAR: Record<Category, string> = {
  Food: "var(--cat-food)",
  Transport: "var(--cat-transport)",
  Shopping: "var(--cat-shopping)",
  Bills: "var(--cat-bills)",
  Other: "var(--cat-other)",
};

interface TooltipEntry {
  dataKey: Category;
  value: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce((t, p) => t + (p.value ?? 0), 0);
  const nonZero = payload.filter((p) => p.value > 0);

  return (
    <div className="rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="mb-1.5 font-medium">{label}</p>
      {nonZero.length === 0 ? (
        <p className="text-muted-foreground">No spending</p>
      ) : (
        <ul className="space-y-0.5">
          {nonZero.map((p) => (
            <li key={p.dataKey} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_VAR[p.dataKey] }}
              />
              <span className="text-muted-foreground">{p.dataKey}</span>
              <span className="ml-auto tabular-nums">
                {formatCurrency(p.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1.5 flex justify-between border-t pt-1.5 font-medium">
        <span>Total</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export function SpendingTrendChart({ data }: { data: MonthlySpend[] }) {
  const hasAnySpending = data.some((month) =>
    CATEGORIES.some((category) => month[category] > 0)
  );

  if (!hasAnySpending) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No spending logged in the last 6 months.
      </p>
    );
  }

  return (
    <div className="category-chart">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="month"
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={40}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => formatCompactCurrency(value)}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
            iconType="circle"
            iconSize={8}
          />
          {CATEGORIES.map((category, i) => (
            <Bar
              key={category}
              dataKey={category}
              stackId="month"
              fill={CATEGORY_VAR[category]}
              stroke="var(--foreground)"
              strokeWidth={1}
              maxBarSize={28}
              radius={
                i === CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
