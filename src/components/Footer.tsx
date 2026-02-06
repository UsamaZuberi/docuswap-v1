import { Globe, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-300 px-2 py-6 text-xs text-slate-600 dark:border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <p className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-slate-600 dark:text-slate-400">
          <span>Built with</span>
          <Heart className="h-3.5 w-3.5 text-red-500" fill="currentColor" />
          <span>by</span>
          <a
            className="text-slate-900 transition hover:text-black dark:text-slate-200 dark:hover:text-white"
            href="https://usamazuberi.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Muhammad Usama Zuberi
          </a>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700/70 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
            href="https://github.com/UsamaZuberi"
            target="_blank"
            rel="noreferrer"
          >
            <GitHubIcon className="h-3.5 w-3.5" />
            GitHub
          </a>
          <a
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700/70 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
            href="https://www.linkedin.com/in/usamazuberi/"
            target="_blank"
            rel="noreferrer"
          >
            <LinkedInIcon className="h-3.5 w-3.5" />
            LinkedIn
          </a>
          <a
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700/70 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
            href="https://usamazuberi.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            <Globe className="h-3.5 w-3.5" />
            Portfolio
          </a>
        </div>
      </div>
    </footer>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.455-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.004.071 1.532 1.034 1.532 1.034.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.564 9.564 0 0 1 2.504.337c1.909-1.296 2.748-1.026 2.748-1.026.546 1.378.203 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .268.18.58.688.482C19.138 20.193 22 16.437 22 12.017 22 6.484 17.523 2 12 2Z"
      />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452H17.21v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.004V9h3.105v1.561h.044c.433-.82 1.49-1.685 3.066-1.685 3.277 0 3.879 2.157 3.879 4.965v6.611ZM5.337 7.433a1.804 1.804 0 1 1 0-3.608 1.804 1.804 0 0 1 0 3.608ZM6.956 20.452H3.717V9h3.239v11.452Z" />
    </svg>
  );
}
