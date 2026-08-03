import { createClient, requireUser } from "@/lib/supabase/server";
import {
  addReceivableEntry,
  deleteReceivableEntry,
} from "@/actions/receivables";
import { EntryForm } from "@/components/entry-form";
import { EntryList } from "@/components/entry-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, sum } from "@/lib/utils";
import type { ReceivableEntry } from "@/lib/types";

export default async function ReceivablesPage() {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("receivables_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = (data ?? []) as ReceivableEntry[];
  const total = sum(entries.map((e) => e.amount));

  const byPerson = new Map<string, number>();
  for (const entry of entries) {
    byPerson.set(entry.person, (byPerson.get(entry.person) ?? 0) + entry.amount);
  }
  const people = [...byPerson.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total owed to you
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{formatCurrency(total)}</p>
          <p className="text-xs text-muted-foreground">
            Counted in your net worth as money owed to you.
          </p>
        </CardContent>
      </Card>

      {people.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By person</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {people.map(([person, amount]) => (
                <li
                  key={person}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium">{person}</span>
                  <span
                    className={
                      amount < 0
                        ? "text-destructive"
                        : "text-emerald-600 dark:text-emerald-500"
                    }
                  >
                    {formatCurrency(amount)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Entries</h2>
        <EntryForm
          action={addReceivableEntry}
          triggerLabel="Add entry"
          dialogTitle="Add receivable entry"
          positiveLabel="I paid for them"
          negativeLabel="They paid me back"
          extraField={
            <div className="space-y-2">
              <Label htmlFor="person">Person</Label>
              <Input
                id="person"
                name="person"
                type="text"
                placeholder="e.g. Dad, Jesslyn"
                maxLength={80}
                required
              />
            </div>
          }
        />
      </div>

      <Card>
        <CardContent className="px-4">
          <EntryList
            entries={entries.map((e) => ({ ...e, badge: e.person }))}
            deleteAction={deleteReceivableEntry}
          />
        </CardContent>
      </Card>
    </div>
  );
}
