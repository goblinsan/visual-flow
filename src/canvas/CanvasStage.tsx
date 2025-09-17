import { Stage, Layer, Transformer, Rect, Group } from "react-konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import type { LayoutSpec } from "../layout-schema.ts";
import { renderNode } from "./CanvasRenderer.tsx";
import { deleteNodes, duplicateNodes, nudgeNodes, normalizeRect } from "./editing";
import { applyPosition, applyPositionAndSize } from "./stage-internal";
import { findNodeIdsIntersecting } from "./selection";

type CanvasStageProps = {
  spec: LayoutSpec;
  setSpec: (next: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  width?: number;
  height?: number;
};

function CanvasStage({ spec, setSpec, width = 800, height = 600 }: CanvasStageProps) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const trRef = useRef<Konva.Transformer>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);

  const toWorld = useCallback((stage: Konva.Stage, p: { x: number; y: number }) => {
    const s = stage.scaleX();
    return { x: (p.x - stage.x()) / s, y: (p.y - stage.y()) / s };
  }, []);

  const onWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setScale(newScale);
    setPos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  }, []);

  const onMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    if (e.evt.buttons === 1 && e.evt.getModifierState("Space")) { setPanning(true); return; }
    if (e.evt.buttons === 1) {
      const p = stage.getPointerPosition();
      if (!p) return;
      const world = toWorld(stage, p);
      marqueeStart.current = world;
      setMarquee({ x: world.x, y: world.y, w: 0, h: 0 });
    }
  }, [toWorld]);

  const onMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    if (panning) setPanning(false);
    if (marquee && marqueeStart.current) {
      const rect = normalizeRect(marquee);
      const ids = findNodeIdsIntersecting(stage, rect);
      setSelected(ids);
    }
    marqueeStart.current = null;
    setMarquee(null);
  }, [panning, marquee]);

  const onMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    if (panning) { setPos({ x: stage.x() + e.evt.movementX, y: stage.y() + e.evt.movementY }); return; }
    if (marquee && marqueeStart.current) {
      const p = stage.getPointerPosition();
      if (!p) return;
      const world = toWorld(stage, p);
      const s = marqueeStart.current;
      setMarquee({ x: s.x, y: s.y, w: world.x - s.x, h: world.y - s.y });
    }
  }, [panning, marquee, toWorld]);

  const onClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (panning || marquee) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const isEmpty = e.target === stage;
    const shift = e.evt.getModifierState("Shift");
    if (isEmpty) { setSelected([]); return; }
    const node = e.target.findAncestor((n: Konva.Node) => Boolean(n.id()), true);
    const id = node?.id();
    if (!id) return;
    setSelected((prev) => (shift ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id]));
  }, [panning, marquee]);

  const selectedNodes = useMemo(() => selected, [selected]);
  const onTransformRefAttach = useCallback((node: Konva.Transformer | null) => {
    if (!node) return;
    const stage = node.getStage();
    if (!stage) return;
    const targets = selectedNodes
      .map((id) => stage.findOne(`#${CSS.escape(id)}`))
      .filter(Boolean) as Konva.Node[];
    node.nodes(targets);
    node.getLayer()?.batchDraw();
  }, [selectedNodes]);

  const onDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Node & { id(): string };
    const id = node.id?.();
    if (!id) return;
    const { x, y } = node.position();
    setSpec((prev) => applyPosition(prev, id, { x, y }));
  }, [setSpec]);

  const onTransformEnd = useCallback(() => {
    const nodes = trRef.current?.nodes() ?? [];
    nodes.forEach((n) => {
      const id = (n as Konva.Node).id?.();
      if (!id) return;
      const node = n as unknown as Konva.Node & {
        scaleX(): number; scaleY(): number; scaleX(v: number): void; scaleY(v: number): void;
        width?(): number; height?(): number; size?(): { width: number; height: number };
        position(): { x: number; y: number };
      };
      const scaleX = node.scaleX?.() ?? 1;
      const scaleY = node.scaleY?.() ?? 1;
      const size = node.size?.() ?? { width: node.width?.(), height: node.height?.() };
      const width = (size?.width ?? 0) * scaleX;
      const height = (size?.height ?? 0) * scaleY;
      const { x, y } = node.position?.() ?? { x: 0, y: 0 };
      node.scaleX?.(1);
      node.scaleY?.(1);
      setSpec((prev) => applyPositionAndSize(prev, id, { x, y }, { width, height }));
    });
    trRef.current?.getLayer()?.batchDraw();
  }, [setSpec]);

  // Keyboard interactions: Delete to remove, Ctrl/Cmd+D to duplicate, Arrows to nudge (Shift x10)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Avoid interfering with text inputs
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (selected.length === 0) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setSpec((prev) => deleteNodes(prev, new Set(selected)));
        // Clear selection after delete
        setSelected([]);
        return;
      }
      const isDup = (e.key.toLowerCase() === "d" && (e.ctrlKey || e.metaKey));
      if (isDup) {
        e.preventDefault();
        setSpec((prev) => duplicateNodes(prev, new Set(selected)));
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -step; else if (e.key === "ArrowRight") dx = step; else if (e.key === "ArrowUp") dy = -step; else if (e.key === "ArrowDown") dy = step;
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        setSpec((prev) => nudgeNodes(prev, new Set(selected), dx, dy));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, setSpec]);

  return (
    <Stage width={width} height={height} scaleX={scale} scaleY={scale} x={pos.x} y={pos.y}
           onWheel={onWheel} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onClick={onClick}>
      <Layer>
        {marquee ? (
          <Rect x={Math.min(marquee.x, marquee.x + marquee.w)} y={Math.min(marquee.y, marquee.y + marquee.h)}
                width={Math.abs(marquee.w)} height={Math.abs(marquee.h)} fill="rgba(59,130,246,0.1)" stroke="#3b82f6" dash={[4,4]} />
        ) : null}
        <Group onDragEnd={onDragEnd}>
          {renderNode(spec.root)}
        </Group>
        <Transformer ref={trRef as unknown as React.RefObject<Konva.Transformer>} rotateEnabled={true}
                     keepRatio={false} refFn={onTransformRefAttach} onTransformEnd={onTransformEnd} />
      </Layer>
    </Stage>
  );
}

export default CanvasStage;
