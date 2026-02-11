import { convertDataFile } from "./data";
import { convertDeveloperFile } from "./developer";
import { convertDocumentFile } from "./documents";
import { convertImageFile } from "./image";
import type { ConversionCategory, ConvertOptions, OutputFormat, TargetFormat } from "./types";
import { getExtension } from "@/utils/format";
import { runDataWorkerConversion } from "./workerClient";
import type { DataFormat } from "./data";

export function getCategory(file: File): ConversionCategory {
  const ext = getExtension(file.name);
  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) {
    return "image";
  }
  if (["json", "js", "mjs", "cjs", "csv", "xml", "md", "markdown"].includes(ext)) {
    return "data";
  }
  if (["svg"].includes(ext)) {
    return "developer";
  }
  if (["pdf", "docx", "pptx"].includes(ext)) {
    return "documents";
  }
  return "unknown";
}

export function getTargetFormats(file: File): TargetFormat[] {
  const ext = getExtension(file.name);
  if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext) || file.type.startsWith("image/")) {
    return ["png", "jpeg", "webp"];
  }
  if (["json", "js", "mjs", "cjs", "csv", "xml", "md", "markdown"].includes(ext)) {
    if (ext === "json") return ["csv", "xml", "js"];
    if (ext === "js" || ext === "mjs" || ext === "cjs") return ["json"];
    if (ext === "csv") return ["json", "md"];
    if (ext === "xml") return ["json"];
    return ["csv"];
  }
  if (["svg"].includes(ext)) {
    return ["png"];
  }
  if (["pdf"].includes(ext)) {
    return ["png", "jpeg"];
  }
  if (["docx"].includes(ext)) {
    return ["pdf"];
  }
  if (["pptx"].includes(ext)) {
    return ["pdf"];
  }
  return [];
}

export async function convertFile(
  file: File,
  target: TargetFormat,
  options: ConvertOptions = {}
): Promise<{ blob: Blob; extension: OutputFormat }>
 {
  options.onProgress?.(10);
  const category = getCategory(file);

  if (category === "image") {
    const result = await convertImageFile(file, target, { quality: options.quality });
    options.onProgress?.(100);
    return result;
  }

  if (category === "data") {
    const rawExt = getExtension(file.name);
    const ext = (rawExt === "markdown" ? "md" : rawExt) as DataFormat;
    if (options.useWorker) {
      const text = await file.text();
      const output = await runDataWorkerConversion({
        id: crypto.randomUUID(),
        kind: "data",
        payload: { from: ext, to: target as DataFormat, input: text },
      });
      options.onProgress?.(100);
      return {
        blob: new Blob([output], { type: "text/plain;charset=utf-8" }),
        extension: target,
      };
    }
    const result = await convertDataFile(file, target as DataFormat);
    options.onProgress?.(100);
    return result;
  }

  if (category === "developer") {
    const result = await convertDeveloperFile(file, target);
    options.onProgress?.(100);
    return result;
  }

  if (category === "documents") {
    const result = await convertDocumentFile(file, target, options);
    options.onProgress?.(100);
    return result;
  }

  throw new Error("Unsupported file type.");
}
