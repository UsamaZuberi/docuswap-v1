export interface PptxWorkerRequest {
  id: string;
  kind: "pptx-to-pdf";
  payload: {
    data: ArrayBuffer;
  };
}

export interface PptxWorkerProgress {
  id: string;
  kind: "progress";
  phase: "parsing" | "rendering";
  value: number;
}

export interface PptxWorkerResponse {
  id: string;
  ok: boolean;
  output?: ArrayBuffer;
  error?: string;
}

export function runPptxToPdfWorker(options: {
  data: ArrayBuffer;
  onProgress?: (value: number) => void;
}) {
  return new Promise<Blob>((resolve, reject) => {
    const worker = new Worker(new URL("../workers/pptxWorker.ts", import.meta.url));
    const id = crypto.randomUUID();

    const handleMessage = (event: MessageEvent<PptxWorkerProgress | PptxWorkerResponse>) => {
      const data = event.data;
      if (data.id !== id) return;
      if ("kind" in data && data.kind === "progress") {
        options.onProgress?.(data.value);
        return;
      }

      const response = data as PptxWorkerResponse;
      worker.removeEventListener("message", handleMessage);
      worker.terminate();

      if (response.ok && response.output) {
        resolve(new Blob([response.output], { type: "application/pdf" }));
      } else {
        reject(new Error(response.error ?? "PPTX conversion failed."));
      }
    };

    worker.addEventListener("message", handleMessage);
    const request: PptxWorkerRequest = {
      id,
      kind: "pptx-to-pdf",
      payload: { data: options.data },
    };
    worker.postMessage(request, [options.data]);
  });
}
