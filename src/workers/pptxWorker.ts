/// <reference lib="webworker" />
import JSZip from "jszip";
import { xml2js } from "xml-js";
import { jsPDF } from "jspdf";

type PptxWorkerRequest = {
  id: string;
  kind: "pptx-to-pdf";
  payload: {
    data: ArrayBuffer;
  };
};

type PptxWorkerProgress = {
  id: string;
  kind: "progress";
  phase: "parsing" | "rendering";
  value: number;
};

type PptxWorkerResponse = {
  id: string;
  ok: boolean;
  output?: ArrayBuffer;
  error?: string;
};

type XmlNode = Record<string, unknown>;
type XmlAttrs = Record<string, string>;

function getNode(node: XmlNode | undefined, key: string) {
  return node?.[key] as XmlNode | undefined;
}

function getAttrs(node: XmlNode | undefined) {
  return node ? (node["_attributes"] as XmlAttrs | undefined) : undefined;
}

function getAttr(node: XmlNode | undefined, key: string) {
  return getAttrs(node)?.[key];
}

type ThemeColorMap = Record<string, string>;

type TextRun = {
  text: string;
  fontSizePx: number;
  color: string;
  underline: boolean;
  underlineStyle: "sng" | "dbl" | "sngWrd" | "dblWrd" | "none";
  underlineColor?: string;
  strike: boolean;
  strikeColor?: string;
  bold: boolean;
  italic: boolean;
  outlineColor?: string;
  outlineWidthPx?: number;
};

type LayoutToken = TextRun & { isWhitespace: boolean };

type UnderlineStyle = "sng" | "dbl" | "sngWrd" | "dblWrd" | "none";

const DEFAULT_SLIDE_WIDTH_EMU = 9144000;
const DEFAULT_SLIDE_HEIGHT_EMU = 6858000;
const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;
const PT_TO_PX = 96 / 72;

self.onmessage = async (event: MessageEvent<PptxWorkerRequest>) => {
  const { id, kind, payload } = event.data;
  if (kind !== "pptx-to-pdf") {
    const response: PptxWorkerResponse = { id, ok: false, error: "Unsupported worker task." };
    self.postMessage(response);
    return;
  }

  try {
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("OffscreenCanvas is not supported in this environment.");
    }

    const output = await convertPptxToPdf(payload.data, (phase, value) => {
      postProgress(id, phase, value);
    });
    const response: PptxWorkerResponse = { id, ok: true, output };
    self.postMessage(response);
  } catch (error) {
    const response: PptxWorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : "PPTX conversion failed.",
    };
    self.postMessage(response);
  }
};

function postProgress(id: string, phase: "parsing" | "rendering", value: number) {
  const payload: PptxWorkerProgress = { id, kind: "progress", phase, value };
  self.postMessage(payload);
}

async function convertPptxToPdf(data: ArrayBuffer, onProgress: (phase: "parsing" | "rendering", value: number) => void) {
  onProgress("parsing", 10);
  const zip = await JSZip.loadAsync(data);
  const slides = getSlideFiles(zip);
  if (!slides.length) {
    throw new Error("No slides found in PPTX.");
  }

  const slideSize = await getSlideSize(zip);
  const themeColors = await getThemeColors(zip);
  const widthPt = emuToPt(slideSize.widthEmu);
  const heightPt = emuToPt(slideSize.heightEmu);

  const pdf = new jsPDF({
    unit: "pt",
    format: [widthPt, heightPt],
    compress: true,
  });

  for (let index = 0; index < slides.length; index += 1) {
    const slidePath = slides[index];
    if (index > 0) {
      pdf.addPage([widthPt, heightPt], "portrait");
    }

    onProgress("rendering", 15 + Math.round((index / slides.length) * 70));
    const slideXml = await zip.file(slidePath)?.async("text");
    if (!slideXml) {
      throw new Error(`Missing slide XML: ${slidePath}`);
    }

    const rels = await getSlideRelationships(zip, slidePath);
    const canvas = await renderSlideToCanvas(zip, slideXml, rels, slideSize, themeColors);
    const dataUrl = await canvasToDataUrl(canvas);
    pdf.addImage(dataUrl, "PNG", 0, 0, widthPt, heightPt);
  }

  onProgress("rendering", 95);
  const output = pdf.output("arraybuffer") as ArrayBuffer;
  onProgress("rendering", 100);
  return output;
}

function getSlideFiles(zip: JSZip) {
  return Object.keys(zip.files)
    .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
    .sort((a, b) => getSlideIndex(a) - getSlideIndex(b));
}

function getSlideIndex(path: string) {
  const match = path.match(/slide(\d+)\.xml$/i);
  if (!match) return 0;
  return Number(match[1]);
}

async function getSlideSize(zip: JSZip) {
  const presentationXml = await zip.file("ppt/presentation.xml")?.async("text");
  if (!presentationXml) {
    return { widthEmu: DEFAULT_SLIDE_WIDTH_EMU, heightEmu: DEFAULT_SLIDE_HEIGHT_EMU };
  }
  const doc = xml2js(presentationXml, { compact: true }) as XmlNode;
  const presentation = doc["p:presentation"] as XmlNode | undefined;
  const sldSz = getNode(presentation, "p:sldSz");
  const cx = Number(getAttr(sldSz, "cx") ?? DEFAULT_SLIDE_WIDTH_EMU);
  const cy = Number(getAttr(sldSz, "cy") ?? DEFAULT_SLIDE_HEIGHT_EMU);
  return { widthEmu: cx, heightEmu: cy };
}

async function getSlideRelationships(zip: JSZip, slidePath: string) {
  const relsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
  const relsXml = await zip.file(relsPath)?.async("text");
  if (!relsXml) return new Map<string, string>();
  const relsDoc = xml2js(relsXml, { compact: true }) as XmlNode;
  const relationships = (relsDoc.Relationships as XmlNode | undefined)?.Relationship as XmlNode | XmlNode[] | undefined;
  const list = ensureArray<XmlNode>(relationships);
  const map = new Map<string, string>();
  list.forEach((rel) => {
    const attrs = getAttrs(rel);
    if (!attrs?.Id || !attrs?.Target) return;
    map.set(attrs.Id, attrs.Target);
  });
  return map;
}

async function renderSlideToCanvas(
  zip: JSZip,
  slideXml: string,
  rels: Map<string, string>,
  size: { widthEmu: number; heightEmu: number },
  themeColors: ThemeColorMap
) {
  const scale = 2;
  const canvasWidth = emuToPx(size.widthEmu, scale);
  const canvasHeight = emuToPx(size.heightEmu, scale);
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const doc = xml2js(slideXml, { compact: true }) as XmlNode;
  const slide = doc["p:sld"] as XmlNode | undefined;
  const spTree = getNode(getNode(slide, "p:cSld"), "p:spTree");

  const shapes = ensureArray<XmlNode>(getNode(spTree, "p:sp") as XmlNode | XmlNode[] | undefined);
  for (const shape of shapes) {
    const xfrm = getTransform(shape);
    if (xfrm.width <= 0 || xfrm.height <= 0) continue;
    const fillColor = getFillColor(shape, themeColors);
    const lineStyle = getLineStyle(shape, themeColors, scale);
    if (fillColor) {
      ctx.fillStyle = fillColor;
    }
    if (lineStyle) {
      ctx.strokeStyle = lineStyle.color;
      ctx.lineWidth = lineStyle.widthPx;
      ctx.lineJoin = lineStyle.lineJoin;
      ctx.setLineDash(lineStyle.dash);
    }
    if (fillColor || lineStyle) {
      drawShape(ctx, shape, xfrm, scale, Boolean(fillColor), Boolean(lineStyle));
    }
    if (lineStyle) {
      ctx.setLineDash([]);
      ctx.lineJoin = "miter";
    }
  }

  const pictures = ensureArray<XmlNode>(getNode(spTree, "p:pic") as XmlNode | XmlNode[] | undefined);
  for (const picture of pictures) {
    const blip = getNode(getNode(picture, "p:blipFill"), "a:blip");
    const embedId = getAttr(blip, "r:embed");
    if (!embedId) continue;
    const target = rels.get(embedId);
    if (!target) continue;
    const normalizedTarget = normalizeTargetPath(target);
    const imageData = await getBinaryFromZip(zip, normalizedTarget);
    if (!imageData) continue;

    const arrayBuffer = imageData.buffer.slice(
      imageData.byteOffset,
      imageData.byteOffset + imageData.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer]);
    const bitmap = await createImageBitmap(blob);
    const xfrm = getTransform(picture);
    ctx.drawImage(bitmap, xfrm.x * scale, xfrm.y * scale, xfrm.width * scale, xfrm.height * scale);
  }

  for (const shape of shapes) {
    const textBody = shape["p:txBody"] as Record<string, unknown> | undefined;
    const blocks = extractParagraphBlocks(textBody, scale, themeColors);
    if (!blocks.length) continue;

    const xfrm = getTransform(shape);
    const boxHeight = xfrm.height * scale;
    const boxWidth = xfrm.width * scale;
    const flow = getVerticalFlow(textBody);
    const useVerticalStack = flow === "vert" || flow === "vert270";
    const layoutWidth = boxWidth;
    const layoutHeight = boxHeight;

    const layout = useVerticalStack
      ? blocks.map((block) => layoutVerticalRuns(ctx, block.runs, layoutWidth, layoutHeight, block.lineSpacingMultiplier))
      : blocks.map((block) => layoutTextRuns(ctx, block.runs, layoutWidth));

    const totalTextHeight = layout.reduce((sum, lines, index) => {
      const lineSpacing = blocks[index].lineSpacingMultiplier;
      const blockHeight = useVerticalStack
        ? lines.reduce((max, column) => Math.max(max, column.height), 0) * lineSpacing
        : lines.reduce((lineSum, line) => lineSum + line.height * lineSpacing, 0);
      const spacingBefore = blocks[index].spaceBeforePx;
      const spacingAfter = blocks[index].spaceAfterPx;
      const gapPct = blocks[index].gapPct;
      const gap = index < layout.length - 1
        ? (gapPct !== null ? gapPct * blocks[index].defaultLineHeight : blocks[index].defaultLineHeight * 0.35)
        : 0;
      return sum + spacingBefore + blockHeight + spacingAfter + gap;
    }, 0);
    const vAlign = getVerticalAlignment(textBody);
    let offsetY = xfrm.y * scale;
    if (vAlign === "center") {
      offsetY += Math.max(0, (layoutHeight - totalTextHeight) / 2);
    } else if (vAlign === "bottom") {
      offsetY += Math.max(0, layoutHeight - totalTextHeight);
    }
    const totalLineCount = layout.reduce((sum, lines) => sum + lines.length, 0);
    const extraPerLine = vAlign === "justify" && totalLineCount > 1
      ? Math.max(0, (layoutHeight - totalTextHeight) / (totalLineCount - 1))
      : 0;

    const rotation = getTextRotation(shape);
    const boxX = xfrm.x * scale;
    const boxY = xfrm.y * scale;
    const centerX = boxX + boxWidth / 2;
    const centerY = boxY + boxHeight / 2;

    ctx.save();
    if (rotation !== 0) {
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.translate(-centerX, -centerY);
    }

    blocks.forEach((block, index) => {
      const lines = layout[index];
      offsetY += block.spaceBeforePx;
      const blockHeight = useVerticalStack
        ? drawVerticalTextLines(
            ctx,
            lines,
            boxX,
            offsetY,
            layoutWidth,
            layoutHeight,
            block.align,
            flow === "vert270" ? "rtl" : "ltr",
            block.lineSpacingMultiplier,
            extraPerLine
          )
        : drawTextLines(
            ctx,
            lines,
            boxX,
            offsetY,
            layoutWidth,
            block.align,
            block.lineSpacingMultiplier,
            extraPerLine
          );
      const gapPct = block.gapPct;
      const blockGap = gapPct !== null ? gapPct * block.defaultLineHeight : block.defaultLineHeight * 0.35;
      offsetY += blockHeight + block.spaceAfterPx + blockGap;
    });

    ctx.restore();
  }

  return canvas;
}

type ParagraphBlock = {
  runs: TextRun[];
  align: CanvasTextAlign;
  defaultLineHeight: number;
  lineSpacingMultiplier: number;
  spaceBeforePx: number;
  spaceAfterPx: number;
  gapPct: number | null;
};

function extractParagraphBlocks(
  textBody: XmlNode | undefined,
  scale: number,
  themeColors: ThemeColorMap
): ParagraphBlock[] {
  if (!textBody) return [];
  const paragraphs = ensureArray<XmlNode>(textBody?.["a:p"] as XmlNode | XmlNode[] | undefined);
  const blocks: ParagraphBlock[] = [];

  paragraphs.forEach((paragraph) => {
    const defaults = getDefaultRunStyle(paragraph, textBody, scale, themeColors);
    const runs = buildRuns(paragraph, scale, themeColors, defaults);
    if (!runs.length) return;

    const alignValue = getAttr(getNode(paragraph, "a:pPr"), "algn");
    const align = mapAlignment(alignValue);
    const defaultLineHeight = getDefaultLineHeight(runs);
    const lineSpacingMultiplier = getLineSpacingMultiplier(paragraph, defaultLineHeight, scale);
    const spacing = getParagraphSpacing(paragraph, defaultLineHeight, scale);

    blocks.push({
      runs,
      align,
      defaultLineHeight,
      lineSpacingMultiplier,
      spaceBeforePx: spacing.beforePx,
      spaceAfterPx: spacing.afterPx,
      gapPct: spacing.gapPct,
    });
  });

  return blocks;
}

function getParagraphSpacing(paragraph: XmlNode, lineHeightPx: number, scale: number) {
  const pPr = paragraph?.["a:pPr"] as XmlNode | undefined;
  const before = pPr?.["a:spcBef"] as XmlNode | undefined;
  const after = pPr?.["a:spcAft"] as XmlNode | undefined;
  const beforePts = getAttr(getNode(before, "a:spcPts"), "val");
  const afterPts = getAttr(getNode(after, "a:spcPts"), "val");
  const beforePct = getAttr(getNode(before, "a:spcPct"), "val");
  const afterPct = getAttr(getNode(after, "a:spcPct"), "val");
  const beforePx = Number(beforePts)
    ? (Number(beforePts) / 100) * PT_TO_PX * scale
    : (Number(beforePct) ? (Number(beforePct) / 100000) * lineHeightPx : 0);
  const afterPx = Number(afterPts)
    ? (Number(afterPts) / 100) * PT_TO_PX * scale
    : (Number(afterPct) ? (Number(afterPct) / 100000) * lineHeightPx : 0);
  const gapPct = Number(afterPct)
    ? Number(afterPct) / 100000
    : Number(beforePct)
      ? Number(beforePct) / 100000
      : null;
  return { beforePx, afterPx, gapPct };
}

function getLineSpacingMultiplier(paragraph: XmlNode, lineHeightPx: number, scale: number) {
  const pPr = paragraph?.["a:pPr"] as XmlNode | undefined;
  const lnSpc = pPr?.["a:lnSpc"] as XmlNode | undefined;
  const spcPts = getAttr(getNode(lnSpc, "a:spcPts"), "val");
  const spcPct = getAttr(getNode(lnSpc, "a:spcPct"), "val");

  if (Number(spcPts)) {
    const px = (Number(spcPts) / 100) * PT_TO_PX * scale;
    return lineHeightPx > 0 ? px / lineHeightPx : 1;
  }
  if (Number(spcPct)) {
    return Number(spcPct) / 100000;
  }
  return 1;
}

function getTransform(node: XmlNode) {
  const xfrm = getNode(getNode(node, "p:spPr"), "a:xfrm")
    ?? getNode(getNode(node, "p:picPr"), "a:xfrm")
    ?? getNode(getNode(node, "p:spPr"), "a:xfrm")
    ?? getNode(getNode(node, "p:blipFill"), "a:xfrm");
  const off = getNode(xfrm, "a:off");
  const ext = getNode(xfrm, "a:ext");
  return {
    x: emuToPx(Number(getAttr(off, "x") ?? 0), 1),
    y: emuToPx(Number(getAttr(off, "y") ?? 0), 1),
    width: emuToPx(Number(getAttr(ext, "cx") ?? 0), 1),
    height: emuToPx(Number(getAttr(ext, "cy") ?? 0), 1),
  };
}

function layoutTextRuns(ctx: OffscreenCanvasRenderingContext2D, runs: TextRun[], width: number) {
  const tokens = tokenizeRuns(runs);
  const lines: { tokens: LayoutToken[]; width: number; height: number }[] = [];
  let currentLine: LayoutToken[] = [];
  let currentWidth = 0;
  let currentHeight = 0;

  tokens.forEach((token) => {
    if (token.text === "\n") {
      if (currentLine.length) {
        lines.push({ tokens: currentLine, width: currentWidth, height: currentHeight });
      }
      currentLine = [];
      currentWidth = 0;
      currentHeight = 0;
      return;
    }

    setCanvasFont(ctx, token);
    const tokenWidth = ctx.measureText(token.text).width;
    const tokenHeight = token.fontSizePx * 1.25;

    if (currentWidth + tokenWidth > width && currentLine.length) {
      lines.push({ tokens: currentLine, width: currentWidth, height: currentHeight });
      currentLine = [token];
      currentWidth = tokenWidth;
      currentHeight = tokenHeight;
    } else {
      currentLine.push(token);
      currentWidth += tokenWidth;
      currentHeight = Math.max(currentHeight, tokenHeight);
    }
  });

  if (currentLine.length) {
    lines.push({ tokens: currentLine, width: currentWidth, height: currentHeight });
  }

  return lines;
}

function layoutVerticalRuns(
  ctx: OffscreenCanvasRenderingContext2D,
  runs: TextRun[],
  width: number,
  height: number,
  lineSpacingMultiplier: number
) {
  const tokens = tokenizeRuns(runs);
  const columns: { tokens: LayoutToken[]; width: number; height: number }[] = [];
  let currentColumn: LayoutToken[] = [];
  let currentHeight = 0;
  let currentWidth = 0;

  const pushColumn = () => {
    if (currentColumn.length) {
      columns.push({ tokens: currentColumn, width: currentWidth, height: currentHeight });
    }
    currentColumn = [];
    currentHeight = 0;
    currentWidth = 0;
  };

  tokens.forEach((token) => {
    if (token.text === "\n") {
      pushColumn();
      return;
    }

    const chars = Array.from(token.text);
    chars.forEach((char) => {
      setCanvasFont(ctx, token);
      const charWidth = ctx.measureText(char).width;
      const charHeight = token.fontSizePx * 1.25 * lineSpacingMultiplier;
      if (currentHeight + charHeight > height && currentColumn.length) {
        pushColumn();
      }
      currentColumn.push({ ...token, text: char, isWhitespace: /^\s$/.test(char) });
      currentHeight += charHeight;
      currentWidth = Math.max(currentWidth, charWidth);
    });
  });

  pushColumn();

  return columns;
}

function drawTextLines(
  ctx: OffscreenCanvasRenderingContext2D,
  lines: { tokens: LayoutToken[]; width: number; height: number }[],
  x: number,
  y: number,
  width: number,
  align: CanvasTextAlign,
  lineSpacingMultiplier: number,
  extraPerLine: number
) {
  let offsetY = y + (lines[0]?.height ?? 0);
  lines.forEach((line, index) => {
    const drawX = align === "center"
      ? x + width / 2 - line.width / 2
      : align === "right"
        ? x + width - line.width
        : x;
    let cursorX = drawX;
    line.tokens.forEach((token) => {
      setCanvasFont(ctx, token);
      if (token.outlineColor && token.outlineWidthPx) {
        ctx.strokeStyle = token.outlineColor;
        ctx.lineWidth = token.outlineWidthPx;
        ctx.strokeText(token.text, cursorX, offsetY);
      }
      ctx.fillStyle = token.color;
      ctx.fillText(token.text, cursorX, offsetY);
      const tokenWidth = ctx.measureText(token.text).width;
      const underlineColor = token.underlineColor ?? token.color;
      const strikeColor = token.strikeColor ?? token.color;
      const wordOnly = token.underlineStyle === "sngWrd" || token.underlineStyle === "dblWrd";
      if (token.underline && (!wordOnly || !token.isWhitespace)) {
        const underlineY = offsetY + token.fontSizePx * 0.12;
        const underlineWidth = tokenWidth;
        ctx.strokeStyle = underlineColor;
        ctx.lineWidth = Math.max(1, token.fontSizePx * 0.06);
        ctx.beginPath();
        ctx.moveTo(cursorX, underlineY);
        ctx.lineTo(cursorX + underlineWidth, underlineY);
        ctx.stroke();
        if (token.underlineStyle === "dbl" || token.underlineStyle === "dblWrd") {
          const secondY = underlineY + token.fontSizePx * 0.08;
          ctx.beginPath();
          ctx.moveTo(cursorX, secondY);
          ctx.lineTo(cursorX + underlineWidth, secondY);
          ctx.stroke();
        }
      }
      if (token.strike && !token.isWhitespace) {
        const strikeY = offsetY - token.fontSizePx * 0.35;
        ctx.strokeStyle = strikeColor;
        ctx.lineWidth = Math.max(1, token.fontSizePx * 0.06);
        ctx.beginPath();
        ctx.moveTo(cursorX, strikeY);
        ctx.lineTo(cursorX + tokenWidth, strikeY);
        ctx.stroke();
      }
      cursorX += tokenWidth;
    });
    const isLast = index === lines.length - 1;
    offsetY += line.height * lineSpacingMultiplier + (isLast ? 0 : extraPerLine);
  });

  const base = lines.reduce((sum, line) => sum + line.height * lineSpacingMultiplier, 0);
  const extra = lines.length > 1 ? extraPerLine * (lines.length - 1) : 0;
  return base + extra;
}

function drawVerticalTextLines(
  ctx: OffscreenCanvasRenderingContext2D,
  columns: { tokens: LayoutToken[]; width: number; height: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  align: CanvasTextAlign,
  direction: "ltr" | "rtl",
  lineSpacingMultiplier: number,
  extraPerLine: number
) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  let startX = x;
  if (align === "center") {
    startX = x + (width - totalWidth) / 2;
  } else if (align === "right") {
    startX = x + (width - totalWidth);
  }

  let cursorX = direction === "rtl" ? startX + totalWidth : startX;
  columns.forEach((column) => {
    if (direction === "rtl") {
      cursorX -= column.width;
    }
    let cursorY = y + column.height * 0.1;
    column.tokens.forEach((token) => {
      setCanvasFont(ctx, token);
      if (token.outlineColor && token.outlineWidthPx) {
        ctx.strokeStyle = token.outlineColor;
        ctx.lineWidth = token.outlineWidthPx;
        ctx.strokeText(token.text, cursorX, cursorY);
      }
      ctx.fillStyle = token.color;
      ctx.fillText(token.text, cursorX, cursorY);
      const tokenWidth = ctx.measureText(token.text).width;
      const underlineColor = token.underlineColor ?? token.color;
      const strikeColor = token.strikeColor ?? token.color;
      const wordOnly = token.underlineStyle === "sngWrd" || token.underlineStyle === "dblWrd";
      if (token.underline && (!wordOnly || !token.isWhitespace)) {
        const underlineY = cursorY + token.fontSizePx * 0.12;
        ctx.strokeStyle = underlineColor;
        ctx.lineWidth = Math.max(1, token.fontSizePx * 0.06);
        ctx.beginPath();
        ctx.moveTo(cursorX, underlineY);
        ctx.lineTo(cursorX + tokenWidth, underlineY);
        ctx.stroke();
        if (token.underlineStyle === "dbl" || token.underlineStyle === "dblWrd") {
          const secondY = underlineY + token.fontSizePx * 0.08;
          ctx.beginPath();
          ctx.moveTo(cursorX, secondY);
          ctx.lineTo(cursorX + tokenWidth, secondY);
          ctx.stroke();
        }
      }
      if (token.strike && !token.isWhitespace) {
        const strikeY = cursorY - token.fontSizePx * 0.35;
        ctx.strokeStyle = strikeColor;
        ctx.lineWidth = Math.max(1, token.fontSizePx * 0.06);
        ctx.beginPath();
        ctx.moveTo(cursorX, strikeY);
        ctx.lineTo(cursorX + tokenWidth, strikeY);
        ctx.stroke();
      }
      cursorY += token.fontSizePx * 1.25 * lineSpacingMultiplier + extraPerLine;
    });
    if (direction === "ltr") {
      cursorX += column.width;
    }
  });

  const usedHeightBase = columns.reduce((max, column) => Math.max(max, column.height), 0) * lineSpacingMultiplier;
  const maxTokens = columns.reduce((max, column) => Math.max(max, column.tokens.length), 0);
  const extra = maxTokens > 1 ? extraPerLine * (maxTokens - 1) : 0;
  return Math.min(usedHeightBase + extra, height);
}

function emuToPt(value: number) {
  return (value / EMU_PER_INCH) * 72;
}

function emuToPx(value: number, scale: number) {
  return (value / EMU_PER_INCH) * PX_PER_INCH * scale;
}

async function canvasToDataUrl(canvas: OffscreenCanvas) {
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const buffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(new Uint8Array(buffer));
  return `data:image/png;base64,${base64}`;
}

function arrayBufferToBase64(data: Uint8Array) {
  let binary = "";
  for (let i = 0; i < data.length; i += 1) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

function ensureArray<T>(value: T | T[] | undefined) {
  if (!value) return [] as T[];
  return Array.isArray(value) ? value : [value];
}

function buildRuns(
  paragraph: XmlNode,
  scale: number,
  themeColors: ThemeColorMap,
  defaults: {
    sizePt: number;
    color: string;
    underline: boolean;
    underlineStyle: "sng" | "dbl" | "sngWrd" | "dblWrd" | "none";
    underlineColor: string;
    strike: boolean;
    strikeColor: string;
    bold: boolean;
    italic: boolean;
    outlineColor?: string;
    outlineWidthPx?: number;
  }
): TextRun[] {
  const runs = ensureArray<XmlNode>(paragraph?.["a:r"] as XmlNode | XmlNode[] | undefined);
  const fieldRuns = ensureArray<XmlNode>(paragraph?.["a:fld"] as XmlNode | XmlNode[] | undefined);
  const combined = [...runs, ...fieldRuns];
  const output: TextRun[] = [];
  let lastSizePt = defaults.sizePt;
  let lastColor = defaults.color;
  let lastUnderlineStyle = defaults.underlineStyle;
  let lastStrike = defaults.strike;
  let lastBold = defaults.bold;
  let lastItalic = defaults.italic;
  let lastOutlineColor = defaults.outlineColor;
  let lastOutlineWidth = defaults.outlineWidthPx;
  let lastUnderlineColor = defaults.underlineColor;
  let lastStrikeColor = defaults.strikeColor;

  combined.forEach((run) => {
    const text = (run?.["a:t"] as XmlNode | undefined)?._text;
    if (typeof text !== "string") return;
    const rPr = run?.["a:rPr"] as XmlNode | undefined;
    const sz = getAttr(rPr, "sz");
    const numeric = Number(sz);
    if (!Number.isNaN(numeric)) {
      lastSizePt = numeric / 100;
    }
    const runColor = getRunColor(run, themeColors) ?? lastColor;
    const runUnderlineStyle = getUnderlineStyle(rPr) ?? lastUnderlineStyle;
    const runUnderline = runUnderlineStyle !== "none";
    const runStrike = getStrike(rPr) ?? lastStrike;
    const runBold = getBooleanAttr(getAttr(rPr, "b")) ?? lastBold;
    const runItalic = getBooleanAttr(getAttr(rPr, "i")) ?? lastItalic;
    const outline = getTextOutline(rPr, themeColors, scale);
    const runUnderlineColor = getUnderlineColor(rPr, themeColors) ?? lastUnderlineColor ?? runColor;
    const runStrikeColor = getStrikeColor(rPr, themeColors) ?? lastStrikeColor ?? runColor;
    if (outline) {
      lastOutlineColor = outline.color;
      lastOutlineWidth = outline.widthPx;
    }
    lastColor = runColor;
    lastUnderlineStyle = runUnderlineStyle;
    lastStrike = runStrike;
    lastBold = runBold;
    lastItalic = runItalic;
    lastUnderlineColor = runUnderlineColor;
    lastStrikeColor = runStrikeColor;
    output.push({
      text,
      fontSizePx: lastSizePt * PT_TO_PX * scale,
      color: runColor,
      underline: runUnderline,
      underlineStyle: runUnderlineStyle,
      underlineColor: runUnderlineColor,
      strike: runStrike,
      strikeColor: runStrikeColor,
      bold: runBold,
      italic: runItalic,
      outlineColor: lastOutlineColor,
      outlineWidthPx: lastOutlineWidth,
    });
  });

  return output;
}

function tokenizeRuns(runs: TextRun[]) {
  const tokens: LayoutToken[] = [];
  runs.forEach((run) => {
    const parts = run.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (!part) return;
      if (part.includes("\n") || part.includes("\r")) {
        tokens.push({
          text: "\n",
          fontSizePx: run.fontSizePx,
          color: run.color,
          underline: run.underline,
          underlineStyle: run.underlineStyle,
          underlineColor: run.underlineColor,
          strike: run.strike,
          strikeColor: run.strikeColor,
          bold: run.bold,
          italic: run.italic,
          outlineColor: run.outlineColor,
          outlineWidthPx: run.outlineWidthPx,
          isWhitespace: true,
        });
        return;
      }
      tokens.push({
        text: part,
        fontSizePx: run.fontSizePx,
        color: run.color,
        underline: run.underline,
        underlineStyle: run.underlineStyle,
        underlineColor: run.underlineColor,
        strike: run.strike,
        strikeColor: run.strikeColor,
        bold: run.bold,
        italic: run.italic,
        outlineColor: run.outlineColor,
        outlineWidthPx: run.outlineWidthPx,
        isWhitespace: /^\s+$/.test(part),
      });
    });
  });
  return tokens;
}

function getDefaultLineHeight(runs: TextRun[]) {
  if (!runs.length) return 0;
  const max = runs.reduce((value, run) => Math.max(value, run.fontSizePx), 0);
  return max * 1.25;
}

function mapAlignment(algn?: string): CanvasTextAlign {
  switch (algn) {
    case "ctr":
      return "center";
    case "r":
      return "right";
    case "just":
      return "left";
    case "l":
    default:
      return "left";
  }
}

function getVerticalAlignment(textBody?: XmlNode) {
  const anchor = getAttr(getNode(textBody, "a:bodyPr"), "anchor");
  switch (anchor) {
    case "ctr":
      return "center";
    case "b":
      return "bottom";
    case "just":
    case "dist":
      return "justify";
    case "t":
    default:
      return "top";
  }
}

function normalizeTargetPath(target: string) {
  if (target.startsWith("../")) {
    return `ppt/${target.replace("../", "")}`;
  }
  if (target.startsWith("/")) {
    return target.replace(/^\/+/, "");
  }
  if (target.startsWith("ppt/")) {
    return target;
  }
  return `ppt/${target}`;
}

async function getThemeColors(zip: JSZip): Promise<ThemeColorMap> {
  const themeXml = await zip.file("ppt/theme/theme1.xml")?.async("text");
  if (!themeXml) return {};
  const doc = xml2js(themeXml, { compact: true }) as XmlNode;
  const theme = doc["a:theme"] as XmlNode | undefined;
  const elements = getNode(theme, "a:themeElements");
  const scheme = getNode(elements, "a:clrScheme");
  if (!scheme) return {};

  const map: ThemeColorMap = {};
  Object.keys(scheme).forEach((key) => {
    if (!key.startsWith("a:")) return;
    const colorNode = scheme[key] as XmlNode | undefined;
    const srgb = getAttr(getNode(colorNode, "a:srgbClr"), "val");
    const sys = getAttr(getNode(colorNode, "a:sysClr"), "lastClr");
    const value = typeof srgb === "string" ? srgb : typeof sys === "string" ? sys : null;
    if (value) {
      map[key.replace("a:", "")] = `#${value}`;
    }
  });
  return map;
}

function getFillColor(shape: XmlNode, themeColors: ThemeColorMap) {
  const fill = getNode(getNode(shape, "p:spPr"), "a:solidFill");
  if (!fill) return null;
  return resolveColor(fill, themeColors);
}

function getLineStyle(shape: XmlNode, themeColors: ThemeColorMap, scale: number) {
  const line = getNode(getNode(shape, "p:spPr"), "a:ln");
  if (!line) return null;
  const color = resolveColor(line, themeColors);
  if (!color) return null;
  const widthEmu = Number(getAttr(line, "w") ?? 0);
  const widthPx = Math.max(1, emuToPx(widthEmu, scale));
  const dashValue = getAttr(getNode(line, "a:prstDash"), "val");
  const lineJoin = resolveLineJoin(line);
  const dash = mapDash(dashValue, widthPx);
  return { color, widthPx, dash, lineJoin };
}

function resolveColor(node: XmlNode | undefined, themeColors: ThemeColorMap) {
  const srgb = getAttr(getNode(node, "a:srgbClr"), "val");
  if (typeof srgb === "string") {
    return `#${srgb}`;
  }

  const scheme = getNode(node, "a:schemeClr");
  const schemeVal = getAttr(scheme, "val");
  if (typeof schemeVal === "string") {
    const base = themeColors[schemeVal] ?? null;
    if (!base) return null;
    const tint = getAttr(getNode(scheme, "a:tint"), "val");
    const shade = getAttr(getNode(scheme, "a:shade"), "val");
    return applyTintShade(base, tint, shade);
  }
  return null;
}

function getRunColor(run: XmlNode, themeColors: ThemeColorMap) {
  const rPr = getNode(run, "a:rPr");
  const fill = getNode(rPr, "a:solidFill");
  if (!fill) return null;
  return resolveColor(fill, themeColors);
}

function getDefaultRunStyle(
  paragraph: XmlNode,
  textBody: XmlNode,
  scale: number,
  themeColors: ThemeColorMap
) {
  const pPr = getNode(paragraph, "a:pPr");
  const defRPr = getNode(pPr, "a:defRPr");
  const listStyle = getNode(textBody, "a:lstStyle");
  const lvl1 = getNode(listStyle, "a:lvl1pPr");
  const lvlDef = getNode(lvl1, "a:defRPr");
  const base = (defRPr ?? lvlDef) as XmlNode | undefined;

  const sizeAttr = getAttr(base, "sz");
  const sizeNum = Number(sizeAttr);
  const sizePt = !Number.isNaN(sizeNum) ? sizeNum / 100 : 18;
  const color = resolveColor(base?.["a:solidFill"] as XmlNode | undefined, themeColors) ?? "#111111";
  const underlineStyle = getUnderlineStyle(base) ?? "none";
  const underline = underlineStyle !== "none";
  const underlineColor = getUnderlineColor(base, themeColors) ?? color;
  const strikeColor = getStrikeColor(base, themeColors) ?? color;
  const strike = getStrike(base) ?? false;
  const bold = getBooleanAttr(getAttr(base, "b")) ?? false;
  const italic = getBooleanAttr(getAttr(base, "i")) ?? false;
  const outline = getTextOutline(base, themeColors, scale);

  return {
    sizePt,
    color,
    underline,
    underlineStyle,
    underlineColor,
    strike,
    strikeColor,
    bold,
    italic,
    outlineColor: outline?.color,
    outlineWidthPx: outline?.widthPx,
  };
}

function getUnderlineStyle(rPr?: XmlNode): UnderlineStyle | null {
  const value = getAttr(rPr, "u");
  if (value === "sng" || value === "dbl" || value === "sngWrd" || value === "dblWrd") return value;
  if (value === "none") return "none";
  return null;
}

function getStrike(rPr?: XmlNode) {
  const value = getAttr(rPr, "strike");
  if (value === "sngStrike" || value === "dblStrike") return true;
  if (value === "noStrike") return false;
  return null;
}

function getBooleanAttr(value: unknown) {
  if (value === "1" || value === "true" || value === true) return true;
  if (value === "0" || value === "false" || value === false) return false;
  return null;
}

function getTextOutline(rPr: XmlNode | undefined, themeColors: ThemeColorMap, scale: number) {
  const line = getNode(rPr, "a:ln");
  if (!line) return null;
  const color = resolveColor(line, themeColors);
  if (!color) return null;
  const widthEmu = Number(getAttr(line, "w") ?? 0);
  const widthPx = Math.max(1, emuToPx(widthEmu, scale));
  return { color, widthPx };
}

function getUnderlineColor(rPr: XmlNode | undefined, themeColors: ThemeColorMap) {
  if (!rPr) return null;
  const underlineFill = getNode(rPr, "a:uFill");
  if (underlineFill) {
    const color = resolveColor(underlineFill, themeColors);
    if (color) return color;
  }
  const solid = getNode(rPr, "a:solidFill");
  if (solid) {
    return resolveColor(solid, themeColors);
  }
  return null;
}

function getStrikeColor(rPr: XmlNode | undefined, themeColors: ThemeColorMap) {
  if (!rPr) return null;
  const solid = getNode(rPr, "a:solidFill");
  if (solid) {
    return resolveColor(solid, themeColors);
  }
  return null;
}

function getTextRotation(shape: XmlNode) {
  const xfrm = getNode(getNode(shape, "p:spPr"), "a:xfrm");
  const rot = Number(getAttr(xfrm, "rot") ?? 0);
  if (Number.isNaN(rot)) return 0;
  return (rot / 60000) * (Math.PI / 180);
}

function getVerticalFlow(textBody?: XmlNode) {
  const vert = getAttr(getNode(textBody, "a:bodyPr"), "vert");
  if (vert === "vert" || vert === "vert270") return vert;
  return null;
}

function setCanvasFont(ctx: OffscreenCanvasRenderingContext2D, token: TextRun) {
  const style = token.italic ? "italic" : "normal";
  const weight = token.bold ? "700" : "400";
  ctx.font = `${style} ${weight} ${token.fontSizePx}px Arial`;
}

function resolveLineJoin(line: XmlNode): CanvasLineJoin {
  const join = line?.["a:lnJoin"] as Record<string, unknown> | undefined;
  if (!join) return "miter";
  if (join["a:round"]) return "round";
  if (join["a:bevel"]) return "bevel";
  return "miter";
}

function mapDash(value: string | undefined, widthPx: number) {
  if (!value || value === "solid") return [];
  const unit = Math.max(1, widthPx);
  switch (value) {
    case "dash":
      return [6 * unit, 4 * unit];
    case "dashDot":
      return [6 * unit, 3 * unit, 1 * unit, 3 * unit];
    case "dot":
      return [1 * unit, 3 * unit];
    case "lgDash":
      return [10 * unit, 6 * unit];
    case "lgDashDot":
      return [10 * unit, 4 * unit, 2 * unit, 4 * unit];
    case "lgDashDotDot":
      return [10 * unit, 4 * unit, 2 * unit, 4 * unit, 2 * unit, 4 * unit];
    default:
      return [];
  }
}

function applyTintShade(color: string, tint?: string, shade?: string) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  let { r, g, b } = rgb;

  if (typeof tint === "string") {
    const amount = Number(tint) / 100000;
    if (!Number.isNaN(amount)) {
      r = Math.round(r + (255 - r) * amount);
      g = Math.round(g + (255 - g) * amount);
      b = Math.round(b + (255 - b) * amount);
    }
  }

  if (typeof shade === "string") {
    const amount = Number(shade) / 100000;
    if (!Number.isNaN(amount)) {
      r = Math.round(r * (1 - amount));
      g = Math.round(g * (1 - amount));
      b = Math.round(b * (1 - amount));
    }
  }

  return rgbToHex(r, g, b);
}

function hexToRgb(value: string) {
  const hex = value.replace("#", "");
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function drawShape(
  ctx: OffscreenCanvasRenderingContext2D,
  shape: Record<string, unknown>,
  xfrm: { x: number; y: number; width: number; height: number },
  scale: number,
  shouldFill: boolean,
  shouldStroke: boolean
) {
  const prst = getAttr(getNode(getNode(shape, "p:spPr"), "a:prstGeom"), "prst");
  const x = xfrm.x * scale;
  const y = xfrm.y * scale;
  const width = xfrm.width * scale;
  const height = xfrm.height * scale;

  if (prst === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    if (shouldFill) ctx.fill();
    if (shouldStroke) ctx.stroke();
    return;
  }

  if (prst === "roundRect") {
    const radius = Math.min(width, height) * 0.08;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (shouldFill) ctx.fill();
    if (shouldStroke) ctx.stroke();
    return;
  }

  if (shouldFill) {
    ctx.fillRect(x, y, width, height);
  }
  if (shouldStroke) {
    ctx.strokeRect(x, y, width, height);
  }
}

async function getBinaryFromZip(zip: JSZip, path: string) {
  return zip.file(path)?.async("uint8array");
}
