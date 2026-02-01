import React from 'react';
import { parseColor } from '../utils/color';
import { parseDashPattern } from '../utils/dashPattern';
import { Select } from './Select';

export interface LineNode {
  id: string;
  type: 'line';
  points: [number, number, number, number];
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  strokeDash?: number[];
  lineCap?: 'butt' | 'round' | 'square';
}

export interface LineAttributesPanelProps {
  line: LineNode;
  updateNode: (patch: Partial<LineNode>) => void;
  beginRecentSession: (c?: string) => void;
  previewRecent: (c: string) => void;
  commitRecent: (c?: string) => void;
  pushRecent: (c: string) => void;
  recentColors: string[];
}

export const LineAttributesPanel: React.FC<LineAttributesPanelProps> = ({
  line,
  updateNode,
  beginRecentSession,
  previewRecent,
  commitRecent,
  pushRecent,
  recentColors,
}) => {
  const [localDash, setLocalDash] = React.useState('');
  
  React.useEffect(() => {
    const dashStr = line.strokeDash?.join(' ') ?? '';
    setLocalDash(dashStr);
  }, [line.strokeDash]);

  const { stroke, strokeWidth, opacity, lineCap, points } = line;

  // Calculate line length
  const dx = points[2] - points[0];
  const dy = points[3] - points[1];
  const length = Math.sqrt(dx * dx + dy * dy).toFixed(1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
          <i className="fa-solid fa-minus text-green-600 text-xs" />
        </div>
        <span className="text-xs font-semibold text-gray-700">Line</span>
      </div>
      
      <div className="bg-gray-100/70 rounded-lg p-2.5 grid grid-cols-2 gap-2 text-[11px]">
        <span className="text-gray-500 flex items-center gap-1">
          <i className="fa-solid fa-ruler text-gray-400 text-[9px]" />
          Length
        </span>
        <span className="font-medium">{length}px</span>
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
          <Select
            value={lineCap || 'round'}
            onChange={val => updateNode({ lineCap: val as LineNode['lineCap'] })}
            options={[
              { value: 'butt', label: 'Butt' },
              { value: 'round', label: 'Round' },
              { value: 'square', label: 'Square' },
            ]}
          />
        </label>
      </div>

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
        <span className="text-[10px] text-gray-400">Space/comma separated. Empty = solid.</span>
      </label>
    </div>
  );
};

export default LineAttributesPanel;
