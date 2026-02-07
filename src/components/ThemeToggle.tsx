"use client";

import { Moon, Sun } from "lucide-react";
import { useMemo } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = useMemo(() => resolvedTheme === "dark", [resolvedTheme]);
  if (!resolvedTheme) return null;
  const Icon = isDark ? Sun : Moon;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="border border-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
