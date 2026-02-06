import { CheckCircle2, Files, HardDrive } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface BatchStatsProps {
  totalFiles: number;
  totalSizeLabel: string;
  completedFiles: number;
}

export function BatchStats({ totalFiles, totalSizeLabel, completedFiles }: BatchStatsProps) {
  return (
    <Card className="border border-slate-300 bg-white shadow-xl shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-slate-900/50 dark:shadow-slate-950/60">
      <CardContent className="grid gap-4 p-4 text-sm md:grid-cols-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
            <Files className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Files</p>
            <p className="font-semibold text-slate-900 dark:text-white">{totalFiles}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
            <HardDrive className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Total size</p>
            <p className="font-semibold text-slate-900 dark:text-white">{totalSizeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Completed</p>
            <p className="font-semibold text-slate-900 dark:text-white">{completedFiles}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
