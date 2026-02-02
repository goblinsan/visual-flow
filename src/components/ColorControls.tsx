import React, { useState } from 'react';
import { parseColor } from '../utils/color';
import { adjustAlpha, toggleColor, swapColors } from '../utils/colorEditing';
import { GradientPicker } from './GradientPicker';
import { gradientToCSS, type GradientFill } from './gradientUtils';

export interface ColorControlsProps {
  id: string; // node id
  fill: string | undefined;
  fillGradient?: GradientFill;
  stroke: string | undefined;
  strokeWidth: number | undefined;
  radius: number | undefined;
  opacity: number | undefined;
  strokeDash: number[] | undefined; // currently unused directly here
  lastFillById: Record<string,string>;
  lastStrokeById: Record<string,string>;
  setLastFillById: React.Dispatch<React.SetStateAction<Record<string,string>>>;
  setLastStrokeById: React.Dispatch<React.SetStateAction<Record<string,string>>>;
  updateRect: (patch: Record<string, unknown>) => void;
  beginRecentSession: (current?: string) => void;
  previewRecent: (value: string) => void;
  commitRecent: (value?: string) => void;
  recentColors: string[];
  pushRecent: (c: string) => void; // outside-session commit
}

export const ColorControls: React.FC<ColorControlsProps> = ({
  id, fill, fillGradient, stroke, strokeWidth, radius, opacity,
  lastFillById, lastStrokeById, setLastFillById, setLastStrokeById,
  updateRect, beginRecentSession, previewRecent, commitRecent, recentColors, pushRecent
}) => {
  const [showFillPanel, setShowFillPanel] = useState(false);
  
  // Get the display value for fill (gradient takes priority)
  const fillDisplay = fillGradient ? gradientToCSS(fillGradient) : fill;
  
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Rectangle</p>
      
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
              onGradientChange={(g) => updateRect({ fillGradient: g })}
              solidColor={fill}
              onSolidColorChange={(c) => {
                updateRect({ fill: c, fillGradient: undefined });
                if (c) setLastFillById(m => ({ ...m, [id]: c }));
              }}
            />
          </div>
        )}
      </div>
      
      <div className="flex items-start gap-3">
        {/* Fill */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Fill</span>
          <label className="relative group" title="Fill color">
            <input
              type="color"
              value={fill || '#ffffff'}
              onPointerDown={() => beginRecentSession(fill || '#ffffff')}
              onInput={e => { const val = (e.target as HTMLInputElement).value; updateRect({ fill: val }); setLastFillById(m => ({ ...m, [id]: val })); previewRecent(val); }}
              onChange={e => { const val = e.target.value; previewRecent(val); }}
              onBlur={e => { const val = e.target.value; if (parseColor(val)) commitRecent(val); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Rectangle fill color"
            />
            <div className="w-9 h-9 rounded border border-gray-300 shadow-sm flex items-center justify-center relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-white">
              <div className="w-7 h-7 rounded checkerboard overflow-hidden relative">
                {fill !== undefined && (
                  <div className="w-full h-full" style={{ background: fill }} />
                )}
                {fill === undefined && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                    <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                  </div>
                )}
              </div>
            </div>
            <span className="sr-only">Fill color</span>
          </label>
          <div className="flex items-center gap-1 mt-1">
            <input type="checkbox" className="h-3 w-3" checked={fill === undefined} onChange={() => {
              const res = toggleColor(fill, id, lastFillById, '#ffffff');
              setLastFillById(res.storage);
              updateRect({ fill: res.next });
            }} title="Toggle fill on/off" />
            <span className="text-[10px] text-gray-500">Off</span>
          </div>
        </div>
        {/* Swap icon button */}
        <div className="flex items-center mt-5">
          <button
            type="button"
            title="Swap fill & stroke"
            onClick={() => {
              const swapped = swapColors(fill, stroke);
              updateRect(swapped);
              if (fill) commitRecent(fill);
              if (stroke) commitRecent(stroke);
            }}
            className="w-7 h-7 rounded-md border border-gray-400 flex items-center justify-center bg-white hover:bg-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-white text-gray-800 font-semibold text-[13px] leading-none"
          >
            ⇄<span className="sr-only">Swap fill and stroke</span>
          </button>
        </div>
        {/* Stroke */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Stroke</span>
          <label className="relative group" title="Stroke color">
            <input
              type="color"
              value={stroke || '#334155'}
              onPointerDown={() => beginRecentSession(stroke || '#334155')}
              onInput={e => { const val = (e.target as HTMLInputElement).value; updateRect({ stroke: val }); setLastStrokeById(m => ({ ...m, [id]: val })); previewRecent(val); }}
              onChange={e => { const val = e.target.value; previewRecent(val); }}
              onBlur={e => { const val = e.target.value; if (parseColor(val)) commitRecent(val); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Rectangle stroke color"
            />
            <div className="w-9 h-9 rounded border border-gray-300 shadow-sm flex items-center justify-center relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-white">
              <div className="w-7 h-7 rounded checkerboard overflow-hidden relative flex items-center justify-center">
                {stroke !== undefined && (
                  <div className="w-full h-full rounded" style={{ background: stroke }} />
                )}
                {stroke === undefined && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                    <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                  </div>
                )}
              </div>
            </div>
            <span className="sr-only">Stroke color</span>
          </label>
          <div className="flex items-center gap-1 mt-1">
            <input type="checkbox" className="h-3 w-3" checked={stroke === undefined} onChange={() => {
              const res = toggleColor(stroke, id, lastStrokeById, '#334155');
              setLastStrokeById(res.storage);
              updateRect({ stroke: res.next });
            }} title="Toggle stroke on/off" />
            <span className="text-[10px] text-gray-500">Off</span>
          </div>
        </div>
      </div>
      {/* Alpha + Text Inputs */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-gray-500 text-[10px] flex items-center justify-between">Fill Alpha{fill===undefined && <span className="text-[9px] text-red-500 ml-1">off</span>}</span>
          <input type="range" min={0} max={1} step={0.01} disabled={fill===undefined} value={parseColor(fill || '#ffffff')?.a ?? 1} onChange={e => {
            if (fill===undefined) return;
            const val = adjustAlpha(fill || (lastFillById[id] || '#ffffff'), Number(e.target.value));
            updateRect({ fill: val });
            setLastFillById(m => ({ ...m, [id]: val }));
          }} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-500 text-[10px] flex items-center justify-between">Stroke Alpha{stroke===undefined && <span className="text-[9px] text-red-500 ml-1">off</span>}</span>
          <input type="range" min={0} max={1} step={0.01} disabled={stroke===undefined} value={parseColor(stroke || '#334155')?.a ?? 1} onChange={e => {
            if (stroke===undefined) return;
            const val = adjustAlpha(stroke || (lastStrokeById[id] || '#334155'), Number(e.target.value));
            updateRect({ stroke: val });
            setLastStrokeById(m => ({ ...m, [id]: val }));
          }} />
        </label>
        <label className="flex flex-col gap-1 col-span-2">
          <span className="text-gray-500 text-[10px]">Fill Value</span>
          <input type="text" className="border rounded px-1 py-0.5 text-[11px] font-mono" value={fill || ''} onChange={e => updateRect({ fill: e.target.value })} onBlur={e => { if (parseColor(e.target.value)) pushRecent(e.target.value); }} />
        </label>
        <label className="flex flex-col gap-1 col-span-2">
          <span className="text-gray-500 text-[10px]">Stroke Value</span>
          <input type="text" className="border rounded px-1 py-0.5 text-[11px] font-mono" value={stroke || ''} onChange={e => updateRect({ stroke: e.target.value })} onBlur={e => { if (parseColor(e.target.value)) pushRecent(e.target.value); }} />
        </label>
      </div>
      {/* Recent Colors (scoped for rectangle) */}
      {recentColors.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Recent</div>
          <div className="flex flex-wrap gap-1">
            {recentColors.map(col => {
              const hasAlpha = /#[0-9a-fA-F]{8}$/.test(col);
              return (
                <button
                  key={col}
                  type="button"
                  title={col}
                  onClick={() => { updateRect({ fill: col }); setLastFillById(m => ({ ...m, [id]: col })); pushRecent(col); }}
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
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 col-span-1">
          <span className="text-gray-500">Stroke W</span>
          <input type="number" min={0} value={strokeWidth ?? 1} onChange={e => updateRect({ strokeWidth: Math.max(0, Number(e.target.value)||0) })} className="border rounded px-1 py-0.5 text-[11px]" />
        </label>
        <label className="flex flex-col gap-1 col-span-1">
          <span className="text-gray-500">Radius</span>
          <input type="number" min={0} value={radius ?? 0} onChange={e => updateRect({ radius: Math.max(0, Number(e.target.value)||0) })} className="border rounded px-1 py-0.5 text-[11px]" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Opacity ({(opacity ?? 1).toFixed(2)})</span>
        <input type="range" min={0} max={1} step={0.01} value={opacity ?? 1} onChange={e => updateRect({ opacity: Math.min(1, Math.max(0, Number(e.target.value))) })} />
      </label>
    </div>
  );
};

export default ColorControls;
