import { COMPANY_CATEGORIES } from "./categories";

export interface SemanticCategorySuggester {
  suggestCategories(jobTitle: string): Promise<string[]>; // Returns array of category IDs
}

/**
 * A highly performant, local keyword-matching implementation of the SemanticCategorySuggester.
 * This acts as the default adapter and provides immediate, practical value for standard 
 * job titles (e.g. UX Designer, Childcare Assistant, Backend Developer) without the overhead/cost 
 * of a remote LLM API call. It's designed to be easily swapped for an AI model embedding 
 * search in the future.
 */
export class KeywordSemanticSuggester implements SemanticCategorySuggester {
  async suggestCategories(jobTitle: string): Promise<string[]> {
    const query = jobTitle.trim().toLowerCase();
    if (!query) return [];

    const matchedScores = new Map<string, number>();

    for (const category of COMPANY_CATEGORIES) {
      let score = 0;

      // 1. Direct match on the category label itself
      if (category.label.toLowerCase().includes(query)) {
        score += 10;
      }
      
      // 2. Direct match on category description words
      if (category.description.toLowerCase().includes(query)) {
        score += 3;
      }

      // 3. Match against the pre-seeded suggested job titles
      for (const suggestedJob of category.suggestedJobTitles) {
        const lowerSuggested = suggestedJob.toLowerCase();
        
        if (lowerSuggested === query) {
          // Perfect match
          score += 20;
        } else if (lowerSuggested.includes(query) || query.includes(lowerSuggested)) {
          // Partial match
          score += 8;
        }
      }

      if (score > 0) {
        matchedScores.set(category.id, score);
      }
    }

    // Sort by score in descending order and return ids
    return Array.from(matchedScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }
}

// Export a default instance for convenience
export const semanticSuggester: SemanticCategorySuggester = new KeywordSemanticSuggester();
