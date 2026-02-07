import JSZip from "jszip";

export type PdfImageFormat = "image/png" | "image/jpeg";

export interface PdfToImageOptions {
  format?: PdfImageFormat;
  quality?: number;
  scale?: number;
  batchSize?: number;
  onProgress?: (current: number, total: number) => void;
  onBatch?: (images: Blob[], pages: number[]) => void;
}

export interface PdfToImageResult {
  images: Blob[];
  filenames: string[];
}

type PdfWorkerRequest = {
  id: string;
  kind: "pdf-to-images";
  payload: {
    data: ArrayBuffer;
    format?: PdfImageFormat;
    quality?: number;
    scale?: number;
    batchSize?: number;
  };
};

type PdfWorkerProgress = {
  id: string;
  kind: "progress";
  page: number;
  total: number;
};

type PdfWorkerBatch = {
  id: string;
  kind: "batch";
  pages: number[];
  images: ArrayBuffer[];
};

type PdfWorkerDone = {
  id: string;
  kind: "done";
};

type PdfWorkerError = {
  id: string;
  kind: "error";
  error: string;
};

type PdfWorkerMessage = PdfWorkerProgress | PdfWorkerBatch | PdfWorkerDone | PdfWorkerError;

export async function convertPdfToImages(file: File, options: PdfToImageOptions = {}): Promise<PdfToImageResult> {
  const format = options.format ?? "image/png";
  const quality = format === "image/jpeg" ? options.quality ?? 0.92 : undefined;
  const arrayBuffer = await file.arrayBuffer();

  const { images, pageNumbers, totalPages } = await runPdfToImageWorker({
    data: arrayBuffer,
    format,
    quality,
    scale: options.scale ?? 2,
    batchSize: options.batchSize ?? 3,
    onProgress: options.onProgress,
    onBatch: options.onBatch,
  });

  const digits = Math.max(3, String(totalPages).length);
  const extension = format === "image/png" ? "png" : "jpg";
  const filenames = pageNumbers.map((page) => `page-${String(page).padStart(digits, "0")}.${extension}`);

  return { images, filenames };
}

export async function downloadPdfImagesZip(file: File, options: PdfToImageOptions = {}) {
  const { images, filenames } = await convertPdfToImages(file, options);
  const zip = new JSZip();

  images.forEach((image, index) => {
    zip.file(filenames[index], image);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${stripExtension(file.name)}-images.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}

type WorkerOptions = {
  data: ArrayBuffer;
  format: PdfImageFormat;
  quality?: number;
  scale: number;
  batchSize: number;
  onProgress?: (current: number, total: number) => void;
  onBatch?: (images: Blob[], pages: number[]) => void;
};

async function runPdfToImageWorker(options: WorkerOptions) {
  return new Promise<{ images: Blob[]; pageNumbers: number[]; totalPages: number }>((resolve, reject) => {
    const worker = new Worker(new URL("../workers/pdfConverter.worker.ts", import.meta.url));
    const id = crypto.randomUUID();

    const images: Blob[] = [];
    const pages: number[] = [];
    let totalPages = 0;

    const handleMessage = (event: MessageEvent<PdfWorkerMessage>) => {
      const data = event.data;
      if (data.id !== id) return;

      if (data.kind === "progress") {
        totalPages = data.total;
        options.onProgress?.(data.page, data.total);
        return;
      }

      if (data.kind === "batch") {
        const batchImages = data.images.map((buffer) => new Blob([buffer], { type: options.format }));
        images.push(...batchImages);
        pages.push(...data.pages);
        options.onBatch?.(batchImages, data.pages);
        return;
      }

      worker.removeEventListener("message", handleMessage);
      worker.terminate();

      if (data.kind === "done") {
        resolve({ images, pageNumbers: pages, totalPages });
        return;
      }

      reject(new Error(data.error ?? "PDF conversion failed."));
    };

    worker.addEventListener("message", handleMessage);

    const request: PdfWorkerRequest = {
      id,
      kind: "pdf-to-images",
      payload: {
        data: options.data,
        format: options.format,
        quality: options.quality,
        scale: options.scale,
        batchSize: options.batchSize,
      },
    };

    worker.postMessage(request, [options.data]);
  });
}

function stripExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(0, index) : name;
}
