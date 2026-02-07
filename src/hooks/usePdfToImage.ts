import { useCallback, useEffect, useRef, useState } from "react";

import type { PdfImageFormat, PdfToImageOptions, PdfToImageResult } from "@/utils/pdfToImage";
import { convertPdfToImages } from "@/utils/pdfToImage";

type PdfStatus = "loading" | "rendering" | "complete";

type PdfProgress = {
  current: number;
  total: number;
};

export function usePdfToImage(defaults: { format?: PdfImageFormat; quality?: number; scale?: number } = {}) {
  const [status, setStatus] = useState<PdfStatus>("complete");
  const [progress, setProgress] = useState<PdfProgress>({ current: 0, total: 0 });
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);

  const reset = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
    setImages([]);
    setProgress({ current: 0, total: 0 });
    setStatus("complete");
    setError(null);
  }, []);

  useEffect(() => () => reset(), [reset]);

  const convert = useCallback(
    async (file: File, options: PdfToImageOptions = {}): Promise<PdfToImageResult> => {
      reset();
      setStatus("loading");

      try {
        const result = await convertPdfToImages(file, {
          format: options.format ?? defaults.format ?? "image/png",
          quality: options.quality ?? defaults.quality,
          scale: options.scale ?? defaults.scale,
          batchSize: options.batchSize,
          onProgress: (current, total) => {
            setProgress({ current, total });
            setStatus("rendering");
            options.onProgress?.(current, total);
          },
          onBatch: options.onBatch,
        });

        const urls = result.images.map((blob) => URL.createObjectURL(blob));
        urlsRef.current = urls;
        setImages(urls);
        setStatus("complete");
        return result;
      } catch (err) {
        setStatus("complete");
        setError(err instanceof Error ? err.message : "PDF conversion failed.");
        throw err;
      }
    },
    [defaults.format, defaults.quality, defaults.scale, reset]
  );

  return {
    status,
    progress,
    images,
    error,
    convert,
    reset,
  };
}
