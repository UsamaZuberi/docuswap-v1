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

  if (target === "jsx" && isHtml(file)) {
    const jsx = htmlToJsx(text);
    return { blob: new Blob([jsx], { type: "text/plain;charset=utf-8" }), extension: "jsx" };
  }

  if (target === "ts" && isJson(file)) {
    const json = JSON.parse(text);
    const output = jsonToTypescript(json, "RootObject");
    return { blob: new Blob([output], { type: "text/plain;charset=utf-8" }), extension: "ts" };
  }

  throw new Error("Unsupported developer conversion.");
}

function htmlToJsx(html: string) {
  return html
    .replace(/class=/g, "className=")
    .replace(/for=/g, "htmlFor=")
    .replace(/\s+([a-z]+)=\"\"/g, "");
}

function jsonToTypescript(value: unknown, name: string) {
  const seen = new Map<string, string>();

  function resolveType(val: unknown, typeName: string): string {
    if (val === null) return "null";
    if (Array.isArray(val)) {
      if (!val.length) return "unknown[]";
      return `${resolveType(val[0], typeName)}[]`;
    }
    if (typeof val === "object") {
      const entries = Object.entries(val as Record<string, unknown>);
      const shape = entries
        .map(([key, v]) => `  ${key}: ${resolveType(v, capitalize(key))};`)
        .join("\n");
      const iface = `interface ${typeName} {\n${shape}\n}`;
      seen.set(typeName, iface);
      return typeName;
    }
    if (typeof val === "string") return "string";
    if (typeof val === "number") return "number";
    if (typeof val === "boolean") return "boolean";
    return "unknown";
  }

  const rootType = resolveType(value, name);
  const interfaces = Array.from(seen.values()).join("\n\n");
  return `${interfaces}\n\nexport type ${name} = ${rootType};\n`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function isHtml(file: File) {
  return file.type === "text/html" || file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm");
}

function isJson(file: File) {
  return file.type === "application/json" || file.name.toLowerCase().endsWith(".json");
}
