"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteEntryButton() {
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      aria-label="Delete entry"
      onClick={(e) => {
        if (!confirm("Delete this entry?")) {
          e.preventDefault();
        }
      }}
    >
      <Trash2 className="size-4 text-muted-foreground" />
    </Button>
  );
}
