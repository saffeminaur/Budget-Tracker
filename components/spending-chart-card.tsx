"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownChart } from "@/components/category-breakdown-chart";
import { SpendingTrendChart, type MonthlySpend } from "@/components/spending-trend-chart";
import { cn, formatCurrency } from "@/lib/utils";
import type { Category } from "@/lib/types";

type View = "category" | "trend";

interface SpendingChartCardProps {
  periodLabel: string;
  periodIncome: number;
  periodExpenses: number;
  categoryTotals: Partial<Record<Category, number>>;
  monthlyTrend: MonthlySpend[];
}

export function SpendingChartCard({
  periodLabel,
  periodIncome,
  periodExpenses,
  categoryTotals,
  monthlyTrend,
}: SpendingChartCardProps) {
  const [view, setView] = useState<View>("category");

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Spending</CardTitle>
          <div className="inline-flex shrink-0 rounded-full border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setView("category")}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition-colors",
                view === "category"
                  ? "bg-strong text-strong-accent"
                  : "bg-card text-foreground hover:bg-muted"
              )}
            >
              By category
            </button>
            <button
              type="button"
              onClick={() => setView("trend")}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition-colors",
                view === "trend"
                  ? "bg-strong text-strong-accent"
                  : "bg-card text-foreground hover:bg-muted"
              )}
            >
              Trend
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-sm font-semibold text-success">
              {formatCurrency(periodIncome)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Budget spend</p>
            <p className="text-sm font-semibold text-destructive">
              {formatCurrency(periodExpenses)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {view === "category" ? periodLabel : "Last 6 months"}
        </p>

        {view === "category" ? (
          <CategoryBreakdownChart totals={categoryTotals} />
        ) : (
          <SpendingTrendChart data={monthlyTrend} />
        )}
      </CardContent>
    </Card>
  );
}
