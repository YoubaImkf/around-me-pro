"use client";

import React from "react";

export default function AppFooter() {
  return (
    <footer className="hidden h-14 shrink-0 border-t border-zinc-200/60 bg-white/80 px-6 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#121214]/80 lg:flex items-center justify-between text-[11px] text-zinc-550 dark:text-zinc-400 select-none">
      {/* Brand & Platform description */}
      <div className="flex items-center gap-2">
        <span className="font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 text-[10px]">
          Around Me Pro
        </span>
        <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">|</span>
        <span className="font-semibold text-zinc-400 dark:text-zinc-500">
          Plateforme d'exploration géographique des entreprises
        </span>
      </div>

      {/* Modern, micro-interactive badges with custom SVG icons and green overlay */}
      <div className="flex items-center gap-6 font-bold">
        {/* Shield Icon - Zéro Donnée */}
        <span className="flex items-center gap-2.5 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
          <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-emerald-50/60 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
          </span>
          Zéro donnée stockée
        </span>

        {/* Eye Slash Icon - Sans Cookies */}
        <span className="flex items-center gap-2.5 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
          <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-emerald-50/60 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
              />
            </svg>
          </span>
          Sans cookies
        </span>

        {/* Institution Icon - API Officielles */}
        <span className="flex items-center gap-2.5 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
          <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-emerald-50/60 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z"
              />
            </svg>
          </span>
          API officielles de l'État
        </span>
      </div>
    </footer>
  );
}
