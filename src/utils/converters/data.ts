import Papa from "papaparse";
import { js2xml, xml2js } from "xml-js";

import type { TargetFormat } from "./types";

export type DataFormat = "json" | "csv" | "xml" | "md";

export async function convertDataFile(
  file: File,
  target: DataFormat
): Promise<{ blob: Blob; extension: TargetFormat }>
 {
  const text = await file.text();
  const from = detectDataFormat(file.name);
  const output = convertDataText(text, from, target);
  return {
    blob: new Blob([output], { type: "text/plain;charset=utf-8" }),
    extension: target,
  };
}

export function convertDataText(
  input: string,
  from: DataFormat,
  to: DataFormat
) {
  if (from === to) return input;

  if (from === "json" && to === "csv") {
    const parsed = JSON.parse(input);
    return Papa.unparse(Array.isArray(parsed) ? parsed : [parsed]);
  }

  if (from === "csv" && to === "json") {
    const parsed = Papa.parse(input, { header: true, skipEmptyLines: true });
    return JSON.stringify(parsed.data, null, 2);
  }

  if (from === "json" && to === "xml") {
    const parsed = JSON.parse(input);
    return js2xml(parsed, { compact: true, spaces: 2 });
  }

  if (from === "xml" && to === "json") {
    const parsed = xml2js(input, { compact: true });
    return JSON.stringify(parsed, null, 2);
  }

  if (from === "csv" && to === "md") {
    const parsed = Papa.parse<string[]>(input, { header: false, skipEmptyLines: true });
    return toMarkdownTable(parsed.data);
  }

  if (from === "md" && to === "csv") {
    return markdownToCsv(input);
  }

  throw new Error(`Unsupported data conversion: ${from} → ${to}`);
}

function detectDataFormat(filename: string): DataFormat {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "csv") return "csv";
  if (ext === "xml") return "xml";
  if (ext === "md" || ext === "markdown") return "md";
  return "json";
}

function toMarkdownTable(rows: string[][]) {
  if (!rows.length) return "";
  const header = rows[0];
  const body = rows.slice(1);
  const separator = header.map(() => "---");
  const renderRow = (row: string[]) => `| ${row.join(" | ")} |`;
  return [renderRow(header), renderRow(separator), ...body.map(renderRow)].join("\n");
}

function markdownToCsv(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith("|"));

  const rows = lines
    .map((line) => line.replace(/^\|/, "").replace(/\|$/, ""))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((_, index) => index !== 1);

  return Papa.unparse(rows);
}
