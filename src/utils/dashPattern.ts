/**
 * Utilities for working with stroke dash patterns.
 * Phase 0 scope: parsing and normalization only (no rendering side-effects here).
 */

export type DashPattern = number[]; // sequence of positive numbers (length can be even/odd; renderer may repeat)

export interface ParseDashResult {
  pattern: DashPattern;
  error?: string; // present if input invalid; pattern will then be []
  normalized: boolean; // true if input required trimming/coercion
}

// Accepts user input forms:
// - string: space or comma separated numbers ("4 2 1").
// - number[]: already parsed.
// - empty/undefined/null => returns empty pattern.
// Rules:
// - Non-numeric tokens -> error.
// - Negative or zero values -> filtered; triggers normalized flag.
// - Resulting empty after filtering -> [] with error.
export function parseDashPattern(input: string | number[] | undefined | null): ParseDashResult {
  if (input == null || input === '') return { pattern: [], normalized: false };

  let tokens: string[] = [];
  if (Array.isArray(input)) {
    tokens = input.map(String);
  } else if (typeof input === 'string') {
    tokens = input.split(/[,\s]+/).filter(Boolean);
  }

  const nums: number[] = [];
  let hadInvalid = false;
  for (const t of tokens) {
    const n = Number(t);
    if (!isFinite(n)) { hadInvalid = true; continue; }
    if (n <= 0) { hadInvalid = true; continue; }
    nums.push(n);
  }

  if (!nums.length) {
    return { pattern: [], error: 'No valid positive dash segments', normalized: hadInvalid };
  }
  return { pattern: nums, normalized: hadInvalid };
}

// Serialize pattern back to canonical string (space separated).
export function dashPatternToString(pattern: DashPattern): string {
  return pattern.join(' ');
}
