import type { SvgRectElement } from './types';

export interface RasterToSvgOptions {
  maxDimension?: number;
  colorLevels?: number;
}

export interface RasterToSvgResult {
  elements: SvgRectElement[];
  svgWidth: number;
  svgHeight: number;
}

function quantize(value: number, levels: number): number {
  const step = 255 / (levels - 1);
  return Math.round(Math.round(value / step) * step);
}

export function rasterImageToSvgElements(
  file: File,
  options: RasterToSvgOptions = {},
): Promise<RasterToSvgResult> {
  const { maxDimension = 150, colorLevels = 6 } = options;

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
      const canvasW = Math.max(1, Math.round(img.width * scale));
      const canvasH = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvasW, canvasH);
      const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
      const { data } = imageData;

      const svgWidth = 800;
      const svgHeight = Math.round((canvasH / canvasW) * svgWidth);
      const pixelW = svgWidth / canvasW;
      const pixelH = svgHeight / canvasH;

      const elements: SvgRectElement[] = [];
      let idCounter = 0;

      for (let row = 0; row < canvasH; row++) {
        let colStart = 0;
        while (colStart < canvasW) {
          const idx = (row * canvasW + colStart) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          // Skip transparent or near-white pixels
          if (a < 128 || (r > 240 && g > 240 && b > 240)) {
            colStart++;
            continue;
          }

          const qr = quantize(r, colorLevels);
          const qg = quantize(g, colorLevels);
          const qb = quantize(b, colorLevels);

          let colEnd = colStart + 1;
          while (colEnd < canvasW) {
            const nIdx = (row * canvasW + colEnd) * 4;
            const nr = data[nIdx];
            const ng = data[nIdx + 1];
            const nb = data[nIdx + 2];
            const na = data[nIdx + 3];
            if (na < 128 || (nr > 240 && ng > 240 && nb > 240)) break;
            if (quantize(nr, colorLevels) !== qr) break;
            if (quantize(ng, colorLevels) !== qg) break;
            if (quantize(nb, colorLevels) !== qb) break;
            colEnd++;
          }

          const fill = `rgb(${qr},${qg},${qb})`;
          elements.push({
            id: `raster-${idCounter++}`,
            type: 'rect',
            x: Math.round(colStart * pixelW),
            y: Math.round(row * pixelH),
            width: Math.ceil((colEnd - colStart) * pixelW),
            height: Math.ceil(pixelH),
            rx: 0,
            fill,
            stroke: 'none',
            strokeWidth: 0,
            opacity: 1,
          });

          colStart = colEnd;
        }
      }

      resolve({ elements, svgWidth, svgHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}
