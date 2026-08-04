"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/amount-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import {
  CATEGORIES,
  QUICK_ADD_TYPES,
  QUICK_ADD_TYPE_META,
  type QuickAddDraft,
  type QuickAddType,
} from "@/lib/types";

interface QuickAddEntryRowProps {
  draft: QuickAddDraft;
  onChange: (updated: QuickAddDraft) => void;
  onRemove: () => void;
}

export function QuickAddEntryRow({
  draft,
  onChange,
  onRemove,
}: QuickAddEntryRowProps) {
  const meta = QUICK_ADD_TYPE_META[draft.type];

  function update(patch: Partial<QuickAddDraft>) {
    onChange({ ...draft, ...patch });
  }

  function handleTypeChange(nextType: QuickAddType) {
    const nextMeta = QUICK_ADD_TYPE_META[nextType];
    update({
      type: nextType,
      category: nextMeta.needsCategory ? (draft.category ?? CATEGORIES[0]) : undefined,
      person: nextMeta.needsPerson ? (draft.person ?? "") : undefined,
      countsTowardBudget:
        nextType === "dbs_expense" ? (draft.countsTowardBudget ?? true) : undefined,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={draft.type}
            onValueChange={(v) => handleTypeChange(v as QuickAddType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_ADD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {QUICK_ADD_TYPE_META[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove entry"
          className="mt-5"
          onClick={onRemove}
        >
          <X className="size-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Amount (S$)</Label>
          <AmountInput
            value={draft.amount}
            onValueChange={(amount) => update({ amount })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={draft.entry_date}
            onChange={(e) => update({ entry_date: e.target.value })}
          />
        </div>
      </div>

      {meta.needsCategory && (
        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select
            value={draft.category}
            onValueChange={(v) => update({ category: v as QuickAddDraft["category"] })}
          >
            <SelectTrigger className="w-full">
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
      )}

      {draft.type === "dbs_expense" && (
        <div className="flex items-center justify-between gap-2 rounded-md border p-3">
          <Label htmlFor={`budget-${draft.id}`} className="text-sm font-normal">
            Count towards monthly budget
          </Label>
          <Switch
            id={`budget-${draft.id}`}
            checked={draft.countsTowardBudget ?? true}
            onCheckedChange={(checked) => update({ countsTowardBudget: checked })}
          />
        </div>
      )}

      {meta.needsPerson && (
        <div className="space-y-1">
          <Label className="text-xs">Person</Label>
          <Input
            type="text"
            value={draft.person ?? ""}
            onChange={(e) => update({ person: e.target.value })}
            placeholder="e.g. Dad, Jesslyn"
            maxLength={80}
          />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Note</Label>
        <Input
          type="text"
          value={draft.note}
          onChange={(e) => update({ note: e.target.value })}
          maxLength={200}
        />
      </div>
    </div>
  );
}
