import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface NetWorthCardProps {
  netWorth: number;
  breakdown: { label: string; amount: number }[];
}

export function NetWorthCard({ netWorth, breakdown }: NetWorthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Net worth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-4xl font-semibold">{formatCurrency(netWorth)}</p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {breakdown.map(({ label, amount }) => (
            <li key={label} className="flex justify-between">
              <span>{label}</span>
              <span className="tabular-nums">
                {amount < 0 ? "−" : "+"}
                {formatCurrency(Math.abs(amount))}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
