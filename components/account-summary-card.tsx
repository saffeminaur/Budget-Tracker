import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface AccountSummaryCardProps {
  href: string;
  label: string;
  amount: number;
  icon: LucideIcon;
  sublabel?: string;
}

export function AccountSummaryCard({
  href,
  label,
  amount,
  icon: Icon,
  sublabel,
}: AccountSummaryCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Icon className="size-4" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{formatCurrency(amount)}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
