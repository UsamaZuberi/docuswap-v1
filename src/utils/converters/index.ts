import { convertDataFile } from "./data";
import { convertDeveloperFile } from "./developer";
import { convertDocumentFile } from "./documents";
import { convertImageFile } from "./image";
import type { ConversionCategory, ConvertOptions, TargetFormat } from "./types";
import { getExtension } from "@/utils/format";
import { runDataWorkerConversion } from "./workerClient";
import type { DataFormat } from "./data";

export function getCategory(file: File): ConversionCategory {
  const ext = getExtension(file.name);
  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "heic", "heif", "svg"].includes(ext)) {
    return "image";
  }
  if (["json", "csv", "xml", "md", "markdown"].includes(ext)) {
    return "data";
  }
  if (["svg", "html", "htm", "json"].includes(ext)) {
    return "developer";
  }
  if (["pdf", "docx", "ppt", "pptx"].includes(ext)) {
    return "documents";
  }
  return "unknown";
}

export function getTargetFormats(file: File): TargetFormat[] {
  const ext = getExtension(file.name);
  if (["png", "jpg", "jpeg", "webp", "heic", "heif", "svg"].includes(ext) || file.type.startsWith("image/")) {
    return ["png", "jpeg", "webp", "heic"];
  }
  if (["json", "csv", "xml", "md", "markdown"].includes(ext)) {
    if (ext === "json") return ["csv", "xml", "ts"];
    if (ext === "csv") return ["json", "md"];
    if (ext === "xml") return ["json"];
    return ["csv"];
  }
  if (["svg"].includes(ext)) {
    return ["png"];
  }
  if (["html", "htm"].includes(ext)) {
    return ["jsx"];
  }
  if (["pdf"].includes(ext)) {
    return ["docx"];
  }
  if (["docx"].includes(ext)) {
    return ["pdf"];
  }
  if (["ppt", "pptx"].includes(ext)) {
    return ["pdf"];
  }
  if (["json"].includes(ext)) {
    return ["ts"];
  }
  return [];
}

export async function convertFile(
  file: File,
  target: TargetFormat,
  options: ConvertOptions = {}
): Promise<{ blob: Blob; extension: TargetFormat }>
 {
  options.onProgress?.(10);
  const category = getCategory(file);

  if (category === "image") {
    const result = await convertImageFile(file, target, { quality: options.quality });
    options.onProgress?.(100);
    return result;
  }

  if (target === "ts") {
    const result = await convertDeveloperFile(file, target);
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
    const result = await convertDocumentFile(file, target);
    options.onProgress?.(100);
    return result;
  }

  throw new Error("Unsupported file type.");
}
