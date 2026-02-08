/**
 * Design Tokens Extractor
 * 
 * Extracts design tokens (colors, typography, spacing) from a LayoutSpec.
 * Generates output compatible with style-dictionary format.
 */

import type { LayoutNode, LayoutSpec } from '../layout-schema';

export interface DesignTokens {
  color?: ColorTokens;
  typography?: TypographyTokens;
  spacing?: SpacingTokens;
  borderRadius?: BorderRadiusTokens;
  opacity?: OpacityTokens;
}

export interface ColorTokens {
  [key: string]: {
    value: string;
    type: 'color';
    description?: string;
  };
}

export interface TypographyTokens {
  [key: string]: {
    value: {
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
      lineHeight?: string;
    };
    type: 'typography';
    description?: string;
  };
}

export interface SpacingTokens {
  [key: string]: {
    value: string;
    type: 'spacing';
    description?: string;
  };
}

export interface BorderRadiusTokens {
  [key: string]: {
    value: string;
    type: 'borderRadius';
    description?: string;
  };
}

export interface OpacityTokens {
  [key: string]: {
    value: number;
    type: 'opacity';
    description?: string;
  };
}

export interface ExtractOptions {
  /**
   * Include semantic naming suggestions
   * @default true
   */
  semantic?: boolean;
  
  /**
   * Deduplicate similar values
   * @default true
   */
  deduplicate?: boolean;
  
  /**
   * Format output for style-dictionary
   * @default true
   */
  styleDictionary?: boolean;
}

/**
 * Extract design tokens from a LayoutSpec
 */
export function extractDesignTokens(
  spec: LayoutSpec,
  options: ExtractOptions = {}
): DesignTokens {
  const {
    semantic = true,
    deduplicate = true,
  } = options;

  const tokens: DesignTokens = {};

  // Collect all values from the tree
  const colors = new Map<string, number>();
  const fontSizes = new Map<number, number>();
  const fontFamilies = new Set<string>();
  const fontWeights = new Set<string>();
  const spacingValues = new Map<number, number>();
  const radiusValues = new Map<number, number>();
  const opacities = new Map<number, number>();

  // Traverse the tree and collect values
  traverseNode(spec.root, (node) => {
    // Colors
    if ('fill' in node && node.fill) {
      colors.set(node.fill, (colors.get(node.fill) || 0) + 1);
    }
    if ('stroke' in node && node.stroke) {
      colors.set(node.stroke, (colors.get(node.stroke) || 0) + 1);
    }
    if ('background' in node && node.background) {
      colors.set(node.background, (colors.get(node.background) || 0) + 1);
    }
    if ('color' in node && node.color) {
      colors.set(node.color, (colors.get(node.color) || 0) + 1);
    }

    // Typography
    if ('fontSize' in node && node.fontSize) {
      fontSizes.set(node.fontSize, (fontSizes.get(node.fontSize) || 0) + 1);
    }
    if ('fontFamily' in node && node.fontFamily) {
      fontFamilies.add(node.fontFamily);
    }
    if ('fontWeight' in node && node.fontWeight) {
      fontWeights.add(String(node.fontWeight));
    }

    // Spacing
    if ('gap' in node && node.gap) {
      spacingValues.set(node.gap, (spacingValues.get(node.gap) || 0) + 1);
    }
    if ('padding' in node && typeof node.padding === 'number') {
      spacingValues.set(node.padding, (spacingValues.get(node.padding) || 0) + 1);
    }

    // Border radius
    if ('radius' in node && node.radius) {
      radiusValues.set(node.radius, (radiusValues.get(node.radius) || 0) + 1);
    }

    // Opacity
    if (node.opacity !== undefined) {
      opacities.set(node.opacity, (opacities.get(node.opacity) || 0) + 1);
    }
  });

  // Generate color tokens
  if (colors.size > 0) {
    tokens.color = {};
    const sortedColors = deduplicate 
      ? Array.from(colors.entries()).sort((a, b) => b[1] - a[1])
      : Array.from(colors.entries());
    
    sortedColors.forEach(([color, count], index) => {
      const name = semantic ? generateColorName(color, index, count) : `color-${index + 1}`;
      tokens.color![name] = {
        value: color,
        type: 'color',
        description: `Used ${count} time${count > 1 ? 's' : ''}`,
      };
    });
  }

  // Generate typography tokens
  if (fontSizes.size > 0 || fontFamilies.size > 0) {
    tokens.typography = {};
    
    // Font sizes
    const sortedSizes = Array.from(fontSizes.entries()).sort((a, b) => a[0] - b[0]);
    sortedSizes.forEach(([size, count], index) => {
      const name = semantic ? generateFontSizeName(size, index) : `font-size-${index + 1}`;
      tokens.typography![name] = {
        value: { fontSize: `${size}px` },
        type: 'typography',
        description: `Used ${count} time${count > 1 ? 's' : ''}`,
      };
    });

    // Font families
    fontFamilies.forEach((family, index) => {
      const name = semantic ? family.toLowerCase().replace(/\s+/g, '-') : `font-family-${index + 1}`;
      if (!tokens.typography![name]) {
        tokens.typography![name] = {
          value: { fontFamily: family },
          type: 'typography',
        };
      } else {
        tokens.typography![name].value.fontFamily = family;
      }
    });
  }

  // Generate spacing tokens
  if (spacingValues.size > 0) {
    tokens.spacing = {};
    const sortedSpacing = Array.from(spacingValues.entries()).sort((a, b) => a[0] - b[0]);
    sortedSpacing.forEach(([value, count], index) => {
      const name = semantic ? generateSpacingName(value, index) : `spacing-${index + 1}`;
      tokens.spacing![name] = {
        value: `${value}px`,
        type: 'spacing',
        description: `Used ${count} time${count > 1 ? 's' : ''}`,
      };
    });
  }

  // Generate border radius tokens
  if (radiusValues.size > 0) {
    tokens.borderRadius = {};
    const sortedRadius = Array.from(radiusValues.entries()).sort((a, b) => a[0] - b[0]);
    sortedRadius.forEach(([value, count], index) => {
      const name = semantic ? generateRadiusName(value, index) : `radius-${index + 1}`;
      tokens.borderRadius![name] = {
        value: `${value}px`,
        type: 'borderRadius',
        description: `Used ${count} time${count > 1 ? 's' : ''}`,
      };
    });
  }

  // Generate opacity tokens
  if (opacities.size > 0) {
    tokens.opacity = {};
    const sortedOpacity = Array.from(opacities.entries()).sort((a, b) => a[0] - b[0]);
    sortedOpacity.forEach(([value, count], index) => {
      const name = semantic ? generateOpacityName(value, index) : `opacity-${index + 1}`;
      tokens.opacity![name] = {
        value: value,
        type: 'opacity',
        description: `Used ${count} time${count > 1 ? 's' : ''}`,
      };
    });
  }

  return tokens;
}

/**
 * Export tokens in style-dictionary format
 */
export function exportToStyleDictionary(tokens: DesignTokens): string {
  return JSON.stringify(tokens, null, 2);
}

/**
 * Export tokens in CSS custom properties format
 */
export function exportToCSS(tokens: DesignTokens): string {
  const lines: string[] = [':root {'];

  if (tokens.color) {
    Object.entries(tokens.color).forEach(([name, token]) => {
      lines.push(`  --${name}: ${token.value};`);
    });
  }

  if (tokens.typography) {
    Object.entries(tokens.typography).forEach(([name, token]) => {
      if (token.value.fontSize) {
        lines.push(`  --${name}-size: ${token.value.fontSize};`);
      }
      if (token.value.fontFamily) {
        lines.push(`  --${name}-family: ${token.value.fontFamily};`);
      }
      if (token.value.fontWeight) {
        lines.push(`  --${name}-weight: ${token.value.fontWeight};`);
      }
    });
  }

  if (tokens.spacing) {
    Object.entries(tokens.spacing).forEach(([name, token]) => {
      lines.push(`  --${name}: ${token.value};`);
    });
  }

  if (tokens.borderRadius) {
    Object.entries(tokens.borderRadius).forEach(([name, token]) => {
      lines.push(`  --${name}: ${token.value};`);
    });
  }

  if (tokens.opacity) {
    Object.entries(tokens.opacity).forEach(([name, token]) => {
      lines.push(`  --${name}: ${token.value};`);
    });
  }

  lines.push('}');
  return lines.join('\n');
}

// Helper functions

function traverseNode(node: LayoutNode, callback: (node: LayoutNode) => void) {
  callback(node);
  
  if ('children' in node && node.children) {
    node.children.forEach(child => traverseNode(child, callback));
  }
}

function generateColorName(color: string, index: number, count: number): string {
  // Try to generate semantic names based on color
  const normalized = color.toLowerCase();
  
  // Common color names
  if (normalized.includes('ff0000') || normalized === 'red') return 'primary-red';
  if (normalized.includes('00ff00') || normalized === 'green') return 'success-green';
  if (normalized.includes('0000ff') || normalized === 'blue') return 'primary-blue';
  if (normalized.includes('ffff00') || normalized === 'yellow') return 'warning-yellow';
  if (normalized.includes('ff9900') || normalized === 'orange') return 'accent-orange';
  if (normalized.includes('ffffff') || normalized === 'white') return 'neutral-white';
  if (normalized.includes('000000') || normalized === 'black') return 'neutral-black';
  
  // Grayscale detection
  if (/^#([0-9a-f])\1{5}$/i.test(normalized) || /^#([0-9a-f]{2})\1{2}$/i.test(normalized)) {
    const brightness = parseInt(normalized.slice(1, 3), 16);
    if (brightness > 200) return `gray-${100 + index}`;
    if (brightness > 150) return `gray-${200 + index}`;
    if (brightness > 100) return `gray-${300 + index}`;
    if (brightness > 50) return `gray-${400 + index}`;
    return `gray-${500 + index}`;
  }
  
  // Fallback to generic name
  return count > 5 ? `primary-${index + 1}` : `accent-${index + 1}`;
}

function generateFontSizeName(size: number, index: number): string {
  if (size <= 12) return 'text-xs';
  if (size <= 14) return 'text-sm';
  if (size <= 16) return 'text-base';
  if (size <= 18) return 'text-lg';
  if (size <= 20) return 'text-xl';
  if (size <= 24) return 'text-2xl';
  if (size <= 30) return 'text-3xl';
  if (size <= 36) return 'text-4xl';
  if (size <= 48) return 'text-5xl';
  return `text-${index + 1}`;
}

function generateSpacingName(value: number, index: number): string {
  // Tailwind-like naming
  if (value === 0) return 'spacing-0';
  if (value === 4) return 'spacing-1';
  if (value === 8) return 'spacing-2';
  if (value === 12) return 'spacing-3';
  if (value === 16) return 'spacing-4';
  if (value === 20) return 'spacing-5';
  if (value === 24) return 'spacing-6';
  if (value === 32) return 'spacing-8';
  if (value === 40) return 'spacing-10';
  if (value === 48) return 'spacing-12';
  return `spacing-${index + 1}`;
}

function generateRadiusName(value: number, index: number): string {
  if (value === 0) return 'radius-none';
  if (value <= 3) return 'radius-sm';
  if (value <= 6) return 'radius-md';
  if (value <= 12) return 'radius-lg';
  if (value <= 24) return 'radius-xl';
  if (value >= 9999) return 'radius-full';
  return `radius-${index + 1}`;
}

function generateOpacityName(value: number, index: number): string {
  const percent = Math.round(value * 100);
  if (percent === 0) return 'opacity-0';
  if (percent <= 25) return 'opacity-25';
  if (percent <= 50) return 'opacity-50';
  if (percent <= 75) return 'opacity-75';
  if (percent === 100) return 'opacity-100';
  return `opacity-${index + 1}`;
}
