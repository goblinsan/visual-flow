/**
 * ImageFirstFlow
 *
 * Guides the user from an uploaded image to extracted color hints and
 * inferred mood suggestions, ready to seed the style journey.
 *
 * Flow:
 *  1. The user uploads or drops an image file.
 *  2. The component renders the image onto an off-screen <canvas> and
 *     samples pixels to extract the most prominent colors.
 *  3. Dominant colors are mapped to the nearest StyleMood via a simple
 *     hue-based heuristic.
 *  4. The caller receives the extracted colors and suggested moods via
 *     `onExtractedColors` and can use them to pre-fill StyleSeed fields.
 *
 * Color extraction runs entirely in the browser – no network requests.
 *
 * Phase 6 (#197)
 */

import { useState, useRef, useCallback } from 'react';
import type { StyleMood } from '../style-flow/types';

// ---------------------------------------------------------------------------
// Color extraction helpers
// ---------------------------------------------------------------------------

/**
 * Sample `sampleCount` evenly-spaced pixels from the canvas pixel data and
 * return their RGB values.
 */
function samplePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sampleCount: number,
): [number, number, number][] {
  const samples: [number, number, number][] = [];
  const step = Math.max(1, Math.floor((width * height) / sampleCount));
  for (let i = 0; i < width * height; i += step) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    // Skip fully transparent pixels
    if (a !== undefined && a < 128) continue;
    if (r !== undefined && g !== undefined && b !== undefined) {
      samples.push([r, g, b]);
    }
  }
  return samples;
}

/** Convert RGB (0–255 each) to HSL. Returns [h (0–360), s (0–1), l (0–1)]. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

/** Convert an [r, g, b] triple to a hex string like "#RRGGBB". */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/**
 * Cluster sampled RGB colors into `k` dominant colors using a simplified
 * median-cut approach (iterative k-means, 5 iterations).
 */
function dominantColors(
  samples: [number, number, number][],
  k: number,
): [number, number, number][] {
  if (samples.length === 0) return [];
  // Initialise centroids by picking evenly-spaced samples
  let centroids: [number, number, number][] = Array.from({ length: k }, (_, i) =>
    samples[Math.floor((i * samples.length) / k)] ?? [128, 128, 128],
  );

  for (let iter = 0; iter < 5; iter++) {
    const clusters: [number, number, number][][] = Array.from({ length: k }, () => []);

    for (const s of samples) {
      let minDist = Infinity;
      let minIdx = 0;
      for (let ci = 0; ci < centroids.length; ci++) {
        const c = centroids[ci]!;
        const dist =
          (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2;
        if (dist < minDist) {
          minDist = dist;
          minIdx = ci;
        }
      }
      clusters[minIdx]!.push(s);
    }

    centroids = clusters.map((cluster, ci) => {
      if (cluster.length === 0) return centroids[ci]!;
      const avg: [number, number, number] = [
        cluster.reduce((sum, p) => sum + p[0], 0) / cluster.length,
        cluster.reduce((sum, p) => sum + p[1], 0) / cluster.length,
        cluster.reduce((sum, p) => sum + p[2], 0) / cluster.length,
      ];
      return avg;
    });
  }

  return centroids;
}

/**
 * Map a dominant color palette to the nearest StyleMood using HSL heuristics.
 *
 * Rules (applied to the most saturated / visually dominant color):
 *  - Low saturation + light → minimal
 *  - Low saturation + dark  → elegant
 *  - High saturation, warm hues (red / orange / yellow) → bold
 *  - High saturation, cool hues (blue / green / cyan)  → technical
 *  - High saturation, mixed / purple / pink            → playful
 */
function inferMoods(
  palette: [number, number, number][],
): StyleMood[] {
  // Find the color with the highest saturation as the "key" color
  const withHsl = palette.map((rgb) => ({
    rgb,
    hsl: rgbToHsl(rgb[0], rgb[1], rgb[2]),
  }));

  // Sort by saturation descending
  withHsl.sort((a, b) => b.hsl[1] - a.hsl[1]);
  const key = withHsl[0]!;

  const [h, s, l] = key.hsl;
  const moods = new Set<StyleMood>();

  if (s < 0.12) {
    // Achromatic
    moods.add(l > 0.6 ? 'minimal' : 'elegant');
  } else {
    // Chromatic – determine by hue
    if (h < 45 || h > 315) moods.add('bold');         // reds/oranges/magentas
    else if (h >= 45 && h < 75) moods.add('playful');  // yellows
    else if (h >= 75 && h < 180) moods.add('technical'); // greens/cyans
    else if (h >= 180 && h < 270) moods.add('technical'); // blues
    else moods.add('playful'); // purples/pinks

    // Secondary mood based on lightness
    if (l < 0.25) moods.add('elegant');
    else if (l > 0.75) moods.add('minimal');
  }

  // Return at most 2 moods, most specific first
  return [...moods].slice(0, 2) as StyleMood[];
}

/**
 * Extract dominant colors from an image element using an off-screen canvas.
 * Returns up to `maxColors` hex strings.
 */
function extractColorsFromImage(
  img: HTMLImageElement,
  maxColors = 5,
): string[] {
  const canvas = document.createElement('canvas');
  // Scale down for performance – 80px is plenty for color analysis
  const scale = Math.min(1, 80 / Math.max(img.naturalWidth, img.naturalHeight, 1));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    // Cross-origin or security error
    return [];
  }

  const samples = samplePixels(imageData.data, canvas.width, canvas.height, 400);
  const palette = dominantColors(samples, maxColors);
  return palette.map(([r, g, b]) => rgbToHex(r, g, b));
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImageFirstFlowProps {
  /**
   * Called once colors have been extracted from the uploaded image.
   * Receives the dominant hex colors and inferred mood suggestions.
   */
  onExtractedColors: (colors: string[], suggestedMoods: StyleMood[]) => void;
  /** Maximum number of dominant colors to extract (default: 5). */
  maxColors?: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ImageFirstFlow({ onExtractedColors, maxColors = 5 }: ImageFirstFlowProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [suggestedMoods, setSuggestedMoods] = useState<StyleMood[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, JPG, WebP, etc.).');
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPreview(dataUrl);

        const img = new Image();
        img.onload = () => {
          const colors = extractColorsFromImage(img, maxColors);
          const moods = inferMoods(
            colors.map((hex) => {
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return [r, g, b] as [number, number, number];
            }),
          );
          setExtractedColors(colors);
          setSuggestedMoods(moods);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [maxColors],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleApply = () => {
    if (extractedColors.length > 0) {
      onExtractedColors(extractedColors, suggestedMoods);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500 italic">
        Upload an image to extract its color palette and kick off your style journey.
      </p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer text-center p-4 focus:outline-none focus:ring-2 focus:ring-teal-400/50
          ${isDragging
            ? 'border-teal-400 bg-teal-50'
            : 'border-gray-300 hover:border-teal-300 hover:bg-gray-50'
          }`}
      >
        {preview ? (
          <img
            src={preview}
            alt="Uploaded preview"
            className="max-h-32 mx-auto rounded object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-2">
            <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-300" />
            <p className="text-[11px] text-gray-500 font-medium">
              {isDragging ? 'Drop your image here' : 'Click or drop an image'}
            </p>
            <p className="text-[9px] text-gray-400">PNG, JPG, WebP, GIF…</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          aria-label="Image file input"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="text-[10px] text-red-500 flex items-center gap-1">
          <i className="fa-solid fa-triangle-exclamation" />
          {error}
        </div>
      )}

      {/* Extracted palette */}
      {extractedColors.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-gray-700">Extracted palette</p>
          <div className="flex h-8 rounded overflow-hidden border border-gray-200">
            {extractedColors.map((hex, i) => (
              <span
                key={`${hex}-${i}`}
                className="flex-1"
                style={{ backgroundColor: hex }}
                title={hex}
                aria-label={hex}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {extractedColors.map((hex, i) => (
              <span key={`${hex}-${i}`} className="text-[9px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {hex}
              </span>
            ))}
          </div>

          {/* Inferred moods */}
          {suggestedMoods.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-500">Suggested mood:</span>
              {suggestedMoods.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded-full text-[10px] bg-teal-50 text-teal-700 border border-teal-200 capitalize font-medium"
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          {/* Apply button */}
          <button
            type="button"
            onClick={handleApply}
            className="w-full px-3 py-1.5 rounded text-[11px] bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 font-medium"
          >
            <i className="fa-solid fa-palette text-[9px]" />
            Use this palette
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageFirstFlow;
