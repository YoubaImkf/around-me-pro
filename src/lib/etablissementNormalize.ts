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

  return companyName;
}

/** Clean up duplicate postcode, city, and redundant address tokens */
export function cleanDuplicateAddressTokens(addr: string): string {
  if (!addr) return "";
  
  let cleaned = addr.trim();
  
  // Dedup common patterns like "59290 WASQUEHAL, 59290 WASQUEHAL"
  const tokens = cleaned.split(/,\s*/);
  if (tokens.length >= 2) {
    const uniqueTokens: string[] = [];
    const seen = new Set<string>();
    for (const token of tokens) {
      const normalizedToken = token.trim().toLowerCase().replace(/\s+/g, " ");
      if (normalizedToken && !seen.has(normalizedToken)) {
        seen.add(normalizedToken);
        uniqueTokens.push(token.trim());
      }
    }
    cleaned = uniqueTokens.join(", ");
  }
  
  // Dedup side-by-side postcode + city patterns: e.g. "59290 WASQUEHAL 59290 WASQUEHAL"
  const postcodeCityPattern = /(\b\d{5}\b\s+[A-ZÀ-ÿ-]+)\s+\1/i;
  cleaned = cleaned.replace(postcodeCityPattern, "$1");
  
  return cleaned;
}

/**
 * Postal address from DINUM: field `adresse` is the full "adresse postale"
 * (often already includes postcode and city). Avoid duplicating CP/ville.
 */
export function resolvePostalAddress(etab: Record<string, unknown>): string {
  const adresse = etab.adresse;
  if (typeof adresse === "string" && adresse.trim()) {
    return cleanDuplicateAddressTokens(adresse.trim());
  }

  const geoAdresse = etab.geo_adresse;
  if (typeof geoAdresse === "string" && geoAdresse.trim()) {
    return cleanDuplicateAddressTokens(geoAdresse.trim());
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
  
  const cpStr = typeof cp === "string" ? cp.trim() : "";
  const villeStr = typeof ville === "string" ? ville.trim() : "";
  
  const reconstructedVoieComplement = lineParts.join(" ").toLowerCase();
  
  const hasCp = cpStr && reconstructedVoieComplement.includes(cpStr.toLowerCase());
  const hasVille = villeStr && reconstructedVoieComplement.includes(villeStr.toLowerCase());
  
  if (cpStr || villeStr) {
    const cityLineParts: string[] = [];
    if (cpStr && !hasCp) cityLineParts.push(cpStr);
    if (villeStr && !hasVille) cityLineParts.push(villeStr);
    
    const cityLine = cityLineParts.join(" ");
    if (cityLine) lineParts.push(cityLine);
  }

  return cleanDuplicateAddressTokens(lineParts.join(", "));
}

export function resolveEstablishmentNaf(etab: Record<string, unknown>, companyNaf?: string): {
  codeNaf: string;
  libelleNaf: string;
} {
  const rawCode =
    (typeof etab.activite_principale === "string" && etab.activite_principale) ||
    companyNaf ||
    "Inconnu";
  
  // Format code to always have the dot (e.g., "8891A" -> "88.91A")
  let code = rawCode.trim().replace(/\s+/g, "").toUpperCase();
  if (code.length === 5 && !code.includes(".")) {
    code = code.slice(0, 2) + "." + code.slice(2);
  }

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
