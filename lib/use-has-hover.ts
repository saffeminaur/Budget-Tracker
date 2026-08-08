"use client";

import { useEffect, useState } from "react";

function getHasHover() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

// Distinguishes real mouse pointers (desktop, hover-driven UI) from touch
// (tap-driven UI) — used to switch interactions like the budget breakdown
// popovers between hover-to-open and tap-to-open.
export function useHasHover() {
  const [hasHover, setHasHover] = useState(getHasHover);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const handleChange = (e: MediaQueryListEvent) => setHasHover(e.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return hasHover;
}
