import { useMemo } from "react";
import type { RootSpec, NodeSpec, GridNode, StackNode, BoxNode, TextNode } from "../dsl.ts";

type NodeWithChildren = Extract<NodeSpec, { type: "grid" | "stack" | "box" }>;
const hasChildren = (node: NodeSpec): node is NodeWithChildren => node.type === "grid" || node.type === "stack" || node.type === "box";

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

export function InspectorPanel({ spec, setSpec, selectedPath }: { spec: RootSpec; setSpec: (s: RootSpec) => void; selectedPath?: string }) {
  const inspector = useMemo(() => {
    if (!selectedPath) return null;
    const node = getNodeAtPath(spec.body, selectedPath);
    if (!node) return null;

    const update = (patch: Partial<NodeSpec>) => {
      const body = setNodeAtPath(spec.body, selectedPath, (n) => {
        const merged = { ...(n as unknown as Record<string, unknown>), ...(patch as unknown as Record<string, unknown>) } as NodeSpec;
        return merged;
      });
      setSpec({ ...spec, body });
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
  }, [spec, selectedPath, setSpec]);

  return (
    <div className="p-3">
      <div className="text-sm font-semibold mb-2">Inspector</div>
      {selectedPath ? inspector : <div className="text-xs opacity-70">Select any element to edit its props.</div>}
    </div>
  );
}
