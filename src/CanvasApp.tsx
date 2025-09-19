import { useCallback, useLayoutEffect, useRef, useState, useEffect } from "react";
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
  const [rectDefaults, setRectDefaults] = useState<{ fill: string; stroke: string; strokeWidth: number; radius: number; opacity: number; strokeDash?: number[] }>({
    fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 0, opacity: 1, strokeDash: undefined
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
      const findNode = (n:any, id:string): any | null => { if (n.id===id) return n; if (n.children) { for (const c of n.children) { const f=findNode(c,id); if (f) return f; } } return null; };
      const node = findNode(spec.root, selectedIds[0]);
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
              const findNode = (n:any, id:string): any | null => { if (n.id===id) return n; if (n.children) { for (const c of n.children) { const f=findNode(c,id); if (f) return f;} } return null; };
              const node = findNode(spec.root, selectedIds[0]);
              if (!node) return <div className="text-[11px] text-gray-400">Node not found.</div>;
              if (node.type === 'rect') {
                const rect = node as any;
                const updateRect = (patch: Record<string, any>) => {
                  setSpec(prev => ({
                    ...prev,
                    root: (function mapAll(n:any):any { if (n.id===rect.id) return { ...n, ...patch }; if (n.children) return { ...n, children: n.children.map(mapAll)}; return n; })(prev.root)
                  }));
                };
                const parseDash = (val:string): number[] | undefined => {
                  const trimmed = val.trim(); if (!trimmed) return undefined;
                  const parts = trimmed.split(/[\,\s]+/).map(p => Number(p)).filter(n => !isNaN(n) && n>=1);
                  return parts.length ? parts : undefined;
                };
                return (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Rectangle</p>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-500">Fill</span>
                      <input type="color" value={rect.fill || '#ffffff'} onChange={e => updateRect({ fill: e.target.value })} className="h-7 w-full cursor-pointer" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-500">Stroke</span>
                      <input type="color" value={rect.stroke || '#334155'} onChange={e => updateRect({ stroke: e.target.value })} className="h-7 w-full cursor-pointer" />
                    </label>
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
                        onBlur={() => updateRect({ strokeDash: parseDash(rawDashInput) })}
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
                <label className="flex flex-col gap-1">
                  <span className="text-gray-500">Fill</span>
                  <input type="color" value={rectDefaults.fill} onChange={e => setRectDefaults(d => ({ ...d, fill: e.target.value }))} className="h-7 w-full cursor-pointer" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-500">Stroke</span>
                  <input type="color" value={rectDefaults.stroke} onChange={e => setRectDefaults(d => ({ ...d, stroke: e.target.value }))} className="h-7 w-full cursor-pointer" />
                </label>
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
                    onBlur={() => {
                      const trimmed = rawDashInput.trim();
                      if (!trimmed) { setRectDefaults(d => ({ ...d, strokeDash: undefined })); return; }
                      const parts = trimmed.split(/[\,\s]+/).map(p => Number(p)).filter(n => !isNaN(n) && n>=1);
                      setRectDefaults(d => ({ ...d, strokeDash: parts.length ? parts : undefined }));
                    }}
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
