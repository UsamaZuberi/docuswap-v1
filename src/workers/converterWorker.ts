/// <reference lib="webworker" />
import { convertDataText } from "../utils/converters/data";
import type { WorkerConversionRequest, WorkerConversionResponse } from "../utils/converters/workerClient";

self.onmessage = (event: MessageEvent<WorkerConversionRequest>) => {
  const { id, kind, payload } = event.data;

  if (kind !== "data") {
    const response: WorkerConversionResponse = {
      id,
      ok: false,
      error: "Unsupported worker task.",
    };
    self.postMessage(response);
    return;
  }

  try {
    const output = convertDataText(payload.input, payload.from, payload.to);
    const response: WorkerConversionResponse = { id, ok: true, output };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerConversionResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : "Worker conversion failed.",
    };
    self.postMessage(response);
  }
};
