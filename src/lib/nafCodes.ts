import rawNafEntries from "@/data/naf-codes.json";

/** Leaf APE/NAF codes used by SIRENE (e.g. 56.10A, 62.01Z). */
const APE_LEAF_PATTERN = /^\d{2}\.\d{2}[A-Z]$/;

export interface NafCodeEntry {
  code: string;
  label: string;
  shortLabel: string;
}

interface RawNafEntry {
  id: string;
  label: string;
}

/** Curated aliases so natural-language queries surface the right codes. */
const SEARCH_ALIASES: Record<string, string[]> = {
  restaurant: ["56.10A", "56.10B", "56.10C", "56.21Z", "56.29A", "56.29B"],
  restaurants: ["56.10A", "56.10B", "56.10C"],
  restauration: ["56.10A", "56.10B", "56.10C", "56.21Z"],
  cafe: ["56.30Z", "56.10B"],
  café: ["56.30Z", "56.10B"],
  bar: ["56.30Z"],
  hotel: ["55.10Z", "55.20Z", "55.30Z"],
  hôtel: ["55.10Z", "55.20Z", "55.30Z"],
  logiciel: ["62.01Z", "62.02A", "62.02B", "62.09Z"],
  software: ["62.01Z", "62.02A", "62.02B", "62.09Z"],
  informatique: ["62.01Z", "62.02A", "62.02B", "62.03Z", "62.09Z"],
  developpeur: ["62.01Z", "62.02A"],
  développeur: ["62.01Z", "62.02A"],
  agence: ["73.11Z", "73.12Z", "70.21Z"],
  publicite: ["73.11Z"],
  publicité: ["73.11Z"],
  marketing: ["73.11Z", "73.12Z", "70.21Z"],
  communication: ["73.11Z", "73.12Z", "59.11A", "59.11B"],
  creche: ["88.91A"],
  crèche: ["88.91A"],
  garderie: ["88.91A"],
  ecommerce: ["47.91A", "47.91B"],
  "e-commerce": ["47.91A", "47.91B"],
  commerce: ["47.11A", "47.11B", "47.11C", "47.11D", "47.11E", "47.11F"],
  boulangerie: ["10.71C", "10.71D"],
  coiffure: ["96.02A", "96.02B"],
  immobilier: ["68.10Z", "68.20A", "68.20B", "68.31Z"],
  avocat: ["69.10Z"],
  comptable: ["69.20Z"],
  architecte: ["71.11Z"],
  construction: ["41.10A", "41.10B", "41.10C", "43.99C"],
  sante: ["86.10Z", "86.21Z", "86.22A", "86.22B", "86.22C"],
  santé: ["86.10Z", "86.21Z", "86.22A", "86.22B", "86.22C"],
  medecin: ["86.21Z"],
  médecin: ["86.21Z"],
  pharmacie: ["47.73Z"],
  transport: ["49.41A", "49.41B", "49.42Z"],
  logistique: ["52.29A", "52.29B"],
  formation: ["85.59A", "85.59B", "85.60Z"],
  ecole: ["85.10Z", "85.20Z", "85.31Z", "85.32Z"],
  école: ["85.10Z", "85.20Z", "85.31Z", "85.32Z"],
};

/** Quick picks shown when the combobox opens with no query. */
export const POPULAR_NAF_CODES = [
  "56.10A",
  "62.01Z",
  "73.11Z",
  "88.91A",
  "47.91A",
  "86.21Z",
  "68.20A",
  "41.10A",
] as const;

const MAX_RESULTS = 10;

function resolveAliasCodes(normalizedQuery: string, queryTokens: string[]): string[] {
  const codes = new Set<string>();
  for (const [alias, aliasCodes] of Object.entries(SEARCH_ALIASES)) {
    const matchesExact = normalizedQuery === alias;
    const matchesPhrase = normalizedQuery.includes(alias) || alias.includes(normalizedQuery);
    const matchesToken = queryTokens.some(
      (token) => token.length >= 3 && (alias.includes(token) || token.includes(alias))
    );
    if (matchesExact || matchesPhrase || matchesToken) {
      aliasCodes.forEach((code) => codes.add(code));
    }
  }
  return Array.from(codes);
}

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, " ")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function simplifyLabel(label: string): string {
  const withoutParens = label.replace(/\s*\([^)]*\)/g, "").trim();
  if (withoutParens.length <= 72) return withoutParens;
  const cut = withoutParens.slice(0, 69).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "…";
}

function buildSearchBlob(entry: NafCodeEntry): string {
  const codeCompact = entry.code.replace(/\./g, "");
  const codeNoDot = entry.code.replace(".", "");
  return normalizeForSearch(
    `${entry.code} ${codeCompact} ${codeNoDot} ${entry.label} ${entry.shortLabel}`
  );
}

const nafByCode = new Map<string, NafCodeEntry>();

for (const raw of rawNafEntries as RawNafEntry[]) {
  if (!APE_LEAF_PATTERN.test(raw.id)) continue;
  const entry: NafCodeEntry = {
    code: raw.id,
    label: raw.label,
    shortLabel: simplifyLabel(raw.label),
  };
  nafByCode.set(entry.code, entry);
}

export const NAF_CODES: NafCodeEntry[] = Array.from(nafByCode.values()).sort(
  (a, b) => a.code.localeCompare(b.code)
);

const searchIndex = NAF_CODES.map((entry) => ({
  entry,
  blob: buildSearchBlob(entry),
}));

export function getNafCodeByCode(code: string): NafCodeEntry | undefined {
  let normalized = code.trim().replace(/\s+/g, "").toUpperCase();
  if (!normalized) return undefined;

  // Handle dot-less codes like "8891A" -> "88.91A"
  if (normalized.length === 5 && !normalized.includes(".")) {
    normalized = normalized.slice(0, 2) + "." + normalized.slice(2);
  }

  return nafByCode.get(normalized);
}

export function searchNafCodes(query: string, limit = MAX_RESULTS): NafCodeEntry[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return NAF_CODES;
  }

  const normalizedQuery = normalizeForSearch(trimmed);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const aliasCodes = resolveAliasCodes(normalizedQuery, queryTokens);

  const scored: { entry: NafCodeEntry; score: number }[] = [];

  for (const { entry, blob } of searchIndex) {
    let score = 0;
    const codeNorm = normalizeForSearch(entry.code);
    const codeCompact = codeNorm.replace(/\./g, "");

    if (codeNorm === normalizedQuery || codeCompact === compactQuery) {
      score = 1000;
    } else if (codeNorm.startsWith(normalizedQuery) || codeCompact.startsWith(compactQuery)) {
      score = 800;
    } else if (blob.includes(normalizedQuery)) {
      score = 500;
    } else if (queryTokens.length > 1 && queryTokens.every((t) => blob.includes(t))) {
      score = 350;
    } else if (queryTokens.some((t) => blob.includes(t))) {
      score = 120;
    }

    if (aliasCodes.includes(entry.code)) {
      score = Math.max(score, 900);
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.label.length - b.entry.label.length;
  });

  const seen = new Set<string>();
  const results: NafCodeEntry[] = [];

  for (const aliasCode of aliasCodes) {
    const entry = nafByCode.get(aliasCode);
    if (entry && !seen.has(entry.code)) {
      seen.add(entry.code);
      results.push(entry);
    }
  }

  for (const { entry } of scored) {
    if (seen.has(entry.code)) continue;
    seen.add(entry.code);
    results.push(entry);
    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}
