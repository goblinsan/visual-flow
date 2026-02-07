import React from 'react';
import ColorControls from './ColorControls';
import { generateRegularPolygonPoints } from '../utils/polygonPoints';
import type { GradientFill } from './gradientUtils';

export interface PolygonNode {
  id: string;
  type: 'polygon';
  points: number[];
  fill?: string;
  fillGradient?: GradientFill;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  strokeDash?: number[];
  sides?: number;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export type PolygonPatch = Partial<Pick<PolygonNode, 'fill' | 'fillGradient' | 'stroke' | 'strokeWidth' | 'opacity' | 'strokeDash' | 'sides' | 'points'>>;

export interface PolygonAttributesPanelProps {
  polygon: PolygonNode;
  lastFillById: Record<string, string>;
  lastStrokeById: Record<string, string>;
  setLastFillById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setLastStrokeById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  updateNode: (patch: PolygonPatch) => void;
  beginRecentSession: (c?: string) => void;
  previewRecent: (c: string) => void;
  commitRecent: (c?: string) => void;
  pushRecent: (c: string) => void;
  recentColors: string[];
}

export const PolygonAttributesPanel: React.FC<PolygonAttributesPanelProps> = ({
  polygon,
  lastFillById,
  lastStrokeById,
  setLastFillById,
  setLastStrokeById,
  updateNode,
  beginRecentSession,
  previewRecent,
  commitRecent,
  pushRecent,
  recentColors,
}) => {
  const { fill, fillGradient, stroke, strokeWidth, opacity, sides = 5, size, strokeDash } = polygon;

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

      {/* Color Controls - Same as Rectangle */}
      <ColorControls
        id={polygon.id}
        fill={fill}
        fillGradient={fillGradient}
        stroke={stroke}
        strokeWidth={strokeWidth}
        radius={0} // Polygons don't have radius
        opacity={opacity}
        strokeDash={strokeDash}
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
    </div>
  );
};

export default PolygonAttributesPanel;
