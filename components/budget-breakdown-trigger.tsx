"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  TransactionBreakdownPanel,
  type BreakdownEntry,
} from "@/components/transaction-breakdown-panel";
import { useHasHover } from "@/lib/use-has-hover";
import { cn } from "@/lib/utils";

interface BudgetBreakdownTriggerProps {
  title: string;
  subtitle?: string;
  entries: BreakdownEntry[];
  viewAllHref: string;
  children: ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
}

// Desktop: hover opens/closes the breakdown, with a short close delay so
// moving the pointer from the trigger onto the panel (e.g. to click "View
// all") doesn't dismiss it. Touch: tap toggles it, and a tap anywhere else
// closes it, since there's no hover-out to rely on.
export function BudgetBreakdownTrigger({
  title,
  subtitle,
  entries,
  viewAllHref,
  children,
  triggerClassName,
  panelClassName,
}: BudgetBreakdownTriggerProps) {
  const hasHover = useHasHover();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={hasHover ? openNow : undefined}
      onMouseLeave={hasHover ? scheduleClose : undefined}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn("cursor-pointer", triggerClassName)}
      >
        {children}
      </button>

      {open && (
        <TransactionBreakdownPanel
          title={title}
          subtitle={subtitle}
          entries={entries}
          viewAllHref={viewAllHref}
          onMouseEnter={hasHover ? openNow : undefined}
          onMouseLeave={hasHover ? scheduleClose : undefined}
          className={cn(
            "absolute top-full left-1/2 z-20 mt-2 w-64 -translate-x-1/2",
            panelClassName
          )}
        />
      )}
    </div>
  );
}
