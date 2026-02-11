import type { TargetFormat } from "./types";

export const sourceFormats = [
  "auto",
  "png",
  "jpeg",
  "webp",
  "svg",
  "json",
  "js",
  "csv",
  "xml",
  "md",
  "pdf",
  "docx",
  "pptx",
] as const;

export type SourceFormat = (typeof sourceFormats)[number];

export const targetsBySource: Record<SourceFormat, TargetFormat[]> = {
  auto: [],
  png: ["jpeg", "webp"],
  jpeg: ["png", "webp"],
  webp: ["png", "jpeg"],
  svg: ["png"],
  json: ["csv", "xml", "js"],
  js: ["json"],
  csv: ["json", "md"],
  xml: ["json"],
  md: ["csv"],
  pdf: ["png", "jpeg"],
  docx: ["pdf"],
  pptx: ["pdf"],
};

export function isSourceFormat(value: string): value is SourceFormat {
  return sourceFormats.includes(value as SourceFormat);
}
