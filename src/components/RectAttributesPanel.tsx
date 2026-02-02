import React from 'react';
import ColorControls from './ColorControls';
import { parseDashPattern } from '../utils/dashPattern';
import type { GradientFill } from './gradientUtils';

// Minimal rect node shape (avoid deep coupling / circular imports). Extend as needed.
export interface RectNode {
  id: string;
  type: 'rect';
  fill?: string;
  fillGradient?: GradientFill;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
  strokeDash?: number[];
}

// Patch shape constrained to rect-relevant properties
export type RectPatch = Partial<Pick<RectNode, 'fill' | 'fillGradient' | 'stroke' | 'strokeWidth' | 'radius' | 'opacity' | 'strokeDash'>>;

export interface RectAttributesPanelProps {
  rect: RectNode; // Rect node (local minimal typing)
  lastFillById: Record<string,string>;
  lastStrokeById: Record<string,string>;
  setLastFillById: React.Dispatch<React.SetStateAction<Record<string,string>>>;
  setLastStrokeById: React.Dispatch<React.SetStateAction<Record<string,string>>>;
  updateRect: (patch: RectPatch) => void;
  rawDashInput: string;
  setRawDashInput: (v: string) => void;
  beginRecentSession: (c?: string) => void;
  previewRecent: (c: string) => void;
  commitRecent: (c?: string) => void;
  pushRecent: (c: string) => void;
  recentColors: string[];
}

/**
 * RectAttributesPanel
 * Phase 4 Extraction: Encapsulates single rect attribute UI (color controls + dash pattern input).
 * Behavior Parity: Identical to prior inline block in CanvasApp (no logic change).
 */
export const RectAttributesPanel: React.FC<RectAttributesPanelProps> = ({
  rect,
  lastFillById,
  lastStrokeById,
  setLastFillById,
  setLastStrokeById,
  updateRect,
  rawDashInput,
  setRawDashInput,
  beginRecentSession,
  previewRecent,
  commitRecent,
  pushRecent,
  recentColors,
}) => {
  // Local mirror so component can function if parent provides a noop setter (e.g., shallow tests)
  const [localDash, setLocalDash] = React.useState(rawDashInput);
  React.useEffect(() => { setLocalDash(rawDashInput); }, [rawDashInput]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
          <i className="fa-regular fa-square text-blue-600 text-xs" />
        </div>
        <span className="text-xs font-semibold text-gray-700">Rectangle</span>
      </div>
      <ColorControls
        id={rect.id}
        fill={rect.fill}
        fillGradient={rect.fillGradient}
        stroke={rect.stroke}
        strokeWidth={rect.strokeWidth}
        radius={rect.radius}
        opacity={rect.opacity}
        strokeDash={rect.strokeDash}
        lastFillById={lastFillById}
        lastStrokeById={lastStrokeById}
        setLastFillById={setLastFillById}
        setLastStrokeById={setLastStrokeById}
        updateRect={updateRect}
        beginRecentSession={beginRecentSession}
        previewRecent={previewRecent}
        commitRecent={commitRecent}
        recentColors={recentColors}
        pushRecent={pushRecent}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1.5">
          <i className="fa-solid fa-grip-lines text-gray-400 text-[10px]" />
          Dash Pattern
        </span>
        <input
          type="text"
          placeholder="e.g. 4 4"
            value={localDash}
            onChange={e => { const v = e.target.value; setLocalDash(v); setRawDashInput(v); }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const current = (e.target as HTMLInputElement).value;
                const { pattern } = parseDashPattern(current);
                updateRect({ strokeDash: pattern.length ? pattern : undefined });
                (e.target as HTMLInputElement).blur();
              }
            }}
            onBlur={e => {
              const current = (e.target as HTMLInputElement).value;
              const { pattern } = parseDashPattern(current);
              updateRect({ strokeDash: pattern.length ? pattern : undefined });
            }}
          className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] font-mono bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
        <span className="text-[10px] text-gray-400">Space/comma separated numbers. Empty = solid.</span>
      </label>
    </div>
  );
};

export default RectAttributesPanel;
