export type ConversionCategory = "image" | "data" | "developer" | "documents" | "unknown";

export type TargetFormat =
  | "png"
  | "jpeg"
  | "webp"
  | "json"
  | "csv"
  | "xml"
  | "md"
  | "svg"
  | "pdf"
  | "docx"
  | "pptx";

export interface ConvertOptions {
  quality?: number;
  useWorker?: boolean;
  onProgress?: (value: number) => void;
}
