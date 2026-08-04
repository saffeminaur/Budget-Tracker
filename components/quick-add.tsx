"use client";

import { useState } from "react";
import { parseQuickAdd, saveQuickAddEntries } from "@/actions/quick-add";
import { QuickAddEntryRow } from "@/components/quick-add-entry-row";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import type { QuickAddDraft } from "@/lib/types";

type Phase = "input" | "reviewing";

export function QuickAdd() {
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<QuickAddDraft[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleParse() {
    setError(null);
    setSuccessMessage(null);
    setParsing(true);
    try {
      const result = await parseQuickAdd(text);
      if (result.ok) {
        setDrafts(result.entries);
        setPhase("reviewing");
      } else {
        setError(result.error);
      }
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveQuickAddEntries(drafts);
      if (result.errors.length > 0) {
        setError(
          result.count > 0
            ? `Saved ${result.count}, but ${result.errors.length} failed: ${result.errors[0]}`
            : `Couldn't save: ${result.errors[0]}`
        );
        return; // stay in reviewing phase — nothing is lost
      }
      setSuccessMessage(
        `Added ${result.count} ${result.count === 1 ? "entry" : "entries"}.`
      );
      setDrafts([]);
      setText("");
      setPhase("input");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDrafts([]);
    setPhase("input");
  }

  function updateDraft(updated: QuickAddDraft) {
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4" />
          Femina AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {phase === "input" && (
          <>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g. "spent $5 on lunch, got my salary $2000"'
              rows={2}
              disabled={parsing}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {successMessage && (
              <p className="text-sm text-success">
                {successMessage}
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={parsing || !text.trim()}
              onClick={handleParse}
            >
              {parsing ? "Parsing…" : "Parse with AI"}
            </Button>
          </>
        )}

        {phase === "reviewing" && (
          <>
            <p className="text-xs text-muted-foreground">
              Review what was parsed — edit any field, remove anything wrong,
              then confirm. Nothing is saved yet.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              {drafts.map((draft) => (
                <QuickAddEntryRow
                  key={draft.id}
                  draft={draft}
                  onChange={updateDraft}
                  onRemove={() => removeDraft(draft.id)}
                />
              ))}
              {drafts.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nothing left to save.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleConfirm}
                disabled={saving || drafts.length === 0}
              >
                {saving
                  ? "Saving…"
                  : `Confirm & save${drafts.length > 1 ? ` (${drafts.length})` : ""}`}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
