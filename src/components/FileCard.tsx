import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  RefreshCcw,
  Trash2,
} from "lucide-react";

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
  const isImage =
    item.file.type.startsWith("image/") ||
    item.file.name.toLowerCase().match(/\.(png|jpe?g|webp|svg)$/);
  const isPdf =
    item.file.type === "application/pdf" ||
    item.file.name.toLowerCase().endsWith(".pdf");
  const isPdfToImages = isPdf && (item.targetFormat === "png" || item.targetFormat === "jpeg");
  const targetLabel = isPdfToImages
    ? `${item.targetFormat.toUpperCase()} (ZIP)`
    : item.targetFormat.toUpperCase();
  const allowQuality = isImage || (isPdf && item.targetFormat === "jpeg");

  return (
    <Card className="border border-slate-300 bg-white transition-shadow hover:shadow-xl hover:shadow-slate-200/70 dark:border-slate-700/60 dark:bg-slate-900 dark:hover:shadow-slate-950/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {item.file.name}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {item.sizeLabel}
            </p>
          </div>
          <Badge
            variant={statusBadge.variant}
            className={statusBadge.className}
          >
            {statusBadge.label}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
            Convert to {targetLabel}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-indigo-600/15 text-indigo-700 hover:bg-indigo-600/25 dark:bg-indigo-500/20 dark:text-indigo-100 dark:hover:bg-indigo-500/30"
              onClick={() => onConvert(item.id)}
              disabled={item.status === "processing"}
            >
              Convert
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {item.status === "error" ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                onClick={() => onRetry(item.id)}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            ) : null}
            {item.output ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                onClick={() => onDownload(item.id)}
              >
                <Download className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {allowQuality ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Quality
            </span>
            <Input
              type="range"
              min={0.4}
              max={1}
              step={0.05}
              value={item.quality}
              className="quality-slider"
              style={
                {
                  "--slider-fill": `${Math.round(((item.quality - 0.4) / 0.6) * 100)}%`,
                } as React.CSSProperties
              }
              onChange={(event) =>
                onQualityChange(item.id, Number(event.target.value))
              }
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {Math.round(item.quality * 100)}%
            </span>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Progress</span>
            <span>{Math.round(item.progress)}%</span>
          </div>
          <div className="progress-track">
            <Progress value={item.progress} className="progress-bar" />
            <motion.div
              className="progress-indicator"
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              transition={{ ease: "easeOut", duration: 0.4 }}
            />
            {item.status === "processing" ? (
              <div className="progress-shimmer absolute inset-0 h-2" />
            ) : null}
          </div>
        </div>

        {item.error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            {item.error}
          </div>
        ) : null}

        {item.status === "done" ? (
          <div className="relative flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Ready to download
            <ConfettiBurst />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConfettiBurst() {
  const dots = [
    { x: -12, y: -10, delay: 0 },
    { x: 6, y: -14, delay: 0.05 },
    { x: 14, y: -6, delay: 0.1 },
    { x: -6, y: -16, delay: 0.12 },
    { x: 10, y: -18, delay: 0.15 },
  ];

  return (
    <div className="pointer-events-none absolute right-0 top-0">
      {dots.map((dot, index) => (
        <motion.span
          key={index}
          className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0], x: dot.x, y: dot.y, scale: 1 }}
          transition={{ duration: 0.6, delay: dot.delay }}
        />
      ))}
    </div>
  );
}

const statusStyles: Record<
  ConversionItem["status"],
  {
    label: string;
    variant: "default" | "secondary" | "outline";
    className?: string;
  }
> = {
  idle: {
    label: "Idle",
    variant: "outline",
    className:
      "border-slate-300 text-slate-700 dark:border-white/20 dark:text-slate-300",
  },
  queued: {
    label: "Queued",
    variant: "secondary",
    className:
      "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-200",
  },
  processing: {
    label: "Processing",
    variant: "default",
    className:
      "bg-indigo-500/20 text-indigo-800 dark:bg-indigo-500/30 dark:text-indigo-100",
  },
  done: {
    label: "Complete",
    variant: "default",
    className:
      "bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-100",
  },
  error: {
    label: "Error",
    variant: "default",
    className:
      "bg-red-500/20 text-red-800 dark:bg-red-500/30 dark:text-red-100",
  },
};
