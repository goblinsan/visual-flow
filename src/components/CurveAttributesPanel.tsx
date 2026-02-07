import React from 'react';
import { Select } from './Select';
import ColorControls from './ColorControls';
import type { GradientFill } from './gradientUtils';

export interface CurveNode {
  id: string;
  type: 'curve';
  points: number[];
  closed?: boolean;
  fill?: string;
  fillGradient?: GradientFill;
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
  lastFillById: Record<string, string>;
  lastStrokeById: Record<string, string>;
  setLastFillById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setLastStrokeById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
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
  lastFillById,
  lastStrokeById,
  setLastFillById,
  setLastStrokeById,
  updateNode,
  selectedPointIndex,
  setSelectedPointIndex,
  beginRecentSession,
  previewRecent,
  commitRecent,
  pushRecent,
  recentColors,
}) => {
  const { fill, fillGradient, stroke, strokeWidth, opacity, lineCap, tension, points, closed } = curve;

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

      {/* Closed Shape Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={closed ?? false}
          onChange={e => updateNode({ closed: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1.5">
          <i className="fa-solid fa-link text-gray-400 text-[9px]" />
          Closed Shape
        </span>
      </label>

      {/* Color Controls - Same as Rectangle/Polygon */}
      <ColorControls
        id={curve.id}
        fill={fill}
        fillGradient={fillGradient}
        stroke={stroke}
        strokeWidth={strokeWidth}
        radius={0}
        opacity={opacity}
        strokeDash={curve.strokeDash}
        lastFillById={lastFillById}
        lastStrokeById={lastStrokeById}
        setLastFillById={setLastFillById}
        setLastStrokeById={setLastStrokeById}
        updateRect={updateNode}
        beginRecentSession={beginRecentSession}
        previewRecent={previewRecent}
        commitRecent={commitRecent}
        recentColors={recentColors}
        pushRecent={pushRecent}
      />

      {/* Line Cap and Tension - Curve-specific controls */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-draw-polygon text-gray-400 text-[9px]" />
            Cap
          </span>
          <Select
            value={lineCap || 'round'}
            onChange={val => updateNode({ lineCap: val as CurveNode['lineCap'] })}
            options={[
              { value: 'butt', label: 'Butt' },
              { value: 'round', label: 'Round' },
              { value: 'square', label: 'Square' },
            ]}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-wave-square text-gray-400 text-[9px]" />
            Tension
          </span>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={(tension ?? 0.5).toFixed(2)}
            onChange={e => updateNode({ tension: Number(e.target.value) })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
        </label>
      </div>

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
