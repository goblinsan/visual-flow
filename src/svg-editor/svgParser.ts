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

function parseElement(el: Element): SvgElement[] {
  const tag = el.tagName.toLowerCase();
  const base = getBaseAttrs(el);

  switch (tag) {
    case 'rect':
      return [{
        ...base,
        id: nextId(),
        type: 'rect',
        x: numAttr(el, 'x'),
        y: numAttr(el, 'y'),
        width: numAttr(el, 'width'),
        height: numAttr(el, 'height'),
        rx: numAttr(el, 'rx'),
      }];

    case 'circle':
      return [{
        ...base,
        id: nextId(),
        type: 'circle',
        cx: numAttr(el, 'cx'),
        cy: numAttr(el, 'cy'),
        r: numAttr(el, 'r'),
      }];

    case 'ellipse':
      return [{
        ...base,
        id: nextId(),
        type: 'ellipse',
        cx: numAttr(el, 'cx'),
        cy: numAttr(el, 'cy'),
        rx: numAttr(el, 'rx'),
        ry: numAttr(el, 'ry'),
      }];

    case 'line':
      return [{
        ...base,
        id: nextId(),
        type: 'line',
        x1: numAttr(el, 'x1'),
        y1: numAttr(el, 'y1'),
        x2: numAttr(el, 'x2'),
        y2: numAttr(el, 'y2'),
      }];

    case 'path':
      return [{
        ...base,
        id: nextId(),
        type: 'path',
        d: attr(el, 'd', ''),
      }];

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
        d,
      }];
    }

    case 'text':
      return [{
        ...base,
        id: nextId(),
        type: 'text',
        x: numAttr(el, 'x'),
        y: numAttr(el, 'y'),
        content: el.textContent ?? '',
        fontSize: numAttr(el, 'font-size', 16),
        fontFamily: attr(el, 'font-family', 'sans-serif'),
      }];

    case 'image':
      return [{
        ...base,
        id: nextId(),
        type: 'image',
        x: numAttr(el, 'x'),
        y: numAttr(el, 'y'),
        width: numAttr(el, 'width'),
        height: numAttr(el, 'height'),
        href: attr(el, 'href', '') || attr(el, 'xlink:href', ''),
      }];

    case 'g': {
      const children: SvgElement[] = [];
      for (const child of Array.from(el.children)) {
        children.push(...parseElement(child));
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

  const viewBoxStr = svgEl.getAttribute('viewBox') ?? '0 0 800 600';
  const parts = viewBoxStr.split(/[\s,]+/).map(Number);
  const svgWidth = parts[2] ?? 800;
  const svgHeight = parts[3] ?? 600;

  const elements: SvgElement[] = [];
  for (const child of Array.from(svgEl.children)) {
    elements.push(...parseElement(child));
  }

  return { elements, viewBoxStr, svgWidth, svgHeight };
}
