import { PDFDocument } from "pdf-lib";

import type { TargetFormat } from "./types";

export async function convertDocumentFile(
  file: File,
  target: TargetFormat
): Promise<{ blob: Blob; extension: TargetFormat }>
 {
  if (target === "docx" && isPdf(file)) {
    return pdfToDocxStub(file);
  }

  if (target === "pdf" && isDocx(file)) {
    throw new Error(
      "DOCX → PDF requires a WASM-based converter. Add one and wire it in here."
    );
  }

  if (target === "pdf" && isPpt(file)) {
    return pptToPdfStub(file);
  }

  throw new Error("Unsupported document conversion.");
}

async function pptToPdfStub(file: File) {
  const metadata = `Converted from PPT\nName: ${file.name}\nSize: ${file.size} bytes\n`;
  const body = [
    metadata,
    "\nThis is a stub PDF payload generated in-browser.",
    "Replace with a WASM-based PPT → PDF implementation when available.",
  ].join("\n");

  return {
    blob: new Blob([body], { type: "application/pdf" }),
    extension: "pdf" as TargetFormat,
  };
}

async function pdfToDocxStub(file: File) {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const pageCount = pdf.getPageCount();
  const metadata = `Converted from PDF\nPages: ${pageCount}\nTitle: ${pdf.getTitle() ?? "Untitled"}\n`;

  const body = [
    metadata,
    "\nThis is a stub DOCX payload generated in-browser.",
    "Replace with a proper PDF → DOCX implementation when available.",
  ].join("\n");

  return {
    blob: new Blob([body], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    extension: "docx" as TargetFormat,
  };
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isDocx(file: File) {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

function isPpt(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/vnd.ms-powerpoint" ||
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  );
}
