import { Group, Rect, Text } from "react-konva";
import { type ReactNode } from "react";
import type { LayoutNode, FrameNode, StackNode, TextNode, BoxNode, GridNode, GroupNode, ImageNode } from "../layout-schema.ts";
import { CanvasImage } from "./components/CanvasImage";

// Text
function renderText(n: TextNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  return (
    <Text
      key={n.id}
      id={n.id}
      name={`node ${n.type}`}
      x={x}
      y={y}
      text={n.text}
      fontSize={n.variant === "h1" ? 28 : n.variant === "h2" ? 22 : n.variant === "h3" ? 18 : 14}
      fill={n.color ?? "#0f172a"}
      opacity={n.opacity ?? 1}
      align={n.align ?? "left"}
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
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} opacity={n.opacity ?? 1} draggable>
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

// Basic measurements (temporary)
function approxTextHeight(n: TextNode): number {
  const fs = n.variant === "h1" ? 28 : n.variant === "h2" ? 22 : n.variant === "h3" ? 18 : 14;
  return fs + 8;
}

function getApproxHeight(n: LayoutNode): number {
  switch (n.type) {
    case "text": return approxTextHeight(n);
    case "image": return n.size?.height ?? 100;
    case "box": return n.size?.height ?? 120;
    case "frame": return n.size.height;
    case "stack":
      return (n as StackNode).children.reduce(
        (h: number, c: LayoutNode) => h + getApproxHeight(c) + ((n as StackNode).gap ?? 0),
        0
      );
    case "grid": return (n as GridNode).children.length > 0 ? 200 : 100;
    case "group": return (n as GroupNode).children.length > 0 ? 200 : 100;
    default: return 100;
  }
}

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
      cursorY += getApproxHeight(child) + gap;
    }
    return node;
  });
  return <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} opacity={n.opacity ?? 1} draggable>{items}</Group>;
}

// Frame
function renderFrame(n: FrameNode) {
  const { size, background, padding } = n;
  const pad = typeof padding === "number" ? padding : padding ? padding.t : 0;
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={n.position?.x ?? 0} y={n.position?.y ?? 0} opacity={n.opacity ?? 1} draggable>
      <Rect width={size.width} height={size.height} fill={background ?? "#ffffff"} />
      <Group x={pad} y={pad}>{n.children.map(renderNode)}</Group>
    </Group>
  );
}

// Group
function renderGroup(n: GroupNode) {
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} opacity={n.opacity ?? 1} draggable>
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
    const childH = getApproxHeight(child);
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
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} opacity={n.opacity ?? 1} draggable>
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
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} opacity={n.opacity ?? 1} draggable>
      <CanvasImage src={n.src} width={w} height={h} objectFit={n.objectFit} radius={n.radius}
      />
    </Group>
  );
}

export function renderNode(n: LayoutNode): ReactNode {
  switch (n.type) {
    case "text": return renderText(n);
    case "box": return renderBox(n);
    case "stack": return renderStack(n as StackNode);
    case "frame": return renderFrame(n as FrameNode);
    case "grid": return renderGrid(n as GridNode);
    case "group": return renderGroup(n as GroupNode);
    case "image": return renderImage(n as ImageNode);
    default:
      return null;
  }
}

export default renderNode;
