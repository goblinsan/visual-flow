import { useMemo, useState } from "react";
import { Modal } from "../components/Modal";
import type React from "react";
import { Renderer } from "../renderer/Renderer.tsx";
import type { NodeSpec, RootSpec, GridNode, StackNode, BoxNode, TextNode } from "../dsl.ts";

export type EditorProps = {
  initial: RootSpec;
};

type PathInfo = { path: string; node: NodeSpec };

type NodeWithChildren = GridNode | StackNode | BoxNode;

function hasChildren(node: NodeSpec): node is NodeWithChildren {
  return node.type === "grid" || node.type === "stack" || node.type === "box";
}

function getNodeAtPath(node: NodeSpec, path: string): NodeSpec | undefined {
  if (!path) return node;
  const parts = path.split(".").map((p) => parseInt(p, 10));
  let current: NodeSpec | undefined = node;
  for (const idx of parts) {
    if (!current || !hasChildren(current) || !current.children[idx]) return undefined;
    current = current.children[idx];
  }
  return current;
}

function setNodeAtPath(root: NodeSpec, path: string, updater: (n: NodeSpec) => NodeSpec): NodeSpec {
  const parts = path === "" ? [] : path.split(".").map((p) => parseInt(p, 10));

  const replaceAt = (node: NodeSpec, remaining: number[]): NodeSpec => {
    if (remaining.length === 0) return updater(node);
    if (!hasChildren(node)) return node; // nothing to replace
    const [idx, ...rest] = remaining;
    const child = node.children[idx];
    if (child === undefined) return node;
    const newChild = replaceAt(child, rest);
    if (newChild === child) return node;
    const newChildren = node.children.slice();
    newChildren[idx] = newChild;
    return { ...node, children: newChildren } as NodeWithChildren;
  };

  return replaceAt(root, parts);
}

export function VisualFlowEditor({ initial }: EditorProps) {
  const [spec, setSpec] = useState<RootSpec>(initial);
  const [editing, setEditing] = useState(true);
  const [selected, setSelected] = useState<PathInfo | undefined>();
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(initial, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const appVersion = (import.meta as any).env?.VITE_APP_VERSION || '0.0.0';

  const onSelectNode = (path: string, node: NodeSpec) => setSelected({ path, node });

  const inspector = useMemo(() => {
    if (!selected) return null;
    const node = getNodeAtPath(spec.body, selected.path);
    if (!node) return null;

    const update = (patch: Partial<NodeSpec>) => {
      const body = setNodeAtPath(spec.body, selected.path, (n) => {
        const merged = { ...(n as unknown as Record<string, unknown>), ...(patch as unknown as Record<string, unknown>) } as NodeSpec;
        return merged;
      });
      setSpec({ ...spec, body });
      setSelected({ path: selected.path, node: getNodeAtPath(body, selected.path)! });
    };

    const common = (
      <div className="space-y-2">
        <div className="text-xs opacity-70">Type: {node.type}</div>
        <label className="block text-sm">ClassName
          <input className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={(node as { className?: string }).className ?? ""} onChange={(e) => update({ className: e.target.value } as Partial<NodeSpec>) } />
        </label>
      </div>
    );

    if (node.type === "grid") {
      const g = node as GridNode;
      return (
        <div className="space-y-3">
          {common}
          <label className="block text-sm">Columns
            <input type="number" min={1} max={12} className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={g.columns} onChange={(e) => update({ columns: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">Gap
            <input type="number" min={0} max={12} className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={g.gap ?? 0} onChange={(e) => update({ gap: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">Padding
            <input type="number" min={0} max={12} className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={g.padding ?? 0} onChange={(e) => update({ padding: Number(e.target.value) })} />
          </label>
        </div>
      );
    }

    if (node.type === "stack") {
      const s = node as StackNode;
      return (
        <div className="space-y-3">
          {common}
          <label className="block text-sm">Direction
            <select className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={s.direction ?? "vertical"} onChange={(e) => update({ direction: e.target.value as StackNode["direction"] })}>
              <option value="vertical">vertical</option>
              <option value="horizontal">horizontal</option>
            </select>
          </label>
          <label className="block text-sm">Gap
            <input type="number" min={0} max={12} className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={s.gap ?? 0} onChange={(e) => update({ gap: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">Padding
            <input type="number" min={0} max={12} className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={s.padding ?? 0} onChange={(e) => update({ padding: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">Align
            <select className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={s.align ?? "start"} onChange={(e) => update({ align: e.target.value as StackNode["align"] })}>
              <option value="start">start</option>
              <option value="center">center</option>
              <option value="end">end</option>
              <option value="stretch">stretch</option>
            </select>
          </label>
          <label className="block text-sm">Justify
            <select className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={s.justify ?? "start"} onChange={(e) => update({ justify: e.target.value as StackNode["justify"] })}>
              <option value="start">start</option>
              <option value="center">center</option>
              <option value="end">end</option>
              <option value="between">between</option>
            </select>
          </label>
        </div>
      );
    }

    if (node.type === "box") {
      const b = node as BoxNode;
      return (
        <div className="space-y-3">
          {common}
          <label className="block text-sm">Padding
            <input type="number" min={0} max={12} className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={b.padding ?? 0} onChange={(e) => update({ padding: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">Gap
            <input type="number" min={0} max={12} className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={b.gap ?? 0} onChange={(e) => update({ gap: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">Variant
            <select className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={b.variant ?? "card"} onChange={(e) => update({ variant: e.target.value as BoxNode["variant"] })}>
              <option value="card">card</option>
              <option value="plain">plain</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!b.selectable} onChange={(e) => update({ selectable: e.target.checked })} />
            Selectable
          </label>
        </div>
      );
    }

    if (node.type === "text") {
      return (
        <div className="space-y-3">
          {common}
          <label className="block text-sm">Text
            <input className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={node.text} onChange={(e) => update({ text: e.target.value })} />
          </label>
          <label className="block text-sm">Variant
            <select className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={node.variant ?? "body"} onChange={(e) => update({ variant: e.target.value as TextNode["variant"] })}>
              <option value="h1">h1</option>
              <option value="h2">h2</option>
              <option value="h3">h3</option>
              <option value="body">body</option>
              <option value="caption">caption</option>
            </select>
          </label>
          <label className="block text-sm">Align
            <select className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={node.align ?? "start"} onChange={(e) => update({ align: e.target.value as TextNode["align"] })}>
              <option value="start">start</option>
              <option value="center">center</option>
              <option value="end">end</option>
            </select>
          </label>
        </div>
      );
    }

    if (node.type === "progress") {
      return (
        <div className="space-y-3">
          {common}
          <label className="block text-sm">Label
            <input className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={node.label ?? ""} onChange={(e) => update({ label: e.target.value })} />
          </label>
          <label className="block text-sm">Bar ClassName
            <input className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={node.barClassName ?? ""} onChange={(e) => update({ barClassName: e.target.value })} />
          </label>
        </div>
      );
    }

    return common;
  }, [spec, selected]);

  const exportJson = () => {
    const text = JSON.stringify(spec, null, 2);
    navigator.clipboard?.writeText(text).catch(() => {});
    alert("Spec copied to clipboard.");
  };
  const importJson = () => {
    const text = prompt("Paste JSON spec:");
    if (!text) return;
    try {
      const next = JSON.parse(text) as RootSpec;
      setSpec(next);
      setSelected(undefined);
    } catch {
      alert("Invalid JSON");
    }
  };

  // Outline tree helpers
  const getParentPath = (path: string): string | null => {
    if (path === "") return null;
    const lastDot = path.lastIndexOf(".");
    return lastDot === -1 ? "" : path.slice(0, lastDot);
  };
  const removeAtPath = (path: string) => {
    const parentPath = getParentPath(path);
    if (parentPath === null) return; // can't remove root
    const parent = getNodeAtPath(spec.body, parentPath);
    if (!parent || !hasChildren(parent)) return;
    const index = parseInt(path.split(".").pop()!, 10);
    const newChildren = parent.children.slice();
    newChildren.splice(index, 1);
  const newBody = setNodeAtPath(spec.body, parentPath, (n) => ({ ...(n as NodeWithChildren), children: newChildren } as NodeSpec));
    setSpec({ ...spec, body: newBody });
    setSelected(undefined);
  };
  const insertChild = (parentPath: string, child: NodeSpec) => {
    const parent = getNodeAtPath(spec.body, parentPath);
    if (!parent || !hasChildren(parent)) return;
    const newChildren = parent.children.concat([child]);
  const newBody = setNodeAtPath(spec.body, parentPath, (n) => ({ ...(n as NodeWithChildren), children: newChildren } as NodeSpec));
    setSpec({ ...spec, body: newBody });
  };
  const moveWithinParent = (parentPath: string, fromIndex: number, toIndex: number) => {
    const parent = getNodeAtPath(spec.body, parentPath);
    if (!parent || !hasChildren(parent)) return;
    const arr = parent.children.slice();
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
  const newBody = setNodeAtPath(spec.body, parentPath, (n) => ({ ...(n as NodeWithChildren), children: arr } as NodeSpec));
    setSpec({ ...spec, body: newBody });
    setSelected((prev) => (prev ? { path: `${parentPath}${parentPath ? "." : ""}${toIndex}`, node: getNodeAtPath(newBody, `${parentPath}${parentPath ? "." : ""}${toIndex}`)! } : prev));
  };

  type OutlineProps = { node: NodeSpec; path: string };
  const OutlineNode = ({ node, path }: OutlineProps) => {
  const label = node.type === "text" ? `${node.type}: ${node.text}` : node.type;
    const parentPath = getParentPath(path);
    const index = path === "" ? 0 : parseInt(path.split(".").pop()!, 10);
    const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData("application/x-vf-path", path);
      e.dataTransfer.effectAllowed = "move";
    };
    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      // Allow drop when both have same parent
      const src = e.dataTransfer.getData("application/x-vf-path");
      if (!src) return;
      const srcParent = getParentPath(src);
      const tgtParent = parentPath;
      if (srcParent === tgtParent && srcParent !== null) {
        e.preventDefault();
      }
    };
    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
      const src = e.dataTransfer.getData("application/x-vf-path");
      if (!src) return;
      const srcParent = getParentPath(src);
      const tgtParent = parentPath;
      if (srcParent === tgtParent && srcParent !== null) {
        const fromIndex = parseInt(src.split(".").pop()!, 10);
        const toIndex = index;
        if (fromIndex !== toIndex) moveWithinParent(srcParent, fromIndex, toIndex);
      }
    };
    const addChild = () => {
      if (!hasChildren(node)) return;
      insertChild(path, { type: "text", text: "New", variant: "body" });
    };
    const removeNode = () => {
      if (path === "") return; // can't remove root
      removeAtPath(path);
    };

    return (
      <div
        className={`px-2 py-1 rounded cursor-pointer ${selected?.path === path ? "bg-slate-700/70" : "hover:bg-slate-800/60"}`}
        onClick={() => setSelected({ path, node })}
        draggable={parentPath !== null}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs">{label}</span>
          <div className="flex items-center gap-1">
            {hasChildren(node) && (
              <button className="text-xs px-1 py-0.5 rounded border border-slate-600 bg-slate-800" onClick={(e) => { e.stopPropagation(); addChild(); }}>+ child</button>
            )}
            {path !== "" && (
              <button className="text-xs px-1 py-0.5 rounded border border-red-600/70 bg-red-900/40" onClick={(e) => { e.stopPropagation(); removeNode(); }}>del</button>
            )}
          </div>
        </div>
        {hasChildren(node) && node.children.length > 0 && (
          <div className="mt-1 ml-3 border-l border-slate-700/50 pl-2 space-y-1">
            {node.children.map((child, i) => (
              <OutlineNode key={`${path}${path ? "." : ""}${i}`} node={child} path={`${path}${path ? "." : ""}${i}`} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-gradient text-slate-100">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button className={"px-3 py-1 rounded border " + (editing ? "bg-[--color-brand] border-[--color-brand] text-white" : "border-slate-600 bg-slate-800 text-slate-100")} onClick={() => setEditing(true)}>Edit</button>
            <button className={"px-3 py-1 rounded border " + (!editing ? "bg-[--color-brand] border-[--color-brand] text-white" : "border-slate-600 bg-slate-800 text-slate-100")} onClick={() => setEditing(false)}>Preview</button>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100" onClick={exportJson}>Export JSON</button>
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100" onClick={importJson}>Import JSON</button>
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100" onClick={() => { setJsonText(JSON.stringify(spec, null, 2)); setJsonError(null); setJsonOpen((v) => !v); }}>{jsonOpen ? "Close JSON" : "Open JSON"}</button>
            <div className="relative">
              <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100" onClick={() => setHelpOpen(o => !o)}>Help ▾</button>
              {helpOpen && (
                <div className="absolute right-0 mt-1 w-48 rounded border border-slate-600 bg-slate-900 shadow-lg z-20 text-sm">
                  <button onClick={() => { setAboutOpen(true); setHelpOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-800">About</button>
                  <button onClick={() => { setCheatOpen(true); setHelpOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-800">Cheatsheet</button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Modals */}
        <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About Visual Flow" size="sm">
          <p><strong>visual-flow</strong> version <code>{appVersion}</code></p>
          <p className="mt-2">A lightweight experimental visual layout & canvas transform playground built with React, Konva & Tailwind.</p>
          <p className="mt-2">Transforms use a bake & reset pattern: live manipulations are applied via Konva, then persisted to a schema on release.</p>
          <p className="mt-4 opacity-70">© {new Date().getFullYear()} visual-flow (experimental)</p>
        </Modal>
        <Modal open={cheatOpen} onClose={() => setCheatOpen(false)} title="Interaction Cheatsheet" size="md">
          <ul className="space-y-2 list-disc pl-4">
            <li><strong>Select:</strong> Click. Shift/Ctrl+Click to multi-select. Drag empty space for marquee.</li>
            <li><strong>Pan:</strong> Middle mouse, Alt+Drag, or hold Space.</li>
            <li><strong>Zoom:</strong> Mouse wheel (focus under cursor).</li>
            <li><strong>Resize:</strong> Drag handles. Shift for aspect lock. Alt for centered. Shift+Alt for centered uniform.</li>
            <li><strong>Rotate:</strong> Use rotate handle (snaps at 0/90/180/270°).</li>
            <li><strong>Images:</strong> Non-uniform stretch disables aspect. Context menu → Re-enable Aspect to restore.</li>
            <li><strong>Group:</strong> Ctrl/Cmd+G. Ungroup: Ctrl/Cmd+Shift+G.</li>
            <li><strong>Duplicate:</strong> Ctrl/Cmd+D.</li>
            <li><strong>Delete:</strong> Delete / Backspace.</li>
            <li><strong>Nudge:</strong> Arrows (1px) or Shift+Arrows (10px).</li>
            <li><strong>Spec JSON:</strong> Open/Close JSON panel, edit, Apply to persist.</li>
          </ul>
        </Modal>
        <div className="grid grid-cols-12 gap-4">
          {/* Left Outline */}
          <div className="col-span-2">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="text-sm font-semibold mb-2">Outline</div>
              <OutlineNode node={spec.body} path="" />
            </div>
          </div>
          {/* Canvas */}
          <div className="col-span-7">
            <Renderer spec={spec} editing={editing} selectedPath={selected?.path} onSelectNode={onSelectNode} />
          </div>
          {/* Inspector */}
          <div className="col-span-3">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="text-sm font-semibold mb-2">Inspector</div>
              {selected ? inspector : <div className="text-xs opacity-70">Select any element to edit its props.</div>}
            </div>
          </div>
        </div>
        {/* JSON Drawer */}
        {jsonOpen && (
          <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">JSON Editor</div>
              <div className="text-xs text-red-400">{jsonError ?? ""}</div>
            </div>
            <textarea
              className="w-full h-64 rounded bg-slate-950 border border-slate-700 p-2 font-mono text-xs"
              value={jsonText}
              onChange={(e) => {
                const t = e.target.value;
                setJsonText(t);
                try {
                  JSON.parse(t);
                  setJsonError(null);
                } catch {
                  setJsonError("Invalid JSON");
                }
              }}
            />
            <div className="mt-2 flex justify-end">
              <button
                className="px-3 py-1 rounded border disabled:opacity-50 border-[--color-brand] bg-[--color-brand] text-white"
                disabled={!!jsonError}
                onClick={() => {
                  try {
                    const next = JSON.parse(jsonText) as RootSpec;
                    setSpec(next);
                    setSelected(undefined);
                  } catch {
                    setJsonError("Invalid JSON");
                  }
                }}
              >Apply</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

