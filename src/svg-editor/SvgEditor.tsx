import { useState, useRef, useCallback, useEffect } from 'react';
import type { SvgTool, SvgElement, SvgRectElement, SvgCircleElement, SvgEllipseElement, SvgLineElement, SvgPathElement, SvgTextElement } from './types';
import { rasterImageToSvgElements } from './rasterToSvg';
import { parseSvgFile } from './svgParser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSvgPoint(e: React.MouseEvent, svgEl: SVGSVGElement): { x: number; y: number } {
  const pt = svgEl.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

function elementToSvgString(el: SvgElement): string {
  const op = (v: number) => (v !== 1 ? ` opacity="${v}"` : '');
  switch (el.type) {
    case 'rect':
      return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.rx}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}/>`;
    case 'circle':
      return `<circle cx="${el.cx}" cy="${el.cy}" r="${el.r}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}/>`;
    case 'ellipse':
      return `<ellipse cx="${el.cx}" cy="${el.cy}" rx="${el.rx}" ry="${el.ry}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}/>`;
    case 'line':
      return `<line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}/>`;
    case 'path':
      return `<path d="${el.d}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}/>`;
    case 'text':
      return `<text x="${el.x}" y="${el.y}" font-size="${el.fontSize}" font-family="${el.fontFamily}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${op(el.opacity)}>${el.content}</text>`;
    case 'image':
      return `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${el.href}"${op(el.opacity)}/>`;
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
      return { id: '__preview__', type: 'rect', x, y, width: w, height: h, rx: 0, fill, stroke, strokeWidth, opacity: 0.8 };
    case 'circle': {
      const r = Math.max(w, h) / 2;
      const cx = (startX + currentX) / 2;
      const cy = (startY + currentY) / 2;
      return { id: '__preview__', type: 'circle', cx, cy, r, fill, stroke, strokeWidth, opacity: 0.8 };
    }
    case 'ellipse':
      return { id: '__preview__', type: 'ellipse', cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2, fill, stroke, strokeWidth, opacity: 0.8 };
    case 'line':
      return { id: '__preview__', type: 'line', x1: startX, y1: startY, x2: currentX, y2: currentY, fill, stroke, strokeWidth, opacity: 0.8 };
    case 'freehand': {
      if (!d.points || d.points.length < 2) return null;
      const pathD = d.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
      return { id: '__preview__', type: 'path', d: pathD, fill: 'none', stroke, strokeWidth, opacity: 0.8 };
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
  const baseProps = {
    onMouseDown: handleMouseDown,
    style: selectionStyle,
    cursor: 'default' as const,
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
  onUpdate,
  onUpdateStart,
  onUpdateEnd,
  onDelete,
}: {
  elements: SvgElement[];
  selectedId: string | null;
  onUpdate: (id: string, updates: Partial<SvgElement>) => void;
  onUpdateStart: () => void;
  onUpdateEnd: () => void;
  onDelete: (id: string) => void;
}) {
  const el = elements.find(e => e.id === selectedId);

  if (!el) {
    return (
      <div className="w-56 bg-gray-50 border-l border-gray-200 p-4 flex flex-col gap-3 text-sm">
        <p className="text-gray-500 italic">Select an element to edit its properties</p>
        <div className="text-gray-400 text-xs mt-2">
          <div>Canvas: 800 × 600</div>
          <div>Elements: {elements.length}</div>
        </div>
      </div>
    );
  }

  const update = (updates: Partial<SvgElement>) => onUpdate(el.id, updates);

  return (
    <div className="w-56 bg-gray-50 border-l border-gray-200 p-3 overflow-y-auto flex flex-col gap-3 text-xs">
      <h3 className="font-semibold text-gray-700 text-sm">{el.type} properties</h3>

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
        <label className="flex flex-col gap-1">
          <span className="text-gray-500">Path d</span>
          <textarea rows={4} value={(el as SvgPathElement).d} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ d: e.target.value } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full text-xs font-mono resize-y" />
        </label>
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
            <input type="text" value={el.fontFamily} onFocus={onUpdateStart} onBlur={onUpdateEnd} onChange={e => update({ fontFamily: e.target.value } as Partial<SvgElement>)} className="border rounded px-1 py-0.5 w-full" />
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
        case 'v': case 'V': setTool('select'); break;
        case 'r': case 'R': setTool('rect'); break;
        case 'c': case 'C': setTool('circle'); break;
        case 'e': case 'E': setTool('ellipse'); break;
        case 'l': case 'L': setTool('line'); break;
        case 'd': case 'D': setTool('freehand'); break;
        case 't': case 'T': setTool('text'); break;
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
  }, [selectedId, elements, undo, redo, setElementsWithHistory]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const pt = getSvgPoint(e, svgRef.current);

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
        fontSize: 20,
        fontFamily: 'sans-serif',
        fill,
        stroke: 'none',
        strokeWidth: 0,
        opacity: 1,
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
  }, [tool, fill, elements, nextId, setElementsWithHistory]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing || !svgRef.current) return;
    const pt = getSvgPoint(e, svgRef.current);
    setDrawing(d => {
      if (!d) return d;
      return {
        ...d,
        currentX: pt.x,
        currentY: pt.y,
        points: d.points ? [...d.points, pt] : undefined,
      };
    });
  }, [drawing]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
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
    const base = { id: nextId(), fill, stroke, strokeWidth, opacity: 1 };

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
  }, [drawing, fill, stroke, strokeWidth, elements, nextId, setElementsWithHistory]);

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
    rasterImageToSvgElements(file, { maxDimension: 150, colorLevels: 6 })
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

  const toolButtons: { id: SvgTool; icon?: string; label: string; content?: string }[] = [
    { id: 'select', icon: 'fa-solid fa-arrow-pointer', label: 'Select (V)' },
    { id: 'rect', icon: 'fa-solid fa-square', label: 'Rectangle (R)' },
    { id: 'circle', icon: 'fa-solid fa-circle', label: 'Circle (C)' },
    { id: 'ellipse', content: '⬭', label: 'Ellipse (E)' },
    { id: 'line', icon: 'fa-solid fa-minus', label: 'Line (L)' },
    { id: 'freehand', icon: 'fa-solid fa-pencil', label: 'Freehand (D)' },
    { id: 'text', icon: 'fa-solid fa-font', label: 'Text (T)' },
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
              onClick={() => setTool(btn.id)}
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
            </svg>
          </div>
        </main>

        {/* Right panel */}
        <PropertiesPanel
          elements={elements}
          selectedId={selectedId}
          onUpdate={handleUpdate}
          onUpdateStart={handleUpdateStart}
          onUpdateEnd={handleUpdateEnd}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
