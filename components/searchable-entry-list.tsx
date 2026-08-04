"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EntryList, type EntryListItem, type EntryListProps } from "@/components/entry-list";

type SearchField = "note" | "badge";

interface SearchableEntryListProps extends Omit<EntryListProps, "entries"> {
  entries: EntryListItem[];
  // "badge" holds the category (DBS) or person (Receivables) depending on
  // the page — only Receivables opts into matching it.
  searchFields?: SearchField[];
  searchPlaceholder?: string;
}

export function SearchableEntryList({
  entries,
  searchFields = ["note"],
  searchPlaceholder = "Search notes…",
  emptyMessage,
  ...entryListProps
}: SearchableEntryListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      searchFields.some((field) => {
        const value = field === "note" ? entry.note : entry.badge;
        return value?.toLowerCase().includes(q);
      })
    );
  }, [entries, query, searchFields]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>
      <EntryList
        entries={filtered}
        emptyMessage={
          isSearching ? "No entries match your search." : emptyMessage
        }
        {...entryListProps}
      />
    </div>
  );
}
