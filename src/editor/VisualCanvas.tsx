import { useMemo, type JSX } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Renderer } from "../renderer/Renderer.tsx";
import type { NodeSpec, RootSpec } from "../dsl.ts";

export function VisualCanvas({
  spec,
  editing,
  selectedPath,
  onSelectNode,
}: {
  spec: RootSpec;
  editing: boolean;
  selectedPath?: string;
  onSelectNode?: (path: string, node: NodeSpec) => void;
}) {
  // Provide a child wrapper that makes each child both draggable and droppable by its path
  const wrapChild = useMemo(() => {
    return (path: string, element: JSX.Element) => {
      if (!editing) return element;
      return <DraggableDroppable key={`wrap-${path}`} id={path} selected={selectedPath === path}>{element}</DraggableDroppable>;
    };
  }, [editing, selectedPath]);

  return (
    <div className="p-4">
      <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3 min-h-[600px]">
        <Renderer spec={spec} editing={editing} selectedPath={selectedPath} onSelectNode={onSelectNode} wrapChild={wrapChild} />
      </div>
    </div>
  );
}

function DraggableDroppable({ id, children, selected }: { id: string; children: React.ReactNode; selected?: boolean }) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id });

  return (
    <div ref={setDropRef} className={"relative"}>
      <div
        ref={setDragRef}
        {...attributes}
        {...listeners}
        className={
          (selected ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") +
          (isOver ? " ring-1 ring-[--color-brand]" : "") +
          (isDragging ? " opacity-60" : "")
        }
      >
        {children}
      </div>
    </div>
  );
}
