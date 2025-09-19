import React from 'react';
import ColorControls from './ColorControls';
import { parseDashPattern } from '../utils/dashPattern';

// Minimal rect node shape (avoid deep coupling / circular imports). Extend as needed.
export interface RectNode {
  id: string;
  type: 'rect';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
  strokeDash?: number[];
}

// Patch shape constrained to rect-relevant properties
export type RectPatch = Partial<Pick<RectNode, 'fill' | 'stroke' | 'strokeWidth' | 'radius' | 'opacity' | 'strokeDash'>>;

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
    <div className="space-y-2">
      <ColorControls
        id={rect.id}
        fill={rect.fill}
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
      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Dash Pattern</span>
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
          className="border rounded px-1 py-0.5 text-[11px] font-mono"
        />
        <span className="text-[10px] text-gray-400">Space/comma separated numbers. Empty = solid.</span>
      </label>
    </div>
  );
};

export default RectAttributesPanel;
