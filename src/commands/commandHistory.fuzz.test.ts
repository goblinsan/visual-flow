import { describe, it, expect } from 'vitest';
import { CommandExecutor } from './executor';
import { createInsertRectCommand } from './insertRect';
import { createTransformNodesCommand } from './transformNodes';
import { createGroupNodesCommand } from './groupNodes';
import { createUngroupNodeCommand } from './ungroupNode';
import { createDuplicateNodesCommand } from './duplicateNodes';
import { createDeleteNodesCommand } from './deleteNodes';
import { createUpdateNodePropsCommand } from './updateNodeProps';
import { expectSpecInvariant } from '../utils/specInvariant';
import { rng } from '../utils/seededRng';
import type { LayoutSpec } from '../layout-schema';

function baseSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 1000, height: 800 },
      children: []
    }
  };
}

// Helper: collect all node ids except root
function collectIds(spec: LayoutSpec): string[] {
  const ids: string[] = [];
  function walk(n: any) { if (n.id !== 'root') ids.push(n.id); if (Array.isArray(n.children)) n.children.forEach(walk); }
  walk(spec.root);
  return ids;
}

describe('command history fuzz', () => {
  it('random operation sequences preserve invariants and undo/redo round trips', () => {
    const seed = Date.now().toString();
    const R = rng(seed);
    const spec0 = baseSpec();
    const exec = new CommandExecutor(spec0, {});
    const operations: string[] = [];

    const OP_COUNT = 120; // moderate length

    for (let step = 0; step < OP_COUNT; step++) {
      const choice = R.int(7); // 7 op families
      const current = exec.spec;
      const ids = collectIds(current);
      let applied = false;
      try {
        switch (choice) {
          case 0: {
            // insert rect
            const id = `r_${step}_${R.int(1e6)}`;
            exec.execute(createInsertRectCommand({
              parentId: 'root',
              id,
              position: { x: R.int(900), y: R.int(700) },
              size: { width: 20 + R.int(180), height: 20 + R.int(180) },
              fill: R.bool() ? '#ff0000' : undefined,
            }));
            operations.push(`insert:${id}`);
            applied = true;
            break;
          }
          case 1: {
            if (ids.length) {
              // transform a random node
              const target = R.pick(ids);
              exec.execute(createTransformNodesCommand({ updates: [{ id: target, position: { x: R.int(900), y: R.int(700) } }] }));
              operations.push(`transform:${target}`);
              applied = true;
            }
            break;
          }
          case 2: {
            // group two or more random siblings (approx by picking subset of ids) - we rely on command to validate
            if (ids.length >= 2) {
              const shuffled = ids.slice().sort(() => R.next() - 0.5);
              const groupPick = shuffled.slice(0, 1 + R.int(Math.min(5, shuffled.length))); // 2..5
              if (groupPick.length >= 2) {
                exec.execute(createGroupNodesCommand({ ids: groupPick }));
                operations.push(`group:${groupPick.join(',')}`);
                applied = true;
              }
            }
            break;
          }
          case 3: {
            // ungroup: pick a group id
            const groupIds: string[] = [];
            function walk(n: any) { if (n.id !== 'root' && n.type === 'group') groupIds.push(n.id); if (Array.isArray(n.children)) n.children.forEach(walk); }
            walk(current.root);
            if (groupIds.length) {
              const g = R.pick(groupIds);
              exec.execute(createUngroupNodeCommand({ id: g }));
              operations.push(`ungroup:${g}`);
              applied = true;
            }
            break;
          }
          case 4: {
            // duplicate random node
            if (ids.length) {
              const target = R.pick(ids);
              exec.execute(createDuplicateNodesCommand({ ids: [target] }));
              operations.push(`duplicate:${target}`);
              applied = true;
            }
            break;
          }
          case 5: {
            // delete random subset
            if (ids.length) {
              const subset = ids.filter(() => R.bool(0.2)).slice(0, 5); // up to 5
              if (subset.length) {
                exec.execute(createDeleteNodesCommand({ ids: subset }));
                operations.push(`delete:${subset.join(',')}`);
                applied = true;
              }
            }
            break;
          }
          case 6: {
            // update node props (opacity or rotation) if any nodes
            if (ids.length) {
              const target = R.pick(ids);
              const patch: any = {};
              if (R.bool()) patch.opacity = Number((R.next()).toFixed(2));
              if (R.bool()) patch.rotation = R.int(360);
              if (Object.keys(patch).length) {
                exec.execute(createUpdateNodePropsCommand({ id: target, props: patch }));
                operations.push(`update:${target}`);
                applied = true;
              }
            }
            break;
          }
        }
      } catch (e) {
        // Swallow to allow continuing; we'll assert invariants below
        operations.push(`error:${(e as Error).message}`);
      }

      // Invariants after each successful apply
      if (applied) {
        try {
          expectSpecInvariant(exec.spec);
        } catch (invErr) {
          throw new Error(`Invariant failed after step ${step} op=${operations[operations.length-1]} seed=${seed}\n` + (invErr as Error).message);
        }
      }
    }

    // Undo all
    const snapshotAfter = JSON.stringify(exec.spec);
  const undoCount = exec.historySize;
    for (let i=0; i<undoCount; i++) exec.undo();
    expectSpecInvariant(exec.spec);
    expect(JSON.stringify(exec.spec)).toEqual(JSON.stringify(spec0));

    // Redo all
    for (let i=0; i<undoCount; i++) exec.redo();
    expectSpecInvariant(exec.spec);
    expect(JSON.stringify(exec.spec)).toEqual(snapshotAfter);
  }, 20_000); // generous timeout
});
