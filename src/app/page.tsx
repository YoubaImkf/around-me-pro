"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import GeoTargetBanner from "@/components/GeoTargetBanner";
import MobileTabBar, { type MobileView } from "@/components/MobileTabBar";
import SearchForm from "@/components/SearchForm";
import AppFooter from "@/components/AppFooter";
import SearchResults, {
  type ExportSearchParams,
  type PageSizeOption
} from "@/components/SearchResults";
import type { EstablishmentRow } from "@/lib/establishments";
import { SearchPagination } from "@/types/company";
import { Company, Etablissement } from "@/types/company";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[220px] w-full items-center justify-center rounded-xl border border-zinc-200/50 bg-zinc-100 dark:border-zinc-800/50 dark:bg-zinc-900/30 sm:min-h-[280px] lg:min-h-[300px]">
      <MapLoadingFallback title="Chargement de la carte…" />
    </div>
  )
});

function MapLoadingFallback({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950 dark:border-zinc-800 dark:border-t-blue-500" />
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

  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [selectedSiret, setSelectedSiret] = useState<string | null>(null);
  const [customCenter, setCustomCenter] = useState<[number, number] | null>(null);
  const [lastTextCity, setLastTextCity] = useState("");
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hasSearched, setHasSearched] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("search");

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

  useEffect(() => {
    // Trigger map resize recalculation when fullscreen toggles
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("resize"));
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreenMap]);

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
  }, [hasSearched, currentCity, currentRadius, selectedCategoryIds, nafCode, onlyActive, customCenter]);

  const goToResultsOnMobile = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileView("results");
    }
  }, []);

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
      if (!activeCustomCenter && city.startsWith("📍")) {
        return;
      }
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
          setLastTextCity(data.city.name);
        }
        setCurrentRadius(data.city.radius);

        setPagination(data.pagination || defaultPagination);
        goToResultsOnMobile();
      } catch (err: unknown) {
        console.error("Search failed:", err);
        setError(err instanceof Error ? err.message : "Impossible de joindre le service de recherche.");
        setCompanies([]);
        setEstablishments([]);
        goToResultsOnMobile();
      } finally {
        setLoading(false);
      }
    },
    [customCenter, onlyActive, nafCode, perPage, goToResultsOnMobile]
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
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileView("results");
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCustomCenter([lat, lng]);
    setMapCenter([lat, lng]);
    const coordLabel = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setCurrentCity(coordLabel);
  };

  const handleCitySelect = (cityName: string, coordinates: [number, number]) => {
    setMapCenter(coordinates);
    setCurrentCity(cityName);
    setCustomCenter(null);
  };

  const searchPanel = (
    <div className="flex w-full flex-col gap-3 sm:gap-4">
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
        <GeoTargetBanner
          coordinates={customCenter}
          onReset={() => {
            setCustomCenter(null);
            if (lastTextCity) {
              setCurrentCity(lastTextCity);
              executeSearch(lastTextCity, currentRadius, selectedCategoryIds, 1, null);
            } else {
              setHasSearched(false);
              setCurrentCity("");
              setCompanies([]);
              setEstablishments([]);
              setPagination(defaultPagination);
            }
          }}
        />
      )}
    </div>
  );

  const resultsPanel = (
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
      onOpenMap={() => setMobileView("map")}
    />
  );

  const mapPanel = (
    <div className={`flex-1 w-full flex flex-col relative z-0 ${
      mobileView === "map" 
        ? "h-[calc(100dvh-var(--header-height)-var(--tab-bar-height))]" 
        : "h-[350px] sm:h-[450px]"
    } lg:!h-full lg:min-h-0 ${
      isFullscreenMap 
        ? "rounded-none" 
        : "rounded-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm"
    }`}>
      <Map
        center={mapCenter}
        radius={currentRadius}
        companies={companies}
        selectedSiret={selectedSiret}
        onSelectEstablishment={handleSelectEstablishment}
        onMapClick={handleMapClick}
        customCenter={customCenter}
        theme={theme}
        isVisible={mobileView === "map" || (typeof window !== "undefined" && window.innerWidth >= 1024)}
        isFullscreen={isFullscreenMap}
      />

      {/* Floating Fullscreen Toggle Button - Desktop Only */}
      <button
        type="button"
        onClick={() => setIsFullscreenMap(!isFullscreenMap)}
        aria-label={isFullscreenMap ? "Mode normal" : "Mode plein écran"}
        title={isFullscreenMap ? "Mode normal" : "Mode plein écran"}
        className="hidden lg:flex absolute right-3.5 top-3.5 z-[500] h-9 w-9 cursor-pointer items-center justify-center rounded-xl border-0 bg-white text-zinc-700 shadow-md hover:bg-zinc-50 hover:text-zinc-950 active:scale-95 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-all"
      >
        {isFullscreenMap ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75v5.25m0 0H3.75M9 9L3.75 3.75M9 20.25v-5.25m0 0H3.75M9 15l-5.25 5.25M15 3.75v5.25m0 0h5.25M15 9l5.25-5.25M15 20.25v-5.25m0 0h5.25M15 15l5.25 5.25" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9V3.75m0 0h5.25m-5.25 0L9 9M3.75 15v5.25m0 0h5.25m-5.25 0L9 15M20.25 9V3.75m0 0h-5.25m5.25 0L15 9M20.25 15v5.25m0 0h-5.25m5.25 0l-5.25-5.25" />
          </svg>
        )}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-[#fafafa] dark:bg-[#09090b]">
      {!isFullscreenMap && (
        <AppHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          hasSearched={hasSearched}
          resultCount={pagination.totalEstablishments}
        />
      )}

      <main 
        className={`app-main-mobile mx-auto flex w-full max-w-[1440px] flex-1 flex-col relative ${
          isFullscreenMap 
            ? "lg:block lg:max-w-none lg:h-dvh lg:w-screen lg:p-0 lg:overflow-hidden" 
            : "lg:grid lg:grid-cols-12 lg:items-start lg:gap-3 lg:px-6 lg:py-5"
        } ${mobileView === "map" ? "p-0" : "px-4 py-3 sm:px-5 sm:py-4"}`}
      >
        {/* Mobile: single active panel */}
        <div className={`flex flex-col lg:hidden ${mobileView === "map" ? "h-[calc(100dvh-var(--header-height)-var(--tab-bar-height))] gap-0 w-full" : "gap-3"}`}>
          {mobileView === "search" && searchPanel}
          {mobileView === "results" && resultsPanel}
          {mobileView === "map" && mapPanel}
        </div>

        {/* Desktop: sidebar + map */}
        <div 
          className={
            isFullscreenMap
              ? "hidden lg:flex lg:flex-col lg:gap-3 lg:absolute lg:left-0 lg:top-0 lg:z-10 lg:w-[420px] lg:h-dvh lg:overflow-y-auto lg:pb-4 lg:pr-1 custom-scrollbar bg-white/95 dark:bg-[#09090b]/95 p-4 border-r border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl backdrop-blur-md"
              : "hidden lg:col-span-5 lg:flex lg:h-[calc(100dvh-var(--header-height)-6rem)] lg:flex-col lg:gap-3 lg:overflow-y-auto lg:pb-4 lg:pr-1 custom-scrollbar"
          }
        >
          {searchPanel}
          {resultsPanel}
        </div>

        <div 
          className={
            isFullscreenMap
              ? "hidden lg:block lg:h-dvh lg:w-full"
              : "hidden lg:col-span-7 lg:block lg:h-[calc(100dvh-var(--header-height)-6rem)] lg:sticky lg:top-[calc(var(--header-height)+1.25rem)]"
          }
        >
          {mapPanel}
        </div>
      </main>

      {!isFullscreenMap && <AppFooter />}

      <MobileTabBar
        activeView={mobileView}
        onViewChange={setMobileView}
        hasResults={hasSearched}
        resultsBadge={pagination.establishmentsOnPage}
      />
    </div>
  );
}
