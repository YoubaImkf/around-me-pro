"use client";

import { useState, useEffect, type ReactNode } from "react";

export type MobileView = "search" | "results" | "map";

interface MobileTabBarProps {
  activeView: MobileView;
  onViewChange: (view: MobileView) => void;
  hasResults: boolean;
  resultsBadge?: number;
}

const tabs: {
  id: MobileView;
  label: string;
  icon: (active: boolean) => ReactNode;
}[] = [
  {
    id: "search",
    label: "Recherche",
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} className="h-5 w-5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    )
  },
  {
    id: "results",
    label: "Résultats",
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} className="h-5 w-5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    )
  },
  {
    id: "map",
    label: "Carte",
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} className="h-5 w-5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
      </svg>
    )
  }
];

export default function MobileTabBar({
  activeView,
  onViewChange,
  hasResults,
  resultsBadge
}: MobileTabBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/80 bg-white/95 backdrop-blur-lg dark:border-zinc-800 dark:bg-[#121214]/95 lg:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex h-[var(--tab-bar-height)] max-w-lg items-stretch justify-around px-2">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          const disabled = tab.id === "results" && !hasResults;
          // Avoid hydration mismatch by waiting until mounted to set the disabled attribute.
          const isButtonDisabled = mounted ? disabled : false;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isButtonDisabled || undefined}
              onClick={() => onViewChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-semibold transition-all duration-250 ${
                isActive
                  ? "text-zinc-900 dark:text-zinc-50 active:scale-95"
                  : disabled
                    ? "cursor-not-allowed text-zinc-300 dark:text-zinc-600"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 active:scale-95"
              }`}
            >
              <span className="relative">
                {tab.icon(isActive)}
                {tab.id === "results" && resultsBadge != null && resultsBadge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[9px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {resultsBadge > 99 ? "99+" : resultsBadge}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 h-0.5 w-8 rounded-full bg-zinc-900 dark:bg-zinc-100" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
