import type { SvgPathElement } from './types';

export interface TraceImageOptions {
  /** Maximum pixel dimension for the working canvas (default: 300). */
  maxDimension?: number;
  /** Sobel magnitude threshold 0–1020 (default: 25). */
  edgeThreshold?: number;
  /** Minimum number of pixels in a contour to be included (default: 8). */
  minContourLength?: number;
  /** Ramer-Douglas-Peucker epsilon in SVG-coordinate units (default: 1.5). */
  simplifyTolerance?: number;
}

export interface TraceImageResult {
  elements: SvgPathElement[];
  svgWidth: number;
  svgHeight: number;
}

type Point = { x: number; y: number };

// ---------------------------------------------------------------------------
// Ramer-Douglas-Peucker simplification
// ---------------------------------------------------------------------------

function perpDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dx * (a.y - p.y) - (a.x - p.x) * dy) / Math.sqrt(len2);
}

function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    return [
      ...rdp(points.slice(0, maxIdx + 1), epsilon),
      ...rdp(points.slice(maxIdx), epsilon).slice(1),
    ];
  }
  return [points[0], points[points.length - 1]];
}

// ---------------------------------------------------------------------------
// Image processing helpers
// ---------------------------------------------------------------------------

/** 3×3 Gaussian blur on a grayscale Float32Array. */
function gaussianBlur(gray: Float32Array, w: number, h: number): Float32Array {
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += gray[(y + dy) * w + (x + dx)] * kernel[k++];
        }
      }
      out[y * w + x] = sum / 16;
    }
  }
  // Copy border pixels unchanged
  for (let x = 0; x < w; x++) { out[x] = gray[x]; out[(h - 1) * w + x] = gray[(h - 1) * w + x]; }
  for (let y = 0; y < h; y++) { out[y * w] = gray[y * w]; out[y * w + w - 1] = gray[y * w + w - 1]; }
  return out;
}

/** Sobel edge detection — returns magnitude map (0–~1440). */
function sobelMagnitude(gray: Float32Array, w: number, h: number): Float32Array {
  const mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[y * w + (x - 1)] - gray[(y + 1) * w + (x - 1)]
        + gray[(y - 1) * w + (x + 1)] + 2 * gray[y * w + (x + 1)] + gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
        + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
      mag[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return mag;
}

// ---------------------------------------------------------------------------
// Contour ordering: order an unordered set of edge pixels into a chain
// ---------------------------------------------------------------------------

const NEIGHBORS_8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const;

function orderChain(pixels: Point[], w: number): Point[] {
  if (pixels.length <= 1) return pixels;

  // Build a fast lookup: key → Point
  const pixelSet = new Map<number, Point>();
  for (const p of pixels) pixelSet.set(p.y * w + p.x, p);

  const neighborList = (p: Point): Point[] => {
    const result: Point[] = [];
    for (const [dy, dx] of NEIGHBORS_8) {
      const n = pixelSet.get((p.y + dy) * w + (p.x + dx));
      if (n) result.push(n);
    }
    return result;
  };

  // Find an endpoint (degree = 1) to start a clean chain, else use top-left pixel
  let start: Point = pixels.reduce((b, p) => (p.y < b.y || (p.y === b.y && p.x < b.x)) ? p : b);
  for (const p of pixels) {
    if (neighborList(p).length === 1) { start = p; break; }
  }

  const visited = new Set<number>();
  const chain: Point[] = [];
  let curr = start;

  while (true) {
    const key = curr.y * w + curr.x;
    if (visited.has(key)) break;
    visited.add(key);
    chain.push(curr);

    const ns = neighborList(curr).filter(n => !visited.has(n.y * w + n.x));
    if (ns.length === 0) break;

    // Prefer continuing in the same direction to produce smoother paths
    if (chain.length >= 2 && ns.length > 1) {
      const prev = chain[chain.length - 2];
      const ddx = curr.x - prev.x;
      const ddy = curr.y - prev.y;
      ns.sort((a, b) => {
        const da = Math.abs((a.x - curr.x) - ddx) + Math.abs((a.y - curr.y) - ddy);
        const db = Math.abs((b.x - curr.x) - ddx) + Math.abs((b.y - curr.y) - ddy);
        return da - db;
      });
    }

    curr = ns[0];
  }

  return chain;
}

// ---------------------------------------------------------------------------
// Main export: trace raster image → SVG path elements
// ---------------------------------------------------------------------------

export function traceImageToPaths(
  file: File,
  options: TraceImageOptions = {},
): Promise<TraceImageResult> {
  const {
    maxDimension = 300,
    edgeThreshold = 25,
    minContourLength = 8,
    simplifyTolerance = 1.5,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width === 0 || img.height === 0) {
        reject(new Error('Image has zero dimensions'));
        return;
      }

      const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not get 2D context')); return; }

      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);

      // 1. Convert to grayscale (treat transparent pixels as white)
      const gray = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const alpha = data[i * 4 + 3];
        if (alpha < 128) { gray[i] = 255; continue; }
        gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      }

      // 2. Gaussian blur to reduce noise
      const blurred = gaussianBlur(gray, w, h);

      // 3. Sobel edge detection + threshold → binary edge map
      const mag = sobelMagnitude(blurred, w, h);
      const edges = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        edges[i] = mag[i] > edgeThreshold ? 1 : 0;
      }

      // SVG output dimensions
      const SVG_WIDTH = 800;
      const svgWidth = SVG_WIDTH;
      const svgHeight = Math.round((h / w) * svgWidth);
      const scaleX = svgWidth / w;
      const scaleY = svgHeight / h;

      // 4. Connected component BFS
      const visited = new Uint8Array(w * h);
      const paths: SvgPathElement[] = [];
      let idCounter = 0;

      for (let sy = 0; sy < h; sy++) {
        for (let sx = 0; sx < w; sx++) {
          const idx = sy * w + sx;
          if (!edges[idx] || visited[idx]) continue;

          // BFS to collect all pixels in this connected edge component
          const component: Point[] = [];
          const queue: Point[] = [{ x: sx, y: sy }];
          visited[idx] = 1;

          while (queue.length > 0) {
            const p = queue.shift()!;
            component.push(p);
            for (const [dy, dx] of NEIGHBORS_8) {
              const nx = p.x + dx, ny = p.y + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const nIdx = ny * w + nx;
              if (!edges[nIdx] || visited[nIdx]) continue;
              visited[nIdx] = 1;
              queue.push({ x: nx, y: ny });
            }
          }

          if (component.length < minContourLength) continue;

          // 5. Order pixels into a continuous chain
          const chain = orderChain(component, w);

          // 6. Scale to SVG coordinates then apply RDP simplification
          const svgPoints = chain.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
          const simplified = rdp(svgPoints, simplifyTolerance);
          if (simplified.length < 2) continue;

          const d = simplified
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(' ');

          paths.push({
            id: `trace-${idCounter++}`,
            type: 'path',
            d,
            fill: 'none',
            stroke: '#1e293b',
            strokeWidth: 1.5,
            opacity: 1,
          });
        }
      }

      resolve({ elements: paths, svgWidth, svgHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}
