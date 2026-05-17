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
      className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200/60 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#121214]/80 sm:px-6"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
        {/* Premium geographic map pin logo */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs active:scale-95 transition-all">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4.5 w-4.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
        </div>

        <div className="min-w-0">
          <h1 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 leading-tight">
            Around Me Pro
          </h1>
          {hasSearched && resultCount != null && (
            <p className="truncate text-[10px] font-bold text-zinc-400 dark:text-zinc-500 lg:hidden">
              {resultCount.toLocaleString("fr-FR")} établissement{resultCount > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <span className="hidden shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 sm:inline">
          Open Data
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {/* Beautiful connectivity pills */}
        <div className="hidden items-center gap-2 md:flex">
          <a
            href="https://adresse.data.gouv.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-zinc-50/50 px-2.5 py-0.5 text-[9px] font-bold text-zinc-500 transition-all hover:scale-102 hover:border-zinc-300 hover:bg-zinc-100/50 hover:text-zinc-800 active:scale-95 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            BAN API
            
            {/* Elegant Tooltip */}
            <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2.5 w-52 -translate-x-1/2 scale-95 rounded-lg border border-zinc-200 bg-white/95 p-2.5 text-left text-[10px] font-medium normal-case tracking-normal text-zinc-600 opacity-0 shadow-lg backdrop-blur-xs transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-300">
              <span className="mb-0.5 block font-bold text-zinc-900 dark:text-zinc-50">Base Adresse Nationale</span>
              Service officiel de géocodage de l'État. Permet de suggérer des adresses et de localiser précisément les établissements sur la carte.
            </span>
          </a>

          <a
            href="https://api.gouv.fr/les-api/api-recherche-entreprises"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-zinc-50/50 px-2.5 py-0.5 text-[9px] font-bold text-zinc-500 transition-all hover:scale-102 hover:border-zinc-300 hover:bg-zinc-100/50 hover:text-zinc-800 active:scale-95 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            DINUM API
            
            {/* Elegant Tooltip */}
            <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2.5 w-52 -translate-x-1/2 scale-95 rounded-lg border border-zinc-200 bg-white/95 p-2.5 text-left text-[10px] font-medium normal-case tracking-normal text-zinc-600 opacity-0 shadow-lg backdrop-blur-xs transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-300">
              <span className="mb-0.5 block font-bold text-zinc-900 dark:text-zinc-50">API Recherche d'Entreprises</span>
              Service de la Direction Interministérielle du Numérique. Permet d'interroger la base Sirene par géolocalisation et filtres.
            </span>
          </a>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Changer de thème"
          className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#1f1f21] dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 active:scale-95 transition-all duration-200"
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
