/**
 * Code Export – Phase 5 (#193)
 *
 * Generates a React + Tailwind CSS starter package from a chosen StyleConcept.
 * The package is returned as a plain Record<filename, content> so callers can
 * offer a ZIP download, copy individual files, or display them in an editor.
 *
 * Generated files:
 *  - `tailwind.config.ts`   – Tailwind config extended with brand tokens
 *  - `tokens.ts`            – TypeScript constants for every design token
 *  - `index.css`            – CSS custom-property declarations (:root { … })
 *  - `App.tsx`              – Sample React page demonstrating the design system
 */

import type { StyleConcept, StyleExportPackage } from './types';

// ── Public API ────────────────────────────────────────────────────────────────

/** Map of filename → file content returned by {@link buildReactTailwindPackage}. */
export type ReactTailwindPackage = Record<string, string>;

export interface CodeExportOptions {
  /** Component name used in App.tsx. Default: "App". */
  componentName?: string;
}

/**
 * Build a React + Tailwind CSS starter package from the chosen concept and
 * its associated export package (for the resolved token values).
 *
 * When `exportPackage` is not yet available the function falls back to
 * deriving tokens directly from the concept's recommendation.
 */
export function buildReactTailwindPackage(
  concept: StyleConcept,
  exportPackage?: StyleExportPackage | null,
  options: CodeExportOptions = {},
): ReactTailwindPackage {
  const componentName = options.componentName ?? 'App';

  // Resolve the authoritative token list.
  const tokens =
    exportPackage?.tokens ??
    concept.recommendation.tokens.map((t) => ({ ...t }));

  return {
    'tailwind.config.ts': buildTailwindConfig(concept, tokens),
    'tokens.ts': buildTokensFile(tokens),
    'index.css': buildCSSFile(tokens),
    'App.tsx': buildAppComponent(concept, tokens, componentName),
  };
}

// ── File generators ───────────────────────────────────────────────────────────

/** Generate a Tailwind v3-compatible config that maps brand tokens to the theme. */
export function buildTailwindConfig(
  concept: StyleConcept,
  tokens: StyleExportPackage['tokens'],
): string {
  const colorTokens = tokens.filter((t) => t.name.startsWith('color-'));
  const fontTokens = tokens.filter((t) => t.name.startsWith('font-') && !t.name.startsWith('font-size') && !t.name.startsWith('font-weight'));

  const colorEntries = colorTokens
    .map((t) => {
      const key = camelCase(t.name.replace('color-', ''));
      return `    ${key}: 'var(--${t.name})',`;
    })
    .join('\n');

  const fontEntries = fontTokens
    .map((t) => {
      const key = camelCase(t.name.replace('font-', ''));
      return `      ${key}: ['var(--${t.name})', { fontFeatureSettings: '"kern"' }],`;
    })
    .join('\n');

  return `/**
 * Tailwind CSS configuration
 * Generated from Style Flow – ${concept.name}
 * ${new Date().toISOString()}
 */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
${colorEntries}
      },
      fontFamily: {
${fontEntries}
      },
    },
  },
  plugins: [],
};

export default config;
`;
}

/** Generate a TypeScript module that exports every design token as a const. */
export function buildTokensFile(tokens: StyleExportPackage['tokens']): string {
  const entries = tokens
    .map((t) => {
      const constName = camelCase(t.name);
      const comment = t.description ? ` // ${t.description}` : '';
      return `export const ${constName} = '${escapeString(t.value)}';${comment}`;
    })
    .join('\n');

  return `/**
 * Design Tokens
 * Auto-generated – do not edit by hand.
 * Generated: ${new Date().toISOString()}
 */

${entries}
`;
}

/** Generate a CSS file with :root custom-property declarations. */
export function buildCSSFile(tokens: StyleExportPackage['tokens']): string {
  const declarations = tokens
    .map((t) => {
      const comment = t.description ? `  /* ${t.description} */\n` : '';
      return `${comment}  --${t.name}: ${t.value};`;
    })
    .join('\n');

  return `/**
 * CSS Design Tokens
 * Auto-generated – do not edit by hand.
 * Generated: ${new Date().toISOString()}
 */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

:root {
${declarations}
}
`;
}

/** Generate a sample React App component that demonstrates the design system. */
export function buildAppComponent(
  concept: StyleConcept,
  tokens: StyleExportPackage['tokens'],
  componentName: string,
): string {
  const rec = concept.recommendation;
  const primary = tokens.find((t) => t.name === 'color-primary')?.value ?? rec.swatches.find((s) => s.role === 'primary')?.hex ?? '#1A73E8';
  const surface = tokens.find((t) => t.name === 'color-surface')?.value ?? rec.swatches.find((s) => s.role === 'surface')?.hex ?? '#FFFFFF';
  const textColor = tokens.find((t) => t.name === 'color-text')?.value ?? rec.swatches.find((s) => s.role === 'text')?.hex ?? '#111111';
  const headingFont = tokens.find((t) => t.name === 'font-heading')?.value ?? rec.typography.headingFont;
  const bodyFont = tokens.find((t) => t.name === 'font-body')?.value ?? rec.typography.bodyFont;

  return `/**
 * ${componentName}.tsx
 * Sample React app generated from Style Flow – "${concept.name}"
 * ${new Date().toISOString()}
 *
 * Apply your design tokens by importing index.css in your entry point.
 */
import React from 'react';
import './index.css';

export const ${componentName}: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '${escapeString(surface)}',
        color: '${escapeString(textColor)}',
        fontFamily: '"${escapeString(bodyFont)}", sans-serif',
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          backgroundColor: '${escapeString(primary)}',
          padding: '0 2rem',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            color: '${escapeString(surface)}',
            fontFamily: '"${escapeString(headingFont)}", serif',
            fontSize: '1.25rem',
            fontWeight: 700,
          }}
        >
          ${escapeString(concept.name)}
        </span>
      </nav>

      {/* Hero */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: '"${escapeString(headingFont)}", serif',
            fontSize: '3rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: 'var(--color-primary)',
          }}
        >
          Welcome to ${escapeString(concept.name)}
        </h1>
        <p
          style={{
            fontSize: '1.125rem',
            opacity: 0.7,
            maxWidth: '560px',
            margin: '0 auto 2rem',
          }}
        >
          ${escapeString(concept.tagline)}
        </p>
        <button
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '${escapeString(surface)}',
            border: 'none',
            borderRadius: 'var(--button-border-radius, 8px)',
            padding: '0.75rem var(--button-padding-x, 1.5rem)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Get Started
        </button>
      </section>

      {/* Colour palette preview */}
      <section style={{ padding: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
${rec.swatches
  .map(
    (s) => `        <div
          title="${escapeString(s.role)}"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '8px',
            backgroundColor: '${escapeString(s.hex)}',
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        />`,
  )
  .join('\n')}
      </section>
    </div>
  );
};

export default ${componentName};
`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Convert a kebab-case or dot-case token name to camelCase.
 * e.g. "color-primary" → "colorPrimary"
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-.](.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^(.)/, (_, char: string) => char.toLowerCase());
}

/** Escape a string for safe embedding in a template literal. */
function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, '\\`');
}
