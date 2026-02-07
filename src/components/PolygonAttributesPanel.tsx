import React from 'react';
import { parseColor } from '../utils/color';
import { generateRegularPolygonPoints } from '../utils/polygonPoints';

export interface PolygonNode {
  id: string;
  type: 'polygon';
  points: number[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  sides?: number;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface PolygonAttributesPanelProps {
  polygon: PolygonNode;
  updateNode: (patch: Partial<PolygonNode>) => void;
  beginRecentSession: (c?: string) => void;
  previewRecent: (c: string) => void;
  commitRecent: (c?: string) => void;
  pushRecent: (c: string) => void;
  recentColors: string[];
}

export const PolygonAttributesPanel: React.FC<PolygonAttributesPanelProps> = ({
  polygon,
  updateNode,
  beginRecentSession,
  previewRecent,
  commitRecent,
  pushRecent,
  recentColors,
}) => {
  const { fill, stroke, strokeWidth, opacity, sides = 5, size } = polygon;

  const handleSidesChange = (newSides: number) => {
    const clampedSides = Math.max(3, Math.min(30, newSides));
    if (size) {
      const newPoints = generateRegularPolygonPoints(size.width, size.height, clampedSides);
      updateNode({ sides: clampedSides, points: newPoints });
    } else {
      updateNode({ sides: clampedSides });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center">
          <i className="fa-solid fa-pentagon text-purple-600 text-xs" />
        </div>
        <span className="text-xs font-semibold text-gray-700">Polygon</span>
      </div>
      
      {/* Sides */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
          <i className="fa-solid fa-shapes text-gray-400 text-[9px]" />
          Sides
        </span>
        <input
          type="number"
          min={3}
          max={30}
          value={sides}
          onChange={e => handleSidesChange(Number(e.target.value) || 5)}
          className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
        <span className="text-[10px] text-gray-400">3-30 sides for regular polygon</span>
      </label>

      {/* Fill Color */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-gray-500">Fill</span>
        <label className="relative" title="Fill color">
          <input
            type="color"
            value={fill || '#ffffff'}
            onPointerDown={() => beginRecentSession(fill || '#ffffff')}
            onInput={e => { const val = (e.target as HTMLInputElement).value; updateNode({ fill: val }); previewRecent(val); }}
            onChange={e => { const val = e.target.value; previewRecent(val); }}
            onBlur={e => { const val = e.target.value; if (parseColor(val)) commitRecent(val); }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="w-9 h-9 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors">
            <div className="w-7 h-7 rounded" style={{ background: fill || '#ffffff' }} />
          </div>
        </label>
        <input
          type="text"
          value={fill || '#ffffff'}
          onChange={e => updateNode({ fill: e.target.value })}
          onBlur={e => { if (parseColor(e.target.value)) pushRecent(e.target.value); }}
          className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-[11px] font-mono bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
      </div>

      {/* Stroke Color */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-gray-500">Stroke</span>
        <label className="relative" title="Stroke color">
          <input
            type="color"
            value={stroke || '#334155'}
            onPointerDown={() => beginRecentSession(stroke || '#334155')}
            onInput={e => { const val = (e.target as HTMLInputElement).value; updateNode({ stroke: val }); previewRecent(val); }}
            onChange={e => { const val = e.target.value; previewRecent(val); }}
            onBlur={e => { const val = e.target.value; if (parseColor(val)) commitRecent(val); }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="w-9 h-9 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors">
            <div className="w-7 h-7 rounded" style={{ background: stroke || '#334155' }} />
          </div>
        </label>
        <input
          type="text"
          value={stroke || '#334155'}
          onChange={e => updateNode({ stroke: e.target.value })}
          onBlur={e => { if (parseColor(e.target.value)) pushRecent(e.target.value); }}
          className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-[11px] font-mono bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
      </div>

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
            <i className="fa-solid fa-clock-rotate-left text-gray-400 text-[9px]" />
            Recent
          </div>
          <div className="flex flex-wrap gap-1">
            {recentColors.map(col => {
              const hasAlpha = /#[0-9a-fA-F]{8}$/.test(col);
              return (
                <button
                  key={col}
                  type="button"
                  title={col}
                  onClick={() => { updateNode({ fill: col }); pushRecent(col); }}
                  className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center relative group p-0"
                >
                  <span className="w-5 h-5 rounded checkerboard overflow-hidden relative">
                    <span className="absolute inset-0" style={{ background: col }} />
                    {hasAlpha && <span className="absolute bottom-0 right-0 px-0.5 rounded-tl bg-black/40 text-[8px] text-white leading-none">α</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-border-all text-gray-400 text-[9px]" />
            Width
          </span>
          <input
            type="number"
            min={0}
            value={strokeWidth ?? 1}
            onChange={e => updateNode({ strokeWidth: Math.max(0, Number(e.target.value) || 0) })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-eye text-gray-400 text-[9px]" />
            Opacity
          </span>
          <input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={(opacity ?? 1).toFixed(1)}
            onChange={e => updateNode({ opacity: Math.max(0, Math.min(1, Number(e.target.value) || 1)) })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
        </label>
      </div>
    </div>
  );
};

export default PolygonAttributesPanel;
