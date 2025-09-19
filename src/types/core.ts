/**
 * Core domain types introduced during Lint Phase 1.
 * These replace scattered `any` usages in canvas + layout code.
 */

// Basic branded identifiers
export type NodeId = string & { readonly __brand: unique symbol };

// Geometry primitives
export interface Vec2 { x: number; y: number }
export interface Size { width: number; height: number }
export interface Rect extends Vec2, Size {}

// Simplified node type (rect + group subset for now)
export interface BaseNode {
  id: string; // not yet using NodeId to avoid wide churn
  type: string; // future union: 'rect' | 'group' | ...
  position?: Vec2;
  size?: Size;
  children?: DesignNode[]; // present when group-like
}

export type DesignNode = BaseNode; // Placeholder for future discriminated union

export interface SelectionState {
  selectedIds: string[];
}

export interface PointerState extends Vec2 {
  modifiers?: {
    shift?: boolean;
    meta?: boolean;
    alt?: boolean;
    ctrl?: boolean;
  };
}

export interface DragSession {
  originPointer: PointerState;
  lastPointer: PointerState;
  targetIds: string[];
}

// Utility narrow helpers
export function isGroupNode(n: DesignNode): boolean {
  return Array.isArray(n.children);
}
