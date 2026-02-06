import { useCallback, useMemo, useState } from "react";
import JSZip from "jszip";

import { convertFile, getTargetFormats } from "@/utils/converters";
import type { TargetFormat } from "@/utils/converters/types";
import { formatBytes, withExtension } from "@/utils/format";
import { isSourceFormat, sourceFormats, targetsBySource, type SourceFormat } from "@/utils/converters/supported";

export type ConversionStatus = "idle" | "queued" | "processing" | "done" | "error";

export interface ConversionItem {
  id: string;
  file: File;
  sizeLabel: string;
  targetFormat: TargetFormat;
  progress: number;
  status: ConversionStatus;
  output?: Blob;
  error?: string;
  quality: number;
}

const DEFAULT_QUALITY = 0.9;
const MAX_FILES_PER_BATCH = 100;
const DEFAULT_SOURCE: SourceFormat = "png";
const DEFAULT_TARGET: TargetFormat = targetsBySource[DEFAULT_SOURCE][0];

export function useConverter() {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [sourceFormat, setSourceFormat] = useState<SourceFormat>(DEFAULT_SOURCE);
  const [targetFormat, setCurrentTargetFormat] = useState<TargetFormat>(DEFAULT_TARGET);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const addFiles = useCallback(
    (files: File[]) => {
      const limitedFiles = files.slice(0, MAX_FILES_PER_BATCH);
      const accepted: File[] = [];
      const rejected: File[] = [];

      limitedFiles.forEach((file) => {
        if (sourceFormat === "auto") {
          const targets = getTargetFormats(file);
          if (targets.length) {
            accepted.push(file);
          } else {
            rejected.push(file);
          }
          return;
        }

        const ext = file.name.toLowerCase().split(".").pop() ?? "";
        if (isSourceFormat(ext) && ext === sourceFormat) {
          accepted.push(file);
        } else {
          rejected.push(file);
        }
      });

      const warnings: string[] = [];
      if (files.length > MAX_FILES_PER_BATCH) {
        warnings.push(`Only the first ${MAX_FILES_PER_BATCH} files were added. Select up to ${MAX_FILES_PER_BATCH} at a time.`);
      }
      if (rejected.length) {
        warnings.push(
          sourceFormat === "auto"
            ? `Skipped ${rejected.length} unsupported file(s).`
            : `Skipped ${rejected.length} file(s) that do not match .${sourceFormat}.`
        );
      }
      setUploadWarning(warnings.length ? warnings.join(" ") : null);

      if (!accepted.length) return;

      setItems((prev) => {
        const next = accepted.map((file) => {
          const autoTarget = sourceFormat === "auto" ? getTargetFormats(file)[0] : undefined;
          return {
            id: crypto.randomUUID(),
            file,
            sizeLabel: formatBytes(file.size),
            targetFormat: autoTarget ?? targetFormat,
            progress: 0,
            status: "queued" as ConversionStatus,
            quality: DEFAULT_QUALITY,
          };
        });
        return [...prev, ...next];
      });
    },
    [sourceFormat, targetFormat]
  );

  const updateItem = useCallback((id: string, patch: Partial<ConversionItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const setTargetFormat = useCallback((id: string, target: TargetFormat) => {
    updateItem(id, { targetFormat: target });
  }, [updateItem]);

  const setGlobalSourceFormat = useCallback((value: SourceFormat) => {
    setSourceFormat(value);
    const nextTarget = value === "auto" ? DEFAULT_TARGET : targetsBySource[value][0];
    setCurrentTargetFormat(nextTarget);
    setItems([]);
    setUploadWarning(null);
  }, []);

  const setGlobalTargetFormat = useCallback((value: TargetFormat) => {
    setCurrentTargetFormat(value);
    setItems([]);
    setUploadWarning(null);
  }, []);

  const setQuality = useCallback((id: string, quality: number) => {
    updateItem(id, { quality });
  }, [updateItem]);

  const convertItem = useCallback(async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    updateItem(id, { status: "processing", progress: 5, error: undefined });

    try {
      const result = await convertFile(item.file, item.targetFormat, {
        quality: item.quality,
        useWorker: true,
        onProgress: (value) => updateItem(id, { progress: value }),
      });

      updateItem(id, {
        status: "done",
        progress: 100,
        output: result.blob,
      });
    } catch (error) {
      updateItem(id, {
        status: "error",
        error: error instanceof Error ? error.message : "Conversion failed.",
      });
    }
  }, [items, updateItem]);

  const convertAll = useCallback(async () => {
    for (const item of items) {
      if (item.status === "processing") continue;
      await convertItem(item.id);
    }
  }, [items, convertItem]);

  const retryItem = useCallback((id: string) => {
    updateItem(id, { status: "queued", progress: 0, error: undefined, output: undefined });
  }, [updateItem]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const downloadItem = useCallback((id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item?.output) return;

    const filename = withExtension(item.file.name, item.targetFormat);
    const url = URL.createObjectURL(item.output);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const downloadAll = useCallback(async () => {
    const zip = new JSZip();
    const completed = items.filter((item) => item.output);
    completed.forEach((item) => {
      if (!item.output) return;
      const filename = withExtension(item.file.name, item.targetFormat);
      zip.file(filename, item.output);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "docuswap-batch.zip";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const clearAll = useCallback(() => {
    setItems([]);
    setUploadWarning(null);
  }, []);

  const hasOutputs = useMemo(() => items.some((item) => item.output), [items]);
  const hasItems = items.length > 0;
  const busy = items.some((item) => item.status === "processing");

  return {
    items,
    addFiles,
    convertItem,
    convertAll,
    retryItem,
    removeItem,
    downloadItem,
    downloadAll,
    clearAll,
    setTargetFormat,
    setQuality,
    sourceFormat,
    targetFormat,
    setGlobalSourceFormat,
    setGlobalTargetFormat,
    uploadWarning,
    hasOutputs,
    hasItems,
    busy,
  };
}
