"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getCategoryBySection } from "@/lib/categories";
import { exportToExcel } from "@/lib/excelExport";
import {
  EXPORT_COLUMNS,
  formatAddress,
  getActivityLabel,
  getEstablishmentDisplayName,
  hasContactInfo,
  type EstablishmentRow
} from "@/lib/establishments";
import { annuaireEtablissementUrl } from "@/lib/etablissementNormalize";
import { Company, Etablissement, SearchPagination } from "@/types/company";

export type PageSizeOption = 10 | 25 | 50 | 100 | "all";

export interface ExportSearchParams {
  city: string;
  radius: number;
  sections: string;
  naf: string;
  onlyActive: boolean;
  lat?: number;
  lon?: number;
}

interface SearchResultsProps {
  establishments: EstablishmentRow[];
  loading: boolean;
  error: string | null;
  selectedSiret: string | null;
  onSelectEstablishment: (company: Company, establishment: Etablissement) => void;
  pagination: SearchPagination;
  onPageChange: (newPage: number) => void;
  onPerPageChange: (perPage: PageSizeOption) => void;
  perPage: PageSizeOption;
  hasSearched: boolean;
  exportParams: ExportSearchParams | null;
}

type SortField = "name" | "distance" | "status";
type SortOrder = "asc" | "desc";

const PAGE_SIZE_OPTIONS: { value: PageSizeOption; label: string }[] = [
  { value: 10, label: "10" },
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: "all", label: "Tout" }
];

function formatCount(n: number): string {
  if (n >= 10000) return "+ de 10 000";
  return n.toLocaleString("fr-FR");
}

function PlaceholderPanel({
  title,
  description,
  loading = false,
  variant = "default"
}: {
  title: string;
  description?: string;
  loading?: boolean;
  variant?: "default" | "error";
}) {
  if (loading) {
    return (
      <LoadingSpinner title={title} />
    );
  }

  const borderClass =
    variant === "error"
      ? "border-rose-200/50 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10"
      : "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900/30";

  return (
    <div className={`rounded-xl border p-8 text-center ${borderClass}`}>
      <p
        className={`text-sm font-semibold ${
          variant === "error" ? "text-rose-800 dark:text-rose-300" : "text-zinc-800 dark:text-zinc-200"
        }`}
      >
        {title}
      </p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}

function LoadingSpinner({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-300" />
      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{title}</span>
    </div>
  );
}

export default function SearchResults({
  establishments,
  loading,
  error,
  selectedSiret,
  onSelectEstablishment,
  pagination,
  onPageChange,
  onPerPageChange,
  perPage,
  hasSearched,
  exportParams
}: SearchResultsProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedSiret) {
      document.getElementById(`etab-card-${selectedSiret}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  }, [selectedSiret]);

  const sortedEstablishments = useMemo(() => {
    const list = [...establishments];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = getEstablishmentDisplayName(a.company, a.etab)
          .toLowerCase()
          .localeCompare(getEstablishmentDisplayName(b.company, b.etab).toLowerCase(), "fr");
      } else if (sortField === "distance") {
        cmp = (a.etab.distance ?? 999) - (b.etab.distance ?? 999);
      } else {
        cmp = a.etab.statut.localeCompare(b.etab.statut, "fr");
      }
      if (cmp === 0 && a.etab.estSiege !== b.etab.estSiege) {
        cmp = a.etab.estSiege ? 1 : -1;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return list;
  }, [establishments, sortField, sortOrder]);

  const rangeStart =
    pagination.establishmentsOnPage === 0
      ? 0
      : (pagination.page - 1) * pagination.perPage + 1;
  const rangeEnd = rangeStart + pagination.establishmentsOnPage - 1;

  const handleExport = async () => {
    if (!exportParams || exporting) return;
    setExporting(true);
    setExportError(null);

    try {
      const query = new URLSearchParams({
        radius: exportParams.radius.toString(),
        sections: exportParams.sections,
        only_active: exportParams.onlyActive.toString()
      });
      if (exportParams.naf) query.append("naf", exportParams.naf);
      if (exportParams.lat != null && exportParams.lon != null) {
        query.append("lat", exportParams.lat.toString());
        query.append("long", exportParams.lon.toString());
        query.append("city", exportParams.city);
      } else {
        query.append("city", exportParams.city);
      }

      const res = await fetch(`/api/companies/export?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export échoué");

      const exportData = data.rows || [];
      if (exportData.length === 0) {
        setExportError("Aucun établissement à exporter pour cette recherche.");
        return;
      }

      const suffix = data.meta?.truncated ? "-partiel" : "";
      await exportToExcel(
        exportData,
        [...EXPORT_COLUMNS],
        "Établissements",
        `etablissements-${new Date().toISOString().slice(0, 10)}${suffix}`
      );
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  if (!hasSearched) {
    return (
      <PlaceholderPanel
        title="Découvrez des établissements à proximité"
        description="Saisissez une ville, sélectionnez vos secteurs d'activité, puis lancez la recherche. Vous pouvez aussi cliquer sur la carte pour cibler une zone."
      />
    );
  }

  if (loading) {
    return <PlaceholderPanel title="Chargement des établissements…" loading />;
  }

  if (error) {
    return <PlaceholderPanel title={error} variant="error" />;
  }

  if (sortedEstablishments.length === 0) {
    return (
      <PlaceholderPanel
        title="Aucun établissement trouvé"
        description="Élargissez le rayon ou modifiez les filtres d'activité."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Établissements</h3>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {formatCount(pagination.totalEstablishments)}
                {!pagination.isEstablishmentCountExact && "+"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {rangeStart > 0 && (
                <>
                  Affichage {rangeStart}–{rangeEnd} sur{" "}
                  {pagination.isEstablishmentCountExact
                    ? formatCount(pagination.totalEstablishments)
                    : `au moins ${formatCount(pagination.totalEstablishments)}`}{" "}
                  établissement{pagination.totalEstablishments > 1 ? "s" : ""}
                  {" · "}
                </>
              )}
              {formatCount(pagination.totalCompanies)} entreprise
              {pagination.totalCompanies > 1 ? "s" : ""} correspondante
              {pagination.totalCompanies > 1 ? "s" : ""}
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              L&apos;export Excel inclut{" "}
              <span className="font-medium text-zinc-600 dark:text-zinc-300">tous les résultats</span>, pas
              seulement cette page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split("-") as [SortField, SortOrder];
                setSortField(f);
                setSortOrder(o);
              }}
              aria-label="Trier les résultats"
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="name-asc">Nom A→Z</option>
              <option value="name-desc">Nom Z→A</option>
              <option value="distance-asc">Distance ↑</option>
              <option value="distance-desc">Distance ↓</option>
              <option value="status-asc">Statut</option>
            </select>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !exportParams}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {exporting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
                  Export…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                  </svg>
                  Exporter tout
                </>
              )}
            </button>
          </div>
        </div>
        {exportError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{exportError}</p>}
      </div>

      <ul className="flex flex-col gap-2.5" role="list">
        {sortedEstablishments.map(({ company, etab }) => {
          const displayName = getEstablishmentDisplayName(company, etab);
          const category = getCategoryBySection(company.secteur);
          const isSelected = selectedSiret === etab.siret;
          const isActive = etab.statut === "Actif";
          const showDetails = detailsOpen[etab.siret];
          const gMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${displayName} ${formatAddress(etab)}`
          )}`;
          const annuaireLink = annuaireEtablissementUrl(etab.siret);

          return (
            <li key={etab.siret}>
              <article
                id={`etab-card-${etab.siret}`}
                onClick={() => onSelectEstablishment(company, etab)}
                className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900/10 dark:border-zinc-100 dark:bg-zinc-800/50"
                    : "border-zinc-200/80 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:border-zinc-700"
                }`}
              >
                <header className="mb-3 min-w-0">
                  <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                    {displayName}
                  </h4>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="text-zinc-400">Raison sociale · </span>
                    {company.nomComplet}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {category && (
                      <span
                        className="inline-flex max-w-[200px] truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${category.color}12`,
                          borderColor: `${category.color}30`,
                          color: category.color
                        }}
                      >
                        {category.label}
                      </span>
                    )}
                    <span
                      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                        isActive
                          ? "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
                      }`}
                    >
                      {isActive ? "Actif" : "Fermé"}
                    </span>
                    {etab.estSiege && (
                      <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                        Siège
                      </span>
                    )}
                    {etab.distance != null && (
                      <span className="text-[10px] font-medium text-zinc-400">{etab.distance} km</span>
                    )}
                  </div>
                </header>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      Activité
                    </p>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      {getActivityLabel(etab, company)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      Adresse
                    </p>
                    <p className="font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {formatAddress(etab)}
                    </p>
                  </div>
                  {hasContactInfo(etab) && (
                    <div>
                      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        Contact
                      </p>
                      <div className="flex flex-col gap-0.5 text-zinc-700 dark:text-zinc-300">
                        {!/non communiqué/i.test(etab.telephone) && <span>{etab.telephone}</span>}
                        {!/non communiqué/i.test(etab.email) && <span>{etab.email}</span>}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailsOpen((prev) => ({ ...prev, [etab.siret]: !prev[etab.siret] }));
                  }}
                  className="mt-3 flex w-full items-center justify-between border-t border-zinc-100 pt-2.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:border-zinc-800"
                >
                  <span>Identifiants administratifs</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-3.5 w-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {showDetails && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[10px] text-zinc-500">
                    <div>
                      <dt className="text-zinc-400">SIRET</dt>
                      <dd>{etab.siret}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-400">SIREN</dt>
                      <dd>{company.siren}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-zinc-400">Code NAF</dt>
                      <dd>{etab.codeNaf}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-zinc-400">Effectif</dt>
                      <dd className="font-sans">{etab.effectifSalarie}</dd>
                    </div>
                  </dl>
                )}

                <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <a
                    href={gMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Itinéraire
                  </a>
                  <a
                    href={annuaireLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Fiche établissement
                  </a>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-medium">Par page</span>
            <select
              value={perPage}
              onChange={(e) => {
                const v = e.target.value;
                onPerPageChange(v === "all" ? "all" : (parseInt(v, 10) as PageSizeOption));
              }}
              disabled={loading}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={String(opt.value)} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => onPageChange(pagination.page - 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700"
              >
                Précédent
              </button>
              <span className="text-xs text-zinc-500">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => onPageChange(pagination.page + 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
