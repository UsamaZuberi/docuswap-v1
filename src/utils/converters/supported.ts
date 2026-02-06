import type { TargetFormat } from "./types";

export const sourceFormats = [
  "auto",
  "png",
  "jpeg",
  "webp",
  "heic",
  "svg",
  "json",
  "csv",
  "xml",
  "md",
  "html",
  "pdf",
  "docx",
  "ppt",
  "pptx",
] as const;

export type SourceFormat = (typeof sourceFormats)[number];

export const targetsBySource: Record<SourceFormat, TargetFormat[]> = {
  auto: [],
  png: ["jpeg", "webp", "heic"],
  jpeg: ["png", "webp", "heic"],
  webp: ["png", "jpeg", "heic"],
  heic: ["png", "jpeg", "webp"],
  svg: ["png"],
  json: ["csv", "xml", "ts"],
  csv: ["json", "md"],
  xml: ["json"],
  md: ["csv"],
  html: ["jsx"],
  pdf: ["docx"],
  docx: ["pdf"],
  ppt: ["pdf"],
  pptx: ["pdf"],
};

export function isSourceFormat(value: string): value is SourceFormat {
  return sourceFormats.includes(value as SourceFormat);
}
