import { useCallback, useEffect, useState } from "react";
import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { VisualCanvas } from "./editor/VisualCanvas.tsx";
import { InspectorPanel } from "./editor/InspectorPanel.tsx";
import { Sidebar } from "./editor/Sidebar.tsx";
import type { NodeSpec, RootSpec } from "./dsl";
import { useDesignFiles } from "./useDesignFiles.ts";
import { exportRobloxLua } from "./roblox/export.ts";

export default function EditorApp() {
  const {
    files,
    activeId,
    active,
    selectFile,
    saveActive,
    saveAs,
    createFromSample,
    importFromJsonText,
    exportActiveJson,
  } = useDesignFiles();

  // Local working copy of the active spec
  const [spec, setSpec] = useState<RootSpec | null>(active?.spec ?? null);
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState(true);

  // When active file changes, update working copy
  const activeSpec = active?.spec ?? null;
  useEffect(() => {
    setSpec(activeSpec);
    setSelectedPath(undefined);
  }, [activeSpec]);

  const onSelectNode = useCallback((path: string, _node: NodeSpec) => {
    void _node;
    setSelectedPath(path);
  }, []);

  const onMoveWithinParent = useCallback(
    (parentPath: string, fromIndex: number, toIndex: number) => {
      if (!spec) return;
      const parts = parentPath === "" ? [] : parentPath.split(".").map((p) => parseInt(p, 10));

      type NodeWithChildren = Extract<NodeSpec, { type: "grid" | "stack" | "box" }>;
      const hasChildren = (n: NodeSpec): n is NodeWithChildren =>
        n.type === "grid" || n.type === "stack" || n.type === "box";

      const replaceAt = (node: NodeSpec, remaining: number[]): NodeSpec => {
        if (remaining.length === 0) {
          if (!hasChildren(node)) return node;
          const arr = node.children.slice();
          const [moved] = arr.splice(fromIndex, 1);
          arr.splice(toIndex, 0, moved);
          return { ...(node as NodeWithChildren), children: arr } as NodeSpec;
        }
        if (!hasChildren(node)) return node;
        const [idx, ...rest] = remaining;
        const child = node.children[idx];
        if (child === undefined) return node;
        const newChild = replaceAt(child, rest);
        if (newChild === child) return node;
        const newChildren = node.children.slice();
        newChildren[idx] = newChild;
        return { ...(node as NodeWithChildren), children: newChildren } as NodeSpec;
      };

      const next = { ...spec, body: replaceAt(spec.body, parts) };
      setSpec(next);
    },
    [spec]
  );

  const onDragEnd = (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const getParent = (p: string) => {
      const i = p.lastIndexOf(".");
      return i === -1 ? "" : p.slice(0, i);
    };
    const fromParent = getParent(activeId);
    const toParent = getParent(overId);
    if (fromParent !== toParent) return; // Only within same parent
    const from = parseInt(activeId.split(".").pop()!, 10);
    const to = parseInt(overId.split(".").pop()!, 10);
    if (Number.isFinite(from) && Number.isFinite(to) && from !== to) {
      onMoveWithinParent(fromParent, from, to);
      setSelectedPath(`${toParent}${toParent ? "." : ""}${to}`);
    }
  };

  const onSave = () => {
    if (spec) saveActive(spec);
  };
  const onSaveAs = () => {
    if (!spec) return;
    const name = window.prompt("Save As: Enter a name for this design", "Untitled");
    if (!name) return;
    saveAs(name, spec);
  };
  const onExportRoblox = () => {
    if (!spec) return;
    const lua = exportRobloxLua(spec);
    const blob = new Blob([lua], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${active?.name ?? "design"}.roblox.lua`;
    a.click();
  };

  const onImportJson = async () => {
    const text = window.prompt("Paste design JSON:");
    if (!text) return;
    importFromJsonText(text);
  };

  const onExportJson = () => {
    exportActiveJson();
  };

  return (
    <div className="min-h-screen bg-dark-gradient text-slate-100">
      <div className="w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/70 bg-slate-950/40 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="text-sm opacity-80">visual-flow editor</div>
            <div className="text-xs opacity-60">{active ? active.name : "No file selected"}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800" onClick={() => setEditing((v) => !v)}>{editing ? "Preview" : "Edit"}</button>
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800" onClick={onSave} disabled={!spec || !activeId}>Save</button>
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800" onClick={onSaveAs} disabled={!spec}>Save As</button>
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800" onClick={onExportJson} disabled={!activeId}>Export JSON</button>
            <button className="px-3 py-1 rounded border border-slate-600 bg-slate-800" onClick={onImportJson}>Import JSON</button>
            <button className="px-3 py-1 rounded border border-[--color-brand] bg-[--color-brand] text-white" onClick={onExportRoblox} disabled={!spec}>Export to Roblox</button>
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-[240px_1fr_320px] gap-0 min-h-[calc(100vh-44px)]">
          {/* Sidebar */}
          <div className="border-r border-slate-800/70 bg-slate-950/30 overflow-auto">
            <Sidebar
              files={files}
              activeId={activeId}
              onSelect={selectFile}
              onCreateSample={createFromSample}
            />
          </div>
          {/* Canvas */}
          <div className="overflow-auto">
            {spec ? (
              <DndContext onDragEnd={onDragEnd}>
                <VisualCanvas
                  spec={spec}
                  editing={editing}
                  selectedPath={selectedPath}
                  onSelectNode={onSelectNode}
                />
              </DndContext>
            ) : (
              <div className="h-full grid place-items-center opacity-70">Select or create a design from the sidebar</div>
            )}
          </div>
          {/* Inspector */}
          <div className="border-l border-slate-800/70 bg-slate-950/30 overflow-auto">
            {spec ? (
              <InspectorPanel spec={spec} setSpec={setSpec} selectedPath={selectedPath} />
            ) : (
              <div className="p-3 text-xs opacity-70">No design loaded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
