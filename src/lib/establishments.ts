import { getCategoryBySection } from "@/lib/categories";
import { annuaireEtablissementUrl } from "@/lib/etablissementNormalize";
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

/** Primary title: establishment name, never "Company — City" when we have a real trade name. */
export function getEstablishmentDisplayName(_company: Company, etab: Etablissement): string {
  return etab.nomEtablissement?.trim() || etab.enseigne?.trim() || "Établissement";
}

export function getActivityLabel(etab: Etablissement, company?: Company): string {
  const code = etab.codeNaf || company?.codeNaf;
  const libelle = etab.libelleNaf?.trim();

  if (code && libelle) {
    return `${code} · ${libelle}`;
  }
  if (libelle) return libelle;
  if (code && code !== "Inconnu") {
    const category = company ? getCategoryBySection(company.secteur) : undefined;
    if (category?.label) return `${code} · ${category.label}`;
    return code;
  }
  if (company) {
    const category = getCategoryBySection(company.secteur);
    return category?.label || "Activité non renseignée";
  }
  return "Activité non renseignée";
}

/** DINUM `adresse` is already the full postal address — do not append CP/ville again. */
export function formatAddress(etab: Etablissement): string {
  return etab.adresse?.trim() || `${etab.codePostal} ${etab.commune}`.trim();
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
  "Fiche établissement": string;
}

export function toExportRow(
  { company, etab }: EstablishmentRow,
  index: number
): ExportRow {
  const displayName = getEstablishmentDisplayName(company, etab);
  const mapsQuery = encodeURIComponent(`${displayName} ${formatAddress(etab)}`);

  return {
    Index: index + 1,
    "Nom de l'établissement": displayName,
    "Raison sociale": company.nomComplet,
    SIRET: etab.siret,
    SIREN: company.siren,
    "Type d'établissement": etab.estSiege ? "Siège social" : "Établissement",
    Statut: etab.statut,
    Adresse: formatAddress(etab),
    "Code postal": etab.codePostal,
    Ville: etab.commune,
    Activité: getActivityLabel(etab, company),
    "Code NAF": etab.codeNaf,
    "Taille d'effectif": etab.effectifSalarie,
    "Distance (km)": etab.distance ?? "",
    "Lien Google Maps": `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
    "Fiche établissement": annuaireEtablissementUrl(etab.siret)
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
  { header: "Fiche établissement", key: "Fiche établissement" }
] as const;
