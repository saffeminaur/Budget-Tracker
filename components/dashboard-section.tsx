"use client";

import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";

interface DashboardSectionProps {
  title: string;
  summary: string;
  children: ReactNode;
}

// Mobile-only progressive-disclosure row: header + one summary line when
// collapsed, full content when tapped open. Always starts collapsed —
// uncontrolled with no persistence, on purpose (simplicity over
// remembering state across visits).
export function DashboardSection({ title, summary, children }: DashboardSectionProps) {
  return (
    <Collapsible>
      <Card className="py-0">
        <CollapsibleTrigger className="group/trigger flex items-center justify-between gap-2 px-4 py-3">
          <span className="min-w-0">
            <span className="font-medium">{title}</span>
            <span className="text-muted-foreground"> · {summary}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]/trigger:rotate-180" />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <div className="px-4 pb-4">{children}</div>
        </CollapsiblePanel>
      </Card>
    </Collapsible>
  );
}
