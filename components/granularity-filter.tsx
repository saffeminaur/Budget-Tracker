import Link from "next/link";
import { cn, GRANULARITY_OPTIONS, type Granularity } from "@/lib/utils";

interface GranularityFilterProps {
  current: Granularity;
  basePath: string;
  // Other search params on the page (e.g. the entry-list date range) that
  // must survive switching granularity, rather than being wiped out.
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

export function GranularityFilter({
  current,
  basePath,
  preserveParams = {},
}: GranularityFilterProps) {
  return (
    <div className="inline-flex rounded-lg border p-0.5 text-sm">
      {GRANULARITY_OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={buildHref(basePath, {
            ...preserveParams,
            granularity: option.value === "monthly" ? undefined : option.value,
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
