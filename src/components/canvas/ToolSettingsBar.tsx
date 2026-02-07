import React from 'react';

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
}

const TOOL_LABELS: Record<string, string> = {
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  curve: 'Curve',
  polygon: 'Polygon',
  text: 'Text',
};

/**
 * Contextual tool settings bar that appears below the header
 * when a drawing tool is selected, showing tool-specific options.
 */
export function ToolSettingsBar({
  tool,
  polygonSides,
  setPolygonSides,
  rectDefaults,
  updateRectDefaults,
  lineDefaults,
  updateLineDefaults,
}: ToolSettingsBarProps) {
  // Only show for drawing tools
  if (!TOOL_LABELS[tool]) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-40 flex items-center gap-4 px-4 py-1.5 bg-white/95 backdrop-blur-sm border-b border-gray-200 text-xs select-none shadow-sm">
      {/* Tool label */}
      <span className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">
        {TOOL_LABELS[tool]}
      </span>

      <div className="w-px h-4 bg-gray-200" />

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
      {(tool === 'rect' || tool === 'ellipse' || tool === 'polygon') && (
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

      {/* Line / Curve stroke settings */}
      {(tool === 'line' || tool === 'curve') && (
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

      {/* Tip text */}
      <div className="ml-auto text-gray-400 text-[10px]">
        {tool === 'polygon' && 'Scroll wheel to adjust sides during creation'}
        {tool === 'rect' && 'Hold Shift for square, Alt to draw from center'}
        {tool === 'ellipse' && 'Hold Shift for circle, Alt to draw from center'}
        {tool === 'line' && 'Click and drag to draw a line'}
        {tool === 'curve' && 'Click to add points, double-click to finish'}
        {tool === 'text' && 'Click to place text on canvas'}
      </div>
    </div>
  );
}
