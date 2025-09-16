import { useMemo, useState } from "react";
import { Renderer } from "../renderer/Renderer";
import type { NodeSpec, RootSpec, GridNode, StackNode, BoxNode } from "../dsl";

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

  return (
    <div className="min-h-screen bg-dark-gradient text-slate-100">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button className={"px-3 py-1 rounded border " + (editing ? "bg-[--color-brand] border-[--color-brand]" : "border-slate-600 bg-slate-800")} onClick={() => setEditing(true)}>Edit</button>
            <button className={"px-3 py-1 rounded border " + (!editing ? "bg-[--color-brand] border-[--color-brand]" : "border-slate-600 bg-slate-800")} onClick={() => setEditing(false)}>Preview</button>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800" onClick={exportJson}>Export JSON</button>
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800" onClick={importJson}>Import JSON</button>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-9">
            <Renderer spec={spec} editing={editing} selectedPath={selected?.path} onSelectNode={onSelectNode} />
          </div>
          <div className="col-span-3">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="text-sm font-semibold mb-2">Inspector</div>
              {selected ? inspector : <div className="text-xs opacity-70">Select any element to edit its props.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
