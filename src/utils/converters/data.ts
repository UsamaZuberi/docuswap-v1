import Papa from "papaparse";
import JSON5 from "json5";
import { js2xml, xml2js } from "xml-js";

import type { TargetFormat } from "./types";

export type DataFormat = "json" | "js" | "csv" | "xml" | "md";

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

  if (from === "json" && to === "js") {
    const parsed = JSON.parse(input);
    return `export default ${JSON.stringify(parsed, null, 2)};`;
  }

  if (from === "js" && to === "json") {
    return convertJsToJson(input);
  }

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
  if (ext === "js" || ext === "mjs" || ext === "cjs") return "js";
  if (ext === "csv") return "csv";
  if (ext === "xml") return "xml";
  if (ext === "md" || ext === "markdown") return "md";
  return "json";
}

function convertJsToJson(input: string) {
  const withoutComments = stripJsComments(input);
  const sanitized = replaceRegexLiterals(withoutComments);
  const literal = extractJsPayload(sanitized);
  if (!literal) {
    throw new Error(
      "No JSON-like data found. JS → JSON only supports files that export/assign a plain object or array."
    );
  }
  try {
    const parsed = JSON5.parse(literal);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    throw new Error(
      `Failed to parse extracted data. Only JSON-like literals are supported. (${message})`
    );
  }
}

function stripJsComments(input: string) {
  let output = "";
  let inLineComment = false;
  let inBlockComment = false;
  let inString: "single" | "double" | "template" | null = null;
  let inRegex = false;
  let inRegexCharClass = false;
  let lastSignificant = "";

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inRegex) {
      output += char;
      if (char === "\\") {
        output += next ?? "";
        index += 1;
        continue;
      }
      if (char === "[" && !inRegexCharClass) {
        inRegexCharClass = true;
        continue;
      }
      if (char === "]" && inRegexCharClass) {
        inRegexCharClass = false;
        continue;
      }
      if (char === "/" && !inRegexCharClass) {
        inRegex = false;
      }
      continue;
    }

    if (!inString && char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (!inString && char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (!inString && char === "/" && next !== "/" && next !== "*" && isRegexStart(lastSignificant)) {
      inRegex = true;
      inRegexCharClass = false;
      output += char;
      continue;
    }

    if (inString) {
      output += char;
      if (char === "\\") {
        output += next ?? "";
        index += 1;
        continue;
      }
      if (inString === "single" && char === "'") inString = null;
      if (inString === "double" && char === "\"") inString = null;
      if (inString === "template" && char === "`") inString = null;
      continue;
    }

    if (char === "'") {
      inString = "single";
      output += char;
      continue;
    }
    if (char === "\"") {
      inString = "double";
      output += char;
      continue;
    }
    if (char === "`") {
      inString = "template";
      output += char;
      continue;
    }

    output += char;
    if (!/\s/.test(char)) {
      lastSignificant = char;
    }
  }

  return output;
}

function extractJsPayload(input: string) {
  const exportDefaultMatch = input.match(/\bexport\s+default\s+/);
  if (exportDefaultMatch?.index !== undefined) {
    const afterDefault = input.slice(exportDefaultMatch.index + exportDefaultMatch[0].length).trimStart();
    if (afterDefault.startsWith("{")) {
      const literal = extractObjectLiteralFromIndex(input, input.indexOf("{", exportDefaultMatch.index));
      if (literal) return literal;
    }
    const nameMatch = afterDefault.match(/^([A-Za-z_$][\w$]*)/);
    if (nameMatch) {
      const literal = extractNamedObjectLiteral(input, nameMatch[1]);
      if (literal) return literal;
    }
  }

  const assignments = [
    /\bmodule\.exports\s*=\s*/,
    /\bexports\.[A-Za-z_$][\w$]*\s*=\s*/,
    /\bmodule\.exports\.[A-Za-z_$][\w$]*\s*=\s*/,
    /\bexport\s+const\s+[A-Za-z_$][\w$]*\s*(?::[^=]+)?=\s*/,
    /\bconst\s+[A-Za-z_$][\w$]*\s*(?::[^=]+)?=\s*/,
    /\blet\s+[A-Za-z_$][\w$]*\s*(?::[^=]+)?=\s*/,
    /\bvar\s+[A-Za-z_$][\w$]*\s*(?::[^=]+)?=\s*/,
  ];

  for (const pattern of assignments) {
    const match = input.match(pattern);
    if (match?.index !== undefined) {
      const literal = extractObjectLiteralFromIndex(input, match.index + match[0].length);
      if (literal) return literal;
    }
  }

  const returnMatch = input.match(/\breturn\s+/);
  if (returnMatch?.index !== undefined) {
    const literal = extractObjectLiteralFromIndex(input, returnMatch.index + returnMatch[0].length);
    if (literal) return literal;
  }

  return extractObjectLiteralFromIndex(input, 0);
}

function extractNamedObjectLiteral(input: string, name: string) {
  const declMatch = input.match(
    new RegExp(`\\b(?:export\\s+)?(?:const|let|var)\\s+${name}\\s*(?::[^=]+)?=\\s*`)
  );
  if (!declMatch || declMatch.index === undefined) return null;
  return extractObjectLiteralFromIndex(input, declMatch.index + declMatch[0].length);
}

function extractObjectLiteralFromIndex(input: string, searchFrom: number) {
  let inString: "single" | "double" | "template" | null = null;
  let inRegex = false;
  let inRegexCharClass = false;
  let lastSignificant = "";
  let braceStart = -1;

  for (let index = searchFrom; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inRegex) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === "[" && !inRegexCharClass) {
        inRegexCharClass = true;
        continue;
      }
      if (char === "]" && inRegexCharClass) {
        inRegexCharClass = false;
        continue;
      }
      if (char === "/" && !inRegexCharClass) {
        inRegex = false;
      }
      continue;
    }

    if (inString) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (inString === "single" && char === "'") inString = null;
      if (inString === "double" && char === "\"") inString = null;
      if (inString === "template" && char === "`") inString = null;
      continue;
    }

    if (char === "'") {
      inString = "single";
      continue;
    }
    if (char === "\"") {
      inString = "double";
      continue;
    }
    if (char === "`") {
      inString = "template";
      continue;
    }

    if (!inString && char === "/" && next !== "/" && next !== "*" && isRegexStart(lastSignificant)) {
      inRegex = true;
      inRegexCharClass = false;
      continue;
    }

    if (char === "{") {
      braceStart = index;
      break;
    }

    if (!/\s/.test(char)) {
      lastSignificant = char;
    }
  }

  if (braceStart < 0) return null;

  let depth = 0;
  inString = null;

  inRegex = false;
  inRegexCharClass = false;
  lastSignificant = "";

  for (let index = braceStart; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inRegex) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === "[" && !inRegexCharClass) {
        inRegexCharClass = true;
        continue;
      }
      if (char === "]" && inRegexCharClass) {
        inRegexCharClass = false;
        continue;
      }
      if (char === "/" && !inRegexCharClass) {
        inRegex = false;
      }
      continue;
    }

    if (inString) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (inString === "single" && char === "'") inString = null;
      if (inString === "double" && char === "\"") inString = null;
      if (inString === "template" && char === "`") inString = null;
      continue;
    }

    if (char === "'") {
      inString = "single";
      continue;
    }
    if (char === "\"") {
      inString = "double";
      continue;
    }
    if (char === "`") {
      inString = "template";
      continue;
    }

    if (!inString && char === "/" && next !== "/" && next !== "*" && isRegexStart(lastSignificant)) {
      inRegex = true;
      inRegexCharClass = false;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(braceStart, index + 1);
      }
    }

    if (!/\s/.test(char)) {
      lastSignificant = char;
    }
  }

  return null;
}

function replaceRegexLiterals(input: string) {
  let output = "";
  let inString: "single" | "double" | "template" | null = null;
  let inRegex = false;
  let inRegexCharClass = false;
  let regexStartIndex = -1;
  let lastSignificant = "";

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inRegex) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === "[" && !inRegexCharClass) {
        inRegexCharClass = true;
        continue;
      }
      if (char === "]" && inRegexCharClass) {
        inRegexCharClass = false;
        continue;
      }
      if (char === "/" && !inRegexCharClass) {
        let endIndex = index + 1;
        while (endIndex < input.length && /[a-z]/i.test(input[endIndex])) {
          endIndex += 1;
        }
        const literal = input.slice(regexStartIndex, endIndex);
        output += JSON.stringify(literal);
        index = endIndex - 1;
        inRegex = false;
        inRegexCharClass = false;
        regexStartIndex = -1;
      }
      continue;
    }

    if (inString) {
      output += char;
      if (char === "\\") {
        output += next ?? "";
        index += 1;
        continue;
      }
      if (inString === "single" && char === "'") inString = null;
      if (inString === "double" && char === "\"") inString = null;
      if (inString === "template" && char === "`") inString = null;
      continue;
    }

    if (char === "'") {
      inString = "single";
      output += char;
      continue;
    }
    if (char === "\"") {
      inString = "double";
      output += char;
      continue;
    }
    if (char === "`") {
      inString = "template";
      output += char;
      continue;
    }

    if (char === "/" && next !== "/" && next !== "*" && isRegexStart(lastSignificant)) {
      inRegex = true;
      inRegexCharClass = false;
      regexStartIndex = index;
      continue;
    }

    output += char;
    if (!/\s/.test(char)) {
      lastSignificant = char;
    }
  }

  if (inRegex && regexStartIndex >= 0) {
    output += JSON.stringify(input.slice(regexStartIndex));
  }

  return output;
}

function isRegexStart(previousChar: string) {
  return previousChar === "" || /[=(:,\[!&|?+\-*/%~^<>]/.test(previousChar);
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
