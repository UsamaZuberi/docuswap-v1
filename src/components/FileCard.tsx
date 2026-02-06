import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Download, RefreshCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import type { ConversionItem } from "@/hooks/useConverter";

interface FileCardProps {
  item: ConversionItem;
  onConvert: (id: string) => void;
  onRetry: (id: string) => void;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
  onQualityChange: (id: string, value: number) => void;
}

export function FileCard({
  item,
  onConvert,
  onRetry,
  onDownload,
  onRemove,
  onQualityChange,
}: FileCardProps) {
  const statusBadge = statusStyles[item.status];
  const isImage = item.file.type.startsWith("image/") || item.file.name.toLowerCase().match(/\.(png|jpe?g|webp|heic|svg)$/);

  return (
    <Card className="border border-white/10 bg-slate-900/60 transition-shadow hover:shadow-lg hover:shadow-slate-950/40">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{item.file.name}</p>
            <p className="text-xs text-slate-400">{item.sizeLabel}</p>
          </div>
          <Badge variant={statusBadge.variant} className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
            Convert to {item.targetFormat.toUpperCase()}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30"
              onClick={() => onConvert(item.id)}
              disabled={item.status === "processing"}
            >
              Convert
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {item.status === "error" ? (
              <Button size="sm" variant="ghost" onClick={() => onRetry(item.id)}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            ) : null}
            {item.output ? (
              <Button size="sm" variant="ghost" onClick={() => onDownload(item.id)}>
                <Download className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {isImage ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Quality</span>
            <Input
              type="range"
              min={0.4}
              max={1}
              step={0.05}
              value={item.quality}
              onChange={(event) => onQualityChange(item.id, Number(event.target.value))}
            />
            <span className="text-xs text-slate-300">{Math.round(item.quality * 100)}%</span>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Progress</span>
            <span>{Math.round(item.progress)}%</span>
          </div>
          <div className="relative">
            <Progress value={item.progress} className="h-2 bg-slate-800" />
            <motion.div
              className="absolute left-0 top-0 h-2 rounded-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              transition={{ ease: "easeOut", duration: 0.4 }}
            />
          </div>
        </div>

        {item.error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            {item.error}
          </div>
        ) : null}

        {item.status === "done" ? (
          <div className="flex items-center gap-2 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Ready to download
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

const statusStyles: Record<
  ConversionItem["status"],
  { label: string; variant: "default" | "secondary" | "outline"; className?: string }
> = {
  idle: { label: "Idle", variant: "outline", className: "border-white/20 text-slate-300" },
  queued: { label: "Queued", variant: "secondary", className: "bg-white/10 text-slate-200" },
  processing: { label: "Processing", variant: "default", className: "bg-indigo-500/30 text-indigo-100" },
  done: { label: "Complete", variant: "default", className: "bg-emerald-500/30 text-emerald-100" },
  error: { label: "Error", variant: "default", className: "bg-red-500/30 text-red-100" },
};
