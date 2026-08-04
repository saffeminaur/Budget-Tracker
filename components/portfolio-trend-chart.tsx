"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

export interface PortfolioTrendPoint {
  label: string;
  value: number;
  contributed: number;
}

interface TooltipEntry {
  dataKey: "value" | "contributed";
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

  const value = payload.find((p) => p.dataKey === "value")?.value ?? 0;
  const contributed = payload.find((p) => p.dataKey === "contributed")?.value ?? 0;
  const growth = value - contributed;
  const growthPct = contributed > 0 ? (growth / contributed) * 100 : 0;

  return (
    <div className="rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="mb-1.5 font-medium">{label}</p>
      <ul className="space-y-0.5">
        <li className="flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--line-value)" }}
          />
          <span className="text-muted-foreground">Portfolio value</span>
          <span className="ml-auto tabular-nums">{formatCurrency(value)}</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--line-muted)" }}
          />
          <span className="text-muted-foreground">Total contributed</span>
          <span className="ml-auto tabular-nums">
            {formatCurrency(contributed)}
          </span>
        </li>
      </ul>
      <div className="mt-1.5 flex justify-between border-t pt-1.5 font-medium">
        <span>Growth</span>
        <span
          className={
            growth < 0
              ? "tabular-nums text-destructive"
              : "tabular-nums text-success"
          }
        >
          {growth >= 0 ? "+" : ""}
          {formatCurrency(growth)} ({growth >= 0 ? "+" : ""}
          {growthPct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

interface CurrentPointDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: PortfolioTrendPoint;
  lastIndex: number;
}

// Only the latest point gets a marker — everything else is just the smooth
// line — plus a floating pill (date + value) permanently pinned above it,
// not just on hover.
function CurrentPointDot({ cx, cy, index, payload, lastIndex }: CurrentPointDotProps) {
  if (cx === undefined || cy === undefined || index !== lastIndex || !payload) {
    return null;
  }

  const valueLabel = formatCurrency(payload.value);
  const pillWidth = Math.max(80, valueLabel.length * 7 + 28);
  const pillHeight = 38;

  return (
    <g>
      <foreignObject
        x={cx - pillWidth / 2}
        y={cy - pillHeight - 12}
        width={pillWidth}
        height={pillHeight}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            borderRadius: 9999,
            background: "#141414",
            color: "#ffffff",
            whiteSpace: "nowrap",
            padding: "0 12px",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 9, opacity: 0.7, lineHeight: 1 }}>
            {payload.label}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
            {valueLabel}
          </span>
        </div>
      </foreignObject>
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="var(--line-value-dot)"
        stroke="var(--line-value)"
        strokeWidth={2}
      />
    </g>
  );
}

export function PortfolioTrendChart({ data }: { data: PortfolioTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No valuations logged yet.
      </p>
    );
  }

  const lastIndex = data.length - 1;

  return (
    <div className="portfolio-chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 48, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--port-grid)" strokeWidth={1} strokeDasharray="0" />
          <XAxis
            dataKey="label"
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            minTickGap={24}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={44}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => formatCompactCurrency(value)}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="plainline"
            formatter={(value: string) => (
              <span style={{ color: "var(--foreground)" }}>{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="contributed"
            name="Total contributed"
            stroke="var(--line-muted)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="Portfolio value"
            stroke="var(--line-value)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props: unknown) => {
              const p = props as CurrentPointDotProps & { key?: string };
              return (
                <CurrentPointDot key={p.key ?? p.index} {...p} lastIndex={lastIndex} />
              );
            }}
            activeDot={{
              r: 6,
              fill: "var(--line-value-dot)",
              stroke: "var(--line-value)",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
