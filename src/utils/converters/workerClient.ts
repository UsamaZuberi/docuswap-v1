import type { DataFormat } from "./data";

export interface WorkerConversionRequest {
  id: string;
  kind: "data";
  payload: {
    from: DataFormat;
    to: DataFormat;
    input: string;
  };
}

export interface WorkerConversionResponse {
  id: string;
  ok: boolean;
  output?: string;
  error?: string;
}

export function runDataWorkerConversion(request: WorkerConversionRequest) {
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(new URL("../../workers/converterWorker.ts", import.meta.url));

    const handleMessage = (event: MessageEvent<WorkerConversionResponse>) => {
      if (event.data.id !== request.id) return;
      worker.removeEventListener("message", handleMessage);
      worker.terminate();

      if (event.data.ok && event.data.output !== undefined) {
        resolve(event.data.output);
      } else {
        reject(new Error(event.data.error ?? "Worker conversion failed."));
      }
    };

    worker.addEventListener("message", handleMessage);
    worker.postMessage(request);
  });
}
