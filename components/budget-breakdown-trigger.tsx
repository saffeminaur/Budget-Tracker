"use client";

import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BreakdownList, type BreakdownEntry } from "@/components/transaction-breakdown-panel";
import { cn } from "@/lib/utils";

interface BudgetBreakdownTriggerProps {
  title: string;
  subtitle?: string;
  entries: BreakdownEntry[];
  viewAllHref: string;
  children: ReactNode;
  triggerClassName?: string;
}

// Desktop: hovering opens the breakdown (base-ui's own hover-intent
// handling, with a close delay so moving the pointer onto the popup to
// click "View all" doesn't dismiss it first). Touch: tapping opens/closes
// it. Rendered through a portal with viewport-aware positioning, so it can
// never get clipped by an ancestor card's `overflow-hidden` regardless of
// where the trigger sits inside it.
export function BudgetBreakdownTrigger({
  title,
  subtitle,
  entries,
  viewAllHref,
  children,
  triggerClassName,
}: BudgetBreakdownTriggerProps) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={0}
        closeDelay={150}
        className={cn(triggerClassName)}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 text-xs">
        <BreakdownList
          title={title}
          subtitle={subtitle}
          entries={entries}
          viewAllHref={viewAllHref}
        />
      </PopoverContent>
    </Popover>
  );
}
