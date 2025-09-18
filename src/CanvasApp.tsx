import { useCallback, useLayoutEffect, useRef, useState, useEffect } from "react";
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
  const [canvasRef, canvasSize] = useElementSize<HTMLDivElement>();
  const [helpOpen, setHelpOpen] = useState(false);
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between h-12 px-4 border-b border-gray-300 bg-white shadow-sm select-none">
        <div className="flex items-center gap-6">
          <h1 className="text-sm font-semibold tracking-wide">Visual Flow Canvas</h1>
          <div className="relative group">
            <button className="text-sm px-2 py-1 rounded hover:bg-gray-100">File ▾</button>
            <div className="absolute left-0 mt-1 w-40 rounded border border-gray-200 bg-white shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
              {[
                ["New", "new"],
                ["Open…", "open"],
                ["Save", "save"],
                ["Save As…", "saveAs"],
              ].map(([label, act]) => (
                <button
                  key={act}
                  onClick={() => fileAction(act)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                >{label}</button>
              ))}
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setHelpOpen(o => !o)} className="text-sm px-2 py-1 rounded hover:bg-gray-100">Help ▾</button>
            {helpOpen && (
              <div className="absolute left-0 mt-1 w-48 rounded border border-gray-200 bg-white shadow-lg z-20 text-xs">
                <button onClick={() => { setAboutOpen(true); setHelpOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-100">About</button>
                <button onClick={() => { setCheatOpen(true); setHelpOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-100">Cheatsheet</button>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs font-mono text-gray-500">Tool: {tool}</div>
      </header>
      {/* Modals */}
      <ModalFrame open={aboutOpen} onClose={() => setAboutOpen(false)} title="About Visual Flow">
        <p className="text-xs"><strong>visual-flow</strong> version <code>{appVersion}</code></p>
        <p className="text-xs mt-2">Experimental canvas + layout editor. Transforms are baked to schema on release.</p>
        <p className="text-[10px] mt-4 opacity-60">© {new Date().getFullYear()} visual-flow</p>
      </ModalFrame>
      <ModalFrame open={cheatOpen} onClose={() => setCheatOpen(false)} title="Interaction Cheatsheet">
        <ul className="text-xs space-y-1 list-disc pl-4 pr-1 max-h-72 overflow-auto">
          <li>Select: Click; Shift/Ctrl multi; marquee drag empty space.</li>
          <li>Pan: Space+Drag / Middle / Alt+Drag.</li>
          <li>Zoom: Wheel (cursor focus).</li>
          <li>Resize: Drag handles; Shift=aspect; Alt=center; Shift+Alt=center+aspect.</li>
          <li>Rotate: Handle (snaps 0/90/180/270).</li>
          <li>Images: Non-uniform stretch disables aspect; context menu to restore.</li>
          <li>Group: Ctrl/Cmd+G; Ungroup: Ctrl/Cmd+Shift+G.</li>
          <li>Duplicate: Ctrl/Cmd+D. Delete: Del/Backspace.</li>
          <li>Nudge: Arrows (1px) / Shift+Arrows (10px).</li>
        </ul>
      </ModalFrame>
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
              <CanvasStage tool={tool} spec={spec} setSpec={setSpec} width={stageWidth} height={stageHeight} />
            )}
          </div>
        </main>
        {/* Right attributes panel */}
        <aside className="w-64 border-l border-gray-300 bg-white flex flex-col">
          <div className="p-3 border-b text-xs font-semibold uppercase tracking-wide text-gray-600">Attributes</div>
          <div className="p-3 text-xs text-gray-500 space-y-2 overflow-auto">
            <p>Attribute panel stub. Future: show selected node properties, allow editing.</p>
            <p>Current tool: <span className="font-mono font-semibold">{tool}</span></p>
            <p>Nodes: {spec.root.children.length}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ModalFrame({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-md border border-gray-300 bg-white shadow-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</h2>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div>
          {children}
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-2 py-1 rounded border border-gray-300 bg-gray-100 text-xs hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  );
}
