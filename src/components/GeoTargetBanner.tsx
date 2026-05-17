"use client";

interface GeoTargetBannerProps {
  coordinates: [number, number];
  onReset: () => void;
}

export default function GeoTargetBanner({ coordinates, onReset }: GeoTargetBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/50 bg-zinc-50 p-3 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/20 sm:p-3.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-base" aria-hidden>
          📍
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-zinc-800 dark:text-zinc-200">Recherche géociblée</p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="touch-target-inline cursor-pointer shrink-0 rounded-lg border border-zinc-200 bg-white px-3 text-[11px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        Réinitialiser
      </button>
    </div>
  );
}
