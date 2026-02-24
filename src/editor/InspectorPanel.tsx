import { useMemo } from "react";
import type { RootSpec, NodeSpec, GridNode, StackNode, BoxNode, TextNode } from "../dsl.ts";
import type { DesignMode } from "../roblox/ChooseModeModal";

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

/**
 * Snap a spacing value to the nearest integer DSL unit.
 * In Roblox mode all UDim offsets must be whole units (1 unit = 4 px).
 * (#144 drag/resize constraints, #145 spacing controls)
 */
function snapToIntegerUnit(value: number): number {
  return Math.round(value);
}

/**
 * UDim hint shown in Roblox mode alongside spacing inputs (#145).
 * Displays the pixel equivalent: 1 DSL unit = 4 px → UDim.new(0, px).
 */
function UDimHint({ units }: { units: number }) {
  const px = units * 4;
  return (
    <span className="text-[10px] text-[--color-brand]/70 ml-1">= UDim.new(0, {px})</span>
  );
}

export function InspectorPanel({
  spec,
  setSpec,
  selectedPath,
  mode,
}: {
  spec: RootSpec;
  setSpec: (s: RootSpec) => void;
  selectedPath?: string;
  mode?: DesignMode;
}) {
  const isRoblox = mode === "roblox";

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

    /** Spacing number input with optional UDim2 hint (#144, #145) */
    const SpacingInput = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
      <label className="block text-sm">{label}{isRoblox && <UDimHint units={value} />}
        <input
          type="number"
          min={0}
          max={isRoblox ? 32 : 12}
          step={1}
          className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1"
          value={value}
          onChange={(e) => {
            const raw = Number(e.target.value);
            onChange(isRoblox ? snapToIntegerUnit(raw) : raw);
          }}
        />
        {isRoblox && <span className="text-[10px] text-slate-500">Snaps to integer units (1 unit = 4 px)</span>}
      </label>
    );

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
          <SpacingInput label="Gap" value={g.gap ?? 0} onChange={(v) => update({ gap: v })} />
          <SpacingInput label="Padding" value={g.padding ?? 0} onChange={(v) => update({ padding: v })} />
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
          <SpacingInput label="Gap" value={s.gap ?? 0} onChange={(v) => update({ gap: v })} />
          <SpacingInput label="Padding" value={s.padding ?? 0} onChange={(v) => update({ padding: v })} />
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
          <SpacingInput label="Padding" value={b.padding ?? 0} onChange={(v) => update({ padding: v })} />
          <SpacingInput label="Gap" value={b.gap ?? 0} onChange={(v) => update({ gap: v })} />
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
          <label className="block text-sm">Value (0–100)
            <input type="number" min={0} max={100} className="mt-1 w-full rounded bg-slate-800 border border-slate-700 p-1" value={node.value ?? 0} onChange={(e) => update({ value: Math.max(0, Math.min(100, Number(e.target.value))) })} />
            {isRoblox && <span className="text-[10px] text-[--color-brand]/70">= UDim2 X scale {((node.value ?? 0) / 100).toFixed(2)}</span>}
          </label>
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
  // SpacingInput is defined inside the memo callback to close over `isRoblox`;
  // adding it to deps would recreate it on every render unnecessarily.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, selectedPath, setSpec, isRoblox]);

  return (
    <div className="p-3">
      <div className="text-sm font-semibold mb-2 flex items-center gap-2">
        Inspector
        {isRoblox && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[--color-brand]/20 text-[--color-brand]">Roblox</span>}
      </div>
      {selectedPath ? inspector : <div className="text-xs opacity-70">Select any element to edit its props.</div>}
    </div>
  );
}
