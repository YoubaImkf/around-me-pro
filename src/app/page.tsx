"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import SearchForm from "@/components/SearchForm";
import SearchResults, {
  type ExportSearchParams,
  type PageSizeOption
} from "@/components/SearchResults";
import type { EstablishmentRow } from "@/lib/establishments";
import { SearchPagination } from "@/types/company";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-zinc-100 rounded-2xl flex items-center justify-center border border-zinc-200/50 dark:bg-zinc-900/30 dark:border-zinc-800/50">
      <div className="flex flex-col items-center gap-2">
        <MapLoadingFallback title="Chargement de la carte interactive…" />
      </div>
    </div>
  )
});

import { Company, Etablissement } from "@/types/company";

function MapLoadingFallback({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-8 border-3 border-zinc-300 border-t-zinc-950 rounded-full animate-spin dark:border-zinc-800 dark:border-t-blue-500" />
      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{title}</span>
    </div>
  );
}

const CATEGORY_TO_SECTION: Record<string, string> = {
  tech: "J",
  engineering: "M",
  health_social: "Q",
  education: "P",
  construction: "F",
  hospitality: "I",
  finance_insurance: "K",
  industry: "C",
  retail: "G",
  arts_recreation: "R"
};

function categoryIdsToSections(categoryIds: string[]): string {
  return categoryIds
    .map((id) => CATEGORY_TO_SECTION[id] || "")
    .filter(Boolean)
    .join(",");
}

const defaultPagination: SearchPagination = {
  totalCompanies: 0,
  totalEstablishments: 0,
  page: 1,
  perPage: 25,
  totalPages: 1,
  establishmentsOnPage: 0,
  isEstablishmentCountExact: false
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentCity, setCurrentCity] = useState("");
  const [currentRadius, setCurrentRadius] = useState(10);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [onlyActive, setOnlyActive] = useState(true);
  const [nafCode, setNafCode] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentRow[]>([]);
  const [pagination, setPagination] = useState<SearchPagination>(defaultPagination);
  const [perPage, setPerPage] = useState<PageSizeOption>(25);

  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]); // Default map center loosely Paris coordinates
  const [selectedSiret, setSelectedSiret] = useState<string | null>(null);
  const [customCenter, setCustomCenter] = useState<[number, number] | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      const isChunkError =
        err &&
        (err.name === "ChunkLoadError" ||
          (err.message &&
            (err.message.includes("ChunkLoadError") ||
              err.message.includes("Failed to load chunk") ||
              err.message.includes("hmr-client"))));

      if (isChunkError) {
        event.preventDefault();
        if (process.env.NODE_ENV === "development") return;
        window.location.reload();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme || (systemDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const exportParams: ExportSearchParams | null = useMemo(() => {
    if (!hasSearched) return null;
    return {
      city: currentCity,
      radius: currentRadius,
      sections: categoryIdsToSections(selectedCategoryIds),
      naf: nafCode,
      onlyActive,
      lat: customCenter?.[0],
      lon: customCenter?.[1]
    };
  }, [
    hasSearched,
    currentCity,
    currentRadius,
    selectedCategoryIds,
    nafCode,
    onlyActive,
    customCenter
  ]);

  const executeSearch = useCallback(
    async (
      city: string,
      radius: number,
      categoryIds: string[],
      pageNumber: number = 1,
      activeCustomCenter: [number, number] | null = customCenter,
      activeOnlyActive: boolean = onlyActive,
      activeNafCode: string = nafCode,
      activePerPage: PageSizeOption = perPage
    ) => {
      setHasSearched(true);
      setLoading(true);
      setError(null);
      setSelectedSiret(null);

      try {
        const queryParams = new URLSearchParams({
          radius: radius.toString(),
          sections: categoryIdsToSections(categoryIds),
          page: pageNumber.toString(),
          per_page: activePerPage === "all" ? "all" : activePerPage.toString(),
          only_active: activeOnlyActive.toString()
        });

        if (activeNafCode) queryParams.append("naf", activeNafCode);

        if (activeCustomCenter) {
          queryParams.append("lat", activeCustomCenter[0].toString());
          queryParams.append("long", activeCustomCenter[1].toString());
          queryParams.append("city", city.startsWith("📍") ? city : "Point sur la carte");
        } else {
          queryParams.append("city", city);
        }

        const response = await fetch(`/api/companies?${queryParams.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Une erreur est survenue lors de la recherche.");
        }

        setCompanies(data.companies || []);
        setEstablishments(data.establishments || []);

        if (activeCustomCenter) {
          setMapCenter(activeCustomCenter);
          setCurrentCity(`📍 ${activeCustomCenter[0].toFixed(5)}, ${activeCustomCenter[1].toFixed(5)}`);
        } else {
          setMapCenter([data.city.latitude, data.city.longitude]);
          setCurrentCity(data.city.name);
        }
        setCurrentRadius(data.city.radius);

        setPagination(data.pagination || defaultPagination);
      } catch (err: unknown) {
        console.error("Search failed:", err);
        setError(err instanceof Error ? err.message : "Impossible de joindre le service de recherche.");
        setCompanies([]);
        setEstablishments([]);
      } finally {
        setLoading(false);
      }
    },
    [customCenter, onlyActive, nafCode, perPage]
  );

  const handleSearchSubmit = (params: {
    city: string;
    radius: number;
    categoryIds: string[];
    onlyActive: boolean;
    nafCode: string;
  }) => {
    setSelectedCategoryIds(params.categoryIds);
    setOnlyActive(params.onlyActive);
    setNafCode(params.nafCode);

    if (params.city.startsWith("📍")) {
      executeSearch(params.city, params.radius, params.categoryIds, 1, customCenter, params.onlyActive, params.nafCode);
    } else {
      setCustomCenter(null);
      executeSearch(params.city, params.radius, params.categoryIds, 1, null, params.onlyActive, params.nafCode);
    }
  };

  const handlePageChange = (newPage: number) => {
    executeSearch(currentCity, currentRadius, selectedCategoryIds, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePerPageChange = (newPerPage: PageSizeOption) => {
    setPerPage(newPerPage);
    executeSearch(currentCity, currentRadius, selectedCategoryIds, 1, customCenter, onlyActive, nafCode, newPerPage);
  };

  const handleSelectEstablishment = (_company: Company, establishment: Etablissement) => {
    setSelectedSiret(establishment.siret);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCustomCenter([lat, lng]);
    setMapCenter([lat, lng]);
    const coordLabel = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setCurrentCity(coordLabel);
    executeSearch(coordLabel, currentRadius, selectedCategoryIds, 1, [lat, lng], onlyActive);
  };

  const handleCitySelect = (cityName: string, coordinates: [number, number]) => {
    setMapCenter(coordinates);
    setCurrentCity(cityName);
    setCustomCenter(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#fafafa] dark:bg-[#09090b]">
      <header className="sticky top-0 z-40 h-14 bg-white/85 backdrop-blur-md border-b border-zinc-200/50 dark:bg-[#121214]/85 dark:border-zinc-800 px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-4.5 rounded-[2px] overflow-hidden shadow-xs border border-zinc-200/10" aria-hidden="true">
            <div className="bg-[#002639] w-1/3 h-full" />
            <div className="bg-[#FFFFFF] w-1/3 h-full" />
            <div className="bg-[#E21A2C] w-1/3 h-full" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Around Me Pro
            </h1>
            <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-sm border border-blue-100/30 dark:border-blue-900/20">
              Open Data
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>BAN API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>DINUM API</span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Changer de thème"
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-all cursor-pointer"
          >
            {theme === "light" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-amber-400">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 flex flex-col gap-4 w-full lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto pr-2 pb-6 custom-scrollbar">
          <SearchForm
            city={currentCity}
            radius={currentRadius}
            onlyActive={onlyActive}
            initialNafCode={nafCode}
            onSearch={handleSearchSubmit}
            loading={loading}
            selectedCategoryIds={selectedCategoryIds}
            setSelectedCategoryIds={setSelectedCategoryIds}
            onRadiusChange={setCurrentRadius}
            onCitySelect={handleCitySelect}
          />

          {customCenter && (
            <div className="bg-zinc-50 border border-zinc-200/50 p-3.5 rounded-lg flex items-center justify-between gap-3 text-xs text-zinc-900 dark:bg-zinc-900/10 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <span className="text-sm flex-shrink-0">📍</span>
                <div>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">Recherche géociblée active</p>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">
                    {customCenter[0].toFixed(5)}, {customCenter[1].toFixed(5)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCustomCenter(null);
                  if (currentCity) {
                    executeSearch(currentCity, currentRadius, selectedCategoryIds, 1, null);
                  }
                }}
                className="px-2 py-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 font-bold rounded-md text-[9px] cursor-pointer"
              >
                Réinitialiser
              </button>
            </div>
          )}

          <SearchResults
            establishments={establishments}
            loading={loading}
            error={error}
            selectedSiret={selectedSiret}
            onSelectEstablishment={handleSelectEstablishment}
            pagination={pagination}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            perPage={perPage}
            hasSearched={hasSearched}
            exportParams={exportParams}
          />
        </div>

        <div className="lg:col-span-7 w-full h-[350px] sm:h-[450px] lg:h-[calc(100vh-96px)] lg:sticky lg:top-[76px]">
          <Map
            center={mapCenter}
            radius={currentRadius}
            companies={companies}
            selectedSiret={selectedSiret}
            onSelectEstablishment={handleSelectEstablishment}
            onMapClick={handleMapClick}
            customCenter={customCenter}
            theme={theme}
          />
        </div>
      </main>
    </div>
  );
}
