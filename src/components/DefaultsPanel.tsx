import React, { useState } from 'react';
import { parseColor } from '../utils/color';
import { adjustAlpha, swapColors } from '../utils/colorEditing';
import RecentColorsPanel from './RecentColorsPanel';
import type { RectDefaults } from '../hooks/usePersistentRectDefaults';

export interface DefaultsPanelProps {
  defaults: RectDefaults;
  updateDefaults: (patch: Partial<RectDefaults>) => void;
  beginRecentSession: (c?: string) => void;
  previewRecent: (c: string) => void;
  commitRecent: (c?: string) => void;
  recentColors: string[];
}

export const DefaultsPanel: React.FC<DefaultsPanelProps> = ({
  defaults, updateDefaults, beginRecentSession, previewRecent, commitRecent, recentColors
}) => {
  const [lastDefaultFill, setLastDefaultFill] = useState<string>(defaults.fill || '#ffffff');
  const [lastDefaultStroke, setLastDefaultStroke] = useState<string>(defaults.stroke || '#334155');
  const onPickRecent = (c: string) => { updateDefaults({ fill: c }); commitRecent(c); };

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Rectangle Defaults</p>
      <div className="flex items-start gap-4">
        {/* Fill Default */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Fill</span>
          <label className="relative group" title="Default fill color">
            <input
              type="color"
              value={defaults.fill || '#ffffff'}
              onPointerDown={() => beginRecentSession(defaults.fill || '#ffffff')}
              onInput={e => { const val = (e.target as HTMLInputElement).value; updateDefaults({ fill: val }); setLastDefaultFill(val); previewRecent(val); }}
              onChange={e => { const val = e.target.value; previewRecent(val); }}
              onBlur={e => { const val = e.target.value; if (parseColor(val)) commitRecent(val); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Default rectangle fill color"
            />
            <div className="w-9 h-9 rounded border border-gray-300 shadow-sm flex items-center justify-center relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-white">
              <div className="w-7 h-7 rounded checkerboard overflow-hidden relative">
                {defaults.fill !== undefined && (
                  <div className="w-full h-full" style={{ background: defaults.fill }} />
                )}
                {defaults.fill === undefined && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                    <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                  </div>
                )}
              </div>
            </div>
            <span className="sr-only">Fill color</span>
          </label>
          <div className="flex items-center gap-1 mt-1">
            <input type="checkbox" className="h-3 w-3" checked={defaults.fill === undefined} onChange={() => {
              if (defaults.fill !== undefined) {
                if (defaults.fill) setLastDefaultFill(defaults.fill);
                updateDefaults({ fill: undefined });
              } else {
                updateDefaults({ fill: lastDefaultFill || '#ffffff' });
              }
            }} title="Toggle fill on/off" />
            <span className="text-[10px] text-gray-500">Off</span>
          </div>
        </div>
        {/* Swap icon button (defaults) */}
        <div className="flex items-center mt-5">
          <button
            type="button"
            title="Swap default fill & stroke"
            onClick={() => { updateDefaults(swapColors(defaults.fill, defaults.stroke)); }}
            className="w-7 h-7 rounded-md border border-gray-400 flex items-center justify-center bg-white hover:bg-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-white text-gray-800 font-semibold text-[13px] leading-none"
          >
            ⇄<span className="sr-only">Swap default fill and stroke</span>
          </button>
        </div>
        {/* Stroke Default */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Stroke</span>
          <label className="relative group" title="Default stroke color">
            <input
              type="color"
              value={defaults.stroke || '#334155'}
              onPointerDown={() => beginRecentSession(defaults.stroke || '#334155')}
              onInput={e => { const val = (e.target as HTMLInputElement).value; updateDefaults({ stroke: val }); setLastDefaultStroke(val); previewRecent(val); }}
              onChange={e => { const val = e.target.value; previewRecent(val); }}
              onBlur={e => { const val = e.target.value; if (parseColor(val)) commitRecent(val); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Default rectangle stroke color"
            />
            <div className="w-9 h-9 rounded border border-gray-300 shadow-sm flex items-center justify-center relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-white">
              <div className="w-7 h-7 rounded checkerboard overflow-hidden relative flex items-center justify-center">
                {defaults.stroke !== undefined && (
                  <div className="w-full h-full rounded" style={{ background: defaults.stroke }} />
                )}
                {defaults.stroke === undefined && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                    <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                  </div>
                )}
              </div>
            </div>
            <span className="sr-only">Stroke color</span>
          </label>
          <div className="flex items-center gap-1 mt-1">
            <input type="checkbox" className="h-3 w-3" checked={defaults.stroke === undefined} onChange={() => {
              if (defaults.stroke !== undefined) {
                if (defaults.stroke) setLastDefaultStroke(defaults.stroke);
                updateDefaults({ stroke: undefined });
              } else {
                updateDefaults({ stroke: lastDefaultStroke || '#334155' });
              }
            }} title="Toggle stroke on/off" />
            <span className="text-[10px] text-gray-500">Off</span>
          </div>
        </div>
      </div>
      {/* Alpha + text */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-gray-500 text-[10px] flex items-center justify-between">Fill Alpha{defaults.fill===undefined && <span className="text-[9px] text-red-500 ml-1">off</span>}</span>
          <input type="range" min={0} max={1} step={0.01} disabled={defaults.fill===undefined} value={parseColor(defaults.fill || '#ffffff')?.a ?? 1} onChange={e => {
            if (defaults.fill===undefined) return;
            updateDefaults({ fill: adjustAlpha(defaults.fill || '#ffffff', Number(e.target.value)) });
          }} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-500 text-[10px] flex items-center justify-between">Stroke Alpha{defaults.stroke===undefined && <span className="text-[9px] text-red-500 ml-1">off</span>}</span>
          <input type="range" min={0} max={1} step={0.01} disabled={defaults.stroke===undefined} value={parseColor(defaults.stroke || '#334155')?.a ?? 1} onChange={e => {
            if (defaults.stroke===undefined) return;
            updateDefaults({ stroke: adjustAlpha(defaults.stroke || '#334155', Number(e.target.value)) });
          }} />
        </label>
        <label className="flex flex-col gap-1 col-span-2">
          <span className="text-gray-500 text-[10px]">Fill Value</span>
          <input type="text" className="border rounded px-1 py-0.5 text-[11px] font-mono" value={defaults.fill || ''} onChange={e => updateDefaults({ fill: e.target.value })} onBlur={e => { if (parseColor(e.target.value)) commitRecent(e.target.value); }} />
        </label>
        <label className="flex flex-col gap-1 col-span-2">
          <span className="text-gray-500 text-[10px]">Stroke Value</span>
          <input type="text" className="border rounded px-1 py-0.5 text-[11px] font-mono" value={defaults.stroke || ''} onChange={e => updateDefaults({ stroke: e.target.value })} onBlur={e => { if (parseColor(e.target.value)) commitRecent(e.target.value); }} />
        </label>
      </div>
      <RecentColorsPanel recentColors={recentColors} onPick={onPickRecent} />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 col-span-1">
          <span className="text-gray-500">Stroke W</span>
          <input type="number" min={0} value={defaults.strokeWidth ?? 1} onChange={e => updateDefaults({ strokeWidth: Math.max(0, Number(e.target.value)||0) })} className="border rounded px-1 py-0.5 text-[11px]" />
        </label>
        <label className="flex flex-col gap-1 col-span-1">
          <span className="text-gray-500">Radius</span>
          <input type="number" min={0} value={defaults.radius ?? 0} onChange={e => updateDefaults({ radius: Math.max(0, Number(e.target.value)||0) })} className="border rounded px-1 py-0.5 text-[11px]" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Opacity ({(defaults.opacity ?? 1).toFixed(2)})</span>
        <input type="range" min={0} max={1} step={0.01} value={defaults.opacity ?? 1} onChange={e => updateDefaults({ opacity: Math.min(1, Math.max(0, Number(e.target.value))) })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-500">Dash Pattern</span>
        <input
          type="text"
          placeholder="e.g. 4 4"
          defaultValue={defaults.strokeDash ? defaults.strokeDash.join(' ') : ''}
          onKeyDown={e => { if (e.key === 'Enter') { const raw = (e.target as HTMLInputElement).value; const nums = raw.trim()? raw.trim().split(/\s+/).map(n=>Number(n)).filter(n=>!isNaN(n)&&n>=0): []; updateDefaults({ strokeDash: nums.length? nums: undefined }); (e.target as HTMLInputElement).blur(); } }}
          onBlur={e => { const raw = (e.target as HTMLInputElement).value; const nums = raw.trim()? raw.trim().split(/\s+/).map(n=>Number(n)).filter(n=>!isNaN(n)&&n>=0): []; updateDefaults({ strokeDash: nums.length? nums: undefined }); }}
          className="border rounded px-1 py-0.5 text-[11px] font-mono"
        />
        <span className="text-[10px] text-gray-400">Will apply to next rectangle.</span>
      </label>
    </div>
  );
};

export default DefaultsPanel;
