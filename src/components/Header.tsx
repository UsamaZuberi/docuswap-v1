import { FileScan, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";

const ThemeToggle = dynamic(
  () => import("@/components/ThemeToggle").then((mod) => mod.ThemeToggle),
  { ssr: false }
);

export function Header() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-200">
          <FileScan className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">
            DocuSwap
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 md:text-base">
            Client-side conversion for images, data, and documents.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 self-start md:self-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/70 px-4 py-2 text-xs text-slate-600 shadow-sm dark:bg-white/5 dark:text-slate-300">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          Web Worker powered pipeline
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
