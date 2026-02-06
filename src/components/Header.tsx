import { FileScan, Sparkles } from "lucide-react";

export function Header() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
          <FileScan className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">DocuSwap</h1>
          <p className="text-sm text-slate-400">Client-side conversion for images, data, and documents.</p>
        </div>
      </div>
      <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 md:flex">
        <Sparkles className="h-4 w-4 text-indigo-300" />
        Web Worker powered pipeline
      </div>
    </div>
  );
}
