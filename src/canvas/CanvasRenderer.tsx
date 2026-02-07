import { Group, Rect, Text, Ellipse, Line, Arrow, Shape } from "react-konva";
import { type ReactNode, useEffect, useState } from "react";
import { computeRectVisual } from "../renderer/rectVisual";
import { estimateNodeHeight } from "../renderer/measurement";
import type { LayoutNode, FrameNode, StackNode, TextNode, BoxNode, GridNode, GroupNode, ImageNode, RectNode, EllipseNode, LineNode, CurveNode, DrawNode, PolygonNode } from "../layout-schema.ts";
import { CanvasImage } from "./components/CanvasImage";
import { debugOnce, logger } from "../utils/logger";
import { parseColor } from "../utils/color";
import { getAnchors, computeBezierPath } from "./utils/bezierUtils";

// Font loading cache and callbacks
const loadedFonts = new Set<string>();
const pendingFonts = new Set<string>();
const systemFonts = new Set(['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'system-ui', 'sans-serif', 'serif', 'monospace']);
const fontLoadCallbacks: Array<() => void> = [];

function addFontLoadCallback(cb: () => void): void {
  fontLoadCallbacks.push(cb);
}

function removeFontLoadCallback(cb: () => void): void {
  const idx = fontLoadCallbacks.indexOf(cb);
  if (idx >= 0) fontLoadCallbacks.splice(idx, 1);
}

function notifyFontLoaded(): void {
  fontLoadCallbacks.forEach(cb => cb());
}

/** Hook to trigger re-render when fonts finish loading */
export function useFontLoading(): number {
  const [fontVersion, setFontVersion] = useState(0);
  
  useEffect(() => {
    const callback = () => setFontVersion(v => v + 1);
    addFontLoadCallback(callback);
    return () => removeFontLoadCallback(callback);
  }, []);
  
  return fontVersion;
}

function loadGoogleFont(fontName: string, weight: string = '400'): void {
  if (!fontName || systemFonts.has(fontName)) return;
  // Skip font values that look like font stacks (contain commas)
  if (fontName.includes(',')) return;
  
  const fontKey = `${fontName}:${weight}`;
  if (loadedFonts.has(fontKey) || pendingFonts.has(fontKey)) return;
  
  pendingFonts.add(fontKey);
  
  // Load font via CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap`;
  document.head.appendChild(link);
  
  // Wait for font to be ready
  document.fonts.ready.then(() => {
    // Check if the specific font+weight is now available
    const fontSpec = `${weight} 16px "${fontName}"`;
    document.fonts.load(fontSpec).then(() => {
      loadedFonts.add(fontKey);
      pendingFonts.delete(fontKey);
      notifyFontLoaded();
    });
  });
}

// Helper to compute Konva fontStyle string
function computeFontStyle(fontWeight: string, fontStyle: string, fontFamily: string): string {
  const isItalic = fontStyle === 'italic';
  const isSystemFont = systemFonts.has(fontFamily);
  
  if (isSystemFont) {
    // System fonts only support normal, bold, italic, italic bold
    const isBold = fontWeight === 'bold' || fontWeight === '700' || Number(fontWeight) >= 600;
    if (isItalic && isBold) return 'italic bold';
    if (isItalic) return 'italic';
    if (isBold) return 'bold';
    return 'normal';
  } else {
    // Google Fonts support numeric weights
    const weightStr = fontWeight === 'normal' ? '' : (fontWeight === 'bold' ? 'bold' : fontWeight);
    if (isItalic && weightStr) return `italic ${weightStr}`;
    if (isItalic) return 'italic';
    if (weightStr) return weightStr;
    return 'normal';
  }
}

// Measure text width using canvas 2D context
function measureTextWidth(text: string, fontSize: number, fontFamily: string, fontWeight: string, fontStyle: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * fontSize * 0.6; // fallback estimate
  
  const weight = fontWeight === 'bold' ? 'bold' : (fontWeight === 'normal' ? 'normal' : fontWeight);
  const style = fontStyle === 'italic' ? 'italic' : 'normal';
  ctx.font = `${style} ${weight} ${fontSize}px "${fontFamily}"`;
  return ctx.measureText(text).width;
}

// Text - supports both plain text and rich text spans
function renderText(n: TextNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const scaleX = n.textScaleX ?? 1;
  const scaleY = n.textScaleY ?? 1;
  
  // Determine default font size from variant
  const defaultFontSize = n.variant === "h1" ? 28 : n.variant === "h2" ? 22 : n.variant === "h3" ? 18 : n.variant === "caption" ? 12 : 14;
  const baseFontSize = n.fontSize ?? defaultFontSize;
  const baseFontFamily = n.fontFamily || 'Arial';
  const baseFontWeight = n.fontWeight ?? (n.variant === 'h1' || n.variant === 'h2' ? 'bold' : 'normal');
  const baseFontStyle = n.fontStyle ?? 'normal';
  const baseColor = n.color ?? "#0f172a";
  
  // If no spans, render as simple text
  if (!n.spans || n.spans.length === 0) {
    // Ensure font is loaded for Google Fonts
    if (baseFontFamily && !systemFonts.has(baseFontFamily)) {
      const numericWeight = baseFontWeight === 'bold' ? '700' : (baseFontWeight === 'normal' ? '400' : baseFontWeight);
      loadGoogleFont(baseFontFamily, numericWeight);
    }
    
    const fontStyleValue = computeFontStyle(baseFontWeight, baseFontStyle, baseFontFamily);
    
    return (
      <Text
        key={n.id}
        id={n.id}
        name={`node ${n.type}`}
        x={x}
        y={y}
        rotation={n.rotation ?? 0}
        text={n.text}
        fontSize={baseFontSize}
        fontFamily={baseFontFamily}
        fontStyle={fontStyleValue}
        fill={baseColor}
        opacity={n.opacity ?? 1}
        align={n.align ?? "left"}
        scaleX={scaleX}
        scaleY={scaleY}
      />
    );
  }
  
  // Rich text: render each span as a separate Text element
  // We need to position each span inline by measuring previous spans
  let offsetX = 0;
  
  // Load fonts for all spans
  n.spans.forEach(span => {
    const fontFamily = span.fontFamily || baseFontFamily;
    const fontWeight = span.fontWeight || baseFontWeight;
    if (fontFamily && !systemFonts.has(fontFamily)) {
      const numericWeight = fontWeight === 'bold' ? '700' : (fontWeight === 'normal' ? '400' : fontWeight);
      loadGoogleFont(fontFamily, numericWeight);
    }
  });
  
  return (
    <Group
      key={n.id}
      id={n.id}
      name={`node ${n.type}`}
      x={x}
      y={y}
      rotation={n.rotation ?? 0}
      scaleX={scaleX}
      scaleY={scaleY}
      opacity={n.opacity ?? 1}
    >
      {n.spans.map((span, idx) => {
        const fontFamily = span.fontFamily || baseFontFamily;
        const fontSize = span.fontSize || baseFontSize;
        const fontWeight = span.fontWeight || baseFontWeight;
        const fontStyle = span.fontStyle || baseFontStyle;
        const color = span.color || baseColor;
        const fontStyleValue = computeFontStyle(fontWeight, fontStyle, fontFamily);
        
        const currentOffsetX = offsetX;
        // Measure this span's width and advance offsetX for the next span
        offsetX += measureTextWidth(span.text, fontSize, fontFamily, fontWeight, fontStyle);
        
        return (
          <Text
            key={`${n.id}-span-${idx}`}
            x={currentOffsetX}
            y={0}
            text={span.text}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fontStyle={fontStyleValue}
            fill={color}
          />
        );
      })}
    </Group>
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

// Line shape (straight line, or arrow if start/end arrows are enabled)
function renderLine(n: LineNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const hasArrow = n.startArrow === true || n.endArrow === true;
  
  // Calculate arrow dimensions
  const pointerLength = (n.arrowSize ?? 1) * 10;
  const pointerWidth = (n.arrowSize ?? 1) * 8;
  
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      {hasArrow ? (
        <Arrow
          points={n.points}
          stroke={n.stroke ?? "#334155"}
          strokeWidth={n.strokeWidth ?? 2}
          dash={n.strokeDash}
          lineCap={n.lineCap ?? "round"}
          fill={n.stroke ?? "#334155"}
          pointerAtBeginning={n.startArrow === true}
          pointerAtEnding={n.endArrow === true}
          pointerLength={pointerLength}
          pointerWidth={pointerWidth}
          hitStrokeWidth={Math.max(20, (n.strokeWidth ?? 2) + 18)}
        />
      ) : (
        <Line
          points={n.points}
          stroke={n.stroke ?? "#334155"}
          strokeWidth={n.strokeWidth ?? 2}
          dash={n.strokeDash}
          lineCap={n.lineCap ?? "round"}
          hitStrokeWidth={Math.max(20, (n.strokeWidth ?? 2) + 18)}
        />
      )}
    </Group>
  );
}

/**
 * Compute control points for a tension-based cardinal spline (open path).
 * Replicates Konva's internal _expandPoints() so we can draw the exact same
 * open curve path in a custom sceneFunc and then close it with a straight line
 * for fill purposes — avoiding the closed-spline wrap-around that distorts the shape.
 */
function expandOpenSpline(points: number[], tension: number): number[] {
  const result: number[] = [];
  const len = points.length;
  for (let n = 2; n < len - 2; n += 2) {
    const x0 = points[n - 2], y0 = points[n - 1];
    const x1 = points[n],     y1 = points[n + 1];
    const x2 = points[n + 2], y2 = points[n + 3];
    const d01 = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
    const d12 = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const denom = d01 + d12;
    if (denom === 0) continue;
    const fa = (tension * d01) / denom;
    const fb = (tension * d12) / denom;
    result.push(
      x1 - fa * (x2 - x0), y1 - fa * (y2 - y0),  // before-control
      x1, y1,                                      // anchor point
      x1 + fb * (x2 - x0), y1 + fb * (y2 - y0)   // after-control
    );
  }
  return result;
}

/**
 * Draw the open curve path on a Canvas2D context, matching Konva's open Line
 * rendering exactly (quadratic end segments + cubic bezier middle segments).
 */
function traceOpenCurvePath(
  ctx: { beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void; bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void },
  pts: number[],
  tensionVal: number,
  isBezier: boolean
): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);

  if (isBezier) {
    // Cubic bezier: control points are baked into the array as groups of 6
    for (let i = 2; i < pts.length; i += 6) {
      ctx.bezierCurveTo(pts[i], pts[i+1], pts[i+2], pts[i+3], pts[i+4], pts[i+5]);
    }
  } else if (tensionVal !== 0 && pts.length > 4) {
    // Cardinal spline — expand to control points then draw
    const tp = expandOpenSpline(pts, tensionVal);
    const tpLen = tp.length;
    // First segment: quadratic from first anchor to first interior point
    ctx.quadraticCurveTo(tp[0], tp[1], tp[2], tp[3]);
    // Middle segments: cubic bezier between interior points
    for (let i = 4; i < tpLen - 2; i += 6) {
      ctx.bezierCurveTo(tp[i], tp[i+1], tp[i+2], tp[i+3], tp[i+4], tp[i+5]);
    }
    // Last segment: quadratic from last interior point to last anchor
    ctx.quadraticCurveTo(tp[tpLen - 2], tp[tpLen - 1], pts[pts.length - 2], pts[pts.length - 1]);
  } else {
    // Simple line segments
    for (let i = 2; i < pts.length; i += 2) {
      ctx.lineTo(pts[i], pts[i + 1]);
    }
  }
}

// Curve shape (bezier/spline)
function renderCurve(n: CurveNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const closed = n.closed ?? false;

  // If handles exist, render as cubic Bezier. Otherwise use tension-based spline.
  const hasHandles = n.handles && n.handles.length > 0;
  let renderPoints: number[];
  let useBezier: boolean;

  if (hasHandles) {
    const anchors = getAnchors(n.points);
    renderPoints = computeBezierPath(anchors, n.handles!);
    useBezier = true;
  } else {
    renderPoints = n.points;
    useBezier = false;
  }

  // Determine fill (supports gradient)
  let fillProps: any = {};
  if (n.fill !== undefined || n.fillGradient !== undefined) {
    if (n.fillGradient) {
      const colorStops: number[] = [];
      n.fillGradient.colors.forEach((color, index) => {
        const position = index / (n.fillGradient!.colors.length - 1);
        const rgba = parseColor(color);
        if (rgba) {
          colorStops.push(position, rgba.r / 255, rgba.g / 255, rgba.b / 255);
        }
      });

      if (n.fillGradient.type === 'linear') {
        const xs = renderPoints.filter((_, i) => i % 2 === 0);
        const ys = renderPoints.filter((_, i) => i % 2 === 1);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const angle = (n.fillGradient.angle ?? 0) * (Math.PI / 180);
        const dx = Math.cos(angle) * (maxX - minX);
        const dy = Math.sin(angle) * (maxY - minY);
        fillProps = {
          fillLinearGradientStartPoint: { x: minX, y: minY },
          fillLinearGradientEndPoint: { x: minX + dx, y: minY + dy },
          fillLinearGradientColorStops: colorStops,
        };
      } else {
        const xs = renderPoints.filter((_, i) => i % 2 === 0);
        const ys = renderPoints.filter((_, i) => i % 2 === 1);
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
        const radius = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
        fillProps = {
          fillRadialGradientStartPoint: { x: centerX, y: centerY },
          fillRadialGradientEndPoint: { x: centerX, y: centerY },
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndRadius: radius,
          fillRadialGradientColorStops: colorStops,
        };
      }
    } else {
      fillProps = { fill: n.fill };
    }
  }

  const hasFill = Object.keys(fillProps).length > 0;
  const tensionVal = useBezier ? 0 : (n.tension ?? 0.5);

  // For open curves with fill, render two layers:
  // 1. A Shape using sceneFunc that traces the exact open curve path, then
  //    closePath() (straight line back to start) so the fill hugs the curve.
  //    Using <Line closed={true}> would use a *closed* spline interpolation
  //    that wraps around the endpoints and distorts the fill boundary.
  // 2. A normal open <Line> for the stroke.
  // For closed curves or no fill, a single <Line> suffices.
  const needsSplitRender = hasFill && !closed;

  /* Captured for the sceneFunc closure */
  const _fillPoints = renderPoints;
  const _fillTension = tensionVal;
  const _fillBezier = useBezier;

  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      {needsSplitRender ? (
        <>
          {/* Fill layer: traces exact open path then closes with straight line */}
          <Shape
            sceneFunc={(ctx, shape) => {
              traceOpenCurvePath(ctx, _fillPoints, _fillTension, _fillBezier);
              ctx.closePath();
              ctx.fillShape(shape);
            }}
            {...fillProps}
            listening={false}
          />
          {/* Stroke layer: open path so stroke doesn't show closing segment */}
          <Line
            points={renderPoints}
            closed={false}
            stroke={n.stroke}
            strokeWidth={n.strokeWidth ?? 2}
            dash={n.strokeDash}
            lineCap={n.lineCap ?? "round"}
            tension={tensionVal}
            bezier={useBezier}
            listening={true}
            hitStrokeWidth={20}
          />
        </>
      ) : (
        <Line
          points={renderPoints}
          closed={closed}
          {...fillProps}
          stroke={n.stroke}
          strokeWidth={n.strokeWidth ?? 2}
          dash={n.strokeDash}
          lineCap={n.lineCap ?? "round"}
          tension={tensionVal}
          bezier={useBezier}
          listening={true}
          hitStrokeWidth={20}
        />
      )}
    </Group>
  );
}

// Draw/freehand shape (captured mouse path)
function renderDraw(n: DrawNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;

  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      <Line
        points={n.points}
        stroke={n.stroke}
        strokeWidth={n.strokeWidth ?? 2}
        dash={n.strokeDash}
        lineCap={n.lineCap ?? "round"}
        lineJoin={n.lineJoin ?? "round"}
        tension={n.tension ?? 0.5}
        listening={true}
        hitStrokeWidth={20}
      />
    </Group>
  );
}

// Polygon shape (multi-point closed/open shape)
function renderPolygon(n: PolygonNode) {
  const x = n.position?.x ?? 0;
  const y = n.position?.y ?? 0;
  const closed = n.closed ?? true;
  
  // Determine fill and stroke status
  const hasFill = n.fill !== undefined || n.fillGradient !== undefined;
  const hasStroke = n.stroke !== undefined;
  
  // Handle gradient fills
  let gradientProps: any = {};
  if (n.fillGradient) {
    const colorStops: number[] = [];
    n.fillGradient.colors.forEach((color, index) => {
      const position = index / (n.fillGradient!.colors.length - 1);
      const rgba = parseColor(color);
      if (rgba) {
        colorStops.push(position, rgba.r / 255, rgba.g / 255, rgba.b / 255);
      }
    });
    
    if (n.fillGradient.type === 'linear') {
      // Calculate bounding box for gradient positioning
      const xs = n.points.filter((_, i) => i % 2 === 0);
      const ys = n.points.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      const angle = n.fillGradient.angle ?? 0;
      const rad = (angle * Math.PI) / 180;
      const len = Math.max(maxX - minX, maxY - minY);
      
      gradientProps = {
        fillLinearGradientStartPoint: {
          x: centerX - Math.cos(rad) * len / 2,
          y: centerY - Math.sin(rad) * len / 2,
        },
        fillLinearGradientEndPoint: {
          x: centerX + Math.cos(rad) * len / 2,
          y: centerY + Math.sin(rad) * len / 2,
        },
        fillLinearGradientColorStops: colorStops,
      };
    }
  }
  
  return (
    <Group key={n.id} id={n.id} name={`node ${n.type}`} x={x} y={y} rotation={n.rotation ?? 0} opacity={n.opacity ?? 1}>
      <Line
        points={n.points}
        closed={closed}
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

export function renderNode(n: LayoutNode): ReactNode {
  debugOnce('renderNode:'+n.id, n.id, n.type);
  switch (n.type) {
    case "text": return renderText(n);
    case "box": return renderBox(n);
    case "stack": return renderStack(n);
    case "frame": return renderFrame(n);
    case "grid": return renderGrid(n);
    case "group": return renderGroup(n);
    case "image": return renderImage(n);
    case "rect": return renderRect(n);
    case "ellipse": return renderEllipse(n);
    case "line": return renderLine(n);
    case "curve": return renderCurve(n);
    case "draw": return renderDraw(n);
    case "polygon": return renderPolygon(n);
    default:
      logger.warn('Unknown node type', n);
      return null;
  }
}

export default renderNode;
