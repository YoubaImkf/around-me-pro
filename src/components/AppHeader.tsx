"use client";

interface AppHeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  resultCount?: number;
  hasSearched?: boolean;
}

export default function AppHeader({
  theme,
  onToggleTheme,
  resultCount,
  hasSearched
}: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/50 bg-white/90 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-white/85 dark:border-zinc-800 dark:bg-[#121214]/90 dark:supports-[backdrop-filter]:bg-[#121214]/85 sm:px-6"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div
          className="flex h-3 w-4.5 shrink-0 overflow-hidden rounded-[2px] border border-zinc-200/10 shadow-xs"
          aria-hidden="true"
        >
          <div className="h-full w-1/3 bg-[#002639]" />
          <div className="h-full w-1/3 bg-white" />
          <div className="h-full w-1/3 bg-[#E21A2C]" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Around Me Pro
          </h1>
          {hasSearched && resultCount != null && (
            <p className="truncate text-[10px] font-medium text-zinc-500 dark:text-zinc-400 lg:hidden">
              {resultCount.toLocaleString("fr-FR")} établissement
              {resultCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <span className="hidden shrink-0 rounded-sm border border-blue-100/30 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 dark:border-blue-900/20 dark:bg-blue-950/40 dark:text-blue-400 sm:inline">
          Open Data
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-4 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 md:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            BAN API
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            DINUM API
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Changer de thème"
          className="touch-target cursor-pointer flex items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
        >
          {theme === "light" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
