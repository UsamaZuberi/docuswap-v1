import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-300 px-2 py-6 text-xs text-slate-600 dark:border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <p className="flex items-center gap-2 tracking-wide text-slate-600 dark:text-slate-500">
          Built with
          <Heart className="h-3.5 w-3.5 text-red-500" fill="currentColor" />
          by{" "}
          <a
            className="text-slate-900 transition hover:text-black dark:text-slate-200 dark:hover:text-white"
            href="https://usamazuberi.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Muhammad Usama Zuberi
          </a>
        </p>
        <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-500">
          <a className="transition hover:text-slate-900 dark:hover:text-slate-200" href="https://github.com/UsamaZuberi" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <span className="text-slate-400 dark:text-slate-700">/</span>
          <a className="transition hover:text-slate-900 dark:hover:text-slate-200" href="https://www.linkedin.com/in/usamazuberi/" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <span className="text-slate-400 dark:text-slate-700">/</span>
          <a className="transition hover:text-slate-900 dark:hover:text-slate-200" href="https://usamazuberi.vercel.app/" target="_blank" rel="noreferrer">
            Portfolio
          </a>
        </div>
      </div>
    </footer>
  );
}
