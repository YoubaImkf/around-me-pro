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
import {
  formatAddress,
  getEstablishmentDisplayName,
  type EstablishmentRow
} from "@/lib/establishments";
import { getCategoryBySection } from "@/lib/categories";
import { annuaireEtablissementUrl } from "@/lib/etablissementNormalize";
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

  const [selectedEstablishmentForMapSheet, setSelectedEstablishmentForMapSheet] = useState<{
    company: Company;
    etab: Etablissement;
  } | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("around_me_pro_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.currentCity) setCurrentCity(parsed.currentCity);
        if (parsed.currentRadius) setCurrentRadius(parsed.currentRadius);
        if (parsed.selectedCategoryIds) setSelectedCategoryIds(parsed.selectedCategoryIds);
        if (parsed.onlyActive !== undefined) setOnlyActive(parsed.onlyActive);
        if (parsed.nafCode !== undefined) setNafCode(parsed.nafCode);
        if (parsed.companies) setCompanies(parsed.companies);
        if (parsed.establishments) setEstablishments(parsed.establishments);
        if (parsed.pagination) setPagination(parsed.pagination);
        if (parsed.perPage) setPerPage(parsed.perPage);
        if (parsed.mapCenter) setMapCenter(parsed.mapCenter);
        if (parsed.selectedSiret !== undefined) setSelectedSiret(parsed.selectedSiret);
        if (parsed.customCenter !== undefined) setCustomCenter(parsed.customCenter);
        if (parsed.lastTextCity !== undefined) setLastTextCity(parsed.lastTextCity);
        if (parsed.hasSearched !== undefined) setHasSearched(parsed.hasSearched);
        if (parsed.mobileView) setMobileView(parsed.mobileView);
      }
    } catch (e) {
      console.error("Error loading cache:", e);
      try {
        localStorage.removeItem("around_me_pro_cache");
      } catch (innerEx) {}
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage on state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const stateToCache = {
        currentCity,
        currentRadius,
        selectedCategoryIds,
        onlyActive,
        nafCode,
        companies,
        establishments,
        pagination,
        perPage,
        mapCenter,
        selectedSiret,
        customCenter,
        lastTextCity,
        hasSearched,
        mobileView
      };
      localStorage.setItem("around_me_pro_cache", JSON.stringify(stateToCache));
    } catch (e) {
      console.error("Error writing cache:", e);
    }
  }, [
    isLoaded,
    currentCity,
    currentRadius,
    selectedCategoryIds,
    onlyActive,
    nafCode,
    companies,
    establishments,
    pagination,
    perPage,
    mapCenter,
    selectedSiret,
    customCenter,
    lastTextCity,
    hasSearched,
    mobileView
  ]);

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
    coordinates?: [number, number] | null;
  }) => {
    setSelectedCategoryIds(params.categoryIds);
    setOnlyActive(params.onlyActive);
    setNafCode(params.nafCode);

    if (params.city.startsWith("📍")) {
      executeSearch(params.city, params.radius, params.categoryIds, 1, customCenter, params.onlyActive, params.nafCode);
    } else if (params.coordinates) {
      setCustomCenter(params.coordinates);
      executeSearch(params.city, params.radius, params.categoryIds, 1, params.coordinates, params.onlyActive, params.nafCode);
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

  const handleSelectEstablishment = (company: Company, establishment: Etablissement, source: "map" | "list" = "list") => {
    setSelectedSiret(establishment.siret);
    setSelectedEstablishmentForMapSheet({ company, etab: establishment });
    if (source === "list" && typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileView("map");
    }
  };

  const handleLongPressEstablishment = (company: Company, establishment: Etablissement) => {
    setSelectedSiret(establishment.siret);
    setSelectedEstablishmentForMapSheet({ company, etab: establishment });
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCustomCenter([lat, lng]);
    setMapCenter([lat, lng]);
    const coordLabel = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setCurrentCity(coordLabel);
    setSelectedEstablishmentForMapSheet(null);
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
        onLongPressEstablishment={handleLongPressEstablishment}
        onMapClick={handleMapClick}
        customCenter={customCenter}
        theme={theme}
        isVisible={mobileView === "map" || (typeof window !== "undefined" && window.innerWidth >= 1024)}
        isFullscreen={isFullscreenMap}
      />

      {selectedEstablishmentForMapSheet && (
        <div className="absolute bottom-3.5 left-3.5 right-3.5 z-[1000] p-4 bg-white/95 dark:bg-[#18181b]/95 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl backdrop-blur-md mobile-details-sheet-active select-none sm:hidden">
          {/* Header with name and close button */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 space-y-1">
              <h4 className="line-clamp-2 text-xs font-black text-zinc-950 dark:text-zinc-50 leading-tight">
                {getEstablishmentDisplayName(
                  selectedEstablishmentForMapSheet.company,
                  selectedEstablishmentForMapSheet.etab
                )}
              </h4>
              <p className="line-clamp-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                Raison sociale : {selectedEstablishmentForMapSheet.company.nomComplet}
              </p>
            </div>
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedEstablishmentForMapSheet(null)}
              className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              aria-label="Fermer les détails"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {selectedEstablishmentForMapSheet.etab.distance != null && (
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-extrabold text-zinc-600 dark:text-zinc-300">
                {selectedEstablishmentForMapSheet.etab.distance} km
              </span>
            )}
            {getCategoryBySection(selectedEstablishmentForMapSheet.company.secteur) && (
              <span
                className="inline-flex max-w-[130px] truncate rounded px-1.5 py-0.5 text-[9px] font-bold border"
                style={{
                  backgroundColor: `${getCategoryBySection(selectedEstablishmentForMapSheet.company.secteur)?.color}12`,
                  borderColor: `${getCategoryBySection(selectedEstablishmentForMapSheet.company.secteur)?.color}30`,
                  color: getCategoryBySection(selectedEstablishmentForMapSheet.company.secteur)?.color
                }}
              >
                {getCategoryBySection(selectedEstablishmentForMapSheet.company.secteur)?.label}
              </span>
            )}
            <span
              className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                selectedEstablishmentForMapSheet.etab.statut === "Actif"
                  ? "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
              }`}
            >
              {selectedEstablishmentForMapSheet.etab.statut === "Actif" ? "Actif" : "Fermé"}
            </span>
          </div>

          {/* Address */}
          <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 leading-normal mb-3">
            {formatAddress(selectedEstablishmentForMapSheet.etab)}
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${getEstablishmentDisplayName(
                  selectedEstablishmentForMapSheet.company,
                  selectedEstablishmentForMapSheet.etab
                )} ${formatAddress(selectedEstablishmentForMapSheet.etab)}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[10px] font-extrabold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 transition-all shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-1 h-3 w-3 text-zinc-400 shrink-0">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 003.051 2.206l.018.008.007.003zM10 13a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
              </svg>
              Itinéraire
            </a>
            <a
              href={annuaireEtablissementUrl(selectedEstablishmentForMapSheet.etab.siret)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[10px] font-extrabold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300 dark:hover:bg-zinc-800/80 transition-all shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-1 h-3 w-3 text-zinc-400 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              Fiche Info
            </a>
          </div>
        </div>
      )}

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
        {/* Mobile: single active panel - preserved in DOM for instant tab switching and state cache */}
        <div className={`flex flex-col lg:hidden w-full flex-1 min-h-0 ${
          mobileView === "map" 
            ? "h-[calc(100dvh-var(--header-height)-var(--tab-bar-height))] gap-0" 
            : "gap-3"
        }`}>
          <div className={mobileView === "search" ? "flex flex-col gap-3 w-full" : "hidden"} id="mobile-tab-search">
            {searchPanel}
          </div>
          <div className={mobileView === "results" ? "flex flex-col gap-3 w-full" : "hidden"} id="mobile-tab-results">
            {resultsPanel}
          </div>
          <div className={`w-full flex-1 min-h-0 ${mobileView === "map" ? "flex flex-col h-full" : "hidden"}`} id="mobile-tab-map">
            {mapPanel}
          </div>
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
