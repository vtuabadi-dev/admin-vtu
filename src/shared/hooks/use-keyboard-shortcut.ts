"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook that listens for keyboard shortcuts:
 * - Cmd+K (Mac) / Ctrl+K (Windows/Linux) → toggles open/close
 * - Escape → closes
 *
 * Returns { isOpen, open, close, toggle }
 */
export function useKeyboardShortcut() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => !prev);
        return;
      }

      // Escape closes
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}
