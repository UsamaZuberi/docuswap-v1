/// <reference lib="webworker" />

const CMAP_URL = "/pdfjs/cmaps/";
const STANDARD_FONT_URL = "/pdfjs/standard_fonts/";


type PdfImageFormat = "image/png" | "image/jpeg";

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

type PdfJsModule = {
  getDocument: unknown;
  GlobalWorkerOptions: { workerSrc: string };
};

type PdfRenderTask = {
  promise: Promise<unknown>;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (context: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => PdfRenderTask;
  cleanup: () => void;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  cleanup: () => void;
};

type PdfDocumentLoadingTask = {
  promise: Promise<PdfDocument>;
};

let pdfjsReady: Promise<PdfJsModule> | null = null;

async function loadPdfJs() {
  if (!pdfjsReady) {
    const globalObj = globalThis as { document?: unknown };
    if (typeof globalObj.document === "undefined") {
      const base = typeof self !== "undefined" && "location" in self ? self.location?.href ?? "" : "";
      globalObj.document = {
        baseURI: base,
        createElement: () => ({}),
      };
    }
    pdfjsReady = import("pdfjs-dist/legacy/build/pdf.mjs") as unknown as Promise<PdfJsModule>;
  }

  const pdfjs = await pdfjsReady;
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  return pdfjs;
}

self.onmessage = async (event: MessageEvent<PdfWorkerRequest>) => {
  const { id, kind, payload } = event.data;
  if (kind !== "pdf-to-images") {
    const response: PdfWorkerError = { id, kind: "error", error: "Unsupported worker task." };
    self.postMessage(response);
    return;
  }

  try {
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("OffscreenCanvas is not supported in this environment.");
    }

    const format = payload.format ?? "image/png";
    const quality = format === "image/jpeg" ? payload.quality ?? 0.92 : undefined;
    const scale = payload.scale ?? 2;
    const batchSize = payload.batchSize ?? 3;

    const { getDocument } = await loadPdfJs();
    const pdf = await (getDocument as unknown as (source: unknown) => PdfDocumentLoadingTask)({
      data: payload.data,
      cMapUrl: CMAP_URL,
      cMapPacked: true,
      standardFontDataUrl: STANDARD_FONT_URL,
      disableFontFace: true,
      useSystemFonts: true,
    }).promise;
    const total = pdf.numPages;

    let batchBuffers: ArrayBuffer[] = [];
    let batchPages: number[] = [];

    for (let pageIndex = 1; pageIndex <= total; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const viewport = page.getViewport({ scale });
      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Failed to create 2D context for PDF page.");
      }

      const renderContext = {
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      } as Parameters<typeof page.render>[0];
      await page.render(renderContext).promise;
      page.cleanup();

      const blob = await canvas.convertToBlob({ type: format, quality });
      const buffer = await blob.arrayBuffer();
      batchBuffers.push(buffer);
      batchPages.push(pageIndex);

      const progress: PdfWorkerProgress = { id, kind: "progress", page: pageIndex, total };
      self.postMessage(progress);

      const isBatchFull = batchBuffers.length >= batchSize;
      const isLastPage = pageIndex === total;
      if (isBatchFull || isLastPage) {
        const batch: PdfWorkerBatch = {
          id,
          kind: "batch",
          pages: batchPages,
          images: batchBuffers,
        };
        self.postMessage(batch, batchBuffers);
        batchBuffers = [];
        batchPages = [];
      }
    }

    pdf.cleanup();
    const done: PdfWorkerDone = { id, kind: "done" };
    self.postMessage(done);
  } catch (error) {
    const response: PdfWorkerError = {
      id,
      kind: "error",
      error: error instanceof Error ? error.message : "PDF conversion failed.",
    };
    self.postMessage(response);
  }
};
