import type { ConvertOptions, TargetFormat } from "./types";
import { runPptxToPdfWorker } from "@/utils/pptxWorkerClient";

const DOCX_RENDER_WIDTH_PX = 816;

export async function convertDocumentFile(
  file: File,
  target: TargetFormat,
  options: ConvertOptions = {}
): Promise<{ blob: Blob; extension: TargetFormat }> {
  if (target === "pdf" && isDocx(file)) {
    if (typeof window === "undefined") {
      throw new Error("Client conversion requires a browser environment.");
    }

    const buffer = await file.arrayBuffer();
    options.onProgress?.(20);
    const blob = await renderDocxToPdf(buffer, (value) => options.onProgress?.(value));
    options.onProgress?.(100);
    return { blob, extension: "pdf" };
  }

  if (target === "pdf" && isPptx(file)) {
    if (typeof window === "undefined") {
      throw new Error("Client conversion requires a browser environment.");
    }
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("PPTX conversion requires OffscreenCanvas support.");
    }

    const buffer = await file.arrayBuffer();
    options.onProgress?.(15);
    const blob = await runPptxToPdfWorker({
      data: buffer,
      onProgress: (value) => options.onProgress?.(value),
    });
    options.onProgress?.(100);
    return { blob, extension: "pdf" };
  }

  throw new Error("Unsupported document conversion.");
}

async function renderDocxToPdf(buffer: ArrayBuffer, onProgress: (value: number) => void) {
  const { iframe, container, doc } = createIsolatedContainer("");
  const restoreComputedStyle = installComputedStyleSanitizer(doc.defaultView ?? null);
  try {
    await renderDocxToContainer(buffer, container, onProgress);
    sanitizeUnsupportedColors(doc);
    sanitizeUnsupportedColors(container);
    onProgress(70);
    return await renderContainerToPdf(container);
  } finally {
    restoreComputedStyle();
    iframe.remove();
  }
}

async function renderDocxToContainer(
  buffer: ArrayBuffer,
  container: HTMLElement,
  onProgress: (value: number) => void
) {
  try {
    const docxPreviewModule = await import("docx-preview");
    await docxPreviewModule.renderAsync(buffer, container, null, {
      className: "docx-preview",
      renderHeaders: true,
      renderFooters: true,
      renderChanges: false,
      useBase64URL: true,
    });
    onProgress(55);
  } catch (error) {
    console.warn("DOCX preview failed, falling back to mammoth", error);
    const mammothModule = await import("mammoth/mammoth.browser");
    const mammoth = (mammothModule as { default?: typeof import("mammoth/mammoth.browser") }).default ?? mammothModule;
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    container.innerHTML = result.value || "";
    onProgress(45);
  }
}

async function renderContainerToPdf(container: HTMLElement) {
  const html2pdfModule = await import("html2pdf.js");
  type Html2PdfWorker = {
    from: (source: HTMLElement) => Html2PdfWorker;
    set: (options: Record<string, unknown>) => Html2PdfWorker;
    outputPdf?: (type: "blob") => Promise<Blob>;
    output?: (type: "blob") => Promise<Blob>;
    toPdf?: () => Promise<{ output: (type: "blob") => Promise<Blob> }> | { output: (type: "blob") => Promise<Blob> };
  };
  type Html2PdfFactory = () => Html2PdfWorker;
  const html2pdf = (html2pdfModule as { default?: Html2PdfFactory }).default ?? (html2pdfModule as unknown as Html2PdfFactory);

  try {
    const worker = html2pdf().from(container).set({
      margin: 12,
      html2canvas: {
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc: Document) => {
          stripStylesheets(clonedDoc);
          sanitizeUnsupportedColors(clonedDoc);
        },
      },
      jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
    });

    if (typeof worker.outputPdf === "function") {
      return await worker.outputPdf("blob");
    }
    if (typeof worker.output === "function") {
      return await worker.output("blob");
    }
    if (typeof worker.toPdf === "function") {
      const pdf = await worker.toPdf();
      if (pdf && typeof pdf.output === "function") {
        return await pdf.output("blob");
      }
    }
    throw new Error("html2pdf did not return a PDF blob.");
  } finally {
  }
}

function createIsolatedContainer(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${DOCX_RENDER_WIDTH_PX}px`;
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.visibility = "hidden";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    throw new Error("Failed to create conversion frame.");
  }

  doc.open();
  doc.write(
    "<!doctype html><html><head><style>" +
      "body{margin:0;background:#ffffff;color:#111111;font-family:Georgia,serif;}" +
      `#doc{width:${DOCX_RENDER_WIDTH_PX}px;padding:24px;box-sizing:border-box;}` +
      "img{max-width:100%;height:auto;}" +
      "</style></head><body><div id=\"doc\"></div></body></html>"
  );
  doc.close();

  const container = doc.getElementById("doc");
  if (!container) {
    throw new Error("Failed to create conversion container.");
  }
  container.innerHTML = html;
  return { iframe, container, doc };
}

function sanitizeUnsupportedColors(root: Document | HTMLElement) {
  const unsupportedColorPattern = /(oklch|oklab|lch|lab|color)\(/i;
  const fallbackText = "#111111";
  const fallbackBackground = "#ffffff";
  const colorProps = [
    "color",
    "background-color",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "text-decoration-color",
  ] as const;

  const styleNodes = root.querySelectorAll("style");
  styleNodes.forEach((node) => {
    const text = node.textContent || "";
    if (unsupportedColorPattern.test(text)) {
      node.textContent = text.replace(/(oklch|oklab|lch|lab|color)\([^)]*\)/gi, fallbackText);
    }
  });

  const elements = root.querySelectorAll<HTMLElement>("*");
  elements.forEach((element) => {
    colorProps.forEach((prop) => {
      const value = element.style.getPropertyValue(prop);
      if (!value || !unsupportedColorPattern.test(value)) return;
      element.style.setProperty(
        prop,
        prop === "background-color" ? fallbackBackground : fallbackText
      );
    });
  });
}

function stripStylesheets(doc: Document) {
  const nodes = Array.from(doc.querySelectorAll("style,link[rel='stylesheet']"));
  nodes.forEach((node) => node.remove());
  const style = doc.createElement("style");
  style.textContent = "body{margin:0;background:#ffffff;color:#111111;}";
  doc.head?.appendChild(style);
}

function installComputedStyleSanitizer(win: Window | null) {
  if (!win) return () => {};
  const originalGetComputedStyle = win.getComputedStyle.bind(win);
  win.getComputedStyle = ((element: Element, pseudo?: string | null) => {
    const style = originalGetComputedStyle(element, pseudo as string | null);
    return wrapStyle(style);
  }) as typeof win.getComputedStyle;

  return () => {
    win.getComputedStyle = originalGetComputedStyle;
  };
}

function wrapStyle(style: CSSStyleDeclaration) {
  return new Proxy(style, {
    get(target, prop, receiver) {
      if (prop === "getPropertyValue") {
        return (name: string) => sanitizeCssValue(target.getPropertyValue(name));
      }
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value === "string") {
        return sanitizeCssValue(value);
      }
      return value;
    },
  });
}

function sanitizeCssValue(value: string) {
  const pattern = /(oklch|oklab|lch|lab|color)\([^)]*\)/gi;
  if (!pattern.test(value)) return value;
  return value.replace(pattern, "#000000");
}

function isDocx(file: File) {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

function isPptx(file: File) {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    file.name.toLowerCase().endsWith(".pptx")
  );
}
