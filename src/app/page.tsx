"use client";

import { BatchList } from "@/components/BatchList";
import { DropZoneCard } from "@/components/DropZoneCard";
import { Footer } from "@/components/Footer";
import { GlobalControls } from "@/components/GlobalControls";
import { Header } from "@/components/Header";
import { FormatSelector } from "@/components/FormatSelector";
import { useConverter } from "@/hooks/useConverter";
import { sourceFormats, targetsBySource, type SourceFormat } from "@/utils/converters/supported";

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
    targetFormat,
    setGlobalSourceFormat,
    setGlobalTargetFormat,
    uploadWarning,
    hasItems,
    hasOutputs,
    busy,
  } = useConverter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-sky-500/10 blur-[120px]" />
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
              options={targetsBySource[sourceFormat]}
              onValueChange={(value) => setGlobalTargetFormat(value as typeof targetFormat)}
            />
          </div>
          {uploadWarning ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
              {uploadWarning}
            </div>
          ) : null}
        </div>
        <DropZoneCard
          onFilesAdded={addFiles}
          sourceFormat={sourceFormat}
          targetFormat={targetFormat}
        />
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
