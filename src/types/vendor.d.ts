declare module "mammoth/mammoth.browser" {
  export interface MammothResult {
    value: string;
    messages?: Array<{ type: string; message: string }>;
  }

  export function convertToHtml(options: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
}

declare module "html2pdf.js" {
  type Html2PdfWorker = {
    from: (source: HTMLElement) => Html2PdfWorker;
    set: (options: Record<string, unknown>) => Html2PdfWorker;
    outputPdf?: (type: "blob") => Promise<Blob>;
    output?: (type: "blob") => Promise<Blob>;
    toPdf?: () => Promise<{ output: (type: "blob") => Promise<Blob> }> | { output: (type: "blob") => Promise<Blob> };
  };

  type Html2PdfFactory = () => Html2PdfWorker;
  const html2pdf: Html2PdfFactory;
  export default html2pdf;
}

declare module "docx-preview" {
  export interface RenderOptions {
    className?: string;
    ignoreWidth?: boolean;
    ignoreHeight?: boolean;
    ignoreFonts?: boolean;
    renderChanges?: boolean;
    useBase64URL?: boolean;
    renderHeaders?: boolean;
    renderFooters?: boolean;
    experimental?: boolean;
  }

  export function renderAsync(
    docx: ArrayBuffer,
    container: HTMLElement,
    stylesContainer?: HTMLElement | null,
    options?: RenderOptions
  ): Promise<void>;
}
