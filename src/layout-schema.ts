// Unified layout schema (formerly V2)

export type NodeType =
  | "frame"
  | "stack"
  | "grid"
  | "text"
  | "image"
  | "box"
  | "group";

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
  text: string;
  variant?: "h1" | "h2" | "h3" | "body" | "caption";
  color?: string;        // CSS color
  align?: "left" | "center" | "right";
}

/** Image leaf node. */
export interface ImageNode extends BaseNode, Partial<AbsoluteChild> {
  type: "image";
  src: string;
  alt?: string;
  radius?: number;       // px
  objectFit?: "cover" | "contain";
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

export type LayoutNode =
  | FrameNode
  | GroupNode
  | StackNode
  | GridNode
  | TextNode
  | ImageNode
  | BoxNode;

export interface LayoutSpec {
  root: FrameNode;
}
