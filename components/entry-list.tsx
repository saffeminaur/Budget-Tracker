import { DeleteEntryButton } from "@/components/delete-entry-button";
import { EditEntryButton } from "@/components/edit-entry-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORIES } from "@/lib/types";

export interface EntryListItem {
  id: string;
  amount: number;
  entry_date: string;
  note?: string | null;
  badge?: string;
  // DBS expenses only — undefined for every other entry type/kind.
  countsTowardBudget?: boolean;
}

type EditExtraField = "category" | "person" | "none";

export interface EntryListProps {
  entries: EntryListItem[];
  deleteAction: (formData: FormData) => Promise<void>;
  updateAction?: (formData: FormData) => Promise<void>;
  emptyMessage?: string;
  showSign?: boolean;
  editDialogTitle?: string;
  editPositiveLabel?: string;
  editNegativeLabel?: string;
  editAmountLabel?: string;
  editShowNote?: boolean;
  editExtraField?: EditExtraField;
  editExtraFieldForSign?: 1 | -1;
}

function buildExtraField(entry: EntryListItem, type: EditExtraField) {
  if (type === "category") {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`category-${entry.id}`}>Category</Label>
          <Select name="category" defaultValue={entry.badge}>
            <SelectTrigger id={`category-${entry.id}`} className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border p-3">
          <Label htmlFor={`counts-${entry.id}`} className="text-sm font-normal">
            Count towards monthly budget
          </Label>
          <Switch
            id={`counts-${entry.id}`}
            name="counts_toward_budget"
            defaultChecked={entry.countsTowardBudget ?? true}
          />
        </div>
      </>
    );
  }

  if (type === "person") {
    return (
      <div className="space-y-2">
        <Label htmlFor={`person-${entry.id}`}>Person</Label>
        <Input
          id={`person-${entry.id}`}
          name="person"
          type="text"
          defaultValue={entry.badge}
          maxLength={80}
          required
        />
      </div>
    );
  }

  return undefined;
}

export function EntryList({
  entries,
  deleteAction,
  updateAction,
  emptyMessage = "No entries yet.",
  showSign = true,
  editDialogTitle = "Edit entry",
  editPositiveLabel,
  editNegativeLabel,
  editAmountLabel,
  editShowNote = true,
  editExtraField = "none",
  editExtraFieldForSign,
}: EntryListProps) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
          <div className="min-w-0 flex-1 basis-full sm:basis-0">
            <div className="flex items-start gap-2">
              {entry.badge && (
                <span className="mt-0.5 shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {entry.badge}
                </span>
              )}
              {entry.note && (
                <span className="min-w-0 flex-1 text-sm break-words">{entry.note}</span>
              )}
            </div>
            {entry.countsTowardBudget === false && (
              <span className="block text-[10px] text-muted-foreground">
                Excluded from budget
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(entry.entry_date)}
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3 sm:ml-0">
            <span
              className={
                showSign
                  ? entry.amount < 0
                    ? "font-medium text-destructive"
                    : "font-medium text-success"
                  : "font-medium"
              }
            >
              {showSign && entry.amount > 0 ? "+" : ""}
              {formatCurrency(entry.amount)}
            </span>
            {updateAction && (
              <EditEntryButton
                action={updateAction}
                entryId={entry.id}
                dialogTitle={editDialogTitle}
                amount={entry.amount}
                note={entry.note}
                entryDate={entry.entry_date}
                signed={showSign}
                positiveLabel={editPositiveLabel}
                negativeLabel={editNegativeLabel}
                amountLabel={editAmountLabel}
                showNote={editShowNote}
                extraField={buildExtraField(entry, editExtraField)}
                extraFieldForSign={editExtraFieldForSign}
              />
            )}
            <form action={deleteAction}>
              <input type="hidden" name="id" value={entry.id} />
              <DeleteEntryButton />
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
