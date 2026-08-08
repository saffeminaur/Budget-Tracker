"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCOUNT_LABELS } from "@/lib/account-labels";

export interface ImportIssue {
  id: string;
  reason: string | null;
  account: "dbs" | "maribank" | null;
  rawSubject: string | null;
  rawBody: string | null;
  createdAt: string;
}

interface ImportIssuesCardProps {
  issues: ImportIssue[];
  dismissAction: (formData: FormData) => Promise<void>;
}

function formatDateTime(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Dashboard alert for /api/ingest-email failures (rejected senders, Gemini
// misparses, missing amounts, etc.) — see actions/email-ingest-log.ts and
// email_ingest_log in supabase/schema.sql. Same visibility rule as
// RemindersCard: nothing to review means nothing rendered at all, on both
// mobile and desktop — unlike reminders, an empty state here is just
// permanent dashboard clutter for something most visits won't touch.
export function ImportIssuesCard({ issues, dismissAction }: ImportIssuesCardProps) {
  if (issues.length === 0) return null;

  return (
    <Card className="h-full border-l-4 border-l-destructive bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-base">Import issues</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.map((issue) => (
          <div key={issue.id} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {issue.account && (
                    <Badge variant="secondary">{ACCOUNT_LABELS[issue.account].tag}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(issue.createdAt)}
                  </span>
                </div>
                <p className="text-sm font-medium text-destructive">
                  {issue.reason ?? "Unknown failure"}
                </p>
              </div>
              <form action={dismissAction} className="shrink-0">
                <input type="hidden" name="id" value={issue.id} />
                <Button type="submit" variant="outline" size="sm">
                  Dismiss
                </Button>
              </form>
            </div>

            {(issue.rawSubject || issue.rawBody) && (
              <div className="space-y-1 rounded-md bg-muted/50 p-2 text-xs">
                {issue.rawSubject && (
                  <p className="font-medium text-foreground">{issue.rawSubject}</p>
                )}
                {issue.rawBody && (
                  <p className="line-clamp-3 text-muted-foreground">{issue.rawBody}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
