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
            if (currentCity) {
              executeSearch(currentCity, currentRadius, selectedCategoryIds, 1, null);
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
    <div className={`flex-1 w-full flex flex-col relative z-0 ${mobileView === "map" ? "h-[calc(100dvh-var(--header-height)-var(--tab-bar-height))]" : "h-[350px] sm:h-[450px]"} lg:!h-full lg:min-h-0`}>
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
      />
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-[#fafafa] dark:bg-[#09090b]">
      <AppHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        hasSearched={hasSearched}
        resultCount={pagination.totalEstablishments}
      />

      <main 
        className={`app-main-mobile mx-auto flex w-full max-w-[1440px] flex-1 flex-col lg:grid lg:grid-cols-12 lg:items-start lg:gap-5 lg:px-6 lg:py-5 ${
          mobileView === "map" ? "p-0" : "px-4 py-3 sm:px-5 sm:py-4"
        }`}
      >
        {/* Mobile: single active panel */}
        <div className={`flex flex-col lg:hidden ${mobileView === "map" ? "h-[calc(100dvh-var(--header-height)-var(--tab-bar-height))] gap-0 w-full" : "gap-3"}`}>
          {mobileView === "search" && searchPanel}
          {mobileView === "results" && resultsPanel}
          {mobileView === "map" && mapPanel}
        </div>

        {/* Desktop: sidebar + map */}
        <div className="hidden lg:col-span-5 lg:flex lg:max-h-[calc(100dvh-var(--header-height)-6rem)] lg:flex-col lg:gap-4 lg:overflow-y-auto lg:pb-6 lg:pr-1 custom-scrollbar">
          {searchPanel}
          {resultsPanel}
        </div>

        <div className="hidden lg:col-span-7 lg:block lg:h-[calc(100dvh-var(--header-height)-6rem)] lg:sticky lg:top-[calc(var(--header-height)+1.25rem)]">
          {mapPanel}
        </div>
      </main>

      <AppFooter />

      <MobileTabBar
        activeView={mobileView}
        onViewChange={setMobileView}
        hasResults={hasSearched}
        resultsBadge={pagination.establishmentsOnPage}
      />
    </div>
  );
}
