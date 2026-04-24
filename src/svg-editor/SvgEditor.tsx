import { useState, useRef, useCallback, useEffect } from 'react';
import type { SvgTool, SvgElement, SvgRectElement, SvgCircleElement, SvgEllipseElement, SvgLineElement, SvgPathElement, SvgTextElement } from './types';
import { traceImageToPaths } from './rasterToSvg';
import { parseSvgFile } from './svgParser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clientToSvg(svgEl: SVGSVGElement, cx: number, cy: number): { x: number; y: number } {
  const pt = svgEl.createSVGPoint();
  pt.x = cx; pt.y = cy;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const r = pt.matrixTransform(ctm.inverse());
  return { x: r.x, y: r.y };
}

function getSvgPoint(e: React.MouseEvent, svgEl: SVGSVGElement): { x: number; y: number } {
  return clientToSvg(svgEl, e.clientX, e.clientY);
}

// ---------------------------------------------------------------------------
// Bézier pen types and helpers
// ---------------------------------------------------------------------------

interface BezierNode {
  x: number; y: number;
  cp1x: number; cp1y: number; // in-handle (arrives at this node)
  cp2x: number; cp2y: number; // out-handle (departs from this node)
}

interface PenState {
  nodes: BezierNode[];
  dragging: boolean; // mouse button held — stretching the handle of the last node
}

interface NodeEditDrag {
  pathId: string;
  handleType: 'anchor' | 'cp1' | 'cp2';
  handleIndex: number;
  startNodes: BezierNode[]; // immutable snapshot taken at drag-start
  grabPt: { x: number; y: number };  // SVG coords where the drag started
  closed: boolean;
}

function r2(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

// ---------------------------------------------------------------------------
// Ramer-Douglas-Peucker simplification (inline copy for path simplification)
// ---------------------------------------------------------------------------

function rdpPerp(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  return Math.abs(dx * (ay - py) - (ax - px) * dy) / Math.sqrt(len2);
}

function rdp2(pts: { x: number; y: number }[], eps: number): { x: number; y: number }[] {
  if (pts.length <= 2) return pts;
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = rdpPerp(pts[i].x, pts[i].y, pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    return [...rdp2(pts.slice(0, idx + 1), eps), ...rdp2(pts.slice(idx), eps).slice(1)];
  }
  return [pts[0], pts[pts.length - 1]];
}

// ---------------------------------------------------------------------------
// Bounding box helpers
// ---------------------------------------------------------------------------

interface BBox { x: number; y: number; width: number; height: number }

function getElementBBox(el: SvgElement): BBox {
  switch (el.type) {
    case 'rect':    return { x: el.x, y: el.y, width: el.width, height: el.height };
    case 'circle':  return { x: el.cx - el.r, y: el.cy - el.r, width: el.r * 2, height: el.r * 2 };
    case 'ellipse': return { x: el.cx - el.rx, y: el.cy - el.ry, width: el.rx * 2, height: el.ry * 2 };
    case 'line':    return {
      x: Math.min(el.x1, el.x2), y: Math.min(el.y1, el.y2),
      width: Math.max(Math.abs(el.x2 - el.x1), 4), height: Math.max(Math.abs(el.y2 - el.y1), 4),
    };
    case 'image':   return { x: el.x, y: el.y, width: el.width, height: el.height };
    case 'text':    return { x: el.x, y: el.y - el.fontSize, width: el.content.length * el.fontSize * 0.6 || 40, height: el.fontSize * 1.4 };
    case 'path': {
      const parsed = pathDToNodes(el.d);
      if (!parsed || parsed.nodes.length === 0) return { x: 0, y: 0, width: 10, height: 10 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of parsed.nodes) {
        minX = Math.min(minX, n.x, n.cp1x, n.cp2x);
        minY = Math.min(minY, n.y, n.cp1y, n.cp2y);
        maxX = Math.max(maxX, n.x, n.cp1x, n.cp2x);
        maxY = Math.max(maxY, n.y, n.cp1y, n.cp2y);
      }
      return { x: minX, y: minY, width: Math.max(maxX - minX, 4), height: Math.max(maxY - minY, 4) };
    }
  }
}

/** Apply a new bounding box to an element, scaling its geometry accordingly. */
function scaleElement(el: SvgElement, nb: BBox): SvgElement {
  const ob = getElementBBox(el);
  const sw = nb.width  / (ob.width  || 1);
  const sh = nb.height / (ob.height || 1);
  const tx = nb.x - ob.x * sw;
  const ty = nb.y - ob.y * sh;
  const sp = (px: number, py: number) => ({ x: px * sw + tx, y: py * sh + ty });
  switch (el.type) {
    case 'rect':    return { ...el, x: nb.x, y: nb.y, width: nb.width, height: nb.height };
    case 'circle':  return { ...el, cx: nb.x + nb.width / 2, cy: nb.y + nb.height / 2, r: Math.min(nb.width, nb.height) / 2 };
    case 'ellipse': return { ...el, cx: nb.x + nb.width / 2, cy: nb.y + nb.height / 2, rx: nb.width / 2, ry: nb.height / 2 };
    case 'line': {
      const p1 = sp(el.x1, el.y1); const p2 = sp(el.x2, el.y2);
      return { ...el, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    }
    case 'image':   return { ...el, x: nb.x, y: nb.y, width: nb.width, height: nb.height };
    case 'text':    return { ...el, x: nb.x, y: nb.y + nb.height * 0.85, fontSize: Math.max(4, nb.height / 1.4) };
    case 'path': {
      const parsed = pathDToNodes(el.d);
      if (!parsed) return el;
      const newNodes: BezierNode[] = parsed.nodes.map(n => {
        const { x, y } = sp(n.x, n.y);
        const { x: cp1x, y: cp1y } = sp(n.cp1x, n.cp1y);
        const { x: cp2x, y: cp2y } = sp(n.cp2x, n.cp2y);
        return { x, y, cp1x, cp1y, cp2x, cp2y };
      });
      return { ...el, d: nodesToPathD(newNodes, parsed.closed) };
    }
  }
}

/** Simplify a path using Ramer-Douglas-Peucker on its anchor nodes. */
function simplifyPath(d: string, tolerance: number): string {
  const parsed = pathDToNodes(d);
  if (!parsed || parsed.nodes.length < 3) return d;
  const pts = parsed.nodes.map(n => ({ x: n.x, y: n.y }));
  const simplified = rdp2(pts, tolerance);
  if (simplified.length < 2) return d;
  const newD = simplified.map((p, i) => `${i === 0 ? 'M' : 'L'} ${r2(p.x)},${r2(p.y)}`).join(' ');
  return parsed.closed ? newD + ' Z' : newD;
}

// BBox drag types
type BBoxHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

interface BBoxDrag {
  elId: string;
  handleType: BBoxHandle;
  startEl: SvgElement;
  startBBox: BBox;
  grabPt: { x: number; y: number };
}

const FONT_FAMILIES = [
  'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
  'Arial', 'Helvetica', 'Verdana', 'Trebuchet MS', 'Georgia',
  'Times New Roman', 'Courier New', 'Impact', 'Comic Sans MS',
  'Palatino', 'Garamond',
];

function getElementCenter(el: SvgElement): { cx: number; cy: number } {
  switch (el.type) {
    case 'rect': return { cx: el.x + el.width / 2, cy: el.y + el.height / 2 };
    case 'circle': return { cx: el.cx, cy: el.cy };
    case 'ellipse': return { cx: el.cx, cy: el.cy };
    case 'line': return { cx: (el.x1 + el.x2) / 2, cy: (el.y1 + el.y2) / 2 };
    case 'text': return { cx: el.x, cy: el.y };
    case 'image': return { cx: el.x + el.width / 2, cy: el.y + el.height / 2 };
    case 'path': {
      const m = /[Mm]\s*([-\d.]+)[,\s]+([-\d.]+)/.exec(el.d);
      return m ? { cx: parseFloat(m[1]), cy: parseFloat(m[2]) } : { cx: 0, cy: 0 };
    }
  }
}

function buildTransform(el: SvgElement): string | undefined {
  const rotate = el.rotate;
  const skewX = el.skewX;
  const skewY = el.skewY;
  if (rotate === 0 && skewX === 0 && skewY === 0) return undefined;
  const { cx, cy } = getElementCenter(el);
  const parts: string[] = [];
  if (rotate !== 0) parts.push(`rotate(${rotate} ${r2(cx)} ${r2(cy)})`);
  if (skewX !== 0) parts.push(`skewX(${skewX})`);
  if (skewY !== 0) parts.push(`skewY(${skewY})`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/** Converts a BezierNode array to an SVG path `d` string. */
function nodesToPathD(nodes: BezierNode[], closed: boolean): string {
  if (nodes.length === 0) return '';
  const p = (x: number, y: number) => `${r2(x)},${r2(y)}`;
  let d = `M ${p(nodes[0].x, nodes[0].y)}`;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const isLine =
      Math.hypot(prev.cp2x - prev.x, prev.cp2y - prev.y) < 0.5 &&
      Math.hypot(curr.cp1x - curr.x, curr.cp1y - curr.y) < 0.5;
    d += isLine
      ? ` L ${p(curr.x, curr.y)}`
      : ` C ${p(prev.cp2x, prev.cp2y)} ${p(curr.cp1x, curr.cp1y)} ${p(curr.x, curr.y)}`;
  }
  if (closed && nodes.length > 1) {
    const last = nodes[nodes.length - 1];
    const first = nodes[0];
    const isLine =
      Math.hypot(last.cp2x - last.x, last.cp2y - last.y) < 0.5 &&
      Math.hypot(first.cp1x - first.x, first.cp1y - first.y) < 0.5;
    if (!isLine) {
      d += ` C ${p(last.cp2x, last.cp2y)} ${p(first.cp1x, first.cp1y)} ${p(first.x, first.y)}`;
    }
    d += ' Z';
  }
  return d;
}

/** Tokenises an SVG path `d` attribute into command objects. */
function parsePath(d: string): { cmd: string; args: number[] }[] {
  const result: { cmd: string; args: number[] }[] = [];
  const re = /([MmLlCcZz])|([+-]?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?)/g;
  let cur = '';
  let args: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    if (m[1]) {
      if (cur) result.push({ cmd: cur, args });
      cur = m[1]; args = [];
    } else if (m[2] !== undefined) {
      args.push(parseFloat(m[2]));
    }
  }
  if (cur) result.push({ cmd: cur, args });
  return result;
}

/**
 * Parses an SVG path `d` string into a BezierNode array.
 * Supports M/m, L/l, C/c, Z/z. Returns null for unsupported commands.
 */
function pathDToNodes(d: string): { nodes: BezierNode[]; closed: boolean } | null {
  const cmds = parsePath(d);
  const nodes: BezierNode[] = [];
  let closed = false;
  let cx = 0, cy = 0;
  try {
    for (const { cmd, args } of cmds) {
      switch (cmd) {
        case 'M': case 'm':
          for (let i = 0; i + 1 < args.length; i += 2) {
            if (cmd === 'M') { cx = args[i]; cy = args[i + 1]; }
            else { cx += args[i]; cy += args[i + 1]; }
            nodes.push({ x: cx, y: cy, cp1x: cx, cp1y: cy, cp2x: cx, cp2y: cy });
          }
          break;
        case 'L': case 'l':
          for (let i = 0; i + 1 < args.length; i += 2) {
            if (cmd === 'L') { cx = args[i]; cy = args[i + 1]; }
            else { cx += args[i]; cy += args[i + 1]; }
            nodes.push({ x: cx, y: cy, cp1x: cx, cp1y: cy, cp2x: cx, cp2y: cy });
          }
          break;
        case 'C': case 'c':
          for (let i = 0; i + 5 < args.length; i += 6) {
            const bx = cmd === 'c' ? cx : 0;
            const by = cmd === 'c' ? cy : 0;
            const x1 = args[i]     + bx, y1 = args[i + 1] + by;
            const x2 = args[i + 2] + bx, y2 = args[i + 3] + by;
            const nx = args[i + 4] + bx, ny = args[i + 5] + by;
            if (nodes.length > 0) {
              nodes[nodes.length - 1].cp2x = x1;
              nodes[nodes.length - 1].cp2y = y1;
            }
            cx = nx; cy = ny;
            // If this cubic bezier closes back to the first node it is the
            // closing-segment curve; update first node's in-handle instead of
            // adding a duplicate node.
            if (nodes.length > 1 && Math.hypot(nx - nodes[0].x, ny - nodes[0].y) < 1) {
              nodes[0].cp1x = x2; nodes[0].cp1y = y2;
            } else {
              nodes.push({ x: nx, y: ny, cp1x: x2, cp1y: y2, cp2x: nx, cp2y: ny });
            }
          }
          break;
        case 'Z': case 'z': closed = true; break;
        default: return null; // unknown command — decline to parse
      }
    }
  } catch { return null; }
  return nodes.length > 0 ? { nodes, closed } : null;
}

// ---------------------------------------------------------------------------
// Pen overlay (shown while the pen tool is active)
// ---------------------------------------------------------------------------

function PenOverlay({
  penState,
  previewPt,
  stroke,
  strokeWidth,
}: {
  penState: PenState;
  previewPt: { x: number; y: number } | null;
  stroke: string;
  strokeWidth: number;
}) {
  const { nodes, dragging } = penState;
  if (nodes.length === 0) return null;

  // Rubber-band: add a virtual next-node at the mouse position so the user can
  // preview the segment that will be drawn on the next click.
  const previewNodes: BezierNode[] = [...nodes];
  if (!dragging && previewPt) {
    previewNodes.push({ x: previewPt.x, y: previewPt.y, cp1x: previewPt.x, cp1y: previewPt.y, cp2x: previewPt.x, cp2y: previewPt.y });
  }
  const pathD = previewNodes.length > 1 ? nodesToPathD(previewNodes, false) : '';

  const SNAP = 10;
  const nearFirst = !dragging && previewPt && nodes.length >= 3 &&
    Math.hypot(previewPt.x - nodes[0].x, previewPt.y - nodes[0].y) < SNAP;

  return (
    <g pointerEvents="none">
      {pathD && <path d={pathD} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="5,3" opacity={0.7} />}
      {nodes.map((node, i) => {
        const hasCp1 = Math.hypot(node.cp1x - node.x, node.cp1y - node.y) > 0.5;
        const hasCp2 = Math.hypot(node.cp2x - node.x, node.cp2y - node.y) > 0.5;
        return (
          <g key={i}>
            {hasCp1 && <line x1={node.cp1x} y1={node.cp1y} x2={node.x} y2={node.y} stroke="#6366f1" strokeWidth={1} />}
            {hasCp2 && <line x1={node.x} y1={node.y} x2={node.cp2x} y2={node.cp2y} stroke="#6366f1" strokeWidth={1} />}
            {hasCp1 && <circle cx={node.cp1x} cy={node.cp1y} r={3.5} fill="#a78bfa" stroke="white" strokeWidth={1} />}
            {hasCp2 && <circle cx={node.cp2x} cy={node.cp2y} r={3.5} fill="#a78bfa" stroke="white" strokeWidth={1} />}
            <rect
              x={node.x - 5} y={node.y - 5} width={10} height={10}
              fill={i === 0 ? (nearFirst ? '#10b981' : '#dcfce7') : 'white'}
              stroke={i === 0 ? '#10b981' : '#3b82f6'}
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Path node editor (shown when a path is selected in select mode)
// ---------------------------------------------------------------------------

function PathNodeEditor({
  el,
  onStartDrag,
  onDeleteNode,
}: {
  el: SvgPathElement;
  onStartDrag: (handleType: 'anchor' | 'cp1' | 'cp2', handleIndex: number, e: React.MouseEvent) => void;
  onDeleteNode: (index: number) => void;
}) {
  const parsed = pathDToNodes(el.d);
  if (!parsed) return null;
  const { nodes } = parsed;
  return (
    <g>
      {nodes.map((node, i) => {
        const hasCp1 = Math.hypot(node.cp1x - node.x, node.cp1y - node.y) > 0.5;
        const hasCp2 = Math.hypot(node.cp2x - node.x, node.cp2y - node.y) > 0.5;
        return (
          <g key={i}>
            {hasCp1 && <line x1={node.cp1x} y1={node.cp1y} x2={node.x} y2={node.y} stroke="#6366f1" strokeWidth={1} pointerEvents="none" />}
            {hasCp2 && <line x1={node.x} y1={node.y} x2={node.cp2x} y2={node.cp2y} stroke="#6366f1" strokeWidth={1} pointerEvents="none" />}
            {hasCp1 && (
              <circle cx={node.cp1x} cy={node.cp1y} r={5} fill="#a78bfa" stroke="white" strokeWidth={1.5}
                style={{ cursor: 'crosshair' }}
                onMouseDown={e => { e.stopPropagation(); onStartDrag('cp1', i, e); }} />
            )}
            {hasCp2 && (
              <circle cx={node.cp2x} cy={node.cp2y} r={5} fill="#a78bfa" stroke="white" strokeWidth={1.5}
                style={{ cursor: 'crosshair' }}
                onMouseDown={e => { e.stopPropagation(); onStartDrag('cp2', i, e); }} />
            )}
            <rect
              x={node.x - 5} y={node.y - 5} width={10} height={10}
              fill="white" stroke="#3b82f6" strokeWidth={2}
              style={{ cursor: 'move' }}
              onMouseDown={e => { e.stopPropagation(); onStartDrag('anchor', i, e); }}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onDeleteNode(i); }}
            />
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Selection bounding-box handles (scale + rotate)
// ---------------------------------------------------------------------------

const HANDLE_CURSOR: Record<BBoxHandle, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize', se: 'se-resize', s: 's-resize',
  sw: 'sw-resize', w: 'w-resize', rotate: 'alias',
};

function SelectionHandles({
  el,
  onStartBBoxDrag,
}: {
  el: SvgElement;
  onStartBBoxDrag: (handleType: BBoxHandle, e: React.MouseEvent) => void;
}) {
  const { x, y, width: w, height: h } = getElementBBox(el);
  const cx = x + w / 2, cy = y + h / 2;
  const rotY = y - 20;
  const handles: { type: BBoxHandle; hx: number; hy: number }[] = [
    { type: 'nw', hx: x,      hy: y      },
    { type: 'n',  hx: cx,     hy: y      },
    { type: 'ne', hx: x + w,  hy: y      },
    { type: 'e',  hx: x + w,  hy: cy     },
    { type: 'se', hx: x + w,  hy: y + h  },
    { type: 's',  hx: cx,     hy: y + h  },
    { type: 'sw', hx: x,      hy: y + h  },
    { type: 'w',  hx: x,      hy: cy     },
  ];
  return (
    <g pointerEvents="all">
      {/* Bounding box outline */}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#3b82f6" strokeWidth={0.75} strokeDasharray="4,2" pointerEvents="none" />
      {/* Rotation handle line + circle */}
      <line x1={cx} y1={y} x2={cx} y2={rotY} stroke="#3b82f6" strokeWidth={0.75} pointerEvents="none" />
      <circle cx={cx} cy={rotY} r={6} fill="white" stroke="#3b82f6" strokeWidth={1.5}
        style={{ cursor: HANDLE_CURSOR.rotate }}
        onMouseDown={e => { e.stopPropagation(); onStartBBoxDrag('rotate', e); }} />
      {/* Scale handles */}
      {handles.map(({ type, hx, hy }) => (
        <rect key={type}
          x={hx - 4} y={hy - 4} width={8} height={8}
          fill="white" stroke="#3b82f6" strokeWidth={1.5}
          style={{ cursor: HANDLE_CURSOR[type] }}
          onMouseDown={e => { e.stopPropagation(); onStartBBoxDrag(type, e); }}
        />
      ))}
    </g>
  );
}

function elementToSvgString(el: SvgElement): string {
  const op = (v: number) => (v !== 1 ? ` opacity="${v}"` : '');
  const tf = buildTransform(el);
  const tAttr = tf ? ` transform="${tf}"` : '';
  switch (el.type) {
    case 'rect':
      return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.rx}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}${tAttr}/>`;
    case 'circle':
      return `<circle cx="${el.cx}" cy="${el.cy}" r="${el.r}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}${tAttr}/>`;
    case 'ellipse':
      return `<ellipse cx="${el.cx}" cy="${el.cy}" rx="${el.rx}" ry="${el.ry}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}${tAttr}/>`;
    case 'line':
      return `<line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}${tAttr}/>`;
    case 'path':
      return `<path d="${el.d}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}${tAttr}/>`;
    case 'text':
      return `<text x="${el.x}" y="${el.y}" font-size="${el.fontSize}" font-family="${el.fontFamily}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}${tAttr}>${el.content}</text>`;
    case 'image':
      return `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${el.href}"${op(el.opacity)}${tAttr}/>`;
  }
}

function buildSvgString(elements: SvgElement[], viewBoxStr: string): string {
  const children = elements.map(elementToSvgString).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxStr}">\n  ${children}\n</svg>`;
}

function exportSvg(elements: SvgElement[], viewBoxStr: string) {
  const svgContent = buildSvgString(elements, viewBoxStr);
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'drawing.svg';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Drawing state
// ---------------------------------------------------------------------------

interface DrawingState {
  tool: SvgTool;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  points?: { x: number; y: number }[];
}

function previewElement(d: DrawingState, fill: string, stroke: string, strokeWidth: number): SvgElement | null {
  const { startX, startY, currentX, currentY } = d;
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const w = Math.abs(currentX - startX);
  const h = Math.abs(currentY - startY);

  switch (d.tool) {
    case 'rect':
      return { id: '__preview__', type: 'rect', x, y, width: w, height: h, rx: 0, fill, stroke, strokeWidth, opacity: 0.8, rotate: 0, skewX: 0, skewY: 0 };
    case 'circle': {
      const r = Math.max(w, h) / 2;
      const cx = (startX + currentX) / 2;
      const cy = (startY + currentY) / 2;
      return { id: '__preview__', type: 'circle', cx, cy, r, fill, stroke, strokeWidth, opacity: 0.8, rotate: 0, skewX: 0, skewY: 0 };
    }
    case 'ellipse':
      return { id: '__preview__', type: 'ellipse', cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2, fill, stroke, strokeWidth, opacity: 0.8, rotate: 0, skewX: 0, skewY: 0 };
    case 'line':
      return { id: '__preview__', type: 'line', x1: startX, y1: startY, x2: currentX, y2: currentY, fill, stroke, strokeWidth, opacity: 0.8, rotate: 0, skewX: 0, skewY: 0 };
    case 'freehand': {
      if (!d.points || d.points.length < 2) return null;
      const pathD = d.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
      return { id: '__preview__', type: 'path', d: pathD, fill: 'none', stroke, strokeWidth, opacity: 0.8, rotate: 0, skewX: 0, skewY: 0 };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Render element as JSX
// ---------------------------------------------------------------------------

function RenderElement({
  el,
  selected,
  onSelect,
  onMove,
  onMoveEnd,
}: {
  el: SvgElement;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onMoveEnd: () => void;
}) {
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    dragStart.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      moved.current = true;
      onMove(el.id, dx, dy);
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  }, [el.id, onMove]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    // Only handle if a mousedown happened on this element; otherwise every
    // element's global listener would fire and select the wrong element.
    if (!dragStart.current) return;
    e.stopPropagation();
    if (!moved.current) {
      onSelect(el.id);
    } else {
      onMoveEnd();
    }
    dragStart.current = null;
    moved.current = false;
  }, [el.id, onSelect, onMoveEnd]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const selectionStyle = selected ? { outline: '2px dashed #3b82f6', outlineOffset: '2px' } : {};
  const elTransform = buildTransform(el);
  const baseProps = {
    onMouseDown: handleMouseDown,
    style: selectionStyle,
    cursor: 'default' as const,
    ...(elTransform !== undefined && { transform: elTransform }),
  };

  switch (el.type) {
    case 'rect':
      return (
        <rect
          {...baseProps}
          x={el.x} y={el.y} width={el.width} height={el.height} rx={el.rx}
          fill={el.fill} stroke={selected ? '#3b82f6' : el.stroke}
          strokeWidth={selected ? Math.max(el.strokeWidth, 1.5) : el.strokeWidth}
          strokeDasharray={selected ? '5,3' : undefined}
          opacity={el.opacity}
        />
      );
    case 'circle':
      return (
        <circle
          {...baseProps}
          cx={el.cx} cy={el.cy} r={el.r}
          fill={el.fill} stroke={selected ? '#3b82f6' : el.stroke}
          strokeWidth={selected ? Math.max(el.strokeWidth, 1.5) : el.strokeWidth}
          strokeDasharray={selected ? '5,3' : undefined}
          opacity={el.opacity}
        />
      );
    case 'ellipse':
      return (
        <ellipse
          {...baseProps}
          cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry}
          fill={el.fill} stroke={selected ? '#3b82f6' : el.stroke}
          strokeWidth={selected ? Math.max(el.strokeWidth, 1.5) : el.strokeWidth}
          strokeDasharray={selected ? '5,3' : undefined}
          opacity={el.opacity}
        />
      );
    case 'line':
      return (
        <line
          {...baseProps}
          x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
          stroke={selected ? '#3b82f6' : el.stroke}
          strokeWidth={selected ? Math.max(el.strokeWidth, 1.5) : el.strokeWidth}
          strokeDasharray={selected ? '5,3' : undefined}
          opacity={el.opacity}
        />
      );
    case 'path':
      return (
        <path
          {...baseProps}
          d={el.d}
          fill={el.fill} stroke={selected ? '#3b82f6' : el.stroke}
          strokeWidth={selected ? Math.max(el.strokeWidth, 1.5) : el.strokeWidth}
          strokeDasharray={selected ? '5,3' : undefined}
          opacity={el.opacity}
        />
      );
    case 'text':
      return (
        <text
          {...baseProps}
          x={el.x} y={el.y}
          fontSize={el.fontSize} fontFamily={el.fontFamily}
          fill={el.fill} stroke={selected ? '#3b82f6' : el.stroke}
          strokeWidth={selected ? Math.max(el.strokeWidth, 0.5) : el.strokeWidth}
          opacity={el.opacity}
        >
          {el.content}
        </text>
      );
    case 'image':
      return (
        <image
          {...baseProps}
          x={el.x} y={el.y} width={el.width} height={el.height}
          href={el.href} opacity={el.opacity}
        />
      );
  }
}

function PreviewElement({ el }: { el: SvgElement }) {
  switch (el.type) {
    case 'rect':
      return <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={el.rx} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} strokeDasharray="5,3" opacity={el.opacity} />;
    case 'circle':
      return <circle cx={el.cx} cy={el.cy} r={el.r} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} strokeDasharray="5,3" opacity={el.opacity} />;
    case 'ellipse':
      return <ellipse cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} strokeDasharray="5,3" opacity={el.opacity} />;
    case 'line':
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.stroke} strokeWidth={el.strokeWidth} strokeDasharray="5,3" opacity={el.opacity} />;
    case 'path':
      return <path d={el.d} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} strokeDasharray="5,3" opacity={el.opacity} />;
    case 'text':
      return <text x={el.x} y={el.y} fontSize={el.fontSize} fontFamily={el.fontFamily} fill={el.fill} opacity={el.opacity}>{el.content}</text>;
    case 'image':
      return <image x={el.x} y={el.y} width={el.width} height={el.height} href={el.href} opacity={el.opacity} />;
  }
}

// ---------------------------------------------------------------------------
// Properties panel
// ---------------------------------------------------------------------------

function PropertiesPanel({
  elements,
  selectedId,
  tool,
  textDefaults,
  onTextDefaultsChange,
  onUpdate,
  onUpdateStart,
  onUpdateEnd,
  onDelete,
  onBringToFront,
  onSendToBack,
  onMoveUp,
  onMoveDown,
  onSimplifyPath,
}: {
  elements: SvgElement[];
  selectedId: string | null;
  tool: SvgTool;
  textDefaults: { fontSize: number; fontFamily: string };
  onTextDefaultsChange: (d: Partial<{ fontSize: number; fontFamily: string }>) => void;
  onUpdate: (id: string, updates: Partial<SvgElement>) => void;
  onUpdateStart: () => void;
  onUpdateEnd: () => void;
  onDelete: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onSimplifyPath: (tolerance: number) => void;
}) {
  const [simplifyTol, setSimplifyTol] = useState(2);
  const el = elements.find(e => e.id === selectedId);

  if (!el) {
    return (
      <div className="w-56 bg-gray-50 border-l border-gray-200 p-4 flex flex-col gap-3 text-sm">
        {tool === 'text' ? (
          <>
            <h3 className="font-semibold text-gray-700 text-sm">Text defaults</h3>
            <p className="text-gray-400 text-xs">These apply to new text elements you place.</p>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-gray-500">Font Size</span>
              <input type="number" min={4} value={textDefaults.fontSize}
                onChange={e => onTextDefaultsChange({ fontSize: parseFloat(e.target.value) || 16 })}
                className="border rounded px-1 py-0.5 w-full" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-gray-500">Font Family</span>
              <input type="text" list="svg-font-families-td" value={textDefaults.fontFamily}
                onChange={e => onTextDefaultsChange({ fontFamily: e.target.value })}
                className="border rounded px-1 py-0.5 w-full" />
              <datalist id="svg-font-families-td">
                {FONT_FAMILIES.map(f => <option key={f} value={f} />)}
              </datalist>
            </label>
          </>
        ) : (
          <>
            <p className="text-gray-500 italic">Select an element to edit its properties</p>
            <div className="text-gray-400 text-xs mt-2">
              <div>Canvas: 800 × 600</div>
              <div>Elements: {elements.length}</div>
            </div>
          </>
        )}
      </div>
    );
  }

  const update = (updates: Partial<SvgElement>) => onUpdate(el.id, updates);

  return (
    <div className="w-56 bg-gray-50 border-l border-gray-200 p-3 overflow-y-auto flex flex-col gap-3 text-xs">
      <h3 className="font-semibold text-gray-700 text-sm">{el.type} properties</h3>

      {/* Z-order controls */}
      <div className="flex gap-1">
        <button title="Send to Back" onClick={() => onSendToBack(el.id)} className="flex-1 bg-gray-100 hover:bg-gray-200 border rounded py-1 text-xs" ><i className="fa-solid fa-angles-down" /></button>
        <button title="Move Down" onClick={() => onMoveDown(el.id)} className="flex-1 bg-gray-100 hover:bg-gray-200 border rounded py-1 text-xs"><i className="fa-solid fa-angle-down" /></button>
        <button title="Move Up" onClick={() => onMoveUp(el.id)} className="flex-1 bg-gray-100 hover:bg-gray-200 border rounded py-1 text-xs"><i className="fa-solid fa-angle-up" /></button>
        <button title="Bring to Front" onClick={() => onBringToFront(el.id)} className="flex-1 bg-gray-100 hover:bg-gray-200 border rounded py-1 text-xs"><i className="fa-solid fa-angles-up" /></button>
      </div>

      {/* Common */}
      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Fill</span>
        <div className="flex gap-1 items-center">
          <input type="color" value={el.fill === 'none' ? '#000000' : el.fill} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ fill: e.target.value } as Partial<SvgElement>)} className="w-8 h-7 cursor-pointer border rounded" />
          <input type="text" value={el.fill} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ fill: e.target.value } as Partial<SvgElement>)} className="flex-1 border rounded px-1 py-0.5" />
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Stroke</span>
        <div className="flex gap-1 items-center">
          <input type="color" value={el.stroke === 'none' ? '#000000' : el.stroke} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ stroke: e.target.value } as Partial<SvgElement>)} className="w-8 h-7 cursor-pointer border rounded" />
          <input type="text" value={el.stroke} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ stroke: e.target.value } as Partial<SvgElement>)} className="flex-1 border rounded px-1 py-0.5" />
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Stroke Width</span>
        <input type="number" min={0} step={0.5} value={el.strokeWidth} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ strokeWidth: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Opacity</span>
        <input type="number" min={0} max={1} step={0.05} value={el.opacity} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ opacity: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Rotate (°)</span>
        <input type="number" step={1} value={el.rotate} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ rotate: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Skew X (°)</span>
        <input type="number" step={1} value={el.skewX} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ skewX: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Skew Y (°)</span>
        <input type="number" step={1} value={el.skewY} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ skewY: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
      </label>

      {/* Element-specific */}
      {el.type === 'rect' && (
        <>
          {(['x', 'y', 'width', 'height'] as const).map(k => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-gray-500">{k}</span>
              <input type="number" value={(el as SvgRectElement)[k]} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ [k]: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-gray-500">Corner Radius (rx)</span>
            <input type="number" min={0} value={el.rx} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ rx: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
          </label>
        </>
      )}

      {el.type === 'circle' && (
        <>
          {(['cx', 'cy', 'r'] as const).map(k => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-gray-500">{k}</span>
              <input type="number" value={(el as SvgCircleElement)[k]} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ [k]: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
            </label>
          ))}
        </>
      )}

      {el.type === 'ellipse' && (
        <>
          {(['cx', 'cy', 'rx', 'ry'] as const).map(k => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-gray-500">{k}</span>
              <input type="number" value={(el as SvgEllipseElement)[k]} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ [k]: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
            </label>
          ))}
        </>
      )}

      {el.type === 'line' && (
        <>
          {(['x1', 'y1', 'x2', 'y2'] as const).map(k => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-gray-500">{k}</span>
              <input type="number" value={(el as SvgLineElement)[k]} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ [k]: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
            </label>
          ))}
        </>
      )}

      {el.type === 'path' && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-gray-500">Path d</span>
            <textarea rows={4} value={(el as SvgPathElement).d} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ d: e.target.value } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full text-xs font-mono resize-y" />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-gray-500">Simplify (tolerance)</span>
            <div className="flex gap-1 items-center">
              <input type="number" min={0.5} max={20} step={0.5} value={simplifyTol}
                onChange={e => setSimplifyTol(parseFloat(e.target.value) || 2)}
                className="flex-1 border rounded px-1 py-0.5" />
              <button
                onClick={() => onSimplifyPath(simplifyTol)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white rounded px-2 py-1 text-xs"
                title="Reduce CV count using Ramer-Douglas-Peucker"
              >Simplify</button>
            </div>
          </div>
          <p className="text-gray-400 text-xs">Right-click an anchor node on canvas to delete it.</p>
        </>
      )}

      {el.type === 'text' && (
        <>
          {(['x', 'y'] as const).map(k => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-gray-500">{k}</span>
              <input type="number" value={(el as SvgTextElement)[k]} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ [k]: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-gray-500">Content</span>
            <input type="text" value={el.content} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ content: e.target.value } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-500">Font Size</span>
            <input type="number" min={1} value={el.fontSize} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ fontSize: parseFloat(e.target.value) || 16 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-500">Font Family</span>
            <input type="text" list="svg-font-families" value={el.fontFamily} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ fontFamily: e.target.value } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
            <datalist id="svg-font-families">
              {FONT_FAMILIES.map(f => <option key={f} value={f} />)}
            </datalist>
          </label>
        </>
      )}

      {el.type === 'image' && (
        <>
          {(['x', 'y', 'width', 'height'] as const).map(k => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-gray-500">{k}</span>
              <input type="number" value={el[k]} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ [k]: parseFloat(e.target.value) || 0 } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
            </label>
          ))}
        </>
      )}

      <button
        onClick={() => onDelete(el.id)}
        className="mt-2 bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1.5 text-xs font-medium"
      >
        Delete Element
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SvgEditor() {
  const [elements, setElements] = useState<SvgElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<SvgTool>('select');
  const [fill, setFill] = useState('#4f86f7');
  const [stroke, setStroke] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [history, setHistory] = useState<SvgElement[][]>([]);
  const [future, setFuture] = useState<SvgElement[][]>([]);
  const [converting, setConverting] = useState(false);
  const [viewBoxStr, setViewBoxStr] = useState('0 0 800 600');
  const [penState, setPenState] = useState<PenState | null>(null);
  const [penMousePt, setPenMousePt] = useState<{ x: number; y: number } | null>(null);
  const [nodeEditDrag, setNodeEditDrag] = useState<NodeEditDrag | null>(null);
  const [bboxDrag, setBboxDrag] = useState<BBoxDrag | null>(null);
  const [textFontSize, setTextFontSize] = useState(20);
  const [textFontFamily, setTextFontFamily] = useState('sans-serif');

  const svgRef = useRef<SVGSVGElement>(null);
  const idRef = useRef(0);
  const openSvgRef = useRef<HTMLInputElement>(null);
  const convertImageRef = useRef<HTMLInputElement>(null);

  const nextId = useCallback(() => `el-${++idRef.current}`, []);

  const pushHistory = useCallback((els: SvgElement[]) => {
    setHistory(h => [...h, els]);
    setFuture([]);
  }, []);

  const setElementsWithHistory = useCallback((newEls: SvgElement[]) => {
    setElements(prev => {
      pushHistory(prev);
      return newEls;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture(f => [elements, ...f]);
      setElements(prev);
      return h.slice(0, -1);
    });
  }, [elements]);

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory(h => [...h, elements]);
      setElements(next);
      return f.slice(1);
    });
  }, [elements]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
        return;
      }

      switch (e.key) {
        case 'v': case 'V': setPenState(null); setTool('select'); break;
        case 'r': case 'R': setPenState(null); setTool('rect'); break;
        case 'c': case 'C': setPenState(null); setTool('circle'); break;
        case 'e': case 'E': setPenState(null); setTool('ellipse'); break;
        case 'l': case 'L': setPenState(null); setTool('line'); break;
        case 'd': case 'D': setPenState(null); setTool('freehand'); break;
        case 't': case 'T': setPenState(null); setTool('text'); break;
        case 'p': case 'P': setTool('pen'); break;
        case 'Escape':
          // Discard any in-progress pen path
          setPenState(null);
          setPenMousePt(null);
          break;
        case 'Enter':
          // Close and commit the in-progress pen path
          if (penState && penState.nodes.length >= 2) {
            e.preventDefault();
            const d = nodesToPathD(penState.nodes, true);
            const newEl: SvgPathElement = { id: nextId(), type: 'path', d, fill, stroke, strokeWidth, opacity: 1, rotate: 0, skewX: 0, skewY: 0 };
            setElementsWithHistory([...elements, newEl]);
            setSelectedId(newEl.id);
            setPenState(null);
            setPenMousePt(null);
          }
          break;
        case 'Delete': case 'Backspace':
          if (selectedId) {
            setElementsWithHistory(elements.filter(el => el.id !== selectedId));
            setSelectedId(null);
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, elements, penState, fill, stroke, strokeWidth, nextId, undo, redo, setElementsWithHistory]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const pt = getSvgPoint(e, svgRef.current);

    // Pen tool: place / extend / close the bezier path
    if (tool === 'pen') {
      if (!penState) {
        // Start a new path
        const node: BezierNode = { x: pt.x, y: pt.y, cp1x: pt.x, cp1y: pt.y, cp2x: pt.x, cp2y: pt.y };
        setPenState({ nodes: [node], dragging: true });
      } else {
        // Click near the first node to close and commit
        const first = penState.nodes[0];
        if (penState.nodes.length >= 3 && Math.hypot(pt.x - first.x, pt.y - first.y) < 10) {
          const d = nodesToPathD(penState.nodes, true);
          const newEl: SvgPathElement = { id: nextId(), type: 'path', d, fill, stroke, strokeWidth, opacity: 1, rotate: 0, skewX: 0, skewY: 0 };
          setElementsWithHistory([...elements, newEl]);
          setSelectedId(newEl.id);
          setPenState(null);
          setPenMousePt(null);
        } else {
          // Add a new anchor and start stretching its handle
          const node: BezierNode = { x: pt.x, y: pt.y, cp1x: pt.x, cp1y: pt.y, cp2x: pt.x, cp2y: pt.y };
          setPenState({ nodes: [...penState.nodes, node], dragging: true });
        }
      }
      return;
    }

    if (tool === 'select') {
      setSelectedId(null);
      return;
    }

    if (tool === 'text') {
      const content = window.prompt('Enter text:', '');
      if (!content) return;
      const newEl: SvgElement = {
        id: nextId(),
        type: 'text',
        x: pt.x,
        y: pt.y,
        content,
        fontSize: textFontSize,
        fontFamily: textFontFamily,
        fill,
        stroke: 'none',
        strokeWidth: 0,
        opacity: 1,
        rotate: 0,
        skewX: 0,
        skewY: 0,
      };
      setElementsWithHistory([...elements, newEl]);
      return;
    }

    setDrawing({
      tool,
      startX: pt.x,
      startY: pt.y,
      currentX: pt.x,
      currentY: pt.y,
      points: tool === 'freehand' ? [pt] : undefined,
    });
  }, [tool, penState, fill, stroke, strokeWidth, elements, nextId, setElementsWithHistory]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const pt = getSvgPoint(e, svgRef.current);

    // Pen tool: update rubber-band and stretch handle of the last placed node
    if (tool === 'pen') {
      setPenMousePt(pt);
      if (penState?.dragging) {
        setPenState(prev => {
          if (!prev || prev.nodes.length === 0) return prev;
          const nodes = prev.nodes.map(n => ({ ...n }));
          const last = nodes[nodes.length - 1];
          last.cp2x = pt.x;
          last.cp2y = pt.y;
          // Mirror cp1 for a smooth (C1-continuous) node
          last.cp1x = 2 * last.x - pt.x;
          last.cp1y = 2 * last.y - pt.y;
          return { ...prev, nodes };
        });
      }
      return;
    }

    // BBox drag: scale or rotate the selected element
    if (bboxDrag) {
      const { handleType, startEl, startBBox: ob } = bboxDrag;
      const { x, y, width: w, height: h } = ob;
      if (handleType === 'rotate') {
        const cx = x + w / 2, cy = y + h / 2;
        const startAngle = Math.atan2(bboxDrag.grabPt.y - cy, bboxDrag.grabPt.x - cx);
        const curAngle = Math.atan2(pt.y - cy, pt.x - cx);
        const deltaDeg = (curAngle - startAngle) * 180 / Math.PI;
        const newRotate = ((startEl.rotate + deltaDeg) % 360 + 360) % 360;
        setElements(prev => prev.map(el => el.id === bboxDrag.elId ? { ...el, rotate: newRotate } as SvgElement : el));
      } else {
        let nb: BBox = { ...ob };
        switch (handleType) {
          case 'se': nb = { x, y, width: Math.max(4, pt.x - x), height: Math.max(4, pt.y - y) }; break;
          case 'sw': nb = { x: Math.min(pt.x, x + w - 4), y, width: Math.max(4, x + w - pt.x), height: Math.max(4, pt.y - y) }; break;
          case 'ne': nb = { x, y: Math.min(pt.y, y + h - 4), width: Math.max(4, pt.x - x), height: Math.max(4, y + h - pt.y) }; break;
          case 'nw': nb = { x: Math.min(pt.x, x + w - 4), y: Math.min(pt.y, y + h - 4), width: Math.max(4, x + w - pt.x), height: Math.max(4, y + h - pt.y) }; break;
          case 'n':  nb = { x, y: Math.min(pt.y, y + h - 4), width: w, height: Math.max(4, y + h - pt.y) }; break;
          case 's':  nb = { x, y, width: w, height: Math.max(4, pt.y - y) }; break;
          case 'e':  nb = { x, y, width: Math.max(4, pt.x - x), height: h }; break;
          case 'w':  nb = { x: Math.min(pt.x, x + w - 4), y, width: Math.max(4, x + w - pt.x), height: h }; break;
        }
        const newEl = scaleElement(startEl, nb);
        setElements(prev => prev.map(el => el.id === bboxDrag.elId ? newEl : el));
      }
      return;
    }


    if (nodeEditDrag) {
      const { pathId, handleType, handleIndex, startNodes, grabPt, closed } = nodeEditDrag;
      const nodes = startNodes.map(n => ({ ...n }));
      const node = nodes[handleIndex];
      const sn = startNodes[handleIndex];
      const dx = pt.x - grabPt.x;
      const dy = pt.y - grabPt.y;
      if (handleType === 'anchor') {
        node.x = sn.x + dx; node.y = sn.y + dy;
        node.cp1x = sn.cp1x + dx; node.cp1y = sn.cp1y + dy;
        node.cp2x = sn.cp2x + dx; node.cp2y = sn.cp2y + dy;
      } else if (handleType === 'cp1') {
        node.cp1x = pt.x; node.cp1y = pt.y;
      } else {
        node.cp2x = pt.x; node.cp2y = pt.y;
      }
      const newD = nodesToPathD(nodes, closed);
      setElements(prev => prev.map(el => el.id === pathId ? { ...el, d: newD } as SvgElement : el));
      return;
    }

    if (!drawing) return;
    setDrawing(d => {
      if (!d) return d;
      return {
        ...d,
        currentX: pt.x,
        currentY: pt.y,
        points: d.points ? [...d.points, pt] : undefined,
      };
    });
  }, [tool, penState, nodeEditDrag, bboxDrag, drawing]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Finalise the bezier handle the user was stretching
    if (tool === 'pen' && penState?.dragging) {
      setPenState(prev => prev ? { ...prev, dragging: false } : null);
      return;
    }

    // End a bbox drag
    if (bboxDrag) {
      setBboxDrag(null);
      return;
    }

    // End a node-edit drag
    if (nodeEditDrag) {
      setNodeEditDrag(null);
      return;
    }

    if (!drawing || !svgRef.current) return;
    const pt = getSvgPoint(e, svgRef.current);
    const { startX, startY } = drawing;
    const currentX = pt.x;
    const currentY = pt.y;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    let newEl: SvgElement | null = null;
    const base = { id: nextId(), fill, stroke, strokeWidth, opacity: 1, rotate: 0, skewX: 0, skewY: 0 };

    switch (drawing.tool) {
      case 'rect':
        if (w > 1 && h > 1) newEl = { ...base, type: 'rect', x, y, width: w, height: h, rx: 0 };
        break;
      case 'circle': {
        const r = Math.max(w, h) / 2;
        if (r > 1) newEl = { ...base, type: 'circle', cx: (startX + currentX) / 2, cy: (startY + currentY) / 2, r };
        break;
      }
      case 'ellipse':
        if (w > 1 && h > 1) newEl = { ...base, type: 'ellipse', cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 };
        break;
      case 'line':
        if (w > 1 || h > 1) newEl = { ...base, type: 'line', x1: startX, y1: startY, x2: currentX, y2: currentY };
        break;
      case 'freehand': {
        const pts = drawing.points ?? [];
        if (pts.length > 1) {
          const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          newEl = { ...base, type: 'path', fill: 'none', d: pathD };
        }
        break;
      }
    }

    setDrawing(null);
    if (newEl) {
      setElementsWithHistory([...elements, newEl]);
      setSelectedId(newEl.id);
    }
  }, [tool, penState, bboxDrag, nodeEditDrag, drawing, fill, stroke, strokeWidth, elements, nextId, setElementsWithHistory]);

  const handleElementSelect = useCallback((id: string) => {
    if (tool === 'select') setSelectedId(id);
  }, [tool]);

  // Snapshot elements before first move so that a completed drag is a single undo step.
  const preMoveSnapshot = useRef<SvgElement[] | null>(null);

  const handleElementMove = useCallback((id: string, dx: number, dy: number) => {
    if (tool !== 'select') return;
    // Capture the state before the first pixel of movement so undo can restore it.
    setElements(prev => {
      if (!preMoveSnapshot.current) {
        preMoveSnapshot.current = prev;
      }
      return prev.map(el => {
        if (el.id !== id) return el;
        switch (el.type) {
          case 'rect': return { ...el, x: el.x + dx, y: el.y + dy };
          case 'circle': return { ...el, cx: el.cx + dx, cy: el.cy + dy };
          case 'ellipse': return { ...el, cx: el.cx + dx, cy: el.cy + dy };
          case 'line': return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
          case 'text': return { ...el, x: el.x + dx, y: el.y + dy };
          case 'image': return { ...el, x: el.x + dx, y: el.y + dy };
          case 'path': return el; // paths cannot be moved by simple coordinate delta
        }
      });
    });
  }, [tool]);

  const handleMoveEnd = useCallback(() => {
    // Push the pre-move snapshot to history so the completed drag is a single undo step.
    if (preMoveSnapshot.current) {
      const snapshot = preMoveSnapshot.current;
      preMoveSnapshot.current = null;
      setHistory(h => [...h, snapshot]);
      setFuture([]);
    }
  }, []);

  const handleUpdate = useCallback((id: string, updates: Partial<SvgElement>) => {
    // Update element immediately without adding to history (avoids flooding undo stack on every keystroke).
    // History is committed via handleUpdateStart when the user first focuses a property input.
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } as SvgElement : el));
  }, []);

  // Called when the user focuses a property field — captures state once per edit session.
  const propEditCommitted = useRef(false);
  const handleUpdateStart = useCallback(() => {
    if (!propEditCommitted.current) {
      propEditCommitted.current = true;
      // Use a functional update to capture the current elements snapshot cleanly.
      setElements(prev => {
        setHistory(h => [...h, prev]);
        setFuture([]);
        return prev;
      });
    }
  }, []);
  const handleUpdateEnd = useCallback(() => {
    propEditCommitted.current = false;
  }, []);

  const handleDelete = useCallback((id: string) => {
    setElementsWithHistory(elements.filter(el => el.id !== id));
    setSelectedId(null);
  }, [elements, setElementsWithHistory]);

  const handleBringToFront = useCallback((id: string) => {
    const idx = elements.findIndex(e => e.id === id);
    if (idx === -1 || idx === elements.length - 1) return;
    const next = [...elements];
    next.push(next.splice(idx, 1)[0]);
    setElementsWithHistory(next);
  }, [elements, setElementsWithHistory]);

  const handleSendToBack = useCallback((id: string) => {
    const idx = elements.findIndex(e => e.id === id);
    if (idx <= 0) return;
    const next = [...elements];
    next.unshift(next.splice(idx, 1)[0]);
    setElementsWithHistory(next);
  }, [elements, setElementsWithHistory]);

  const handleMoveUp = useCallback((id: string) => {
    const idx = elements.findIndex(e => e.id === id);
    if (idx === -1 || idx === elements.length - 1) return;
    const next = [...elements];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setElementsWithHistory(next);
  }, [elements, setElementsWithHistory]);

  const handleMoveDown = useCallback((id: string) => {
    const idx = elements.findIndex(e => e.id === id);
    if (idx <= 0) return;
    const next = [...elements];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setElementsWithHistory(next);
  }, [elements, setElementsWithHistory]);

  // Start dragging an anchor or control-handle of the selected path element
  const handleStartNodeDrag = useCallback((
    handleType: 'anchor' | 'cp1' | 'cp2',
    handleIndex: number,
    e: React.MouseEvent,
  ) => {
    if (!selectedId || !svgRef.current) return;
    const pathEl = elements.find(el => el.id === selectedId);
    if (!pathEl || pathEl.type !== 'path') return;
    const parsed = pathDToNodes(pathEl.d);
    if (!parsed) return;
    const grabPt = getSvgPoint(e, svgRef.current);
    pushHistory(elements);
    setNodeEditDrag({ pathId: selectedId, handleType, handleIndex, startNodes: parsed.nodes, grabPt, closed: parsed.closed });
  }, [selectedId, elements, pushHistory]);

  // Start a bounding-box scale/rotate drag
  const handleStartBBoxDrag = useCallback((handleType: BBoxHandle, e: React.MouseEvent) => {
    if (!selectedId || !svgRef.current) return;
    const el = elements.find(el => el.id === selectedId);
    if (!el) return;
    const grabPt = getSvgPoint(e, svgRef.current);
    pushHistory(elements);
    setBboxDrag({ elId: selectedId, handleType, startEl: el, startBBox: getElementBBox(el), grabPt });
  }, [selectedId, elements, pushHistory]);

  // Delete an anchor node from the selected path
  const handleDeleteNode = useCallback((index: number) => {
    if (!selectedId) return;
    const pathEl = elements.find(el => el.id === selectedId);
    if (!pathEl || pathEl.type !== 'path') return;
    const parsed = pathDToNodes(pathEl.d);
    if (!parsed || parsed.nodes.length <= 2) return; // keep at least 2 nodes
    pushHistory(elements);
    const newNodes = parsed.nodes.filter((_, i) => i !== index);
    const newD = nodesToPathD(newNodes, parsed.closed);
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, d: newD } as SvgElement : el));
  }, [selectedId, elements, pushHistory]);

  // Simplify the selected path using RDP
  const handleSimplifyPath = useCallback((tolerance: number) => {
    if (!selectedId) return;
    const pathEl = elements.find(el => el.id === selectedId);
    if (!pathEl || pathEl.type !== 'path') return;
    pushHistory(elements);
    const newD = simplifyPath(pathEl.d, tolerance);
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, d: newD } as SvgElement : el));
  }, [selectedId, elements, pushHistory]);

  // Export SVG and navigate to main canvas, inserting the SVG as an image
  const handleUseInCanvas = useCallback(() => {
    if (elements.length === 0) { alert('Canvas is empty — add some elements first.'); return; }
    const svgStr = buildSvgString(elements, viewBoxStr);
    // Encode SVG string to base64 safely (handles Unicode characters)
    const b64 = btoa(
      encodeURIComponent(svgStr).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)))
    );
    const dataUrl = `data:image/svg+xml;base64,${b64}`;
    try {
      localStorage.setItem('vf_pending_svg', dataUrl);
    } catch {
      alert('Could not store SVG in local storage (storage quota exceeded). Try exporting as SVG and importing it manually.');
      return;
    }
    window.location.href = '/';
  }, [elements, viewBoxStr]);

  // Open SVG
  const handleOpenSvg = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseSvgFile(text);
        pushHistory(elements);
        setElements(parsed.elements);
        setViewBoxStr(parsed.viewBoxStr);
        setSelectedId(null);
      } catch {
        alert('Failed to parse SVG file. The file may be invalid or use unsupported features.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [elements, pushHistory]);

  // Convert image
  const handleConvertImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConverting(true);
    traceImageToPaths(file, { maxDimension: 300, edgeThreshold: 25, minContourLength: 8, simplifyTolerance: 1.5 })
      .then(result => {
        pushHistory(elements);
        setElements(result.elements);
        setViewBoxStr(`0 0 ${result.svgWidth} ${result.svgHeight}`);
        setSelectedId(null);
      })
      .catch((err: unknown) => alert(`Failed to convert image: ${err instanceof Error ? err.message : 'Unknown error'}.`))
      .finally(() => setConverting(false));
    e.target.value = '';
  }, [elements, pushHistory]);

  const preview = drawing ? previewElement(drawing, fill, stroke, strokeWidth) : null;

  // Switch tool, clearing any in-progress pen path
  const activateTool = useCallback((t: SvgTool) => {
    setPenState(null);
    setPenMousePt(null);
    setTool(t);
  }, []);

  const toolButtons: { id: SvgTool; icon?: string; label: string; content?: string }[] = [
    { id: 'select', icon: 'fa-solid fa-arrow-pointer', label: 'Select (V)' },
    { id: 'rect', icon: 'fa-solid fa-square', label: 'Rectangle (R)' },
    { id: 'circle', icon: 'fa-solid fa-circle', label: 'Circle (C)' },
    { id: 'ellipse', content: '⬭', label: 'Ellipse (E)' },
    { id: 'line', icon: 'fa-solid fa-minus', label: 'Line (L)' },
    { id: 'freehand', icon: 'fa-solid fa-pencil', label: 'Freehand (D)' },
    { id: 'text', icon: 'fa-solid fa-font', label: 'Text (T)' },
    { id: 'pen', icon: 'fa-solid fa-bezier-curve', label: 'Pen / Bézier (P)' },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-700 text-white px-4 py-2 flex items-center gap-3 shrink-0">
        <button
          onClick={() => { window.location.href = '/'; }}
          className="hover:bg-white/10 rounded p-1.5 transition-colors"
          title="Back"
        >
          <i className="fa-solid fa-arrow-left" />
        </button>
        <span className="font-semibold text-lg">SVG Editor</span>
        <div className="flex-1" />
        <div className="flex gap-2 items-center">
          {/* Color pickers in header */}
          <label className="flex items-center gap-1 text-xs text-white/80">
            Fill
            <input type="color" value={fill} onChange={e => setFill(e.target.value)} className="w-7 h-7 cursor-pointer rounded border-0" />
          </label>
          <label className="flex items-center gap-1 text-xs text-white/80">
            Stroke
            <input type="color" value={stroke} onChange={e => setStroke(e.target.value)} className="w-7 h-7 cursor-pointer rounded border-0" />
          </label>
          <label className="flex items-center gap-1 text-xs text-white/80">
            Width
            <input type="number" min={0} step={1} value={strokeWidth} onChange={e => setStrokeWidth(parseFloat(e.target.value) || 0)} className="w-12 text-gray-900 text-xs rounded px-1 py-0.5" />
          </label>

          <div className="w-px h-6 bg-white/30 mx-1" />

          <button onClick={() => { pushHistory(elements); setElements([]); setSelectedId(null); }} className="hover:bg-white/10 rounded px-2 py-1 text-sm transition-colors">
            New
          </button>
          <button onClick={() => openSvgRef.current?.click()} className="hover:bg-white/10 rounded px-2 py-1 text-sm transition-colors">
            Open SVG
          </button>
          <button onClick={() => convertImageRef.current?.click()} disabled={converting} className="hover:bg-white/10 rounded px-2 py-1 text-sm transition-colors disabled:opacity-50">
            {converting ? 'Converting…' : 'Convert Image'}
          </button>
          <button onClick={() => exportSvg(elements, viewBoxStr)} className="bg-cyan-500 hover:bg-cyan-400 rounded px-3 py-1 text-sm font-medium transition-colors">
            Export SVG
          </button>
          <button onClick={handleUseInCanvas} className="bg-green-500 hover:bg-green-400 rounded px-3 py-1 text-sm font-medium transition-colors">
            Use in Canvas
          </button>
        </div>

        <input ref={openSvgRef} type="file" accept=".svg" className="hidden" onChange={handleOpenSvg} />
        <input ref={convertImageRef} type="file" accept="image/*" className="hidden" onChange={handleConvertImage} />
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <aside className="w-12 bg-gray-800 flex flex-col items-center py-2 gap-1 shrink-0">
          {toolButtons.map(btn => (
            <button
              key={btn.id}
              title={btn.label}
              onClick={() => activateTool(btn.id)}
              className={`w-9 h-9 rounded flex items-center justify-center text-sm transition-colors ${
                tool === btn.id ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {btn.icon ? <i className={btn.icon} /> : <span className="text-lg leading-none">{btn.content}</span>}
            </button>
          ))}

          <div className="w-8 h-px bg-gray-600 my-1" />

          <button
            title="Delete selected (Delete)"
            onClick={() => { if (selectedId) { handleDelete(selectedId); } }}
            className="w-9 h-9 rounded flex items-center justify-center text-sm text-red-400 hover:bg-gray-700 transition-colors"
          >
            <i className="fa-solid fa-trash" />
          </button>
          <button
            title="Clear all"
            onClick={() => { setElementsWithHistory([]); setSelectedId(null); }}
            className="w-9 h-9 rounded flex items-center justify-center text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <i className="fa-solid fa-broom" />
          </button>
          <button
            title="Undo (Ctrl+Z)"
            onClick={undo}
            disabled={history.length === 0}
            className="w-9 h-9 rounded flex items-center justify-center text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            <i className="fa-solid fa-rotate-left" />
          </button>
          <button
            title="Redo (Ctrl+Y)"
            onClick={redo}
            disabled={future.length === 0}
            className="w-9 h-9 rounded flex items-center justify-center text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            <i className="fa-solid fa-rotate-right" />
          </button>
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-hidden flex items-center justify-center bg-gray-200 relative">
          {/* grid background */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <svg
              ref={svgRef}
              viewBox={viewBoxStr}
              preserveAspectRatio="xMidYMid meet"
              className="max-w-full max-h-full shadow-xl"
              style={{
                cursor: tool === 'select' ? 'default' : 'crosshair',
                background: 'white',
                aspectRatio: (() => {
                  const parts = viewBoxStr.split(' ').map(Number);
                  return `${parts[2]}/${parts[3]}`;
                })(),
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {elements.map(el => (
                <RenderElement
                  key={el.id}
                  el={el}
                  selected={el.id === selectedId}
                  onSelect={handleElementSelect}
                  onMove={handleElementMove}
                  onMoveEnd={handleMoveEnd}
                />
              ))}
              {preview && <PreviewElement el={preview} />}
              {/* Bounding-box scale/rotate handles for selected element in select mode */}
              {tool === 'select' && selectedId && (() => {
                const sel = elements.find(el => el.id === selectedId);
                return sel ? <SelectionHandles el={sel} onStartBBoxDrag={handleStartBBoxDrag} /> : null;
              })()}
              {/* Node editor overlay for selected path in select mode */}
              {tool === 'select' && selectedId && (() => {
                const sel = elements.find(el => el.id === selectedId);
                return sel?.type === 'path'
                  ? <PathNodeEditor el={sel} onStartDrag={handleStartNodeDrag} onDeleteNode={handleDeleteNode} />
                  : null;
              })()}
              {/* Pen tool in-progress path overlay */}
              {tool === 'pen' && penState && (
                <PenOverlay penState={penState} previewPt={penMousePt} stroke={stroke} strokeWidth={strokeWidth} />
              )}
            </svg>
          </div>
        </main>

        {/* Right panel */}
        <PropertiesPanel
          elements={elements}
          selectedId={selectedId}
          tool={tool}
          textDefaults={{ fontSize: textFontSize, fontFamily: textFontFamily }}
          onTextDefaultsChange={d => {
            if (d.fontSize !== undefined) setTextFontSize(d.fontSize);
            if (d.fontFamily !== undefined) setTextFontFamily(d.fontFamily);
          }}
          onUpdate={handleUpdate}
          onUpdateStart={handleUpdateStart}
          onUpdateEnd={handleUpdateEnd}
          onDelete={handleDelete}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onSimplifyPath={handleSimplifyPath}
        />
      </div>
    </div>
  );
}
