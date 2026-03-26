/**
 * Tests for Phase 5 code export (#193)
 */

import { describe, it, expect } from 'vitest';
import {
  buildReactTailwindPackage,
  buildTailwindConfig,
  buildTokensFile,
  buildCSSFile,
  buildAppComponent,
  camelCase,
} from './codeExport';
import type { StyleConcept, StyleExportPackage } from './types';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_TOKENS: StyleExportPackage['tokens'] = [
  { name: 'color-primary', value: '#1A1A2E', description: 'Primary brand colour' },
  { name: 'color-secondary', value: '#16213E' },
  { name: 'color-accent', value: '#0F3460' },
  { name: 'color-surface', value: '#FFFFFF' },
  { name: 'color-text', value: '#111111' },
  { name: 'font-heading', value: 'Inter' },
  { name: 'font-body', value: 'Inter' },
  { name: 'font-size-base', value: '16px' },
];

const MOCK_EXPORT_PACKAGE: StyleExportPackage = {
  tokens: MOCK_TOKENS,
  swatches: [
    { role: 'primary', hex: '#1A1A2E' },
    { role: 'surface', hex: '#FFFFFF' },
  ],
  typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSizePx: 16, lineHeight: 1.6 },
  outputs: { 'css-variables': ':root {}', json: '{}' },
  generatedAt: new Date().toISOString(),
  sourceRecommendationId: 'rec-minimal-0',
};

const MOCK_CONCEPT: StyleConcept = {
  id: 'concept-minimal-technology-0',
  name: 'Clean Vision',
  tagline: 'A minimal, technology-focused style.',
  recommendation: {
    id: 'rec-minimal-0',
    name: 'Minimal Tech',
    description: 'Clean palette.',
    confidence: 0.95,
    swatches: [
      { role: 'primary', hex: '#1A1A2E' },
      { role: 'secondary', hex: '#16213E' },
      { role: 'surface', hex: '#FFFFFF' },
      { role: 'text', hex: '#111111' },
    ],
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSizePx: 16, lineHeight: 1.6 },
    tokens: MOCK_TOKENS,
  },
  typographyPairingId: 'modern-sans',
  buttonStyleId: 'rounded',
  navigationStyleId: 'top-bar',
};

// ── camelCase ─────────────────────────────────────────────────────────────────

describe('camelCase', () => {
  it('converts kebab-case to camelCase', () => {
    expect(camelCase('color-primary')).toBe('colorPrimary');
    expect(camelCase('font-heading')).toBe('fontHeading');
    expect(camelCase('font-size-base')).toBe('fontSizeBase');
  });

  it('leaves already-camelCase strings unchanged', () => {
    expect(camelCase('colorPrimary')).toBe('colorPrimary');
  });

  it('handles single-word strings', () => {
    expect(camelCase('color')).toBe('color');
    expect(camelCase('primary')).toBe('primary');
  });
});

// ── buildTokensFile ───────────────────────────────────────────────────────────

describe('buildTokensFile', () => {
  it('exports one const per token', () => {
    const output = buildTokensFile(MOCK_TOKENS);
    expect(output).toContain('export const colorPrimary');
    expect(output).toContain('export const colorSecondary');
    expect(output).toContain('export const fontHeading');
  });

  it('includes token values as string literals', () => {
    const output = buildTokensFile(MOCK_TOKENS);
    expect(output).toContain("'#1A1A2E'");
    expect(output).toContain("'Inter'");
  });

  it('includes a description comment when present', () => {
    const output = buildTokensFile(MOCK_TOKENS);
    expect(output).toContain('Primary brand colour');
  });

  it('does not throw for tokens without a description', () => {
    const tokens = [{ name: 'color-accent', value: '#0F3460' }];
    expect(() => buildTokensFile(tokens)).not.toThrow();
  });
});

// ── buildCSSFile ──────────────────────────────────────────────────────────────

describe('buildCSSFile', () => {
  it('contains :root { … } block', () => {
    const output = buildCSSFile(MOCK_TOKENS);
    expect(output).toContain(':root {');
    expect(output).toContain('}');
  });

  it('emits one custom-property declaration per token', () => {
    const output = buildCSSFile(MOCK_TOKENS);
    expect(output).toContain('--color-primary: #1A1A2E;');
    expect(output).toContain('--font-heading: Inter;');
  });

  it('includes description comments', () => {
    const output = buildCSSFile(MOCK_TOKENS);
    expect(output).toContain('/* Primary brand colour */');
  });

  it('includes a Google Fonts import', () => {
    const output = buildCSSFile(MOCK_TOKENS);
    expect(output).toContain('@import url');
  });
});

// ── buildTailwindConfig ───────────────────────────────────────────────────────

describe('buildTailwindConfig', () => {
  it('references var(--…) for colour tokens', () => {
    const output = buildTailwindConfig(MOCK_CONCEPT, MOCK_TOKENS);
    expect(output).toContain("'var(--color-primary)'");
    expect(output).toContain("'var(--color-secondary)'");
  });

  it('references var(--…) for font tokens', () => {
    const output = buildTailwindConfig(MOCK_CONCEPT, MOCK_TOKENS);
    expect(output).toContain("'var(--font-heading)'");
  });

  it('includes a valid TypeScript export', () => {
    const output = buildTailwindConfig(MOCK_CONCEPT, MOCK_TOKENS);
    expect(output).toContain('export default config');
    expect(output).toContain('import type { Config }');
  });

  it('mentions the concept name in a comment', () => {
    const output = buildTailwindConfig(MOCK_CONCEPT, MOCK_TOKENS);
    expect(output).toContain('Clean Vision');
  });
});

// ── buildAppComponent ─────────────────────────────────────────────────────────

describe('buildAppComponent', () => {
  it('exports the named component', () => {
    const output = buildAppComponent(MOCK_CONCEPT, MOCK_TOKENS, 'App');
    expect(output).toContain('export const App');
  });

  it('uses the provided component name', () => {
    const output = buildAppComponent(MOCK_CONCEPT, MOCK_TOKENS, 'LandingPage');
    expect(output).toContain('export const LandingPage');
    expect(output).toContain('export default LandingPage');
  });

  it('includes import React and index.css', () => {
    const output = buildAppComponent(MOCK_CONCEPT, MOCK_TOKENS, 'App');
    expect(output).toContain("import React from 'react'");
    expect(output).toContain("import './index.css'");
  });

  it('includes the concept name in the heading', () => {
    const output = buildAppComponent(MOCK_CONCEPT, MOCK_TOKENS, 'App');
    expect(output).toContain('Clean Vision');
  });

  it('references CSS custom properties for colours', () => {
    const output = buildAppComponent(MOCK_CONCEPT, MOCK_TOKENS, 'App');
    expect(output).toContain('var(--color-primary)');
  });
});

// ── buildReactTailwindPackage ─────────────────────────────────────────────────

describe('buildReactTailwindPackage', () => {
  it('returns a package with all four expected files', () => {
    const pkg = buildReactTailwindPackage(MOCK_CONCEPT, MOCK_EXPORT_PACKAGE);
    expect(pkg).toHaveProperty('tailwind.config.ts');
    expect(pkg).toHaveProperty('tokens.ts');
    expect(pkg).toHaveProperty('index.css');
    expect(pkg).toHaveProperty('App.tsx');
  });

  it('each file is a non-empty string', () => {
    const pkg = buildReactTailwindPackage(MOCK_CONCEPT, MOCK_EXPORT_PACKAGE);
    for (const content of Object.values(pkg)) {
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('uses the resolved tokens from the export package when available', () => {
    const pkg = buildReactTailwindPackage(MOCK_CONCEPT, MOCK_EXPORT_PACKAGE);
    expect(pkg['tokens.ts']).toContain('colorPrimary');
  });

  it('falls back to concept recommendation tokens when export package is null', () => {
    const pkg = buildReactTailwindPackage(MOCK_CONCEPT, null);
    expect(pkg['tokens.ts']).toContain('colorPrimary');
  });

  it('respects a custom component name option', () => {
    const pkg = buildReactTailwindPackage(MOCK_CONCEPT, MOCK_EXPORT_PACKAGE, { componentName: 'Dashboard' });
    expect(pkg['App.tsx']).toContain('export const Dashboard');
  });

  it('produces valid CSS in index.css', () => {
    const pkg = buildReactTailwindPackage(MOCK_CONCEPT, MOCK_EXPORT_PACKAGE);
    expect(pkg['index.css']).toContain(':root {');
    expect(pkg['index.css']).toContain('--color-primary');
  });
});
