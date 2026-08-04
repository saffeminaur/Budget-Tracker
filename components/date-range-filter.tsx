import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cn,
  DATE_RANGE_OPTIONS,
  firstOfCurrentMonthIsoDate,
  todayIsoDate,
  type DateRange,
} from "@/lib/utils";

interface DateRangeFilterProps {
  current: DateRange;
  basePath: string;
  customFrom?: string;
  customTo?: string;
  // Other search params on the page (e.g. a chart's granularity) that must
  // survive switching the date range, rather than being wiped out.
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

// Plain links driving a `?range=` search param — the page reads it via
// searchParams and refetches/recomputes accordingly. The custom-range form
// is a native GET form for the same reason: no client JS needed anywhere.
export function DateRangeFilter({
  current,
  basePath,
  customFrom,
  customTo,
  preserveParams = {},
}: DateRangeFilterProps) {
  return (
    <div className="space-y-3">
      <div className="inline-flex flex-wrap gap-0.5 rounded-lg border p-0.5 text-sm">
        {DATE_RANGE_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={buildHref(basePath, {
              ...preserveParams,
              range: option.value === "month" ? undefined : option.value,
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

      {current === "custom" && (
        <form
          method="get"
          action={basePath}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="range" value="custom" />
          {Object.entries(preserveParams).map(
            ([key, value]) =>
              value && <input key={key} type="hidden" name={key} value={value} />
          )}
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">
              From
            </Label>
            <Input
              id="from"
              name="from"
              type="date"
              defaultValue={customFrom ?? firstOfCurrentMonthIsoDate()}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">
              To
            </Label>
            <Input
              id="to"
              name="to"
              type="date"
              defaultValue={customTo ?? todayIsoDate()}
            />
          </div>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      )}
    </div>
  );
}
