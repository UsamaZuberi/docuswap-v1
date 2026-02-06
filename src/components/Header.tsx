import { FileScan, Sparkles } from "lucide-react";

export function Header() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 shadow-lg shadow-indigo-500/20">
          <FileScan className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">DocuSwap</h1>
          <p className="text-sm text-slate-400 md:text-base">
            Client-side conversion for images, data, and documents.
          </p>
        </div>
      </div>
      <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 md:self-auto">
        <Sparkles className="h-4 w-4 text-indigo-300" />
        Web Worker powered pipeline
      </div>
    </div>
  );
}
