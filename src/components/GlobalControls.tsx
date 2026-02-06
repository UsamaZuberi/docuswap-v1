import { Archive, Play, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GlobalControlsProps {
  onConvertAll: () => void;
  onDownloadAll: () => void;
  onClearAll: () => void;
  hasItems: boolean;
  hasOutputs: boolean;
  busy: boolean;
}

export function GlobalControls({ onConvertAll, onDownloadAll, onClearAll, hasItems, hasOutputs, busy }: GlobalControlsProps) {
  return (
    <Card className="border border-slate-300 bg-white shadow-xl shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-slate-900/50 dark:shadow-slate-950/60">
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Batch Controls</h3>
          <p className="text-xs text-slate-700 dark:text-slate-400">Run conversions or bundle downloads with one click.</p>
        </div>
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Button
            variant="secondary"
            className="bg-indigo-600/15 text-indigo-700 hover:bg-indigo-600/25 dark:bg-indigo-500/20 dark:text-indigo-100 dark:hover:bg-indigo-500/30"
            onClick={onConvertAll}
            disabled={!hasItems || busy}
          >
            <Play className="h-4 w-4" />
            Convert All
          </Button>
          <Button
            variant="ghost"
            className="border border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
            onClick={onDownloadAll}
            disabled={!hasOutputs}
          >
            <Archive className="h-4 w-4" />
            Download ZIP
          </Button>
          <Button
            variant="ghost"
            className="border border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
            onClick={onClearAll}
            disabled={!hasItems}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
