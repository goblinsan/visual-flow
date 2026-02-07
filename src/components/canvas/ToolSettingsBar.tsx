// ToolSettingsBar — persistent settings bar at top of canvas area
import { useState, useRef, useEffect, useMemo } from 'react';

/** Curated font list for quick selection in the toolbar */
const TOOLBAR_FONTS = [
  // System
  { name: 'Arial', value: 'Arial' },
  { name: 'Helvetica', value: 'Helvetica' },
  { name: 'Verdana', value: 'Verdana' },
  { name: 'Georgia', value: 'Georgia' },
  { name: 'Times New Roman', value: 'Times New Roman' },
  { name: 'Courier New', value: 'Courier New' },
  // Google - Sans-serif
  { name: 'Inter', value: 'Inter' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Open Sans', value: 'Open Sans' },
  { name: 'Lato', value: 'Lato' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Poppins', value: 'Poppins' },
  { name: 'Nunito', value: 'Nunito' },
  { name: 'Raleway', value: 'Raleway' },
  { name: 'Work Sans', value: 'Work Sans' },
  { name: 'DM Sans', value: 'DM Sans' },
  { name: 'Rubik', value: 'Rubik' },
  { name: 'Space Grotesk', value: 'Space Grotesk' },
  { name: 'Outfit', value: 'Outfit' },
  { name: 'Figtree', value: 'Figtree' },
  // Google - Serif
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Merriweather', value: 'Merriweather' },
  { name: 'Lora', value: 'Lora' },
  { name: 'Libre Baskerville', value: 'Libre Baskerville' },
  // Google - Display
  { name: 'Oswald', value: 'Oswald' },
  { name: 'Bebas Neue', value: 'Bebas Neue' },
  // Google - Handwriting
  { name: 'Dancing Script', value: 'Dancing Script' },
  { name: 'Pacifico', value: 'Pacifico' },
  { name: 'Caveat', value: 'Caveat' },
  // Google - Monospace
  { name: 'Fira Code', value: 'Fira Code' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono' },
  { name: 'Source Code Pro', value: 'Source Code Pro' },
];

// Set of system fonts that don't need loading
const SYSTEM_FONT_NAMES = new Set(['Arial', 'Helvetica', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New']);
const loadedToolbarFonts = new Set<string>();

function loadToolbarFont(fontName: string): void {
  if (SYSTEM_FONT_NAMES.has(fontName) || loadedToolbarFonts.has(fontName)) return;
  loadedToolbarFonts.add(fontName);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

/** Compact searchable font dropdown for the toolbar */
function ToolbarFontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load selected font
  useEffect(() => { loadToolbarFont(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search on open
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? TOOLBAR_FONTS.filter(f => f.name.toLowerCase().includes(q)) : TOOLBAR_FONTS;
  }, [search]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="flex items-center gap-1 px-1.5 py-0.5 border border-gray-300 rounded text-xs bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[90px] max-w-[130px]"
        style={{ fontFamily: value }}
        title={value}
      >
        <span className="truncate flex-1 text-left">{value || 'Font'}</span>
        <i className="fa-solid fa-caret-down text-[8px] text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-1.5 border-b border-gray-100">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(f => (
              <button
                key={f.value}
                type="button"
                onMouseEnter={() => loadToolbarFont(f.value)}
                onClick={() => { onChange(f.value); setOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-blue-50 transition-colors ${
                  value === f.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
                style={{ fontFamily: f.value }}
              >
                {f.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-2.5 py-2 text-[10px] text-gray-400 italic">No fonts match</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolSettingsBarProps {
  tool: string;
  /** Polygon sides */
  polygonSides: number;
  setPolygonSides: (sides: number) => void;
  /** Rect / shape defaults */
  rectDefaults: {
    fill?: string;
    stroke?: string;
    strokeWidth: number;
    radius: number;
    opacity: number;
  };
  updateRectDefaults: (patch: Record<string, unknown>) => void;
  /** Line defaults (arrow options) */
  lineDefaults: {
    stroke?: string;
    strokeWidth: number;
    startArrow: boolean;
    endArrow: boolean;
    arrowSize: number;
  };
  updateLineDefaults: (patch: Record<string, unknown>) => void;
  /** Curve defaults */
  curveDefaults: {
    fill?: string;
    stroke?: string;
    strokeWidth: number;
    opacity: number;
    closed: boolean;
    tension: number;
  };
  updateCurveDefaults: (patch: Record<string, unknown>) => void;
  /** Draw defaults */
  drawDefaults: {
    stroke: string;
    strokeWidth: number;
    strokeDash?: number[];
    lineCap: CanvasLineCap;
    smoothing: number;
  };
  updateDrawDefaults: (patch: Record<string, unknown>) => void;
  /** Text defaults */
  textDefaults: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    color: string;
  };
  updateTextDefaults: (patch: Record<string, unknown>) => void;
  /** Snapping toggles */
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  snapToObjects: boolean;
  setSnapToObjects: (snap: boolean) => void;
  snapToSpacing: boolean;
  setSnapToSpacing: (snap: boolean) => void;
  /** Grid size (px between dots) */
  gridSize: number;
  setGridSize: (size: number) => void;
  /** Snap anchor mode */
  snapAnchor: 'center' | 'border' | 'both';
  setSnapAnchor: (anchor: 'center' | 'border' | 'both') => void;
  /** Selection info */
  selectedCount: number;
}

const DRAWING_TOOLS: Record<string, string> = {
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  curve: 'Curve',
  polygon: 'Polygon',
  text: 'Text',
};

/**
 * Persistent tool settings bar at the top of the canvas area.
 * Always visible — shows tool-specific options for drawing tools,
 * selection info for select mode, and snapping toggles for all modes.
 */
export function ToolSettingsBar({
  tool,
  polygonSides,
  setPolygonSides,
  rectDefaults,
  updateRectDefaults,
  lineDefaults,
  updateLineDefaults,
  curveDefaults,
  updateCurveDefaults,
  drawDefaults,
  updateDrawDefaults,
  textDefaults,
  updateTextDefaults,
  snapToGrid,
  setSnapToGrid,
  snapToObjects,
  setSnapToObjects,
  snapToSpacing,
  setSnapToSpacing,
  gridSize,
  setGridSize,
  snapAnchor,
  setSnapAnchor,
  selectedCount,
}: ToolSettingsBarProps) {
  const isDrawingTool = Boolean(DRAWING_TOOLS[tool]);
  const isShapeTool = tool === 'rect' || tool === 'ellipse' || tool === 'polygon';
  const isLineTool = tool === 'line';
  const isTextTool = tool === 'text';

  return (
    <div className="absolute top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-1.5 bg-white/95 backdrop-blur-sm border-b border-gray-200 text-xs select-none shadow-sm">
      {/* Tool label or select mode indicator */}
      {isDrawingTool ? (
        <span className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">
          {DRAWING_TOOLS[tool]}
        </span>
      ) : (
        <span className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
          {selectedCount > 0 ? `${selectedCount} selected` : 'Select'}
        </span>
      )}

      <div className="w-px h-4 bg-gray-200" />

      {/* ─── Drawing-tool-specific options ─── */}

      {/* Polygon sides */}
      {tool === 'polygon' && (
        <label className="flex items-center gap-1.5 text-gray-600">
          <span>Sides</span>
          <input
            type="number"
            min={3}
            max={30}
            value={polygonSides}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 3 && v <= 30) setPolygonSides(v);
            }}
            className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </label>
      )}

      {/* Fill & stroke for shape tools */}
      {isShapeTool && (
        <>
          {/* Fill color */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Fill</span>
            <span className="relative">
              <input
                type="color"
                value={rectDefaults.fill || '#ffffff'}
                onChange={(e) => updateRectDefaults({ fill: e.target.value })}
                className="w-5 h-5 border border-gray-300 rounded cursor-pointer appearance-none p-0"
                style={{ backgroundColor: rectDefaults.fill || '#ffffff' }}
              />
            </span>
          </label>

          {/* Stroke color */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Stroke</span>
            <span className="relative">
              <input
                type="color"
                value={rectDefaults.stroke || '#334155'}
                onChange={(e) => updateRectDefaults({ stroke: e.target.value })}
                className="w-5 h-5 border border-gray-300 rounded cursor-pointer appearance-none p-0"
                style={{ backgroundColor: rectDefaults.stroke || '#334155' }}
              />
            </span>
          </label>

          {/* Stroke width */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Weight</span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={rectDefaults.strokeWidth}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0) updateRectDefaults({ strokeWidth: v });
              }}
              className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>

          {/* Corner radius (rect only) */}
          {tool === 'rect' && (
            <label className="flex items-center gap-1.5 text-gray-600">
              <span>Radius</span>
              <input
                type="number"
                min={0}
                max={100}
                value={rectDefaults.radius}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 0) updateRectDefaults({ radius: v });
                }}
                className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </label>
          )}

          {/* Opacity */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={rectDefaults.opacity}
              onChange={(e) => updateRectDefaults({ opacity: parseFloat(e.target.value) })}
              className="w-16 h-3 accent-blue-500"
            />
            <span className="w-8 text-right tabular-nums">{Math.round(rectDefaults.opacity * 100)}%</span>
          </label>
        </>
      )}

      {/* Text tool settings */}
      {isTextTool && (
        <>
          {/* Font Family - searchable dropdown */}
          <div className="flex items-center gap-1.5 text-gray-600">
            <span>Font</span>
            <ToolbarFontPicker
              value={textDefaults.fontFamily}
              onChange={(v) => updateTextDefaults({ fontFamily: v })}
            />
          </div>

          {/* Font size auto-adjusts to zoom — show hint instead of static input */}
          <span className="text-[10px] text-gray-400 italic" title="Font size auto-scales to match canvas zoom">Size: auto</span>

          {/* Color */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Color</span>
            <span className="relative">
              <input
                type="color"
                value={textDefaults.color}
                onChange={(e) => updateTextDefaults({ color: e.target.value })}
                className="w-5 h-5 border border-gray-300 rounded cursor-pointer appearance-none p-0"
                style={{ backgroundColor: textDefaults.color }}
              />
            </span>
          </label>

          {/* Bold toggle */}
          <button
            onClick={() => updateTextDefaults({ fontWeight: textDefaults.fontWeight === '700' || textDefaults.fontWeight === 'bold' ? '400' : '700' })}
            className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-colors ${
              textDefaults.fontWeight === '700' || textDefaults.fontWeight === 'bold'
                ? 'bg-blue-100 text-blue-600 border border-blue-300'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
            title="Bold"
          >
            B
          </button>

          {/* Italic toggle */}
          <button
            onClick={() => updateTextDefaults({ fontStyle: textDefaults.fontStyle === 'italic' ? 'normal' : 'italic' })}
            className={`w-7 h-7 rounded flex items-center justify-center text-xs italic transition-colors ${
              textDefaults.fontStyle === 'italic'
                ? 'bg-blue-100 text-blue-600 border border-blue-300'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
            title="Italic"
          >
            I
          </button>
        </>
      )}

      {/* Line / Curve stroke settings */}
      {isLineTool && (
        <>
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Stroke</span>
            <span className="relative">
              <input
                type="color"
                value={lineDefaults.stroke || '#334155'}
                onChange={(e) => updateLineDefaults({ stroke: e.target.value })}
                className="w-5 h-5 border border-gray-300 rounded cursor-pointer appearance-none p-0"
                style={{ backgroundColor: lineDefaults.stroke || '#334155' }}
              />
            </span>
          </label>
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Weight</span>
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={lineDefaults.strokeWidth}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 1) updateLineDefaults({ strokeWidth: v });
              }}
              className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
        </>
      )}

      {/* Curve tool settings */}
      {tool === 'curve' && (
        <>
          {/* Stroke color */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Stroke</span>
            <span className="relative">
              <input
                type="color"
                value={curveDefaults.stroke || '#334155'}
                onChange={(e) => updateCurveDefaults({ stroke: e.target.value })}
                className="w-5 h-5 border border-gray-300 rounded cursor-pointer appearance-none p-0"
                style={{ backgroundColor: curveDefaults.stroke || '#334155' }}
              />
            </span>
          </label>

          {/* Stroke width */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Weight</span>
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={curveDefaults.strokeWidth}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 1) updateCurveDefaults({ strokeWidth: v });
              }}
              className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>

          <div className="w-px h-4 bg-gray-200" />

          {/* Fill color */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Fill</span>
            <span className="relative">
              <input
                type="color"
                value={curveDefaults.fill || '#ffffff'}
                onChange={(e) => updateCurveDefaults({ fill: e.target.value })}
                className="w-5 h-5 border border-gray-300 rounded cursor-pointer appearance-none p-0"
                style={{ backgroundColor: curveDefaults.fill || '#ffffff' }}
              />
            </span>
          </label>

          {/* Fill toggle */}
          <label className="flex items-center gap-1 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={!!curveDefaults.fill}
              onChange={(e) => updateCurveDefaults({ fill: e.target.checked ? '#ffffff' : undefined })}
              className="w-3.5 h-3.5 accent-blue-500 rounded"
            />
            <span>Fill</span>
          </label>

          {/* Opacity */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={curveDefaults.opacity}
              onChange={(e) => updateCurveDefaults({ opacity: parseFloat(e.target.value) })}
              className="w-16 h-3 accent-blue-500"
            />
            <span className="w-8 text-right tabular-nums">{Math.round(curveDefaults.opacity * 100)}%</span>
          </label>

          <div className="w-px h-4 bg-gray-200" />

          {/* Closed shape toggle */}
          <label className="flex items-center gap-1 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={curveDefaults.closed}
              onChange={(e) => updateCurveDefaults({ closed: e.target.checked })}
              className="w-3.5 h-3.5 accent-blue-500 rounded"
            />
            <span>Closed</span>
          </label>
        </>
      )}

      {/* Arrow options (line tool only) */}
      {tool === 'line' && (
        <>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-gray-500 font-medium">Arrows</span>
          <label className="flex items-center gap-1 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={lineDefaults.startArrow}
              onChange={(e) => updateLineDefaults({ startArrow: e.target.checked })}
              className="w-3.5 h-3.5 accent-blue-500 rounded"
            />
            <span>Start</span>
          </label>
          <label className="flex items-center gap-1 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={lineDefaults.endArrow}
              onChange={(e) => updateLineDefaults({ endArrow: e.target.checked })}
              className="w-3.5 h-3.5 accent-blue-500 rounded"
            />
            <span>End</span>
          </label>
          {(lineDefaults.startArrow || lineDefaults.endArrow) && (
            <label className="flex items-center gap-1.5 text-gray-600">
              <span>Size</span>
              <input
                type="number"
                min={0.5}
                max={5}
                step={0.5}
                value={lineDefaults.arrowSize}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0.5) updateLineDefaults({ arrowSize: v });
                }}
                className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </label>
          )}
        </>
      )}

      {/* Draw tool settings */}
      {tool === 'draw' && (
        <>
          {/* Stroke color */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Stroke</span>
            <span className="relative">
              <input
                type="color"
                value={drawDefaults.stroke}
                onChange={(e) => updateDrawDefaults({ stroke: e.target.value })}
                className="w-5 h-5 border border-gray-300 rounded cursor-pointer appearance-none p-0"
                style={{ backgroundColor: drawDefaults.stroke }}
              />
            </span>
          </label>

          {/* Stroke width */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Weight</span>
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={drawDefaults.strokeWidth}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 1) updateDrawDefaults({ strokeWidth: v });
              }}
              className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>

          <div className="w-px h-4 bg-gray-200" />

          {/* Stroke dash pattern */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Style</span>
            <select
              value={drawDefaults.strokeDash ? 'dashed' : 'solid'}
              onChange={(e) => {
                if (e.target.value === 'solid') {
                  updateDrawDefaults({ strokeDash: undefined });
                } else if (e.target.value === 'dashed') {
                  updateDrawDefaults({ strokeDash: [10, 5] });
                } else if (e.target.value === 'dotted') {
                  updateDrawDefaults({ strokeDash: [2, 4] });
                }
              }}
              className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </label>

          {/* Line cap */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Cap</span>
            <select
              value={drawDefaults.lineCap}
              onChange={(e) => updateDrawDefaults({ lineCap: e.target.value as CanvasLineCap })}
              className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              <option value="round">Round</option>
              <option value="butt">Butt</option>
              <option value="square">Square</option>
            </select>
          </label>

          <div className="w-px h-4 bg-gray-200" />

          {/* Smoothing */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Smoothing</span>
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={drawDefaults.smoothing}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 1) updateDrawDefaults({ smoothing: v });
              }}
              className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
        </>
      )}

      {/* ─── Snapping toggles (always visible, pushed to the right) ─── */}
      <div className="w-px h-4 bg-gray-200 ml-auto" />

      <div className="flex items-center gap-3 pr-6">
        <label className="flex items-center gap-1 text-gray-600 cursor-pointer" title="Snap to grid lines while moving objects">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
            className="w-3.5 h-3.5 accent-teal-500 rounded"
          />
          <i className="fa-solid fa-border-all text-[10px]" />
          <span>Grid</span>
        </label>
        <label className="flex items-center gap-1 text-gray-600 cursor-pointer" title="Snap to other objects for alignment">
          <input
            type="checkbox"
            checked={snapToObjects}
            onChange={(e) => setSnapToObjects(e.target.checked)}
            className="w-3.5 h-3.5 accent-teal-500 rounded"
          />
          <i className="fa-solid fa-object-group text-[10px]" />
          <span>Objects</span>
        </label>
        <label className="flex items-center gap-1 text-gray-600 cursor-pointer" title="Snap to equal spacing between objects">
          <input
            type="checkbox"
            checked={snapToSpacing}
            onChange={(e) => setSnapToSpacing(e.target.checked)}
            className="w-3.5 h-3.5 accent-violet-500 rounded"
          />
          <i className="fa-solid fa-ruler-combined text-[10px]" />
          <span>Spacing</span>
        </label>
        <div className="w-px h-4 bg-gray-200" />
        <label className="flex items-center gap-1 text-gray-600" title="Grid spacing in pixels">
          <i className="fa-solid fa-grid text-[10px]" />
          <input
            type="number"
            min={5}
            max={100}
            step={5}
            value={gridSize}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 5 && v <= 100) setGridSize(v);
            }}
            className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          <span className="text-gray-400">px</span>
        </label>
        <div className="w-px h-4 bg-gray-200" />
        <span className="text-gray-500 font-medium text-[10px]" title="Which part of the object snaps">Anchor</span>
        <div className="flex items-center rounded border border-gray-300 overflow-hidden">
          {(['center', 'border', 'both'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSnapAnchor(mode)}
              title={`Snap on ${mode === 'both' ? 'center & borders' : mode}`}
              className={`px-1.5 py-0.5 text-[10px] capitalize transition-colors ${
                snapAnchor === mode
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Tip text for drawing tools */}
      {isDrawingTool && (
        <div className="text-gray-400 text-[10px] pr-6 whitespace-nowrap">
          {tool === 'polygon' && 'Scroll to adjust sides'}
          {tool === 'rect' && 'Shift=square, Alt=center'}
          {tool === 'ellipse' && 'Shift=circle, Alt=center'}
          {tool === 'line' && 'Drag to draw line'}
          {tool === 'curve' && 'Click points, dbl-click to finish'}
          {tool === 'text' && 'Click to place text'}
        </div>
      )}
    </div>
  );
}
