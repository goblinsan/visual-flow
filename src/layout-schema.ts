// Unified layout schema (formerly V2)

export type NodeType =
  | "frame"
  | "stack"
  | "grid"
  | "text"
  | "image"
  | "box"
  | "rect"
  | "group"
  | "ellipse"
  | "line"
  | "curve";

export interface BaseNode {
  id: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  rotation?: number; // degrees
  opacity?: number;  // 0..1
  zIndex?: number;
}

export interface Pos {
  x: number; // px in parent coordinates
  y: number; // px in parent coordinates
}

export interface Size {
  width: number;  // px
  height: number; // px
}

export interface Constraints {
  horizontal: "left" | "right" | "center" | "left-right" | "scale";
  vertical:   "top"  | "bottom" | "center" | "top-bottom" | "scale";
}

/** Common absolute-positioning fields for nodes placed inside frames/groups. */
export interface AbsoluteChild {
  position: Pos;         // top-left origin within parent
  size: Size;            // explicit pixel size
  constraints?: Constraints;
}

export interface FrameNode extends BaseNode {
  type: "frame";
  position?: Pos;        // if this frame itself is placed in a parent frame/group
  size: Size;
  padding?: number | { t: number; r: number; b: number; l: number };
  background?: string;   // CSS color
  children: LayoutNode[]; // children are absolute by default (unless stack/grid)
}

export interface GroupNode extends BaseNode, Partial<AbsoluteChild> {
  type: "group";
  children: LayoutNode[]; // bounding box is union(children)
}

/** Flow layout container using flex (for convenience within frames). */
export interface StackNode extends BaseNode, Partial<AbsoluteChild> {
  type: "stack";
  direction?: "row" | "column";
  gap?: number;          // px
  padding?: number;      // px
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between";
  children: LayoutNode[];
}

/** Flow layout container using CSS grid. */
export interface GridNode extends BaseNode, Partial<AbsoluteChild> {
  type: "grid";
  columns: number;
  gap?: number;          // px
  padding?: number;      // px
  children: (LayoutNode & { columnSpan?: number })[];
}

/** Text leaf node. */
export interface TextNode extends BaseNode, Partial<AbsoluteChild> {
  type: "text";
  text: string;          // Plain text (fallback/legacy)
  spans?: TextSpan[];    // Rich text spans - if present, takes precedence over text
  variant?: "h1" | "h2" | "h3" | "body" | "caption";
  color?: string;        // CSS color (default for all spans)
  align?: "left" | "center" | "right";
  fontFamily?: string;   // Font family name (default for all spans)
  fontSize?: number;     // Font size in pixels (default for all spans)
  fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
  fontStyle?: "normal" | "italic";
  /** Persistent horizontal glyph scale (1 = original). */
  textScaleX?: number;
  /** Persistent vertical glyph scale (1 = original). */
  textScaleY?: number;
}

/** Image leaf node. */
export interface ImageNode extends BaseNode, Partial<AbsoluteChild> {
  type: "image";
  src: string;
  alt?: string;
  radius?: number;       // px
  objectFit?: "cover" | "contain";
  /** If false, allow stretched (non-uniform) rendering ignoring objectFit scaling */
  preserveAspect?: boolean;
}

/** Generic box/container that can optionally hold children. */
export interface BoxNode extends BaseNode, Partial<AbsoluteChild> {
  type: "box";
  radius?: number;       // px
  background?: string;   // CSS color
  border?: string;       // e.g., "1px solid #e5e7eb"
  padding?: number;      // px
  children?: LayoutNode[];
}

/** Individual text span with optional formatting (for rich text). */
export interface TextSpan {
  text: string;
  color?: string;        // override color for this span
  fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
  fontStyle?: "normal" | "italic";
  fontFamily?: string;   // override font family
  fontSize?: number;     // override font size
}

/** Gradient fill definition */
export interface GradientFill {
  type: 'linear' | 'radial';
  colors: string[];        // array of color stops
  angle?: number;          // angle in degrees for linear gradient (default 0 = left to right)
  // For radial: could add centerX, centerY, radius in future
}

/** Simple rectangle shape node (no children). */
export interface RectNode extends BaseNode, Partial<AbsoluteChild> {
  type: "rect";
  fill?: string;           // CSS fill color (solid)
  fillGradient?: GradientFill; // gradient fill (overrides fill if set)
  stroke?: string;         // CSS stroke color
  strokeWidth?: number;    // px
  radius?: number;         // corner radius px
  strokeDash?: number[];   // dash pattern e.g., [4,4]
}

/** Ellipse/circle shape node. */
export interface EllipseNode extends BaseNode, Partial<AbsoluteChild> {
  type: "ellipse";
  fill?: string;           // CSS fill color (solid)
  fillGradient?: GradientFill; // gradient fill (overrides fill if set)
  stroke?: string;         // CSS stroke color
  strokeWidth?: number;    // px
  strokeDash?: number[];   // dash pattern e.g., [4,4]
}

/** Line shape node (straight line between two points). */
export interface LineNode extends BaseNode {
  type: "line";
  points: [number, number, number, number]; // [x1, y1, x2, y2] relative to position
  position?: Pos;        // offset for the line group
  stroke?: string;       // CSS stroke color
  strokeWidth?: number;  // px
  strokeDash?: number[]; // dash pattern
  lineCap?: "butt" | "round" | "square";
}

/** Curve/bezier shape node (quadratic or cubic bezier). */
export interface CurveNode extends BaseNode {
  type: "curve";
  points: number[];      // [x1, y1, cx1, cy1, (cx2, cy2,) x2, y2] for quadratic/cubic
  position?: Pos;        // offset for the curve group
  stroke?: string;       // CSS stroke color
  strokeWidth?: number;  // px
  strokeDash?: number[]; // dash pattern
  lineCap?: "butt" | "round" | "square";
  tension?: number;      // spline tension (0-1)
}

export type LayoutNode =
  | FrameNode
  | GroupNode
  | StackNode
  | GridNode
  | TextNode
  | ImageNode
  | BoxNode
  | RectNode
  | EllipseNode
  | LineNode
  | CurveNode;

export interface LayoutSpec {
  root: FrameNode;
}
