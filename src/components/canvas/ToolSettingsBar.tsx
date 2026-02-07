// ToolSettingsBar — persistent settings bar at top of canvas area

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
  const isLineTool = tool === 'line' || tool === 'curve';
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
          {/* Font Family */}
          <label className="flex items-center gap-1.5 text-gray-600">
            <span>Font</span>
            <input
              type="text"
              value={textDefaults.fontFamily}
              onChange={(e) => updateTextDefaults({ fontFamily: e.target.value })}
              className="w-24 px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Arial"
            />
          </label>

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
