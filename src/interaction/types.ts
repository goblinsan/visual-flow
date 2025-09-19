/**
 * Interaction shared types (Milestone 1)
 */

export interface Point { x: number; y: number }
export interface NodeBounds { id: string; x: number; y: number; width: number; height: number }

export interface DragSession {
  start: Point;
  last: Point;
  nodeIds: string[];
  originPositions: Record<string, Point>; // nodeId -> original top-left
  passedThreshold: boolean;
}

export interface DragUpdate {
  dx: number;
  dy: number;
  moved: { id: string; x: number; y: number }[]; // new tentative positions (not yet committed)
  passedThreshold: boolean;
}

export interface DragFinalize {
  totalDx: number;
  totalDy: number;
  moved: { id: string; from: Point; to: Point }[]; // commit summary
}

export interface MarqueeRect { x: number; y: number; width: number; height: number }
