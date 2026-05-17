import { getNafCodeByCode } from "@/lib/nafCodes";
import { getEmployeeSize } from "@/lib/employeeSize";

/** Extract establishment trade name from DINUM matching_etablissements payload. */
export function resolveEstablishmentName(etab: Record<string, unknown>, companyName: string): string {
  const listeEnseignes = etab.liste_enseignes;
  if (Array.isArray(listeEnseignes)) {
    for (const item of listeEnseignes) {
      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }
    }
  }

  const nomCommercial = etab.nom_commercial;
  if (typeof nomCommercial === "string" && nomCommercial.trim()) {
    return nomCommercial.trim();
  }

  const enseigne = etab.enseigne;
  if (typeof enseigne === "string" && enseigne.trim()) {
    return enseigne.trim();
  }

  if (etab.est_siege) {
    return companyName;
  }

  const commune = etab.libelle_commune;
  if (typeof commune === "string" && commune.trim()) {
    return `Établissement — ${commune.trim()}`;
  }

  return companyName;
}

/**
 * Postal address from DINUM: field `adresse` is the full "adresse postale"
 * (often already includes postcode and city). Avoid duplicating CP/ville.
 */
export function resolvePostalAddress(etab: Record<string, unknown>): string {
  const adresse = etab.adresse;
  if (typeof adresse === "string" && adresse.trim()) {
    return adresse.trim();
  }

  const geoAdresse = etab.geo_adresse;
  if (typeof geoAdresse === "string" && geoAdresse.trim()) {
    return geoAdresse.trim();
  }

  const lineParts: string[] = [];
  const complement = etab.complement_adresse;
  if (typeof complement === "string" && complement.trim()) {
    lineParts.push(complement.trim());
  }

  const voie = [
    etab.numero_voie,
    etab.indice_repetition,
    etab.type_voie,
    etab.libelle_voie
  ]
    .filter((p) => typeof p === "string" && p.trim())
    .map((p) => (p as string).trim())
    .join(" ");

  if (voie) lineParts.push(voie);

  const cp = etab.code_postal;
  const ville = etab.libelle_commune;
  const cityLine = [cp, ville]
    .filter((p) => typeof p === "string" && (p as string).trim())
    .map((p) => (p as string).trim())
    .join(" ");
  if (cityLine) lineParts.push(cityLine);

  return lineParts.join(", ");
}

export function resolveEstablishmentNaf(etab: Record<string, unknown>, companyNaf?: string): {
  codeNaf: string;
  libelleNaf: string;
} {
  const code =
    (typeof etab.activite_principale === "string" && etab.activite_principale) ||
    companyNaf ||
    "Inconnu";
  const entry = getNafCodeByCode(code);
  return {
    codeNaf: code,
    libelleNaf: entry?.label || entry?.shortLabel || ""
  };
}

export function annuaireEtablissementUrl(siret: string): string {
  const normalized = siret.replace(/\s+/g, "");
  return `https://annuaire-entreprises.data.gouv.fr/etablissement/${normalized}`;
}

export function normalizeEtablissementFromApi(
  etab: Record<string, unknown>,
  company: Record<string, unknown>,
  searchLat: number,
  searchLon: number,
  distanceKm: number
) {
  const companyName =
    (company.nom_complet as string) ||
    (company.nom_raison_sociale as string) ||
    "Entreprise inconnue";

  const { codeNaf, libelleNaf } = resolveEstablishmentNaf(
    etab,
    company.activite_principale as string | undefined
  );

  const adresse = resolvePostalAddress(etab);
  const codePostal =
    (typeof etab.code_postal === "string" && etab.code_postal) ||
    extractPostcodeFromAddress(adresse) ||
    "";
  const commune =
    (typeof etab.libelle_commune === "string" && etab.libelle_commune) || "";

  return {
    siret: String(etab.siret || ""),
    nomEtablissement: resolveEstablishmentName(etab, companyName),
    enseigne:
      (Array.isArray(etab.liste_enseignes) && (etab.liste_enseignes[0] as string)) ||
      (etab.nom_commercial as string) ||
      "",
    adresse,
    codePostal,
    commune,
    latitude: parseFloat(String(etab.latitude)),
    longitude: parseFloat(String(etab.longitude)),
    estSiege: Boolean(etab.est_siege),
    statut: etab.etat_administratif === "A" ? "Actif" : "Fermé",
    codeNaf,
    libelleNaf,
    effectifSalarie: getEmployeeSize(
      (etab.tranche_effectif_salarie as string) || (company.tranche_effectif_salarie as string) || null
    ),
    telephone: "Non communiqué (réglementation INSEE)",
    email: "Non communiqué (réglementation INSEE)",
    siteWeb: "Non renseigné",
    distance: Math.round(distanceKm * 100) / 100
  };
}

function extractPostcodeFromAddress(adresse: string): string {
  const match = adresse.match(/\b(\d{5})\b/);
  return match?.[1] || "";
}
