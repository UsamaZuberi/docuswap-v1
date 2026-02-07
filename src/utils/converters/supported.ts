import type { TargetFormat } from "./types";

export const sourceFormats = [
  "auto",
  "png",
  "jpeg",
  "webp",
  "svg",
  "json",
  "csv",
  "xml",
  "md",
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
  json: ["csv", "xml"],
  csv: ["json", "md"],
  xml: ["json"],
  md: ["csv"],
  docx: ["pdf"],
  pptx: ["pdf"],
};

export function isSourceFormat(value: string): value is SourceFormat {
  return sourceFormats.includes(value as SourceFormat);
}
