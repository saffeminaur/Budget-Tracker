import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/skeleton";
import { EntryListSkeleton } from "@/components/entry-list-skeleton";

// Approximates the shared shape of the account pages (maribank, dbs, hsbc,
// mendaki, receivables) so navigating to any of them shows structure
// immediately instead of a blank page while the server round-trip runs.
export function AccountPageSkeleton({
  hasHeader = true,
  statCards = 1,
  sections = 1,
}: {
  hasHeader?: boolean;
  statCards?: number;
  sections?: number;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      {hasHeader && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      )}

      <div className={statCards > 1 ? "grid grid-cols-3 gap-3" : ""}>
        {Array.from({ length: statCards }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-9 w-full" />
          <EntryListSkeleton />
        </div>
      ))}
    </div>
  );
}
