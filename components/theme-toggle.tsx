"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

// The server can't know the real value (it lives in localStorage), but the
// beforeInteractive init script in app/layout.tsx has already applied the
// real .dark class before this ever paints — useSyncExternalStore
// reconciles any server/client mismatch silently on first paint instead of
// a visible flash or a hydration warning, so this default just needs to
// match the app's own default (dark).
function getServerSnapshot() {
  return true;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private browsing, etc.) — the toggle
      // still works for the current session, it just won't persist.
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", next ? "#0d0d0d" : "#f4f3ed");
    listeners.forEach((listener) => listener());
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
