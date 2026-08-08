"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  TransactionBreakdownPanel,
  type BreakdownEntry,
} from "@/components/transaction-breakdown-panel";
import { useHasHover } from "@/lib/use-has-hover";
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
}

interface CategoryBreakdownChartProps {
  totals: Partial<Record<Category, number>>;
  entriesByCategory: Partial<Record<Category, BreakdownEntry[]>>;
  viewAllHref: string;
}

// Tapping/hovering a bar shows exactly which transactions make up that
// category's total — same breakdown popup as the "Budget spend" figure,
// anchored to the chart instead of to each bar (bars live in an SVG, so a
// per-bar-anchored popup isn't worth the positioning complexity for what's
// meant to be a quick glance, not a full modal).
export function CategoryBreakdownChart({
  totals,
  entriesByCategory,
  viewAllHref,
}: CategoryBreakdownChartProps) {
  const hasHover = useHasHover();
  const [active, setActive] = useState<Category | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNow(category: Category) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(category);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setActive(null), 150);
  }

  useEffect(() => {
    if (!active) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [active]);

  const rows: Row[] = CATEGORY_ORDER.map((category) => ({
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

  return (
    <div className="category-chart relative" ref={containerRef}>
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
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} stroke="var(--foreground)" strokeWidth={1} maxBarSize={56}>
            {rows.map((row) => (
              <Cell
                key={row.category}
                fill={CATEGORY_VAR[row.category]}
                opacity={active && active !== row.category ? 0.5 : 1}
                style={{ cursor: "pointer" }}
                onMouseEnter={hasHover ? () => openNow(row.category) : undefined}
                onMouseLeave={hasHover ? scheduleClose : undefined}
                onClick={() =>
                  setActive((current) => (current === row.category ? null : row.category))
                }
              />
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

      {active && (
        <TransactionBreakdownPanel
          title={active}
          subtitle={`${formatCurrency(totals[active] ?? 0)} · ${Math.round(((totals[active] ?? 0) / grandTotal) * 100)}% of spending`}
          entries={entriesByCategory[active] ?? []}
          viewAllHref={viewAllHref}
          onMouseEnter={hasHover ? () => openNow(active) : undefined}
          onMouseLeave={hasHover ? scheduleClose : undefined}
          className="absolute top-2 right-2 z-20 w-64"
        />
      )}
    </div>
  );
}
