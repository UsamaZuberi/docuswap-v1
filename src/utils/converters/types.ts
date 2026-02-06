export type ConversionCategory = "image" | "data" | "developer" | "documents" | "unknown";

export type TargetFormat =
  | "png"
  | "jpeg"
  | "webp"
  | "heic"
  | "json"
  | "csv"
  | "xml"
  | "md"
  | "svg"
  | "jsx"
  | "ts"
  | "pdf"
  | "docx"
  | "ppt"
  | "pptx";

export interface ConvertOptions {
  quality?: number;
  useWorker?: boolean;
  onProgress?: (value: number) => void;
}
