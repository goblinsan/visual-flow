import { useCallback, useLayoutEffect, useRef, useState, useEffect } from "react";
import { parseColor, toHex, addRecentColor } from './utils/color';
import { findNode, updateNode } from './utils/specUtils';
import { parseDashPattern } from './utils/dashPattern';
import { Modal } from "./components/Modal";
import { logger } from "./utils/logger";
import CanvasStage from "./canvas/CanvasStage.tsx";
import type { LayoutSpec } from "./layout-schema.ts";

// Hook to observe element size
function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Immediate measurement fallback so first render can mount Stage
    const first = el.getBoundingClientRect();
    if ((first.width || first.height) && (first.width !== size.width || first.height !== size.height)) {
      setSize({ width: first.width, height: first.height });
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize(prev => (prev.width === cr.width && prev.height === cr.height) ? prev : { width: cr.width, height: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [size.width, size.height]);
  return [ref, size];
}

function buildInitialSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 1600, height: 1200 },
      background: "#ffffff",
      children: [
        { id: "title", type: "text", text: "Welcome to Visual Flow Canvas", variant: "h1", position: { x: 48, y: 48 }, size: { width: 420, height: 48 }, color: "#111827" },
        { id: "hint", type: "text", text: "Use the left toolbar tools (stub) – pan with Space+Drag, zoom wheel.", variant: "body", position: { x: 48, y: 108 }, size: { width: 520, height: 32 }, color: "#374151" },
        { id: "panel", type: "box", position: { x: 48, y: 170 }, size: { width: 340, height: 160 }, background: "#f3f4f6", border: "1px solid #e5e7eb", radius: 12, children: [
          { id: "panelText", type: "text", text: "This is a sample node.", variant: "body", position: { x: 16, y: 16 }, size: { width: 250, height: 24 }, color: "#111827" }
        ]},
        { id: "img1", type: "image", src: "/vite.svg", position: { x: 420, y: 200 }, size: { width: 120, height: 120 }, radius: 16, objectFit: "contain" },
      ],
    },
  };
}

export default function CanvasApp() {
  const [spec, setSpec] = useState<LayoutSpec>(() => buildInitialSpec());
  const [tool, setTool] = useState<string>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Rectangle default attributes (used when creating new rectangles)
  const [rectDefaults, setRectDefaults] = useState<{ fill?: string; stroke?: string; strokeWidth: number; radius: number; opacity: number; strokeDash?: number[] }>({
    fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 0, opacity: 1, strokeDash: undefined
  });
  // Remember last non-undefined colors so toggling off/on restores previous value
  const [lastFillById, setLastFillById] = useState<Record<string,string>>({});
  const [lastStrokeById, setLastStrokeById] = useState<Record<string,string>>({});
  const [lastDefaultFill, setLastDefaultFill] = useState<string>('#ffffff');
  const [lastDefaultStroke, setLastDefaultStroke] = useState<string>('#334155');
  // Recent colors (mode toggle removed; default treat stored strings as-is)
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try { const j = localStorage.getItem('vf_recent_colors'); return j ? JSON.parse(j) : ['#ffffff','#000000','#ff0000','#00aaff']; } catch { return ['#ffffff','#000000']; }
  });
  // Raw dash pattern input (for both selected rect and defaults) to preserve user typing
  const [rawDashInput, setRawDashInput] = useState<string>('');
  const [canvasRef, canvasSize] = useElementSize<HTMLDivElement>();
  const [helpOpen, setHelpOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const appVersion = (import.meta as any).env?.VITE_APP_VERSION || '0.0.0';

  // Debug: log spec on mount
  useEffect(() => {
    logger.debug('CanvasApp mount: root children', spec.root.children.map(c => c.id));
  }, []);

  useEffect(() => {
    logger.debug('CanvasApp size', canvasSize.width, canvasSize.height);
  }, [canvasSize.width, canvasSize.height]);

  // Load persisted defaults once
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vf_rect_defaults');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setRectDefaults(d => ({ ...d, ...parsed }));
        }
      }
    } catch {/* ignore */}
  }, []);

  // Persist defaults & recent colors (debounced minimal via effect)
  useEffect(() => {
    try { localStorage.setItem('vf_rect_defaults', JSON.stringify(rectDefaults)); } catch {/* ignore */}
  }, [rectDefaults]);
  useEffect(() => {
    try { localStorage.setItem('vf_recent_colors', JSON.stringify(recentColors)); } catch {/* ignore */}
  }, [recentColors]);

  // Keep root frame sized to at least viewport to avoid gray background gaps
  useEffect(() => {
    setSpec(prev => {
      const root = prev.root;
      const need = root.size?.width !== canvasSize.width || root.size?.height !== canvasSize.height;
      if (!need) return prev;
      return { ...prev, root: { ...root, size: { width: canvasSize.width, height: canvasSize.height } } };
    });
  }, [canvasSize.width, canvasSize.height]);

  // Sync raw dash input based on selection / tool changes
  useEffect(() => {
    // If exactly one rectangle selected, mirror its strokeDash
    if (selectedIds.length === 1) {
      const node = findNode(spec.root as any, selectedIds[0]);
      if (node && node.type === 'rect') {
        const dashStr = node.strokeDash ? node.strokeDash.join(' ') : '';
        setRawDashInput(prev => prev === dashStr ? prev : dashStr);
        return;
      }
    }
    // If no selection and rect tool active, show defaults value
    if (selectedIds.length === 0 && tool === 'rect') {
      const dashStr = rectDefaults.strokeDash ? rectDefaults.strokeDash.join(' ') : '';
      setRawDashInput(prev => prev === dashStr ? prev : dashStr);
      return;
    }
    // Otherwise don't overwrite user input (e.g., multi-select or other tool)
  }, [selectedIds, tool, rectDefaults.strokeDash, spec.root]);

  // File menu stub handlers
  const fileAction = useCallback((action: string) => {
    // Later: implement persistence layer
    // eslint-disable-next-line no-console
    console.log(`[File] ${action}`);
    if (action === "new") {
      setSpec(buildInitialSpec());
      logger.info('File action new: spec reset');
    }
  }, []);


  // Derive stage width/height from container size (padding adjustments if needed)
  const stageWidth = Math.max(0, canvasSize.width);
  const stageHeight = Math.max(0, canvasSize.height);

  // Close menus on global ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHelpOpen(false);
        setFileOpen(false);
        if (tool !== 'select') setTool('select');
      }
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setTool(prev => prev === 'rect' ? 'select' : 'rect');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool]);

  // Outside click for menus
  const headerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
        setFileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100 text-gray-900 flex flex-col">
      {/* Header */}
      <header ref={headerRef} className="flex items-center justify-between h-12 px-4 border-b border-gray-300 bg-white shadow-sm select-none">
        <div className="flex items-center gap-6">
            <h1 className="text-sm font-semibold tracking-wide">Visual Flow Canvas</h1>
            {/* File menu */}
            <div className="relative">
              <button
                onClick={() => setFileOpen(o => !o)}
                className={`text-sm px-2 py-1 rounded hover:bg-gray-100 ${fileOpen ? 'bg-gray-100' : ''}`}
                aria-haspopup="true"
                aria-expanded={fileOpen}
              >File ▾</button>
              {fileOpen && (
                <div className="absolute left-0 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg z-30 p-1 flex flex-col">
                  {[
                    ["New", "new"],
                    ["Open…", "open"],
                    ["Save", "save"],
                    ["Save As…", "saveAs"],
                  ].map(([label, act]) => (
                    <button
                      key={act}
                      onClick={() => { fileAction(act); setFileOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-100"
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Help menu */}
            <div className="relative">
              <button
                onClick={() => setHelpOpen(o => !o)}
                className={`text-sm px-2 py-1 rounded hover:bg-gray-100 ${helpOpen ? 'bg-gray-100' : ''}`}
                aria-haspopup="true"
                aria-expanded={helpOpen}
              >Help ▾</button>
              {helpOpen && (
                <div className="absolute left-0 mt-1 w-52 rounded-md border border-gray-200 bg-white shadow-lg z-30 p-1 flex flex-col text-xs">
                  <button
                    onClick={() => { setAboutOpen(true); setHelpOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100"
                  >About</button>
                  <button
                    onClick={() => { setCheatOpen(true); setHelpOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100"
                  >Cheatsheet</button>
                </div>
              )}
            </div>
        </div>
        <div className="text-xs font-mono text-gray-500">Tool: {tool}</div>
      </header>
      {/* Modals */}
      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About Visual Flow" size="sm" variant="light">
        <p><strong>visual-flow</strong> version <code>{appVersion}</code></p>
        <p className="mt-2">Experimental canvas + layout editor. Transforms are baked to schema on release.</p>
        <p className="mt-4 opacity-70 text-[10px]">© {new Date().getFullYear()} visual-flow</p>
      </Modal>
      <Modal open={cheatOpen} onClose={() => setCheatOpen(false)} title="Interaction Cheatsheet" size="sm" variant="light">
        <ul className="space-y-1 list-disc pl-4 pr-1 max-h-72 overflow-auto text-xs">
          <li>Select: Click; Shift/Ctrl multi; marquee drag empty space.</li>
          <li>Pan: Space+Drag / Middle / Alt+Drag.</li>
          <li>Zoom: Wheel (cursor focus).</li>
          <li>Resize: Drag handles; Shift=aspect; Alt=center; Shift+Alt=center+aspect.</li>
          <li>Rotate: Handle (snaps 0/90/180/270).</li>
          <li>Images: Non-uniform stretch disables aspect; context menu to restore.</li>
          <li>Rectangle: Press R to toggle; drag to draw; Shift=square; Alt=center-out.</li>
          <li>Group: Ctrl/Cmd+G; Ungroup: Ctrl/Cmd+Shift+G.</li>
          <li>Duplicate: Ctrl/Cmd+D. Delete: Del/Backspace.</li>
          <li>Nudge: Arrows (1px) / Shift+Arrows (10px).</li>
        </ul>
      </Modal>
      {/* Body layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left toolbar */}
        <aside className="w-14 border-r border-gray-300 bg-white flex flex-col items-center py-2 gap-2">
          {[
            ["Select", "select"],
            ["Rect", "rect"],
            ["Ellipse", "ellipse"],
            ["Line", "line"],
            ["Curve", "curve"],
            ["Text", "text"],
            ["Image", "image"],
          ].map(([label, val]) => (
            <button
              key={val}
              onClick={() => setTool(val)}
              className={`w-10 h-10 text-[10px] rounded border text-gray-700 flex items-center justify-center leading-tight hover:bg-gray-100 ${tool === val ? "bg-gray-200 border-gray-400" : "border-transparent"}`}
            >{label}</button>
          ))}
        </aside>
        {/* Canvas center */}
        <main className="flex-1 relative min-w-0">
          <div ref={canvasRef} className="absolute inset-0">
            {stageWidth > 0 && stageHeight > 0 && (
              <CanvasStage
                tool={tool}
                spec={spec}
                setSpec={setSpec}
                width={stageWidth}
                height={stageHeight}
                onToolChange={setTool}
                onSelectionChange={setSelectedIds}
                rectDefaults={rectDefaults}
              />
            )}
          </div>
        </main>
        {/* Right attributes panel */}
        <aside className="w-64 border-l border-gray-300 bg-white flex flex-col">
          <div className="p-3 border-b text-xs font-semibold uppercase tracking-wide text-gray-600">Attributes</div>
          <div className="p-3 text-xs text-gray-600 space-y-3 overflow-auto">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Context</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <span className="text-gray-400">Tool</span><span className="font-mono">{tool}</span>
              <span className="text-gray-400">Nodes</span><span className="font-mono">{spec.root.children.length}</span>
              <span className="text-gray-400">Selected</span><span className="font-mono">{selectedIds.length}</span>
            </div>
            {selectedIds.length === 1 && (() => {
              // Find node
              const node = findNode(spec.root as any, selectedIds[0]);
              if (!node) return <div className="text-[11px] text-gray-400">Node not found.</div>;
              if (node.type === 'rect') {
                const rect = node as any;
                const dashLogEnabled = (() => {
                  try {
                    if (typeof window !== 'undefined') {
                      const urlFlag = new URLSearchParams(window.location.search).has('debugUpdates');
                      const lsFlag = localStorage.getItem('vf_debug_updates') === '1';
                      return urlFlag || lsFlag;
                    }
                  } catch { /* ignore */ }
                  return false;
                })();
                const updateRect = (patch: Record<string, any>) => {
                  if (dashLogEnabled) logger.debug('updateNode(rect)', rect.id, patch);
                  setSpec(prev => ({ ...prev, root: updateNode(prev.root as any, rect.id, patch) as any }));
                };
                return (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Rectangle</p>
                    <div className="flex items-start gap-3">
                      {/* Fill */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">Fill</span>
                        <label className="relative group" title="Fill color">
                          <input
                            type="color"
                            value={rect.fill || '#ffffff'}
                            onChange={e => { const val = e.target.value; updateRect({ fill: val }); setLastFillById(m => ({ ...m, [rect.id]: val })); setRecentColors(rc => addRecentColor(rc, val)); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            aria-label="Rectangle fill color"
                          />
                          <div className="w-9 h-9 rounded border border-gray-300 shadow-sm flex items-center justify-center relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-white">
                            <div className="w-7 h-7 rounded checkerboard overflow-hidden relative">
                              {rect.fill !== undefined && (
                                <div className="w-full h-full" style={{ background: rect.fill }} />
                              )}
                              {rect.fill === undefined && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                                  <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="sr-only">Fill color</span>
                        </label>
                        <div className="flex items-center gap-1 mt-1">
                          <input type="checkbox" className="h-3 w-3" checked={rect.fill === undefined} onChange={e => {
                            if (e.target.checked) { // turning off
                              if (rect.fill) setLastFillById(m => ({ ...m, [rect.id]: rect.fill }));
                              updateRect({ fill: undefined });
                            } else { // turning on
                              const restore = lastFillById[rect.id] || '#ffffff';
                              updateRect({ fill: restore });
                            }
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
                            updateRect({ fill: rect.stroke, stroke: rect.fill });
                            if (rect.fill) setRecentColors(rc => addRecentColor(rc, rect.fill!));
                            if (rect.stroke) setRecentColors(rc => addRecentColor(rc, rect.stroke!));
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
                            value={rect.stroke || '#334155'}
                            onChange={e => { const val = e.target.value; updateRect({ stroke: val }); setLastStrokeById(m => ({ ...m, [rect.id]: val })); setRecentColors(rc => addRecentColor(rc, val)); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            aria-label="Rectangle stroke color"
                          />
                          <div className="w-9 h-9 rounded border border-gray-300 shadow-sm flex items-center justify-center relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-white">
                            <div className="w-7 h-7 rounded checkerboard overflow-hidden relative flex items-center justify-center">
                              {rect.stroke !== undefined && (
                                <div className="w-full h-full rounded" style={{ background: rect.stroke }} />
                              )}
                              {rect.stroke === undefined && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                                  <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="sr-only">Stroke color</span>
                        </label>
                        <div className="flex items-center gap-1 mt-1">
                          <input type="checkbox" className="h-3 w-3" checked={rect.stroke === undefined} onChange={e => {
                            if (e.target.checked) { // turning off
                              if (rect.stroke) setLastStrokeById(m => ({ ...m, [rect.id]: rect.stroke }));
                              updateRect({ stroke: undefined });
                            } else {
                              const restore = lastStrokeById[rect.id] || '#334155';
                              updateRect({ stroke: restore });
                            }
                          }} title="Toggle stroke on/off" />
                          <span className="text-[10px] text-gray-500">Off</span>
                        </div>
                      </div>
                    </div>
                    {/* (Removed separate Swap & Format buttons; compact swap icon inserted between swatches) */}
                    {/* Alpha + Text Inputs */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-gray-500 text-[10px] flex items-center justify-between">Fill Alpha{rect.fill===undefined && <span className="text-[9px] text-red-500 ml-1">off</span>}</span>
                        <input type="range" min={0} max={1} step={0.01} disabled={rect.fill===undefined} value={parseColor(rect.fill || '#ffffff')?.a ?? 1} onChange={e => {
                          if (rect.fill===undefined) return; // don't resurrect while off
                          const p = parseColor(rect.fill || (lastFillById[rect.id] || '#ffffff')); if (p) { p.a = Number(e.target.value); const val = toHex(p, p.a!==1); updateRect({ fill: val }); setLastFillById(m => ({ ...m, [rect.id]: val })); }
                        }} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-gray-500 text-[10px] flex items-center justify-between">Stroke Alpha{rect.stroke===undefined && <span className="text-[9px] text-red-500 ml-1">off</span>}</span>
                        <input type="range" min={0} max={1} step={0.01} disabled={rect.stroke===undefined} value={parseColor(rect.stroke || '#334155')?.a ?? 1} onChange={e => {
                          if (rect.stroke===undefined) return; // don't resurrect while off
                          const p = parseColor(rect.stroke || (lastStrokeById[rect.id] || '#334155')); if (p) { p.a = Number(e.target.value); const val = toHex(p, p.a!==1); updateRect({ stroke: val }); setLastStrokeById(m => ({ ...m, [rect.id]: val })); }
                        }} />
                      </label>
                      <label className="flex flex-col gap-1 col-span-2">
                        <span className="text-gray-500 text-[10px]">Fill Value</span>
                        <input type="text" className="border rounded px-1 py-0.5 text-[11px] font-mono" value={rect.fill || ''} onChange={e => updateRect({ fill: e.target.value })} />
                      </label>
                      <label className="flex flex-col gap-1 col-span-2">
                        <span className="text-gray-500 text-[10px]">Stroke Value</span>
                        <input type="text" className="border rounded px-1 py-0.5 text-[11px] font-mono" value={rect.stroke || ''} onChange={e => updateRect({ stroke: e.target.value })} />
                      </label>
                    </div>
                    {/* Recent Colors */}
                    {recentColors.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Recent</div>
                        <div className="flex flex-wrap gap-1">
                          {recentColors.map(col => (
                            <button key={col} type="button" title={col} onClick={() => { updateRect({ fill: col }); setLastFillById(m => ({ ...m, [rect.id]: col })); setRecentColors(rc => addRecentColor(rc, col)); }} className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center">
                              <span className="w-4 h-4 rounded checkerboard overflow-hidden" style={{ background: col }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 col-span-1">
                        <span className="text-gray-500">Stroke W</span>
                        <input type="number" min={0} value={rect.strokeWidth ?? 1} onChange={e => updateRect({ strokeWidth: Math.max(0, Number(e.target.value)||0) })} className="border rounded px-1 py-0.5 text-[11px]" />
                      </label>
                      <label className="flex flex-col gap-1 col-span-1">
                        <span className="text-gray-500">Radius</span>
                        <input type="number" min={0} value={rect.radius ?? 0} onChange={e => updateRect({ radius: Math.max(0, Number(e.target.value)||0) })} className="border rounded px-1 py-0.5 text-[11px]" />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-500">Opacity ({(rect.opacity ?? 1).toFixed(2)})</span>
                      <input type="range" min={0} max={1} step={0.01} value={rect.opacity ?? 1} onChange={e => updateRect({ opacity: Math.min(1, Math.max(0, Number(e.target.value))) })} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-500">Dash Pattern</span>
                      <input
                        type="text"
                        placeholder="e.g. 4 4"
                        value={rawDashInput}
                        onChange={e => { setRawDashInput(e.target.value); }}
                        onKeyDown={e => { if (e.key === 'Enter') { const { pattern } = parseDashPattern(rawDashInput); updateRect({ strokeDash: pattern.length ? pattern : undefined }); (e.target as HTMLInputElement).blur(); } }}
                        onBlur={() => { const { pattern } = parseDashPattern(rawDashInput); updateRect({ strokeDash: pattern.length ? pattern : undefined }); }}
                        className="border rounded px-1 py-0.5 text-[11px] font-mono"
                      />
                      <span className="text-[10px] text-gray-400">Space/comma separated numbers. Empty = solid.</span>
                    </label>
                  </div>
                );
              }
              return <div className="text-[11px] text-gray-400">No editable attributes for type: {node.type}</div>;
            })()}
            {selectedIds.length !== 1 && tool==='rect' && selectedIds.length===0 && (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Rectangle Defaults</p>
                <div className="flex items-start gap-4">
                  {/* Fill Default */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">Fill</span>
                    <label className="relative group" title="Default fill color">
                      <input
                        type="color"
                        value={rectDefaults.fill}
                        onChange={e => { const val = e.target.value; setRectDefaults(d => ({ ...d, fill: val })); setLastDefaultFill(val); setRecentColors(rc => addRecentColor(rc, val)); }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Default rectangle fill color"
                      />
                      <div className="w-9 h-9 rounded border border-gray-300 shadow-sm flex items-center justify-center relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-white">
                        <div className="w-7 h-7 rounded checkerboard overflow-hidden relative">
                          {rectDefaults.fill !== undefined && (
                            <div className="w-full h-full" style={{ background: rectDefaults.fill }} />
                          )}
                          {rectDefaults.fill === undefined && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                              <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="sr-only">Fill color</span>
                    </label>
                    <div className="flex items-center gap-1 mt-1">
                      <input type="checkbox" className="h-3 w-3" checked={rectDefaults.fill === undefined} onChange={e => {
                        if (e.target.checked) { // off
                          if (rectDefaults.fill) setLastDefaultFill(rectDefaults.fill);
                          setRectDefaults(d => ({ ...d, fill: undefined }));
                        } else {
                          setRectDefaults(d => ({ ...d, fill: lastDefaultFill || '#ffffff' }));
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
                      onClick={() => {
                        setRectDefaults(d => ({ ...d, fill: d.stroke, stroke: d.fill }));
                      }}
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
                        value={rectDefaults.stroke}
                        onChange={e => { const val = e.target.value; setRectDefaults(d => ({ ...d, stroke: val })); setLastDefaultStroke(val); setRecentColors(rc => addRecentColor(rc, val)); }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Default rectangle stroke color"
                      />
                      <div className="w-9 h-9 rounded border border-gray-300 shadow-sm flex items-center justify-center relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-white">
                        <div className="w-7 h-7 rounded checkerboard overflow-hidden relative flex items-center justify-center">
                          {rectDefaults.stroke !== undefined && (
                            <div className="w-full h-full rounded" style={{ background: rectDefaults.stroke }} />
                          )}
                          {rectDefaults.stroke === undefined && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                              <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="sr-only">Stroke color</span>
                    </label>
                    <div className="flex items-center gap-1 mt-1">
                      <input type="checkbox" className="h-3 w-3" checked={rectDefaults.stroke === undefined} onChange={e => {
                        if (e.target.checked) { // off
                          if (rectDefaults.stroke) setLastDefaultStroke(rectDefaults.stroke);
                          setRectDefaults(d => ({ ...d, stroke: undefined }));
                        } else {
                          setRectDefaults(d => ({ ...d, stroke: lastDefaultStroke || '#334155' }));
                        }
                      }} title="Toggle stroke on/off" />
                      <span className="text-[10px] text-gray-500">Off</span>
                    </div>
                  </div>
                </div>
                {/* (Removed separate swap & format buttons; compact swap icon between swatches) */}
                {/* Defaults alpha + text */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-gray-500 text-[10px] flex items-center justify-between">Fill Alpha{rectDefaults.fill===undefined && <span className="text-[9px] text-red-500 ml-1">off</span>}</span>
                    <input type="range" min={0} max={1} step={0.01} disabled={rectDefaults.fill===undefined} value={parseColor(rectDefaults.fill || '#ffffff')?.a ?? 1} onChange={e => {
                      if (rectDefaults.fill===undefined) return; // don't resurrect while off
                      const p = parseColor(rectDefaults.fill || '#ffffff'); if (p) { p.a = Number(e.target.value); setRectDefaults(d => ({ ...d, fill: toHex(p, p.a!==1) })); }
                    }} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-gray-500 text-[10px] flex items-center justify-between">Stroke Alpha{rectDefaults.stroke===undefined && <span className="text-[9px] text-red-500 ml-1">off</span>}</span>
                    <input type="range" min={0} max={1} step={0.01} disabled={rectDefaults.stroke===undefined} value={parseColor(rectDefaults.stroke || '#334155')?.a ?? 1} onChange={e => {
                      if (rectDefaults.stroke===undefined) return; // don't resurrect while off
                      const p = parseColor(rectDefaults.stroke || '#334155'); if (p) { p.a = Number(e.target.value); setRectDefaults(d => ({ ...d, stroke: toHex(p, p.a!==1) })); }
                    }} />
                  </label>
                  <label className="flex flex-col gap-1 col-span-2">
                    <span className="text-gray-500 text-[10px]">Fill Value</span>
                    <input type="text" className="border rounded px-1 py-0.5 text-[11px] font-mono" value={rectDefaults.fill || ''} onChange={e => setRectDefaults(d => ({ ...d, fill: e.target.value }))} />
                  </label>
                  <label className="flex flex-col gap-1 col-span-2">
                    <span className="text-gray-500 text-[10px]">Stroke Value</span>
                    <input type="text" className="border rounded px-1 py-0.5 text-[11px] font-mono" value={rectDefaults.stroke || ''} onChange={e => setRectDefaults(d => ({ ...d, stroke: e.target.value }))} />
                  </label>
                </div>
                {recentColors.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Recent</div>
                    <div className="flex flex-wrap gap-1">
                      {recentColors.map(col => (
                        <button key={col} type="button" title={col} onClick={() => setRectDefaults(d => ({ ...d, fill: col }))} className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center">
                          <span className="w-4 h-4 rounded checkerboard overflow-hidden" style={{ background: col }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 col-span-1">
                    <span className="text-gray-500">Stroke W</span>
                    <input type="number" min={0} value={rectDefaults.strokeWidth} onChange={e => setRectDefaults(d => ({ ...d, strokeWidth: Math.max(0, Number(e.target.value)||0) }))} className="border rounded px-1 py-0.5 text-[11px]" />
                  </label>
                  <label className="flex flex-col gap-1 col-span-1">
                    <span className="text-gray-500">Radius</span>
                    <input type="number" min={0} value={rectDefaults.radius} onChange={e => setRectDefaults(d => ({ ...d, radius: Math.max(0, Number(e.target.value)||0) }))} className="border rounded px-1 py-0.5 text-[11px]" />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-500">Opacity ({rectDefaults.opacity.toFixed(2)})</span>
                  <input type="range" min={0} max={1} step={0.01} value={rectDefaults.opacity} onChange={e => setRectDefaults(d => ({ ...d, opacity: Math.min(1, Math.max(0, Number(e.target.value))) }))} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-500">Dash Pattern</span>
                  <input
                    type="text"
                    placeholder="e.g. 4 4"
                    value={rawDashInput}
                    onChange={e => setRawDashInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { const { pattern } = parseDashPattern(rawDashInput); setRectDefaults(d => ({ ...d, strokeDash: pattern.length ? pattern : undefined })); (e.target as HTMLInputElement).blur(); } }}
                    onBlur={() => { const { pattern } = parseDashPattern(rawDashInput); setRectDefaults(d => ({ ...d, strokeDash: pattern.length ? pattern : undefined })); }}
                    className="border rounded px-1 py-0.5 text-[11px] font-mono"
                  />
                  <span className="text-[10px] text-gray-400">Will apply to next rectangle.</span>
                </label>
              </div>
            )}
            {selectedIds.length !== 1 && !(tool==='rect' && selectedIds.length===0) && (
              <div className="text-[11px] text-gray-400">{selectedIds.length === 0 ? 'No selection' : 'Multiple selection (attributes coming soon).'}</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
