import type { SvgElement } from './types';

export interface ParsedSvg {
  elements: SvgElement[];
  viewBoxStr: string;
  svgWidth: number;
  svgHeight: number;
}

let parseIdCounter = 0;

function nextId(): string {
  return `parsed-${parseIdCounter++}`;
}

function attr(el: Element, name: string, fallback = '0'): string {
  return el.getAttribute(name) ?? fallback;
}

function numAttr(el: Element, name: string, fallback = 0): number {
  const v = el.getAttribute(name);
  if (!v) return fallback;
  return parseFloat(v) || fallback;
}

function parseDimension(val: string | null): number | null {
  if (!val) return null;
  const n = parseFloat(val); // parseFloat stops at non-numeric chars, so "210mm" → 210
  return isNaN(n) ? null : n;
}

function parseStyle(styleStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const decl of styleStr.split(';')) {
    const parts = decl.split(':');
    if (parts.length === 2) {
      result[parts[0].trim()] = parts[1].trim();
    }
  }
  return result;
}

function getBaseAttrs(el: Element) {
  const styleStr = el.getAttribute('style') ?? '';
  const style = parseStyle(styleStr);

  const fill = style['fill'] ?? attr(el, 'fill', '#000000');
  const stroke = style['stroke'] ?? attr(el, 'stroke', 'none');
  const strokeWidthRaw = style['stroke-width'] ?? attr(el, 'stroke-width', '1');
  const strokeWidth = parseFloat(strokeWidthRaw) || 1;
  const opacity = parseFloat(attr(el, 'opacity', '1')) || 1;

  return { fill, stroke, strokeWidth, opacity };
}

function pointsToPath(points: string): string {
  const pairs = points.trim().split(/[\s,]+/);
  const coords: number[] = [];
  for (const p of pairs) {
    const n = parseFloat(p);
    if (!isNaN(n)) coords.push(n);
  }
  if (coords.length < 4) return '';
  let d = `M ${coords[0]},${coords[1]}`;
  for (let i = 2; i < coords.length; i += 2) {
    d += ` L ${coords[i]},${coords[i + 1]}`;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Transform support
// ---------------------------------------------------------------------------

interface Transform {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
}

const IDENTITY: Transform = { tx: 0, ty: 0, sx: 1, sy: 1 };

function parseTransform(str: string): Transform {
  if (!str) return IDENTITY;
  const t: Transform = { tx: 0, ty: 0, sx: 1, sy: 1 };

  // matrix(a,b,c,d,e,f) — covers the general affine case
  const matrixM = str.match(
    /matrix\(\s*([-\d.e+]+)[,\s]+([-\d.e+]+)[,\s]+([-\d.e+]+)[,\s]+([-\d.e+]+)[,\s]+([-\d.e+]+)[,\s]+([-\d.e+]+)\s*\)/
  );
  if (matrixM) {
    t.sx = parseFloat(matrixM[1]) || 1;
    t.sy = parseFloat(matrixM[4]) || 1;
    t.tx = parseFloat(matrixM[5]) || 0;
    t.ty = parseFloat(matrixM[6]) || 0;
    return t;
  }

  // translate(tx [,ty])
  const translateM = str.match(/translate\(\s*([-\d.e+]+)(?:[,\s]+([-\d.e+]+))?\s*\)/);
  if (translateM) {
    t.tx = parseFloat(translateM[1]) || 0;
    t.ty = translateM[2] !== undefined ? parseFloat(translateM[2]) || 0 : 0;
  }

  // scale(sx [,sy])
  const scaleM = str.match(/scale\(\s*([-\d.e+]+)(?:[,\s]+([-\d.e+]+))?\s*\)/);
  if (scaleM) {
    t.sx = parseFloat(scaleM[1]) || 1;
    t.sy = scaleM[2] !== undefined ? parseFloat(scaleM[2]) || 1 : t.sx;
  }

  return t;
}

/** Compose parent → child transforms (child applied first, then parent). */
function compose(parent: Transform, child: Transform): Transform {
  return {
    tx: parent.tx + parent.sx * child.tx,
    ty: parent.ty + parent.sy * child.ty,
    sx: parent.sx * child.sx,
    sy: parent.sy * child.sy,
  };
}

/** Apply transform to a single (x, y) coordinate pair. */
function applyXY(t: Transform, x: number, y: number): { x: number; y: number } {
  return { x: t.tx + t.sx * x, y: t.ty + t.sy * y };
}

/** Apply transform to a path d string (translate + uniform scale only). */
function applyTransformToPath(t: Transform, d: string): string {
  // Only safe for simple M/L/C/Z paths with absolute coordinates.
  // We apply the transform by adjusting numeric coordinate pairs.
  return d.replace(/([-\d.e+]+)(?:[,\s]+([-\d.e+]+))?/g, (match, numStr, numStr2) => {
    if (numStr2 === undefined) return match; // single number (arc flags etc.) — leave alone
    const xv = parseFloat(numStr);
    const yv = parseFloat(numStr2);
    if (isNaN(xv) || isNaN(yv)) return match;
    const { x, y } = applyXY(t, xv, yv);
    return `${x.toFixed(3)},${y.toFixed(3)}`;
  });
}

// ---------------------------------------------------------------------------
// Element parsing
// ---------------------------------------------------------------------------

function parseElement(el: Element, parentTransform: Transform): SvgElement[] {
  const tag = el.tagName.toLowerCase();
  const base = getBaseAttrs(el);

  // Compose this element's own transform with the parent's
  const ownTransformStr = el.getAttribute('transform') ?? '';
  const ownTransform = parseTransform(ownTransformStr);
  const t = compose(parentTransform, ownTransform);

  switch (tag) {
    case 'rect': {
      const raw = {
        x: numAttr(el, 'x'),
        y: numAttr(el, 'y'),
        width: numAttr(el, 'width'),
        height: numAttr(el, 'height'),
      };
      const topLeft = applyXY(t, raw.x, raw.y);
      return [{
        ...base,
        id: nextId(),
        type: 'rect',
        x: topLeft.x,
        y: topLeft.y,
        width: raw.width * t.sx,
        height: raw.height * t.sy,
        rx: numAttr(el, 'rx') * Math.min(t.sx, t.sy),
      }];
    }

    case 'circle': {
      const raw = { cx: numAttr(el, 'cx'), cy: numAttr(el, 'cy'), r: numAttr(el, 'r') };
      const c = applyXY(t, raw.cx, raw.cy);
      return [{
        ...base,
        id: nextId(),
        type: 'circle',
        cx: c.x,
        cy: c.y,
        r: raw.r * Math.min(t.sx, t.sy),
      }];
    }

    case 'ellipse': {
      const raw = { cx: numAttr(el, 'cx'), cy: numAttr(el, 'cy'), rx: numAttr(el, 'rx'), ry: numAttr(el, 'ry') };
      const c = applyXY(t, raw.cx, raw.cy);
      return [{
        ...base,
        id: nextId(),
        type: 'ellipse',
        cx: c.x,
        cy: c.y,
        rx: raw.rx * t.sx,
        ry: raw.ry * t.sy,
      }];
    }

    case 'line': {
      const p1 = applyXY(t, numAttr(el, 'x1'), numAttr(el, 'y1'));
      const p2 = applyXY(t, numAttr(el, 'x2'), numAttr(el, 'y2'));
      return [{
        ...base,
        id: nextId(),
        type: 'line',
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
      }];
    }

    case 'path': {
      const d = attr(el, 'd', '');
      return [{
        ...base,
        id: nextId(),
        type: 'path',
        d: (t.tx !== 0 || t.ty !== 0 || t.sx !== 1 || t.sy !== 1)
          ? applyTransformToPath(t, d)
          : d,
      }];
    }

    case 'polyline':
    case 'polygon': {
      const points = attr(el, 'points', '');
      let d = pointsToPath(points);
      if (tag === 'polygon' && d) d += ' Z';
      if (!d) return [];
      return [{
        ...base,
        id: nextId(),
        type: 'path',
        d: (t.tx !== 0 || t.ty !== 0 || t.sx !== 1 || t.sy !== 1)
          ? applyTransformToPath(t, d)
          : d,
      }];
    }

    case 'text': {
      const pos = applyXY(t, numAttr(el, 'x'), numAttr(el, 'y'));
      return [{
        ...base,
        id: nextId(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        content: el.textContent ?? '',
        fontSize: numAttr(el, 'font-size', 16) * Math.min(t.sx, t.sy),
        fontFamily: attr(el, 'font-family', 'sans-serif'),
      }];
    }

    case 'image': {
      const pos = applyXY(t, numAttr(el, 'x'), numAttr(el, 'y'));
      return [{
        ...base,
        id: nextId(),
        type: 'image',
        x: pos.x,
        y: pos.y,
        width: numAttr(el, 'width') * t.sx,
        height: numAttr(el, 'height') * t.sy,
        href: attr(el, 'href', '') || attr(el, 'xlink:href', ''),
      }];
    }

    case 'g': {
      const children: SvgElement[] = [];
      for (const child of Array.from(el.children)) {
        children.push(...parseElement(child, t));
      }
      return children;
    }

    default:
      return [];
  }
}

export function parseSvgFile(svgText: string): ParsedSvg {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    return { elements: [], viewBoxStr: '0 0 800 600', svgWidth: 800, svgHeight: 600 };
  }

  let viewBoxStr: string;
  let svgWidth: number;
  let svgHeight: number;

  const vbAttr = svgEl.getAttribute('viewBox');
  if (vbAttr) {
    viewBoxStr = vbAttr;
    const parts = vbAttr.split(/[\s,]+/).map(Number);
    svgWidth = parts[2] ?? 800;
    svgHeight = parts[3] ?? 600;
  } else {
    // No viewBox: synthesize from width/height so element coordinates are preserved.
    const wVal = parseDimension(svgEl.getAttribute('width'));
    const hVal = parseDimension(svgEl.getAttribute('height'));
    svgWidth = wVal ?? 800;
    svgHeight = hVal ?? 600;
    viewBoxStr = `0 0 ${svgWidth} ${svgHeight}`;
  }

  // Apply the root SVG's own transform (rare but valid)
  const rootTransformStr = svgEl.getAttribute('transform') ?? '';
  const rootTransform = parseTransform(rootTransformStr);

  const elements: SvgElement[] = [];
  for (const child of Array.from(svgEl.children)) {
    elements.push(...parseElement(child, rootTransform));
  }

  return { elements, viewBoxStr, svgWidth, svgHeight };
}

