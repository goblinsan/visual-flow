export type SvgTool = 'select' | 'rect' | 'circle' | 'ellipse' | 'line' | 'freehand' | 'text' | 'pen';

export interface SvgBaseElement {
  id: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface SvgRectElement extends SvgBaseElement {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export interface SvgCircleElement extends SvgBaseElement {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface SvgEllipseElement extends SvgBaseElement {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface SvgLineElement extends SvgBaseElement {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SvgPathElement extends SvgBaseElement {
  type: 'path';
  d: string;
}

export interface SvgTextElement extends SvgBaseElement {
  type: 'text';
  x: number;
  y: number;
  content: string;
  fontSize: number;
  fontFamily: string;
}

export interface SvgImageElement extends SvgBaseElement {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  href: string;
}

export type SvgElement =
  | SvgRectElement
  | SvgCircleElement
  | SvgEllipseElement
  | SvgLineElement
  | SvgPathElement
  | SvgTextElement
  | SvgImageElement;
