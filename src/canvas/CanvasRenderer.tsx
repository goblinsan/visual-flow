import { Group, Rect, Text } from "react-konva";
import { type ReactNode } from "react";
import { computeRectVisual } from "../renderer/rectVisual";
import { estimateNodeHeight } from "../renderer/measurement";
import type { LayoutNode, FrameNode, StackNode, TextNode, BoxNode, GridNode, GroupNode, ImageNode, RectNode } from "../layout-schema.ts";
import { CanvasImage } from "./components/CanvasImage";
import { debugOnce, logger } from "../utils/logger";

// Text
function renderText(n: TextNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const scaleX = n.textScaleX ?? 1;
  const scaleY = n.textScaleY ?? 1;
  return (
    <Text
      key={n.id}
      id={n.id}
      name={`node ${n.type}`}
      x={x}
      y={y}
      rotation={n.rotation ?? 0}
      text={n.text}
      fontSize={n.variant === "h1" ? 28 : n.variant === "h2" ? 22 : n.variant === "h3" ? 18 : 14}
      fill={n.color ?? "#0f172a"}
      opacity={n.opacity ?? 1}
      align={n.align ?? "left"}
      scaleX={scaleX}
      scaleY={scaleY}
    />
  );
}

// Box
function renderBox(n: BoxNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const w = n.size?.width ?? 200;
  const h = n.size?.height ?? 120;
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      <Rect
        width={w}
        height={h}
        fill={n.background ?? "#ffffff"}
        stroke={n.border ? n.border.split(" ").at(-1) : "#94a3b8"}
        cornerRadius={n.radius ?? 8}
        shadowBlur={4}
      />
      {n.children?.map(renderNode)}
    </Group>
  );
}

// Rect (shape)
function renderRect(n: RectNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const v = computeRectVisual(n);
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      <Rect
        width={v.width}
        height={v.height}
        fill={v.fill}
        fillEnabled={v.fillEnabled}
        stroke={v.stroke}
        strokeEnabled={v.strokeEnabled}
        strokeWidth={v.strokeWidth}
        opacity={v.opacity}
        dash={v.dash}
        cornerRadius={v.cornerRadius}
      />
    </Group>
  );
}

// Basic measurements (temporary)
// measurement logic extracted to measurement.ts

// Stack: add direction support
function renderStack(n: StackNode) {
  const direction = n.direction ?? "column";
  const gap = n.gap ?? 0;
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  let cursorX = 0;
  let cursorY = 0;
  const items = n.children.map((child: LayoutNode) => {
    const node = (
      <Group key={child.id} x={cursorX} y={cursorY}>
        {renderNode(child)}
      </Group>
    );
    if (direction === "row") {
      // best-effort width for flow layout
      const w = ("size" in child && child.size ? child.size.width : 100);
      cursorX += w;
      cursorX += gap;
    } else {
  cursorY += estimateNodeHeight(child) + gap;
    }
    return node;
  });
  return <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>{items}</Group>;
}

// Frame
function renderFrame(n: FrameNode) {
  const { size, padding, background } = n;
  const pad = typeof padding === "number" ? padding : padding ? padding.t : 0;
  const draggable = false; // root / frames currently static
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={n.position?.x ?? 0} y={n.position?.y ?? 0} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1} draggable={draggable}>
      <Rect width={size.width} height={size.height} fill={background ?? '#ffffff'} stroke={background ? '#e2e8f0' : undefined} listening={false} />
      <Group x={pad} y={pad}>{n.children.map(renderNode)}</Group>
    </Group>
  );
}

// Group
function renderGroup(n: GroupNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      {n.children.map(renderNode)}
    </Group>
  );
}

// Grid (basic)
function renderGrid(n: GridNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const pad = n.padding ?? 0;
  const gap = n.gap ?? 0;
  const cols = Math.max(1, n.columns);
  const width = n.size?.width ?? 600;
  const innerWidth = Math.max(0, width - pad * 2 - gap * (cols - 1));
  const baseCellWidth = innerWidth / cols;

  let col = 0;
  let rowY = 0;
  let rowMaxH = 0;
  const items: ReactNode[] = [];

  for (const child of n.children) {
    const span = Math.min(cols, (child as { columnSpan?: number }).columnSpan ?? 1);
    if (col + span > cols && col !== 0) {
      rowY += rowMaxH + gap;
      rowMaxH = 0;
      col = 0;
    }
    const cellX = pad + col * (baseCellWidth + gap);
  const childH = estimateNodeHeight(child);
    rowMaxH = Math.max(rowMaxH, childH);
    items.push(
      <Group key={child.id} x={cellX} y={rowY}>
        {renderNode(child)}
      </Group>
    );
    col += span;
    if (col >= cols) {
      rowY += rowMaxH + gap;
      rowMaxH = 0;
      col = 0;
    }
  }

  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      {n.size ? <Rect width={n.size.width} height={n.size.height} fillEnabled={false} /> : null}
      <Group x={0} y={0}>{items}</Group>
    </Group>
  );
}

// Image with objectFit support handled inside CanvasImage via props
function renderImage(n: ImageNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const w = n.size?.width ?? 100;
  const h = n.size?.height ?? 100;
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      <CanvasImage
        src={n.src}
        width={w}
        height={h}
        objectFit={n.objectFit}
        radius={n.radius}
        preserveAspect={n.preserveAspect}
      />
    </Group>
  );
}

export function renderNode(n: LayoutNode): ReactNode {
  debugOnce('renderNode:'+n.id, n.id, n.type);
  switch (n.type) {
    case "text": return renderText(n);
    case "box": return renderBox(n);
    case "stack": return renderStack(n as StackNode);
    case "frame": return renderFrame(n as FrameNode);
    case "grid": return renderGrid(n as GridNode);
    case "group": return renderGroup(n as GroupNode);
    case "image": return renderImage(n as ImageNode);
  case "rect": return renderRect(n as RectNode);
    default:
      logger.warn('Unknown node type', (n as any).type, n);
      return null;
  }
}

export default renderNode;
