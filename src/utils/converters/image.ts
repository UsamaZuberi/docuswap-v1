import type { TargetFormat } from "./types";

export interface ImageConvertOptions {
  quality?: number;
}

export async function convertImageFile(
  file: File,
  target: TargetFormat,
  options: ImageConvertOptions = {}
): Promise<{ blob: Blob; extension: TargetFormat }>
 {
  const quality = options.quality ?? 0.9;
  if (target === "heic") {
    throw new Error("HEIC output is not supported in-browser yet.");
  }

  let sourceBlob: Blob = file;
  if (isHeic(file)) {
    if (typeof window === "undefined") {
      throw new Error("HEIC conversion requires a browser environment.");
    }
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/png" });
    sourceBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  if (isSvg(file)) {
    const pngBlob = await svgToPng(sourceBlob, quality);
    return { blob: pngBlob, extension: "png" };
  }

  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable.");
  ctx.drawImage(bitmap, 0, 0);

  const mime = target === "jpeg" ? "image/jpeg" : target === "webp" ? "image/webp" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Failed to export image."))),
      mime,
      quality
    );
  });

  return { blob, extension: target };
}

async function svgToPng(blob: Blob, quality: number) {
  const svgText = await blob.text();
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load SVG."));
  });
  img.src = url;
  const image = await loaded;
  const canvas = document.createElement("canvas");
  canvas.width = image.width || 1024;
  canvas.height = image.height || 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable.");
  ctx.drawImage(image, 0, 0);
  URL.revokeObjectURL(url);

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Failed to export PNG."))),
      "image/png",
      quality
    );
  });
  return pngBlob;
}

function isHeic(file: File) {
  return file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic");
}

function isSvg(file: File) {
  return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}
