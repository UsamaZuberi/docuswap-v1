import type { TargetFormat } from "./types";

export async function convertDeveloperFile(
  file: File,
  target: TargetFormat
): Promise<{ blob: Blob; extension: TargetFormat }>
 {
  const text = await file.text();

  if (target === "png" && isSvg(file)) {
    const svgBlob = new Blob([text], { type: "image/svg+xml" });
    const png = await svgToPng(svgBlob);
    return { blob: png, extension: "png" };
  }

  throw new Error("Unsupported developer conversion.");
}

async function svgToPng(svgBlob: Blob) {
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
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Failed to export PNG."))),
      "image/png"
    );
  });
  return blob;
}

function isSvg(file: File) {
  return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}

