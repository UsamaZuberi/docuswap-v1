import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

import { convertFile } from "@/utils/converters";
import type { TargetFormat } from "@/utils/converters/types";
import { formatBytes, getExtension, withExtension } from "@/utils/format";
import { isSourceFormat, targetsBySource, type SourceFormat } from "@/utils/converters/supported";

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
const DEFAULT_SOURCE: SourceFormat = "auto";
const DEFAULT_TARGET: TargetFormat = targetsBySource["png"][0];

export function useConverter() {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [sourceFormat, setSourceFormat] = useState<SourceFormat>(DEFAULT_SOURCE);
  const [targetFormat, setCurrentTargetFormat] = useState<TargetFormat>(DEFAULT_TARGET);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [autoDetectedSource, setAutoDetectedSource] = useState<SourceFormat | null>(null);
  const itemsRef = useRef<ConversionItem[]>([]);
  const autoDetectedSourceRef = useRef<SourceFormat | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    autoDetectedSourceRef.current = autoDetectedSource;
  }, [autoDetectedSource]);

  const normalizeExtension = useCallback((ext: string) => {
    if (ext === "jpg") return "jpeg";
    if (ext === "markdown") return "md";
    return ext;
  }, []);

  const detectSourceFromFile = useCallback((file: File) => {
    const ext = normalizeExtension(getExtension(file.name));
    if (!isSourceFormat(ext) || ext === "auto") return null;
    if (targetsBySource[ext].length === 0) return null;
    return ext;
  }, [normalizeExtension]);

  const addFiles = useCallback(
    (files: File[]) => {
      if (sourceFormat !== "auto" && targetsBySource[sourceFormat].length === 0) {
        setUploadWarning(`No target formats available for .${sourceFormat}.`);
        return;
      }
      const detectedLimit = sourceFormat === "auto"
        ? undefined
        : (sourceFormat === "docx" || sourceFormat === "pptx" ? 5 : MAX_FILES_PER_BATCH);
      const limitedFiles = files.slice(0, detectedLimit ?? MAX_FILES_PER_BATCH);
      const accepted: File[] = [];
      const rejected: File[] = [];

      const hasExistingItems = itemsRef.current.length > 0;
      const firstSupported = limitedFiles
        .map((file) => detectSourceFromFile(file))
        .find((value): value is SourceFormat => Boolean(value)) ?? null;
      let detectedSource = sourceFormat === "auto" && !hasExistingItems
        ? firstSupported
        : autoDetectedSourceRef.current;
      if (sourceFormat === "auto" && !hasExistingItems && detectedSource !== firstSupported) {
        detectedSource = firstSupported;
      }

      const limit = sourceFormat === "auto"
        ? (detectedSource === "docx" || detectedSource === "pptx" ? 5 : MAX_FILES_PER_BATCH)
        : (sourceFormat === "docx" || sourceFormat === "pptx" ? 5 : MAX_FILES_PER_BATCH);
      const limitedByType = files.slice(0, limit);

      limitedByType.forEach((file) => {
        if (sourceFormat === "auto") {
          const ext = normalizeExtension(getExtension(file.name));
          if (detectedSource && ext === detectedSource) {
            accepted.push(file);
          } else {
            rejected.push(file);
          }
          return;
        }

        const ext = normalizeExtension(getExtension(file.name));
        if (isSourceFormat(ext) && ext === sourceFormat) {
          accepted.push(file);
        } else {
          rejected.push(file);
        }
      });

      const warnings: string[] = [];
      if (files.length > limit) {
        warnings.push(`Only the first ${limit} files were added. Select up to ${limit} at a time.`);
      }
      if (rejected.length) {
        warnings.push(
          sourceFormat === "auto"
            ? detectedSource
              ? `Keeping .${detectedSource} files only. Skipped ${rejected.length} other file(s).`
              : `Skipped ${rejected.length} unsupported file(s).`
            : `Skipped ${rejected.length} file(s) that do not match .${sourceFormat}.`
        );
      }
      setUploadWarning(warnings.length ? warnings.join(" ") : null);

      if (!accepted.length) return;

      if (sourceFormat === "auto" && detectedSource && detectedSource !== autoDetectedSource) {
        setAutoDetectedSource(detectedSource);
        const defaultTarget = targetsBySource[detectedSource][0];
        if (defaultTarget && !targetsBySource[detectedSource].includes(targetFormat)) {
          setCurrentTargetFormat(defaultTarget);
        }
      }

      setItems((prev) => {
        const next = accepted.map((file) => {
          const autoTarget = sourceFormat === "auto" && detectedSource
            ? targetsBySource[detectedSource][0]
            : undefined;
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
    [detectSourceFromFile, normalizeExtension, sourceFormat, targetFormat]
  );

  const updateItem = useCallback((id: string, patch: Partial<ConversionItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const setTargetFormat = useCallback((id: string, target: TargetFormat) => {
    updateItem(id, { targetFormat: target });
  }, [updateItem]);

  const setGlobalSourceFormat = useCallback((value: SourceFormat) => {
    setSourceFormat(value);
    setAutoDetectedSource(null);
    const nextTarget = value === "auto"
      ? DEFAULT_TARGET
      : (targetsBySource[value][0] ?? DEFAULT_TARGET);
    setCurrentTargetFormat(nextTarget);
    setItems([]);
    if (value !== "auto" && targetsBySource[value].length === 0) {
      setUploadWarning(`No target formats available for .${value}.`);
    } else {
      setUploadWarning(null);
    }
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
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) {
        setUploadWarning(null);
        setAutoDetectedSource(null);
        autoDetectedSourceRef.current = null;
        itemsRef.current = [];
        if (sourceFormat === "auto") {
          setCurrentTargetFormat(DEFAULT_TARGET);
        }
      }
      return next;
    });
  }, [sourceFormat]);

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
    itemsRef.current = [];
    setUploadWarning(null);
    setAutoDetectedSource(null);
    autoDetectedSourceRef.current = null;
    if (sourceFormat === "auto") {
      setCurrentTargetFormat(DEFAULT_TARGET);
    }
  }, [sourceFormat]);

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
    autoDetectedSource,
    targetFormat,
    setGlobalSourceFormat,
    setGlobalTargetFormat,
    uploadWarning,
    hasOutputs,
    hasItems,
    busy,
  };
}
