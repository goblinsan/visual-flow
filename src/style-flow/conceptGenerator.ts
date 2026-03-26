/**
 * Concept generator – Phase 4 (#188)
 *
 * Produces deterministic, distinct StyleConcept variants from user-provided
 * seeds and an optional set of locked selections.
 *
 * Determinism: concepts are derived solely from the seeds and the locked
 * aspect values, so the same inputs always produce the same output.
 *
 * Distinctness: each concept is assigned a unique combination of colour
 * palette, typography pairing, button style, and navigation style by cycling
 * through the available options in a structured way.
 */

import type {
  StyleConcept,
  StyleMood,
  StyleIndustry,
  StyleRecommendation,
  LockableAspect,
} from './types';

// ── Internal option tables (must stay in sync with panel components) ──────────

const TYPOGRAPHY_IDS = [
  'modern-sans',
  'serif-elegance',
  'display-bold',
  'humanist',
  'classic-mix',
  'mono-code',
];

const BUTTON_IDS = ['rounded', 'pill', 'sharp', 'ghost-border', 'minimal-link'];

const NAVIGATION_IDS = ['top-bar', 'sidebar', 'tab-bar', 'floating', 'bottom-bar'];

// ── Colour palettes (one per mood) ────────────────────────────────────────────

type HexQuad = [string, string, string, string];

const MOOD_PALETTES: Record<StyleMood, HexQuad[]> = {
  minimal: [
    ['#1A1A2E', '#16213E', '#0F3460', '#E94560'],
    ['#2C2C54', '#474787', '#AAABB8', '#2E4057'],
    ['#F5F5F5', '#E0E0E0', '#9E9E9E', '#212121'],
  ],
  bold: [
    ['#FF6B35', '#F7931E', '#FFD23F', '#EE4266'],
    ['#E63946', '#F4A261', '#2A9D8F', '#264653'],
    ['#D62828', '#F77F00', '#FCBF49', '#EAE2B7'],
  ],
  playful: [
    ['#6C63FF', '#FF6584', '#43BCCD', '#F9C74F'],
    ['#FF9F1C', '#FFBF69', '#CBF3F0', '#2EC4B6'],
    ['#B5EAD7', '#FFDAC1', '#FF9AA2', '#C7CEEA'],
  ],
  elegant: [
    ['#2D2D2D', '#B8A472', '#E8E0D4', '#8B7355'],
    ['#1C1C1E', '#D4AF8C', '#F5EFE6', '#A0856C'],
    ['#0D0D0D', '#C9A96E', '#EDE8E3', '#7A6650'],
  ],
  technical: [
    ['#0A0E17', '#1B2838', '#66C0F4', '#4C7899'],
    ['#0F172A', '#1E293B', '#38BDF8', '#0EA5E9'],
    ['#111827', '#1F2937', '#6EE7B7', '#10B981'],
  ],
};

// ── Concept name vocabulary ────────────────────────────────────────────────────

const CONCEPT_ADJECTIVES: Record<StyleMood, string[]> = {
  minimal: ['Clean', 'Crisp', 'Quiet', 'Pure', 'Airy'],
  bold: ['Vivid', 'Charged', 'Loud', 'Fierce', 'Daring'],
  playful: ['Bubbly', 'Lively', 'Bright', 'Joyful', 'Fresh'],
  elegant: ['Refined', 'Poised', 'Luxe', 'Graceful', 'Polished'],
  technical: ['Precise', 'System', 'Circuit', 'Structured', 'Sharp'],
};

const CONCEPT_NOUNS = [
  'Vision',
  'Signal',
  'Canvas',
  'Blueprint',
  'Flow',
  'Pulse',
  'Edge',
  'Horizon',
];

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Deterministic selection from an array using seed + offset. */
function pick<T>(arr: T[], seedIndex: number, offset = 0): T {
  return arr[(seedIndex + offset) % arr.length];
}

function buildRecommendation(
  mood: StyleMood,
  industry: StyleIndustry,
  paletteIndex: number,
  conceptIndex: number,
): StyleRecommendation {
  const palettes = MOOD_PALETTES[mood];
  const palette = palettes[paletteIndex % palettes.length];
  const [c1, c2, c3, c4] = palette;

  const isElegant = mood === 'elegant';
  const headingFont = isElegant ? 'Playfair Display' : mood === 'technical' ? 'JetBrains Mono' : 'Inter';

  return {
    id: `concept-${mood}-${industry}-${conceptIndex}`,
    name: `${mood.charAt(0).toUpperCase() + mood.slice(1)} ${industry.charAt(0).toUpperCase() + industry.slice(1)} ${conceptIndex + 1}`,
    description: `A ${mood} style concept tuned for the ${industry} sector.`,
    confidence: parseFloat((0.95 - conceptIndex * 0.07).toFixed(2)),
    swatches: [
      { role: 'primary', hex: c1 },
      { role: 'secondary', hex: c2 },
      { role: 'accent', hex: c3 },
      { role: 'highlight', hex: c4 },
      { role: 'surface', hex: conceptIndex === 2 ? '#121212' : '#FFFFFF' },
      { role: 'text', hex: conceptIndex === 2 ? '#E0E0E0' : '#111111' },
    ],
    typography: {
      headingFont,
      bodyFont: 'Inter',
      baseSizePx: 16,
      lineHeight: 1.6,
    },
    tokens: [
      { name: 'color-primary', value: c1, description: 'Primary brand colour' },
      { name: 'color-secondary', value: c2 },
      { name: 'color-accent', value: c3 },
      { name: 'color-highlight', value: c4 },
      { name: 'font-heading', value: headingFont },
      { name: 'font-body', value: 'Inter' },
      { name: 'font-size-base', value: '16px' },
      { name: 'line-height-base', value: '1.6' },
    ],
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ConceptGeneratorOptions {
  /**
   * Number of concepts to generate.
   * Defaults to 3.
   */
  count?: number;
  /**
   * Aspects to lock; locked aspects remain constant across all concepts.
   * Useful when the user already knows, e.g., which typography they want.
   */
  lockedAspects?: LockableAspect[];
  /**
   * Fixed values for locked aspects (keyed by aspect name).
   */
  lockedValues?: {
    recommendation?: StyleRecommendation;
    typography?: string;
    buttons?: string;
    navigation?: string;
  };
}

/**
 * Generate `count` deterministic, distinct StyleConcept variants from the
 * provided seeds.
 *
 * Determinism: the output depends only on the input parameters.
 * Distinctness: each concept varies in at least one unlocked dimension.
 */
export function generateConcepts(
  moods: StyleMood[],
  industry: StyleIndustry,
  options: ConceptGeneratorOptions = {},
): StyleConcept[] {
  const count = options.count ?? 3;
  const locked = options.lockedAspects ?? [];
  const lockedValues = options.lockedValues ?? {};

  // Use the first mood as the primary seed for determinism.
  const primaryMood: StyleMood = moods[0] ?? 'minimal';
  const moodIndex = ['minimal', 'bold', 'playful', 'elegant', 'technical'].indexOf(primaryMood);

  const concepts: StyleConcept[] = [];

  for (let i = 0; i < count; i++) {
    // ── Colour recommendation ────────────────────────────────────────────────
    const recommendation: StyleRecommendation = locked.includes('recommendation') && lockedValues.recommendation
      ? lockedValues.recommendation
      : buildRecommendation(primaryMood, industry, i, i);

    // ── Typography ───────────────────────────────────────────────────────────
    const typographyPairingId: string = locked.includes('typography') && lockedValues.typography
      ? lockedValues.typography
      : pick(TYPOGRAPHY_IDS, moodIndex, i);

    // ── Button style ─────────────────────────────────────────────────────────
    const buttonStyleId: string = locked.includes('buttons') && lockedValues.buttons
      ? lockedValues.buttons
      : pick(BUTTON_IDS, moodIndex + 1, i);

    // ── Navigation style ─────────────────────────────────────────────────────
    const navigationStyleId: string = locked.includes('navigation') && lockedValues.navigation
      ? lockedValues.navigation
      : pick(NAVIGATION_IDS, moodIndex + 2, i);

    // ── Concept identity ─────────────────────────────────────────────────────
    const adjectives = CONCEPT_ADJECTIVES[primaryMood];
    const adj = pick(adjectives, i);
    const noun = pick(CONCEPT_NOUNS, moodIndex, i);
    const name = `${adj} ${noun}`;
    const tagline = `A ${primaryMood}, ${industry}-focused style with distinct character.`;

    concepts.push({
      id: `concept-${primaryMood}-${industry}-${i}`,
      name,
      tagline,
      recommendation,
      typographyPairingId,
      buttonStyleId,
      navigationStyleId,
    });
  }

  return concepts;
}
