import { Group, Rect, Text, Ellipse, Line, Path } from "react-konva";
import { type ReactNode } from "react";
import { computeRectVisual } from "../renderer/rectVisual";
import { estimateNodeHeight } from "../renderer/measurement";
import type { LayoutNode, FrameNode, StackNode, TextNode, BoxNode, GridNode, GroupNode, ImageNode, RectNode, EllipseNode, LineNode, CurveNode } from "../layout-schema.ts";
import { CanvasImage } from "./components/CanvasImage";
import { debugOnce, logger } from "../utils/logger";

// Text
function renderText(n: TextNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const scaleX = n.textScaleX ?? 1;
  const scaleY = n.textScaleY ?? 1;
  
  // Determine font size: use explicit fontSize if set, otherwise derive from variant
  const defaultFontSize = n.variant === "h1" ? 28 : n.variant === "h2" ? 22 : n.variant === "h3" ? 18 : n.variant === "caption" ? 12 : 14;
  const fontSize = n.fontSize ?? defaultFontSize;
  
  // Build font style string for Konva
  const fontStyle = n.fontStyle === 'italic' ? 'italic' : 'normal';
  const fontWeight = n.fontWeight ?? (n.variant === 'h1' || n.variant === 'h2' ? 'bold' : 'normal');
  
  return (
    <Text
      key={n.id}
      id={n.id}
      name={`node ${n.type}`}
      x={x}
      y={y}
      rotation={n.rotation ?? 0}
      text={n.text}
      fontSize={fontSize}
      fontFamily={n.fontFamily || 'Arial'}
      fontStyle={fontStyle}
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
        fillLinearGradientStartPoint={v.fillLinearGradientStartPoint}
        fillLinearGradientEndPoint={v.fillLinearGradientEndPoint}
        fillLinearGradientColorStops={v.fillLinearGradientColorStops}
        fillRadialGradientStartPoint={v.fillRadialGradientStartPoint}
        fillRadialGradientEndPoint={v.fillRadialGradientEndPoint}
        fillRadialGradientStartRadius={v.fillRadialGradientStartRadius}
        fillRadialGradientEndRadius={v.fillRadialGradientEndRadius}
        fillRadialGradientColorStops={v.fillRadialGradientColorStops}
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
      {background && <Rect width={size.width} height={size.height} fill={background} stroke={'#e2e8f0'} listening={false} />}
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

// Ellipse shape
function renderEllipse(n: EllipseNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const w = n.size?.width ?? 100;
  const h = n.size?.height ?? 100;
  // Konva Ellipse is centered, so we offset to match top-left positioning
  const radiusX = w / 2;
  const radiusY = h / 2;
  const hasFill = n.fill !== undefined || n.fillGradient !== undefined;
  const hasStroke = n.stroke !== undefined;
  
  // Compute gradient properties if gradient is defined
  let gradientProps: Record<string, unknown> = {};
  if (n.fillGradient) {
    const { type, colors, angle = 0 } = n.fillGradient;
    const colorStops: (string | number)[] = [];
    colors.forEach((color, index) => {
      const offset = index / (colors.length - 1 || 1);
      colorStops.push(offset, color);
    });
    
    if (type === 'linear') {
      // Convert angle to start/end points
      const rad = (angle * Math.PI) / 180;
      const len = Math.max(w, h);
      gradientProps = {
        fillLinearGradientStartPoint: {
          x: radiusX - Math.cos(rad) * len / 2,
          y: radiusY - Math.sin(rad) * len / 2,
        },
        fillLinearGradientEndPoint: {
          x: radiusX + Math.cos(rad) * len / 2,
          y: radiusY + Math.sin(rad) * len / 2,
        },
        fillLinearGradientColorStops: colorStops,
      };
    } else {
      gradientProps = {
        fillRadialGradientStartPoint: { x: radiusX, y: radiusY },
        fillRadialGradientEndPoint: { x: radiusX, y: radiusY },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: Math.max(radiusX, radiusY),
        fillRadialGradientColorStops: colorStops,
      };
    }
  }
  
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      <Ellipse
        x={radiusX}
        y={radiusY}
        radiusX={radiusX}
        radiusY={radiusY}
        fill={n.fillGradient ? undefined : (n.fill ?? "#ffffff")}
        fillEnabled={hasFill}
        stroke={n.stroke ?? "#334155"}
        strokeEnabled={hasStroke || !hasFill}
        strokeWidth={n.strokeWidth ?? 1}
        dash={n.strokeDash}
        {...gradientProps}
      />
    </Group>
  );
}

// Line shape (straight line)
function renderLine(n: LineNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      <Line
        points={n.points}
        stroke={n.stroke ?? "#334155"}
        strokeWidth={n.strokeWidth ?? 2}
        dash={n.strokeDash}
        lineCap={n.lineCap ?? "round"}
      />
    </Group>
  );
}

// Curve shape (bezier/spline)
function renderCurve(n: CurveNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      <Line
        points={n.points}
        stroke={n.stroke ?? "#334155"}
        strokeWidth={n.strokeWidth ?? 2}
        dash={n.strokeDash}
        lineCap={n.lineCap ?? "round"}
        tension={n.tension ?? 0.5}
        bezier={n.tension === undefined || n.tension === 0}
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
    case "ellipse": return renderEllipse(n as EllipseNode);
    case "line": return renderLine(n as LineNode);
    case "curve": return renderCurve(n as CurveNode);
    default:
      logger.warn('Unknown node type', (n as any).type, n);
      return null;
  }
}

export default renderNode;
