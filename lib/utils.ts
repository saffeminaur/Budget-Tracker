import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const sgdFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
});

export function formatCurrency(amount: number) {
  return sgdFormatter.format(amount);
}

export function sum(amounts: number[]) {
  return amounts.reduce((total, amount) => total + amount, 0);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-SG", { month: "long", year: "numeric" });
}

function formatDateShort(isoDate: string, referenceYear: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === referenceYear ? undefined : "numeric",
  });
}

export interface DateGroup<T> {
  label: string;
  entries: T[];
}

// Buckets already-descending-sorted entries under relative headers (Today,
// Yesterday, This week) for the last week, then falls back to the actual
// date for anything older — lets a scan of a long list answer "when" at a
// glance instead of reading every row's date.
export function groupByDate<T>(
  entries: T[],
  getIsoDate: (entry: T) => string,
  todayIso: string
): DateGroup<T>[] {
  const today = new Date(`${todayIso}T00:00:00`);
  const referenceYear = today.getFullYear();

  function labelFor(isoDate: string) {
    const d = new Date(`${isoDate}T00:00:00`);
    const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays >= 2 && diffDays <= 6) return "This week";
    return formatDateShort(isoDate, referenceYear);
  }

  const groups: DateGroup<T>[] = [];
  for (const entry of entries) {
    const label = labelFor(getIsoDate(entry));
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  }
  return groups;
}

export function firstOfPreviousMonthIsoDate() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.toISOString().slice(0, 10);
}

export function firstOfCurrentMonthIsoDate() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return d.toISOString().slice(0, 10);
}

export function lastNMonths(n: number, reference: Date = new Date()): Date[] {
  return Array.from(
    { length: n },
    (_, i) => new Date(reference.getFullYear(), reference.getMonth() - (n - 1 - i), 1)
  );
}

export function formatMonthShort(date: Date) {
  return date.toLocaleDateString("en-SG", { month: "short", year: "2-digit" });
}

export function isSameMonth(isoDate: string, reference: Date) {
  const d = new Date(`${isoDate}T00:00:00`);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth()
  );
}

export type DateRange = "month" | "3months" | "all" | "custom";

export interface CustomRange {
  from?: string;
  to?: string;
}

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "3months", label: "Last 3 months" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export function parseDateRange(value: string | string[] | undefined): DateRange {
  return value === "3months" || value === "all" || value === "custom"
    ? value
    : "month";
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseDateParam(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value !== "string") return undefined;
  return isIsoDateString(value) ? value : undefined;
}

export interface PageSearchParams {
  range?: string;
  from?: string | string[];
  to?: string | string[];
}

export function parseRangeSearchParams(searchParams: PageSearchParams) {
  const range = parseDateRange(searchParams.range);
  const custom: CustomRange = {
    from: parseDateParam(searchParams.from),
    to: parseDateParam(searchParams.to),
  };
  return { range, custom };
}

export function dateRangeLabel(range: DateRange, custom?: CustomRange) {
  if (range === "custom") {
    if (custom?.from && custom?.to) {
      return `${formatDate(custom.from)} – ${formatDate(custom.to)}`;
    }
    if (custom?.from) return `Since ${formatDate(custom.from)}`;
    if (custom?.to) return `Until ${formatDate(custom.to)}`;
    return "Custom range";
  }
  return DATE_RANGE_OPTIONS.find((o) => o.value === range)!.label;
}

export function isWithinDateRange(
  isoDate: string,
  range: DateRange,
  reference: Date = new Date(),
  custom?: CustomRange
) {
  if (range === "all") return true;

  if (range === "month") return isSameMonth(isoDate, reference);

  if (range === "3months") {
    const cutoff = new Date(reference.getFullYear(), reference.getMonth() - 2, 1);
    const d = new Date(`${isoDate}T00:00:00`);
    return d >= cutoff;
  }

  // custom
  const d = new Date(`${isoDate}T00:00:00`);
  if (custom?.from && d < new Date(`${custom.from}T00:00:00`)) return false;
  if (custom?.to && d > new Date(`${custom.to}T00:00:00`)) return false;
  return true;
}

export type Granularity = "daily" | "monthly" | "yearly";

export const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function parseGranularity(value: string | string[] | undefined): Granularity {
  return value === "daily" || value === "yearly" ? value : "monthly";
}

export function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000;
    return `$${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}
