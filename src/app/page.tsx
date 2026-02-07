"use client";

import { BatchList } from "@/components/BatchList";
import { DropZoneCard } from "@/components/DropZoneCard";
import { BatchStats } from "@/components/BatchStats";
import { Footer } from "@/components/Footer";
import { GlobalControls } from "@/components/GlobalControls";
import { Header } from "@/components/Header";
import { FormatSelector } from "@/components/FormatSelector";
import { useConverter } from "@/hooks/useConverter";
import { sourceFormats, targetsBySource, type SourceFormat } from "@/utils/converters/supported";
import { formatBytes } from "@/utils/format";

export default function Home() {
  const {
    items,
    addFiles,
    convertItem,
    convertAll,
    retryItem,
    removeItem,
    downloadItem,
    downloadAll,
    clearAll,
    setQuality,
    sourceFormat,
    autoDetectedSource,
    targetFormat,
    setGlobalSourceFormat,
    setGlobalTargetFormat,
    uploadWarning,
    hasItems,
    hasOutputs,
    busy,
  } = useConverter();

  const isAuto = sourceFormat === "auto";
  const effectiveSource = isAuto ? autoDetectedSource : sourceFormat;
  const targetOptions = effectiveSource ? targetsBySource[effectiveSource] : [];
  const hasTargets = targetOptions.length > 0;
  const totalFiles = items.length;
  const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);
  const completedFiles = items.filter((item) => item.status === "done").length;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-indigo-400/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-sky-400/15 blur-[120px]" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6 md:py-12">
        <Header />
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FormatSelector
              label="Upload Format"
              value={sourceFormat}
              options={sourceFormats}
              onValueChange={(value) => setGlobalSourceFormat(value as SourceFormat)}
            />
            <FormatSelector
              label="Convert To"
              value={targetFormat}
              options={targetOptions}
              onValueChange={(value) => setGlobalTargetFormat(value as typeof targetFormat)}
              disabled={!hasTargets || (isAuto && !hasItems)}
            />
          </div>
          {isAuto ? (
            <div className="rounded-lg border border-indigo-300 bg-indigo-100/70 px-4 py-2 text-xs font-medium text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
              Auto-detect locks to the first file type you add.
            </div>
          ) : null}
          {uploadWarning ? (
            <div className="rounded-lg border border-amber-300 bg-amber-100/80 px-4 py-2 text-xs font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {uploadWarning}
            </div>
          ) : null}
        </div>
        <DropZoneCard
          onFilesAdded={addFiles}
          sourceFormat={sourceFormat}
          targetFormat={targetFormat}
          hasTargets={hasTargets}
        />
        {totalFiles > 0 ? (
          <BatchStats
            totalFiles={totalFiles}
            totalSizeLabel={formatBytes(totalSize)}
            completedFiles={completedFiles}
          />
        ) : null}
        <GlobalControls
          onConvertAll={convertAll}
          onDownloadAll={downloadAll}
          onClearAll={clearAll}
          hasItems={hasItems}
          hasOutputs={hasOutputs}
          busy={busy}
        />
        <BatchList
          items={items}
          onConvert={convertItem}
          onRetry={retryItem}
          onDownload={downloadItem}
          onRemove={removeItem}
          onQualityChange={setQuality}
        />
        <Footer />
      </main>
    </div>
  );
}
