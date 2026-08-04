import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface AccountSummaryCardProps {
  href: string;
  label: string;
  tag?: string;
  amount: number;
  icon: LucideIcon;
  sublabel?: string;
  // Dark ink card with a lime value — used to make one tile (Investments)
  // stand out from the rest of the row.
  highlight?: boolean;
}

export function AccountSummaryCard({
  href,
  label,
  tag,
  amount,
  icon: Icon,
  sublabel,
  highlight = false,
}: AccountSummaryCardProps) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          "h-full transition-colors",
          highlight
            ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
            : "hover:bg-accent/50"
        )}
      >
        <CardHeader>
          <CardTitle
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              highlight ? "text-background/70" : "text-muted-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
            {tag && (
              <Badge
                variant="outline"
                className={cn(
                  "h-4 px-1 text-[9px] font-normal",
                  highlight
                    ? "border-background/30 text-background/70"
                    : "text-muted-foreground"
                )}
              >
                {tag}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-xl font-semibold",
              highlight && "text-primary"
            )}
          >
            {formatCurrency(amount)}
          </p>
          {sublabel && (
            <p
              className={cn(
                "text-xs",
                highlight ? "text-background/70" : "text-muted-foreground"
              )}
            >
              {sublabel}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
