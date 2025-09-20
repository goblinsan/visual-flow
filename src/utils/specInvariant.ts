import type { LayoutSpec, LayoutNode } from '../layout-schema';

export interface InvariantIssue {
  code: string;      // machine readable code e.g. NODE_DUPLICATE_ID
  message: string;   // human readable
  path?: string;     // simple path of node ids to locate problem
  nodeId?: string;   // primary node id involved
  extra?: any;       // optional structured details
}

export interface InvariantResult {
  ok: boolean;
  issues: InvariantIssue[];
}

/** Public API: validate a spec and return list of issues (never throws). */
export function checkSpec(spec: LayoutSpec): InvariantResult {
  const issues: InvariantIssue[] = [];
  if (!spec || !spec.root) {
    issues.push({ code: 'ROOT_MISSING', message: 'Spec missing root frame' });
    return { ok: false, issues };
  }
  if (spec.root.type !== 'frame') {
    issues.push({ code: 'ROOT_NOT_FRAME', message: 'Root must be a frame', nodeId: spec.root.id });
  }

  const seenIds = new Set<string>();
  const parentOf = new Map<string, string | null>();

  function pushIssue(issue: InvariantIssue) { issues.push(issue); }

  function visit(node: LayoutNode, parent: LayoutNode | null, path: string[]) {
    // unique id
    if (seenIds.has(node.id)) {
      pushIssue({ code: 'NODE_DUPLICATE_ID', message: `Duplicate id ${node.id}`, nodeId: node.id, path: path.join('/') });
    } else {
      seenIds.add(node.id);
    }
    parentOf.set(node.id, parent ? parent.id : null);

    // size validity (where size is present)
    const size: any = (node as any).size;
    if (size) {
      if (!(Number.isFinite(size.width) && size.width >= 0)) {
        pushIssue({ code: 'SIZE_WIDTH_INVALID', message: `Invalid width for ${node.id}`, nodeId: node.id });
      }
      if (!(Number.isFinite(size.height) && size.height >= 0)) {
        pushIssue({ code: 'SIZE_HEIGHT_INVALID', message: `Invalid height for ${node.id}`, nodeId: node.id });
      }
    }

    // position validity
    const pos: any = (node as any).position;
    if (pos) {
      if (!(Number.isFinite(pos.x))) pushIssue({ code: 'POS_X_NAN', message: `Invalid x for ${node.id}`, nodeId: node.id });
      if (!(Number.isFinite(pos.y))) pushIssue({ code: 'POS_Y_NAN', message: `Invalid y for ${node.id}`, nodeId: node.id });
    }

    // container specific checks
    if ('children' in node && Array.isArray((node as any).children)) {
      const children = (node as any).children as LayoutNode[];
      // group bounds sanity: groups should not define their own size (size may exist but should be consistent with union - deferred)
      if (node.type === 'group') {
        // placeholder: later we can recompute union and compare
      }
  children.forEach((c) => visit(c, node, path.concat(`${c.id}`)));
    }
  }

  visit(spec.root, null, [spec.root.id]);

  // parent mapping sanity: no cycles (simple detection using ancestors set)
  function detectCycles() {
    const visited = new Set<string>();
    const stack = new Set<string>();

    function dfs(id: string) {
      if (stack.has(id)) {
        pushIssue({ code: 'CYCLE', message: `Cycle detected at ${id}`, nodeId: id });
        return;
      }
      if (visited.has(id)) return;
      visited.add(id);
      stack.add(id);
      for (const [child, parent] of parentOf.entries()) {
        if (parent === id) dfs(child);
      }
      stack.delete(id);
    }
    dfs(spec.root.id);
  }
  detectCycles();

  return { ok: issues.length === 0, issues };
}

// Convenience assert helper for tests
export function expectSpecInvariant(spec: LayoutSpec) {
  const res = checkSpec(spec);
  if (!res.ok) {
    const msgs = res.issues.map(i => `${i.code}:${i.nodeId ?? ''}:${i.message}`).join('\n');
    throw new Error(`Spec invariant violations (count=${res.issues.length})\n${msgs}`);
  }
}

// Future extensions (S1 scope):
// - Validate group bounding box matches union
// - Validate selection ids exist
// - Validate zIndex ordering if used
// - Validate no overlapping IDs after duplicate
