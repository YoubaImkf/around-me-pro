import { Company } from "@/types/company";
import { flattenEstablishments } from "@/lib/establishments";
import { normalizeEtablissementFromApi } from "@/lib/etablissementNormalize";
import { getEmployeeSize } from "@/lib/employeeSize";

export { EMPLOYEE_SIZE_MAP, getEmployeeSize } from "@/lib/employeeSize";

export const MAX_COMPANY_PAGES = 100;
export const DINUM_PER_PAGE = 25;

export interface SearchParams {
  lat: number;
  lon: number;
  radius: number;
  sections: string;
  naf: string;
  onlyActive: boolean;
}

export interface DinumPageResult {
  companies: Company[];
  totalCompanies: number;
  totalCompanyPages: number;
  page: number;
}

export function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function normalizeCompanies(
  results: any[],
  searchLat: number,
  searchLon: number,
  radius: number,
  onlyActive: boolean
): Company[] {
  return results
    .map((company: any) => {
      if (onlyActive && company.etat_administratif === "F") return null;

      const etablissements = (company.matching_etablissements || [])
        .map((etab: any) => {
          if (onlyActive && etab.etat_administratif === "F") return null;

          const etabLat = parseFloat(etab.latitude || company.siege?.latitude);
          const etabLon = parseFloat(etab.longitude || company.siege?.longitude);

          if (isNaN(etabLat) || isNaN(etabLon)) return null;

          const distance = getHaversineDistance(searchLat, searchLon, etabLat, etabLon);
          if (distance > radius * 1.25) return null;

          return normalizeEtablissementFromApi(
            etab,
            company,
            searchLat,
            searchLon,
            distance
          );
        })
        .filter((etab: any) => etab !== null);

      if (etablissements.length === 0) return null;

      return {
        siren: company.siren,
        nomComplet: company.nom_complet || company.nom_raison_sociale || "Entreprise inconnue",
        secteur: company.section_activite_principale || "Autre",
        codeNaf: company.activite_principale || "Inconnu",
        libelleNaf:
          company.libelle_activite_principale ||
          company.activite_principale_libelle ||
          "",
        categorie: company.categorie_entreprise || "TPE/PME",
        effectifSalarie: getEmployeeSize(company.tranche_effectif_salarie),
        etablissements,
        siegeSocial: {
          siret: company.siege?.siret || "",
          adresse: company.siege?.adresse || "",
          codePostal: company.siege?.code_postal || "",
          commune: company.siege?.libelle_commune || ""
        }
      };
    })
    .filter((company: any) => company !== null) as Company[];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, init?: RequestInit, retries = 3, backoff = 250): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.status === 429) {
        console.warn(`[API Rate Limit] Got 429 for ${url}. Retrying attempt ${attempt}/${retries} after ${backoff}ms...`);
        await delay(backoff);
        backoff *= 2.5;
        continue;
      }
      return response;
    } catch (err: any) {
      lastError = err;
      console.error(`[API Network Error] Attempt ${attempt}/${retries} failed:`, err);
      await delay(backoff);
      backoff *= 2.5;
    }
  }
  throw lastError || new Error(`Failed to fetch after ${retries} attempts`);
}

export async function fetchDinumPage(
  params: SearchParams,
  page: number
): Promise<DinumPageResult> {
  const queryParams = new URLSearchParams({
    lat: params.lat.toString(),
    long: params.lon.toString(),
    radius: params.radius.toString(),
    page: page.toString(),
    per_page: DINUM_PER_PAGE.toString()
  });

  if (params.sections) {
    queryParams.append("section_activite_principale", params.sections);
  }
  if (params.naf) {
    queryParams.append("activite_principale", params.naf.replace(/\s+/g, ""));
  }

  const companyRes = await fetchWithRetry(
    `https://recherche-entreprises.api.gouv.fr/near_point?${queryParams.toString()}`,
    {
      headers: { "User-Agent": "AroundMePro/1.0" },
      next: { revalidate: 60 }
    }
  );

  if (!companyRes.ok) {
    throw new Error(`DINUM_ERROR_${companyRes.status}`);
  }

  const companyData = await companyRes.json();
  const companies = normalizeCompanies(
    companyData.results || [],
    params.lat,
    params.lon,
    params.radius,
    params.onlyActive
  );

  return {
    companies,
    totalCompanies: companyData.total_results || 0,
    totalCompanyPages: companyData.total_pages || 1,
    page: companyData.page || page
  };
}

/** Collect establishments across DINUM pages until slice is filled or data exhausted. */
export async function collectEstablishments(
  params: SearchParams,
  options: {
    establishmentPage: number;
    perPage: number;
    fetchAll?: boolean;
  }
): Promise<{
  companies: Company[];
  establishments: ReturnType<typeof flattenEstablishments>;
  totalCompanies: number;
  totalCompanyPages: number;
  totalEstablishments: number;
  isEstablishmentCountExact: boolean;
}> {
  const naf = params.naf || "";
  const nafCodes = naf.includes(",")
    ? naf.split(",").map((c) => c.trim()).filter(Boolean)
    : [naf];

  if (nafCodes.length > 1) {
    // Concurrent multi-NAF search aggregation!
    const results = await Promise.all(
      nafCodes.map(async (code) => {
        const subParams = { ...params, naf: code };
        return collectEstablishments(subParams, {
          establishmentPage: 1,
          perPage: Number.MAX_SAFE_INTEGER,
          fetchAll: true
        });
      })
    );

    const companyMap = new Map<string, Company>();
    const establishmentMap = new Map<string, any>();

    for (const res of results) {
      for (const comp of res.companies) {
        companyMap.set(comp.siren, comp);
      }
      for (const row of res.establishments) {
        establishmentMap.set(row.etab.siret, row);
      }
    }

    const allCompanies = Array.from(companyMap.values());
    const allEstablishments = Array.from(establishmentMap.values());

    // Sort combined establishments by distance (closest first)
    allEstablishments.sort((a, b) => (a.etab.distance ?? 0) - (b.etab.distance ?? 0));

    const totalCompanies = allCompanies.length;
    const totalEstablishments = allEstablishments.length;

    const { establishmentPage, perPage, fetchAll = false } = options;
    const targetStart = fetchAll ? 0 : (establishmentPage - 1) * perPage;
    const targetEnd = fetchAll ? Number.MAX_SAFE_INTEGER : targetStart + perPage;

    const pageSlice = allEstablishments.slice(targetStart, targetEnd);

    // Keep companies aligned with the page slice
    const activeSirens = new Set(pageSlice.map((row) => row.company.siren));
    const activeCompanies = allCompanies.filter((c) => activeSirens.has(c.siren));

    return {
      companies: activeCompanies,
      establishments: pageSlice,
      totalCompanies,
      totalCompanyPages: fetchAll ? 1 : Math.max(1, Math.ceil(totalEstablishments / perPage)),
      totalEstablishments,
      isEstablishmentCountExact: true
    };
  }

  // Single NAF (or no NAF) default path:
  const { establishmentPage, perPage, fetchAll = false } = options;
  const targetStart = fetchAll ? 0 : (establishmentPage - 1) * perPage;
  const targetEnd = fetchAll ? Number.MAX_SAFE_INTEGER : targetStart + perPage;

  const companyMap = new Map<string, Company>();
  let allEstablishments = flattenEstablishments([]);
  let totalCompanies = 0;
  let totalCompanyPages = 1;
  let companyPage = 1;

  while (companyPage <= totalCompanyPages && companyPage <= MAX_COMPANY_PAGES) {
    if (companyPage > 1) {
      // Proactive rate-limit avoidance: sleep 80ms before fetching next page
      await delay(80);
    }
    const pageResult = await fetchDinumPage(params, companyPage);
    totalCompanies = pageResult.totalCompanies;
    totalCompanyPages = pageResult.totalCompanyPages;

    for (const company of pageResult.companies) {
      const existing = companyMap.get(company.siren);
      if (existing) {
        const sirets = new Set(existing.etablissements.map((e) => e.siret));
        for (const etab of company.etablissements) {
          if (!sirets.has(etab.siret)) {
            existing.etablissements.push(etab);
          }
        }
      } else {
        companyMap.set(company.siren, { ...company });
      }
    }

    allEstablishments = flattenEstablishments(Array.from(companyMap.values()));

    const hasEnough = allEstablishments.length >= targetEnd;
    const isLastPage = companyPage >= totalCompanyPages;

    if (fetchAll && isLastPage) break;
    if (!fetchAll && hasEnough) break;
    if (isLastPage) break;

    companyPage++;
  }

  const isEstablishmentCountExact = companyPage >= totalCompanyPages;
  const totalEstablishments = isEstablishmentCountExact
    ? allEstablishments.length
    : Math.max(allEstablishments.length, totalCompanies);

  const pageSlice = fetchAll
    ? allEstablishments
    : allEstablishments.slice(targetStart, targetEnd);

  return {
    companies: Array.from(companyMap.values()),
    establishments: pageSlice,
    totalCompanies,
    totalCompanyPages,
    totalEstablishments,
    isEstablishmentCountExact
  };
}

export async function geocodeCity(city: string): Promise<{
  lat: number;
  lon: number;
  name: string;
  postcode: string;
}> {
  const cleanCity = city.replace(/^📍\s*/, "").trim();
  const geocodeRes = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cleanCity)}&limit=1`,
    { headers: { "User-Agent": "AroundMePro/1.0" } }
  );

  if (!geocodeRes.ok) {
    throw new Error("GEOCODE_UNAVAILABLE");
  }

  const geocodeData = await geocodeRes.json();
  if (!geocodeData.features?.length) {
    throw new Error("CITY_NOT_FOUND");
  }

  const topFeature = geocodeData.features[0];
  const coords = topFeature.geometry.coordinates;
  return {
    lon: coords[0],
    lat: coords[1],
    name: topFeature.properties.label || topFeature.properties.name,
    postcode: topFeature.properties.postcode || ""
  };
}
