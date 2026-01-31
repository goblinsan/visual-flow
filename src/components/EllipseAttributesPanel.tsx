import React, { useState } from 'react';
import { parseColor } from '../utils/color';
import { toggleColor, swapColors } from '../utils/colorEditing';
import { parseDashPattern } from '../utils/dashPattern';
import { GradientPicker, gradientToCSS, type GradientFill } from './GradientPicker';

export interface EllipseNode {
  id: string;
  type: 'ellipse';
  fill?: string;
  fillGradient?: GradientFill;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  strokeDash?: number[];
}

export interface EllipseAttributesPanelProps {
  ellipse: EllipseNode;
  lastFillById: Record<string, string>;
  lastStrokeById: Record<string, string>;
  setLastFillById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setLastStrokeById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  updateNode: (patch: Partial<EllipseNode>) => void;
  beginRecentSession: (c?: string) => void;
  previewRecent: (c: string) => void;
  commitRecent: (c?: string) => void;
  pushRecent: (c: string) => void;
  recentColors: string[];
}

export const EllipseAttributesPanel: React.FC<EllipseAttributesPanelProps> = ({
  ellipse,
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
  const [localDash, setLocalDash] = React.useState('');
  const [showFillPanel, setShowFillPanel] = useState(false);
  
  React.useEffect(() => {
    const dashStr = ellipse.strokeDash?.join(' ') ?? '';
    setLocalDash(dashStr);
  }, [ellipse.strokeDash]);

  const { fill, fillGradient, stroke, strokeWidth, opacity, id } = ellipse;
  const fillDisplay = fillGradient ? gradientToCSS(fillGradient) : fill;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center">
          <i className="fa-regular fa-circle text-purple-600 text-xs" />
        </div>
        <span className="text-xs font-semibold text-gray-700">Ellipse</span>
      </div>
      
      {/* Fill Section with Gradient Support */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-fill-drip text-gray-400 text-[9px]" />
            Fill
          </span>
          <button
            type="button"
            onClick={() => setShowFillPanel(!showFillPanel)}
            className="text-[10px] text-blue-500 hover:text-blue-600"
          >
            {showFillPanel ? 'Collapse' : 'Expand'}
          </button>
        </div>
        
        {/* Quick Preview */}
        <div 
          className="h-8 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
          style={{ background: fillDisplay || '#ffffff' }}
          onClick={() => setShowFillPanel(!showFillPanel)}
          title="Click to edit fill"
        />
        
        {showFillPanel && (
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
            <GradientPicker
              gradient={fillGradient}
              onGradientChange={(g) => updateNode({ fillGradient: g })}
              solidColor={fill}
              onSolidColorChange={(c) => {
                updateNode({ fill: c, fillGradient: undefined });
                if (c) setLastFillById(m => ({ ...m, [id]: c }));
              }}
            />
          </div>
        )}
      </div>
      
      <div className="flex items-start gap-3">
        {/* Fill */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-gray-500">Fill</span>
          <label className="relative group" title="Fill color">
            <input
              type="color"
              value={fill || '#ffffff'}
              onPointerDown={() => beginRecentSession(fill || '#ffffff')}
              onInput={e => { const val = (e.target as HTMLInputElement).value; updateNode({ fill: val }); setLastFillById(m => ({ ...m, [id]: val })); previewRecent(val); }}
              onChange={e => { const val = e.target.value; previewRecent(val); }}
              onBlur={e => { const val = e.target.value; if (parseColor(val)) commitRecent(val); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-9 h-9 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center relative cursor-pointer hover:border-gray-300 transition-colors">
              <div className="w-7 h-7 rounded-full checkerboard overflow-hidden relative">
                {fill !== undefined && <div className="w-full h-full" style={{ background: fill }} />}
                {fill === undefined && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                  </div>
                )}
              </div>
            </div>
          </label>
          <div className="flex items-center gap-1 mt-1">
            <input type="checkbox" className="h-3 w-3 rounded accent-blue-500" checked={fill === undefined} onChange={() => {
              const res = toggleColor(fill, id, lastFillById, '#ffffff');
              setLastFillById(res.storage);
              updateNode({ fill: res.next });
            }} title="Toggle fill on/off" />
            <span className="text-[10px] text-gray-400">Off</span>
          </div>
        </div>
        {/* Swap */}
        <div className="flex items-center mt-5">
          <button
            type="button"
            title="Swap fill & stroke"
            onClick={() => {
              const swapped = swapColors(fill, stroke);
              updateNode(swapped);
            }}
            className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fa-solid fa-right-left text-[10px]" />
          </button>
        </div>
        {/* Stroke */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-gray-500">Stroke</span>
          <label className="relative group" title="Stroke color">
            <input
              type="color"
              value={stroke || '#334155'}
              onPointerDown={() => beginRecentSession(stroke || '#334155')}
              onInput={e => { const val = (e.target as HTMLInputElement).value; updateNode({ stroke: val }); setLastStrokeById(m => ({ ...m, [id]: val })); previewRecent(val); }}
              onChange={e => { const val = e.target.value; previewRecent(val); }}
              onBlur={e => { const val = e.target.value; if (parseColor(val)) commitRecent(val); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-9 h-9 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center relative cursor-pointer hover:border-gray-300 transition-colors">
              <div className="w-7 h-7 rounded-full checkerboard overflow-hidden relative">
                {stroke !== undefined && <div className="w-full h-full" style={{ background: stroke }} />}
                {stroke === undefined && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                  </div>
                )}
              </div>
            </div>
          </label>
          <div className="flex items-center gap-1 mt-1">
            <input type="checkbox" className="h-3 w-3 rounded accent-blue-500" checked={stroke === undefined} onChange={() => {
              const res = toggleColor(stroke, id, lastStrokeById, '#334155');
              setLastStrokeById(res.storage);
              updateNode({ stroke: res.next });
            }} title="Toggle stroke on/off" />
            <span className="text-[10px] text-gray-400">Off</span>
          </div>
        </div>
      </div>

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
            <i className="fa-solid fa-clock-rotate-left text-gray-400 text-[9px]" />
            Recent
          </div>
          <div className="flex flex-wrap gap-1">
            {recentColors.map(col => (
              <button
                key={col}
                type="button"
                title={col}
                onClick={() => { updateNode({ fill: col }); setLastFillById(m => ({ ...m, [id]: col })); pushRecent(col); }}
                className="w-6 h-6 rounded-md border border-gray-200 hover:border-gray-400 transition-colors overflow-hidden"
              >
                <span className="w-full h-full block" style={{ background: col }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-border-all text-gray-400 text-[9px]" />
            Stroke W
          </span>
          <input type="number" min={0} value={strokeWidth ?? 1} onChange={e => updateNode({ strokeWidth: Math.max(0, Number(e.target.value) || 0) })} className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-eye text-gray-400 text-[9px]" />
            Opacity
          </span>
          <input type="range" min={0} max={1} step={0.01} value={opacity ?? 1} onChange={e => updateNode({ opacity: Number(e.target.value) })} className="accent-blue-500" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 mt-3">
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
    </div>
  );
};

export default EllipseAttributesPanel;
