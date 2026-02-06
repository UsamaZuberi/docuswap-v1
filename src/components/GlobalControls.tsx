import { Archive, Play, Trash2 } from "lucide-react";

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
    <Card className="border border-white/10 bg-white/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Batch Controls</h3>
          <p className="text-xs text-slate-400">Run conversions or bundle downloads with one click.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30"
            onClick={onConvertAll}
            disabled={!hasItems || busy}
          >
            <Play className="h-4 w-4" />
            Convert All
          </Button>
          <Button
            variant="ghost"
            className="border border-white/10 text-white hover:bg-white/10"
            onClick={onDownloadAll}
            disabled={!hasOutputs}
          >
            <Archive className="h-4 w-4" />
            Download ZIP
          </Button>
          <Button
            variant="ghost"
            className="border border-white/10 text-white hover:bg-white/10"
            onClick={onClearAll}
            disabled={!hasItems}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
