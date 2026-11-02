/**
 * Fuzzy string matching utilities for categorical data normalization.
 * Implements Levenshtein distance and similarity scoring without external dependencies.
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  // Quick exits
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  // Use two rows instead of full matrix for O(min(m,n)) space
  let prevRow = new Array<number>(bLen + 1);
  let currRow = new Array<number>(bLen + 1);

  for (let j = 0; j <= bLen; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i;
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,       // insertion
        prevRow[j] + 1,           // deletion
        prevRow[j - 1] + cost     // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[bLen];
}

/**
 * Compute a similarity score (0-100) between two strings.
 * Uses Levenshtein distance normalized by the longer string length.
 * Also accounts for case-insensitive exact matches and prefix matching.
 */
export function similarityScore(a: string, b: string): number {
  // Exact match
  if (a === b) return 100;

  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  // Case-insensitive exact match
  if (aLower === bLower) return 100;

  // Empty string handling
  if (aLower.length === 0 || bLower.length === 0) return 0;

  // One is an abbreviation/initial of the other (e.g., "F" and "Female")
  // Check if shorter string is a prefix of longer string (case-insensitive)
  const shorter = aLower.length <= bLower.length ? aLower : bLower;
  const longer = aLower.length <= bLower.length ? bLower : aLower;

  if (longer.startsWith(shorter)) {
    // Give a boost for prefix matches, scaled by how much of the longer string is covered
    const coverage = shorter.length / longer.length;
    // A single-letter prefix of a long word gets ~70-85, longer prefixes get higher
    return Math.round(70 + coverage * 30);
  }

  // Levenshtein-based similarity
  const distance = levenshteinDistance(aLower, bLower);
  const maxLen = Math.max(aLower.length, bLower.length);
  const normalizedSimilarity = ((maxLen - distance) / maxLen) * 100;

  return Math.round(normalizedSimilarity);
}

/**
 * Represents a group of similar values with a canonical label.
 */
export interface CategoryGroup {
  canonical: string;
  members: string[];
  count: number;
}

/**
 * Given a list of unique values, group them by fuzzy similarity.
 * Returns groups where each group has a canonical name (the most frequent
 * or longest member) and its similar members.
 */
export function autoGroupValues(
  valueCounts: Map<string, number>,
  threshold: number
): CategoryGroup[] {
  const values = Array.from(valueCounts.keys());
  const assigned = new Set<string>();
  const groups: CategoryGroup[] = [];

  // Sort values by frequency (descending), then by length (descending) for stability
  const sortedValues = [...values].sort((a, b) => {
    const countDiff = (valueCounts.get(b) ?? 0) - (valueCounts.get(a) ?? 0);
    if (countDiff !== 0) return countDiff;
    return b.length - a.length;
  });

  for (const value of sortedValues) {
    if (assigned.has(value)) continue;

    // Start a new group with this value as canonical
    const group: CategoryGroup = {
      canonical: value,
      members: [value],
      count: valueCounts.get(value) ?? 0,
    };
    assigned.add(value);

    // Find all unassigned values that are similar
    for (const candidate of sortedValues) {
      if (assigned.has(candidate)) continue;

      const score = similarityScore(value, candidate);
      if (score >= threshold) {
        group.members.push(candidate);
        group.count += valueCounts.get(candidate) ?? 0;
        assigned.add(candidate);
      }
    }

    // Choose the best canonical name: prefer the most common variant,
    // breaking ties with the longest (most descriptive) variant
    let bestCanonical = group.members[0];
    let bestCount = valueCounts.get(bestCanonical) ?? 0;

    for (const member of group.members) {
      const memberCount = valueCounts.get(member) ?? 0;
      if (
        memberCount > bestCount ||
        (memberCount === bestCount && member.length > bestCanonical.length)
      ) {
        bestCanonical = member;
        bestCount = memberCount;
      }
    }
    group.canonical = bestCanonical;

    groups.push(group);
  }

  return groups;
}

/**
 * Given a value and a set of rules (canonical -> synonyms[]), find the matching
 * canonical category. Tries exact match first, then case-insensitive, then fuzzy.
 */
export function matchToCanonical(
  value: string,
  rules: Record<string, string[]>
): string | null {
  const trimmed = value.trim();

  // Try exact match against canonical names and their synonyms
  for (const [canonical, synonyms] of Object.entries(rules)) {
    if (trimmed === canonical) return canonical;
    if (synonyms.includes(trimmed)) return canonical;
  }

  // Try case-insensitive match
  const lowerValue = trimmed.toLowerCase();
  for (const [canonical, synonyms] of Object.entries(rules)) {
    if (lowerValue === canonical.toLowerCase()) return canonical;
    for (const synonym of synonyms) {
      if (lowerValue === synonym.toLowerCase()) return canonical;
    }
  }

  // Try fuzzy match (threshold 70) against all synonyms and canonical names
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [canonical, synonyms] of Object.entries(rules)) {
    const score = similarityScore(trimmed, canonical);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = canonical;
    }

    for (const synonym of synonyms) {
      const synScore = similarityScore(trimmed, synonym);
      if (synScore > bestScore) {
        bestScore = synScore;
        bestMatch = canonical;
      }
    }
  }

  // Only return fuzzy match if score is good enough
  if (bestScore >= 70 && bestMatch) {
    return bestMatch;
  }

  return null;
}
