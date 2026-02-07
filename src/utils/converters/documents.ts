import type { TargetFormat } from "./types";

export async function convertDocumentFile(
  file: File,
  target: TargetFormat
): Promise<{ blob: Blob; extension: TargetFormat }> {
  if (target === "pdf" && isDocx(file)) {
    throw new Error(
      "DOCX → PDF requires a WASM-based converter. Add one and wire it in here."
    );
  }

  if (target === "pdf" && isPptx(file)) {
    throw new Error(
      "PPTX → PDF requires a PPTX renderer (WASM). This is not wired yet."
    );
  }

  throw new Error("Unsupported document conversion.");
}

function isDocx(file: File) {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

function isPptx(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    name.endsWith(".pptx")
  );
}
