import { AnimatePresence, motion } from "framer-motion";

import { ScrollArea, ScrollBar, ScrollAreaViewport } from "@/components/ui/scroll-area";
import type { ConversionItem } from "@/hooks/useConverter";
import { FileCard } from "@/components/FileCard";

interface BatchListProps {
  items: ConversionItem[];
  onConvert: (id: string) => void;
  onRetry: (id: string) => void;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
  onQualityChange: (id: string, value: number) => void;
}

export function BatchList({
  items,
  onConvert,
  onRetry,
  onDownload,
  onRemove,
  onQualityChange,
}: BatchListProps) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
        Drop a batch of files to see them listed here.
      </div>
    );
  }

  return (
    <ScrollArea className="h-105 rounded-xl border border-white/10 bg-white/5">
      <ScrollAreaViewport className="h-full p-4">
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <FileCard
                  item={item}
                  onConvert={onConvert}
                  onRetry={onRetry}
                  onDownload={onDownload}
                  onRemove={onRemove}
                  onQualityChange={onQualityChange}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollAreaViewport>
      <ScrollBar />
    </ScrollArea>
  );
}
