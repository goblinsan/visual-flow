import type { LayoutSpec } from '../layout-schema';

/**
 * CommandContext provided at execution time (can be expanded later with services, history, etc.).
 */
export interface CommandContext {
  spec: LayoutSpec; // current spec prior to apply
  selection: string[]; // current selection state (pre-command)
}

/** Generic mutation command interface */
export interface Command {
  id: string; // stable identifier (e.g. 'update-node-props')
  description?: string;
  /** Apply the command, returning the next spec */
  apply(ctx: CommandContext): LayoutSpec;
  /** Optional: produce an inverse command using pre/post snapshots */
  invert?(before: LayoutSpec, after: LayoutSpec): Command | null;
}

/** Helper: deep clone spec (cheap for now; can optimize later) */
export function cloneSpec(spec: LayoutSpec): LayoutSpec {
  return JSON.parse(JSON.stringify(spec));
}

/** Utility: find node by id (returns ref in structure) */
export function findNode(root: any, id: string): any | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (Array.isArray(root.children)) {
    for (const c of root.children) {
      const f = findNode(c, id);
      if (f) return f;
    }
  }
  return null;
}

/** Map node producing new tree (immutably) */
export function mapNode(root: any, id: string, fn: (n: any) => any): any {
  if (root.id === id) return fn(root);
  if (Array.isArray(root.children)) {
    const children = root.children.map((c: any) => mapNode(c, id, fn));
    return { ...root, children };
  }
  return root;
}
