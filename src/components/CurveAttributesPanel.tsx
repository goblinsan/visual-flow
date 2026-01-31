import React from 'react';
import { parseColor } from '../utils/color';
import { parseDashPattern } from '../utils/dashPattern';

export interface CurveNode {
  id: string;
  type: 'curve';
  points: number[];
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  strokeDash?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  tension?: number;
}

export interface ControlPoint {
  index: number;
  x: number;
  y: number;
  type: 'anchor' | 'control';
}

export interface CurveAttributesPanelProps {
  curve: CurveNode;
  updateNode: (patch: Partial<CurveNode>) => void;
  selectedPointIndex: number | null;
  setSelectedPointIndex: (idx: number | null) => void;
  beginRecentSession: (c?: string) => void;
  previewRecent: (c: string) => void;
  commitRecent: (c?: string) => void;
  pushRecent: (c: string) => void;
  recentColors: string[];
}

export const CurveAttributesPanel: React.FC<CurveAttributesPanelProps> = ({
  curve,
  updateNode,
  selectedPointIndex,
  setSelectedPointIndex,
  beginRecentSession,
  previewRecent,
  commitRecent,
  pushRecent,
  recentColors,
}) => {
  const [localDash, setLocalDash] = React.useState('');
  
  React.useEffect(() => {
    const dashStr = curve.strokeDash?.join(' ') ?? '';
    setLocalDash(dashStr);
  }, [curve.strokeDash]);

  const { stroke, strokeWidth, opacity, lineCap, tension, points } = curve;

  // Parse points into control points array
  const controlPoints: ControlPoint[] = [];
  for (let i = 0; i < points.length; i += 2) {
    controlPoints.push({
      index: i / 2,
      x: points[i],
      y: points[i + 1],
      type: 'anchor', // For now treat all as anchors; could detect control points
    });
  }

  const updatePointPosition = (pointIndex: number, x: number, y: number) => {
    const newPoints = [...points];
    newPoints[pointIndex * 2] = x;
    newPoints[pointIndex * 2 + 1] = y;
    updateNode({ points: newPoints });
  };

  const deletePoint = (pointIndex: number) => {
    if (controlPoints.length <= 2) return; // Need at least 2 points
    const newPoints = [...points];
    newPoints.splice(pointIndex * 2, 2);
    updateNode({ points: newPoints });
    setSelectedPointIndex(null);
  };

  const selectedPoint = selectedPointIndex !== null ? controlPoints[selectedPointIndex] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
          <i className="fa-solid fa-bezier-curve text-amber-600 text-xs" />
        </div>
        <span className="text-xs font-semibold text-gray-700">Curve</span>
      </div>
      
      <div className="bg-gray-100/70 rounded-lg p-2.5 grid grid-cols-2 gap-2 text-[11px]">
        <span className="text-gray-500 flex items-center gap-1">
          <i className="fa-solid fa-circle-nodes text-gray-400 text-[9px]" />
          Points
        </span>
        <span className="font-medium">{controlPoints.length}</span>
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
                  onClick={() => { updateNode({ stroke: col }); pushRecent(col); }}
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
            min={1}
            value={strokeWidth ?? 2}
            onChange={e => updateNode({ strokeWidth: Math.max(1, Number(e.target.value) || 1) })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-draw-polygon text-gray-400 text-[9px]" />
            Cap
          </span>
          <select
            value={lineCap || 'round'}
            onChange={e => updateNode({ lineCap: e.target.value as CurveNode['lineCap'] })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          >
            <option value="butt">Butt</option>
            <option value="round">Round</option>
            <option value="square">Square</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
          <i className="fa-solid fa-wave-square text-gray-400 text-[9px]" />
          Tension ({(tension ?? 0.5).toFixed(2)})
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={tension ?? 0.5}
          onChange={e => updateNode({ tension: Number(e.target.value) })}
          className="accent-blue-500"
        />
        <span className="text-[10px] text-gray-400">0 = sharp corners, 1 = smooth</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
          <i className="fa-solid fa-eye text-gray-400 text-[9px]" />
          Opacity ({(opacity ?? 1).toFixed(2)})
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={opacity ?? 1}
          onChange={e => updateNode({ opacity: Number(e.target.value) })}
          className="accent-blue-500"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1.5">
          <i className="fa-solid fa-grip-lines text-gray-400 text-[10px]" />
          Dash Pattern
        </span>
        <input
          type="text"
          placeholder="e.g. 4 4"
          value={localDash}
          onChange={e => setLocalDash(e.target.value)}
          onBlur={e => {
            const { pattern } = parseDashPattern(e.target.value);
            updateNode({ strokeDash: pattern.length ? pattern : undefined });
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const { pattern } = parseDashPattern((e.target as HTMLInputElement).value);
              updateNode({ strokeDash: pattern.length ? pattern : undefined });
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] font-mono bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
      </label>

      {/* Control Points Editor */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <p className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <i className="fa-solid fa-vector-square text-gray-400" />
          Control Points
        </p>
        <div className="space-y-1 max-h-32 overflow-auto">
          {controlPoints.map((pt, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] cursor-pointer transition-colors ${selectedPointIndex === idx ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'}`}
              onClick={() => setSelectedPointIndex(idx)}
            >
              <span className="font-medium">Point {idx + 1}</span>
              <span className="font-mono text-gray-500">({pt.x.toFixed(0)}, {pt.y.toFixed(0)})</span>
            </div>
          ))}
        </div>

        {selectedPoint && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-[10px] font-semibold text-blue-700 mb-2 flex items-center gap-1">
              <i className="fa-solid fa-location-dot" />
              Point {selectedPointIndex! + 1}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-blue-600 text-[10px] font-medium">X</span>
                <input
                  type="number"
                  value={selectedPoint.x.toFixed(0)}
                  onChange={e => updatePointPosition(selectedPointIndex!, Number(e.target.value), selectedPoint.y)}
                  className="border border-blue-200 rounded-md px-2 py-1 text-[11px] bg-white focus:border-blue-400"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-blue-600 text-[10px] font-medium">Y</span>
                <input
                  type="number"
                  value={selectedPoint.y.toFixed(0)}
                  onChange={e => updatePointPosition(selectedPointIndex!, selectedPoint.x, Number(e.target.value))}
                  className="border border-blue-200 rounded-md px-2 py-1 text-[11px] bg-white focus:border-blue-400"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => deletePoint(selectedPointIndex!)}
                disabled={controlPoints.length <= 2}
                className="flex-1 px-2 py-1.5 text-[10px] font-medium bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
              >
                <i className="fa-solid fa-trash-can" />
                Delete Point
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurveAttributesPanel;
