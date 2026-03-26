/**
 * Tests for Phase 5 image export (#191)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeConceptLayout, exportConceptAsPng, renderConceptToPng } from './imageExport';
import type { StyleConcept } from './types';

// ── Mock concept ──────────────────────────────────────────────────────────────

const MOCK_CONCEPT: StyleConcept = {
  id: 'concept-minimal-technology-0',
  name: 'Clean Vision',
  tagline: 'A minimal, technology-focused style with distinct character.',
  recommendation: {
    id: 'rec-minimal-0',
    name: 'Minimal Tech',
    description: 'Clean palette.',
    confidence: 0.95,
    swatches: [
      { role: 'primary', hex: '#1A1A2E' },
      { role: 'secondary', hex: '#16213E' },
      { role: 'accent', hex: '#0F3460' },
      { role: 'highlight', hex: '#E94560' },
      { role: 'surface', hex: '#FFFFFF' },
      { role: 'text', hex: '#111111' },
    ],
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSizePx: 16, lineHeight: 1.6 },
    tokens: [
      { name: 'color-primary', value: '#1A1A2E' },
      { name: 'color-surface', value: '#FFFFFF' },
      { name: 'color-text', value: '#111111' },
    ],
  },
  typographyPairingId: 'modern-sans',
  buttonStyleId: 'rounded',
  navigationStyleId: 'top-bar',
};

// ── computeConceptLayout (pure, no browser deps) ──────────────────────────────

describe('computeConceptLayout', () => {
  it('returns correct width and height', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 800, 480);
    expect(layout.width).toBe(800);
    expect(layout.height).toBe(480);
  });

  it('extracts surface colour from swatches', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 800, 480);
    expect(layout.surface).toBe('#FFFFFF');
  });

  it('extracts primary colour from swatches', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 800, 480);
    expect(layout.primary).toBe('#1A1A2E');
  });

  it('extracts text colour from swatches', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 800, 480);
    expect(layout.textColor).toBe('#111111');
  });

  it('uses concept name and tagline', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 800, 480);
    expect(layout.conceptName).toBe('Clean Vision');
    expect(layout.tagline).toContain('minimal');
  });

  it('uses typography fonts', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 800, 480);
    expect(layout.headingFont).toBe('Inter');
    expect(layout.bodyFont).toBe('Inter');
  });

  it('returns one swatch entry per recommendation swatch', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 800, 480);
    expect(layout.swatches).toHaveLength(MOCK_CONCEPT.recommendation.swatches.length);
  });

  it('each swatch entry has x, y, size, hex, and role', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 800, 480);
    for (const swatch of layout.swatches) {
      expect(typeof swatch.x).toBe('number');
      expect(typeof swatch.y).toBe('number');
      expect(typeof swatch.size).toBe('number');
      expect(typeof swatch.hex).toBe('string');
      expect(typeof swatch.role).toBe('string');
    }
  });

  it('swatch positions increase left-to-right', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 800, 480);
    for (let i = 1; i < layout.swatches.length; i++) {
      expect(layout.swatches[i].x).toBeGreaterThan(layout.swatches[i - 1].x);
    }
  });

  it('falls back gracefully when surface swatch is absent', () => {
    const concept: StyleConcept = {
      ...MOCK_CONCEPT,
      recommendation: {
        ...MOCK_CONCEPT.recommendation,
        swatches: [{ role: 'primary', hex: '#0000FF' }],
      },
    };
    const layout = computeConceptLayout(concept, 800, 480);
    expect(layout.surface).toBe('#FFFFFF'); // fallback default
    expect(layout.primary).toBe('#0000FF');
  });

  it('respects custom dimensions', () => {
    const layout = computeConceptLayout(MOCK_CONCEPT, 1200, 600);
    expect(layout.width).toBe(1200);
    expect(layout.height).toBe(600);
  });
});

// ── renderConceptToPng (requires canvas mock) ─────────────────────────────────

describe('renderConceptToPng', () => {
  let mockGetContext: ReturnType<typeof vi.fn>;
  let mockFillRect: ReturnType<typeof vi.fn>;
  let mockFillText: ReturnType<typeof vi.fn>;
  let mockFill: ReturnType<typeof vi.fn>;
  let mockBeginPath: ReturnType<typeof vi.fn>;
  let mockMoveTo: ReturnType<typeof vi.fn>;
  let mockLineTo: ReturnType<typeof vi.fn>;
  let mockArcTo: ReturnType<typeof vi.fn>;
  let mockClosePath: ReturnType<typeof vi.fn>;
  let mockToDataURL: ReturnType<typeof vi.fn>;
  let mockScale: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFillRect = vi.fn();
    mockFillText = vi.fn();
    mockFill = vi.fn();
    mockBeginPath = vi.fn();
    mockMoveTo = vi.fn();
    mockLineTo = vi.fn();
    mockArcTo = vi.fn();
    mockClosePath = vi.fn();
    mockScale = vi.fn();
    mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc123');

    const ctx = {
      scale: mockScale,
      fillStyle: '',
      font: '',
      globalAlpha: 1,
      fillRect: mockFillRect,
      fillText: mockFillText,
      fill: mockFill,
      beginPath: mockBeginPath,
      moveTo: mockMoveTo,
      lineTo: mockLineTo,
      arcTo: mockArcTo,
      closePath: mockClosePath,
    };

    mockGetContext = vi.fn().mockReturnValue(ctx);
    mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc123');

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: mockGetContext,
          toDataURL: mockToDataURL,
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement.call(document, tag) as HTMLElement;
    });
  });

  it('returns a data URL string', () => {
    const result = renderConceptToPng(MOCK_CONCEPT);
    expect(result).toBe('data:image/png;base64,abc123');
  });

  it('calls getContext with "2d"', () => {
    renderConceptToPng(MOCK_CONCEPT);
    expect(mockGetContext).toHaveBeenCalledWith('2d');
  });

  it('scales the canvas for HiDPI when scale option is given', () => {
    renderConceptToPng(MOCK_CONCEPT, { scale: 2 });
    expect(mockScale).toHaveBeenCalledWith(2, 2);
  });

  it('throws when canvas context is unavailable', () => {
    mockGetContext.mockReturnValue(null);
    expect(() => renderConceptToPng(MOCK_CONCEPT)).toThrow('Canvas 2D context unavailable');
  });
});

// ── exportConceptAsPng ────────────────────────────────────────────────────────

describe('exportConceptAsPng', () => {
  it('triggers an anchor click with a png filename', () => {
    const mockClick = vi.fn();
    const mockA = { href: '', download: '', click: mockClick };
    let capturedCanvas: HTMLCanvasElement | null = null;

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockA as unknown as HTMLAnchorElement;
      if (tag === 'canvas') {
        capturedCanvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            scale: vi.fn(),
            fillStyle: '',
            font: '',
            globalAlpha: 1,
            fillRect: vi.fn(),
            fillText: vi.fn(),
            fill: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            arcTo: vi.fn(),
            closePath: vi.fn(),
          }),
          toDataURL: () => 'data:image/png;base64,test',
        } as unknown as HTMLCanvasElement;
        return capturedCanvas;
      }
      return document.createElement.call(document, tag) as HTMLElement;
    });

    exportConceptAsPng(MOCK_CONCEPT);

    expect(mockClick).toHaveBeenCalled();
    expect(mockA.download).toMatch(/\.png$/);
    expect(mockA.download).not.toContain(' '); // filename should be sanitised
  });
});
