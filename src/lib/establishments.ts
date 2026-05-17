import { getCategoryBySection } from "@/lib/categories";
import { Company, Etablissement } from "@/types/company";

export interface EstablishmentRow {
  company: Company;
  etab: Etablissement;
}

/** Flatten companies into establishment rows, operational sites before sièges. */
export function flattenEstablishments(companies: Company[]): EstablishmentRow[] {
  const rows = companies.flatMap((company) =>
    company.etablissements.map((etab) => ({ company, etab }))
  );
  return sortEstablishmentRows(rows);
}

export function sortEstablishmentRows(rows: EstablishmentRow[]): EstablishmentRow[] {
  return [...rows].sort((a, b) => {
    if (a.etab.estSiege !== b.etab.estSiege) {
      return a.etab.estSiege ? 1 : -1;
    }
    const distA = a.etab.distance ?? Infinity;
    const distB = b.etab.distance ?? Infinity;
    return distA - distB;
  });
}

/** Primary display name: trade name / branch context, not siège framing. */
export function getEstablishmentDisplayName(company: Company, etab: Etablissement): string {
  if (etab.enseigne?.trim()) {
    return etab.enseigne.trim();
  }
  if (!etab.estSiege && etab.commune) {
    return `${company.nomComplet} — ${etab.commune}`;
  }
  return company.nomComplet;
}

export function getActivityLabel(company: Company): string {
  if (company.libelleNaf?.trim()) {
    return company.libelleNaf.trim();
  }
  const category = getCategoryBySection(company.secteur);
  const naf = company.codeNaf && company.codeNaf !== "Inconnu" ? company.codeNaf : "";
  if (naf && category?.label) {
    return `${naf} · ${category.label}`;
  }
  return category?.label || naf || "Activité non renseignée";
}

export function formatAddress(etab: Etablissement): string {
  const parts = [etab.adresse, `${etab.codePostal} ${etab.commune}`.trim()].filter(Boolean);
  return parts.join(", ");
}

export function hasContactInfo(etab: Etablissement): boolean {
  const placeholder = /non communiqué|non renseigné/i;
  return (
    (!placeholder.test(etab.telephone) && !!etab.telephone) ||
    (!placeholder.test(etab.email) && !!etab.email) ||
    (!placeholder.test(etab.siteWeb) && !!etab.siteWeb)
  );
}

export interface ExportRow {
  Index: number;
  "Nom de l'établissement": string;
  "Raison sociale": string;
  SIRET: string;
  SIREN: string;
  "Type d'établissement": string;
  Statut: string;
  Adresse: string;
  "Code postal": string;
  Ville: string;
  Activité: string;
  "Code NAF": string;
  "Taille d'effectif": string;
  "Distance (km)": number | string;
  "Lien Google Maps": string;
  "Fiche administrative": string;
}

export function toExportRow(
  { company, etab }: EstablishmentRow,
  index: number
): ExportRow {
  const category = getCategoryBySection(company.secteur);
  const mapsQuery = encodeURIComponent(
    `${getEstablishmentDisplayName(company, etab)} ${formatAddress(etab)}`
  );

  return {
    Index: index + 1,
    "Nom de l'établissement": getEstablishmentDisplayName(company, etab),
    "Raison sociale": company.nomComplet,
    SIRET: etab.siret,
    SIREN: company.siren,
    "Type d'établissement": etab.estSiege ? "Siège social" : "Établissement",
    Statut: etab.statut,
    Adresse: etab.adresse,
    "Code postal": etab.codePostal,
    Ville: etab.commune,
    Activité: getActivityLabel(company),
    "Code NAF": company.codeNaf,
    "Taille d'effectif": company.effectifSalarie,
    "Distance (km)": etab.distance ?? "",
    "Lien Google Maps": `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
    "Fiche administrative": `https://annuaire-entreprises.data.gouv.fr/entreprise/${company.siren}`
  };
}

export const EXPORT_COLUMNS = [
  { header: "#", key: "Index" },
  { header: "Nom de l'établissement", key: "Nom de l'établissement" },
  { header: "Raison sociale", key: "Raison sociale" },
  { header: "SIRET", key: "SIRET" },
  { header: "SIREN", key: "SIREN" },
  { header: "Type d'établissement", key: "Type d'établissement" },
  { header: "Statut", key: "Statut" },
  { header: "Adresse", key: "Adresse" },
  { header: "Code postal", key: "Code postal" },
  { header: "Ville", key: "Ville" },
  { header: "Activité", key: "Activité" },
  { header: "Code NAF", key: "Code NAF" },
  { header: "Taille d'effectif", key: "Taille d'effectif" },
  { header: "Distance (km)", key: "Distance (km)" },
  { header: "Lien Google Maps", key: "Lien Google Maps" },
  { header: "Fiche administrative", key: "Fiche administrative" }
] as const;
