import { describe, it, expect } from 'vitest';
import { createDeleteNodesCommand } from './deleteNodes';
import { CommandExecutor } from './executor';
import { createUpdateNodePropsCommand } from './updateNodeProps';

const baseSpec = {
  root: {
    id: 'root',
    children: [
      { id: 'a', type: 'rect', x: 0, y: 0 },
      { id: 'b', type: 'rect', x: 10, y: 0 },
      { id: 'c', type: 'rect', x: 20, y: 0 },
    ]
  }
};

describe('CommandExecutor', () => {
  it('executes a command and records history', () => {
    const exec = new CommandExecutor(baseSpec);
    exec.execute(createUpdateNodePropsCommand({ id: 'a', props: { x: 5 } }));
    expect(exec.spec.root.children[0].x).toBe(5);
    expect(exec.canUndo).toBe(true);
  });

  it('undo / redo cycle works', () => {
    const exec = new CommandExecutor(baseSpec);
    exec.execute(createUpdateNodePropsCommand({ id: 'a', props: { x: 5 } }));
    exec.undo();
    expect(exec.spec.root.children[0].x).toBe(0); // reverted
    expect(exec.canRedo).toBe(true);
    exec.redo();
    expect(exec.spec.root.children[0].x).toBe(5); // reapplied
  });

  it('delete then undo restores nodes in order', () => {
    const exec = new CommandExecutor(baseSpec);
    exec.execute(createDeleteNodesCommand({ ids: ['b'] }));
    expect(exec.spec.root.children.map((n: any) => n.id)).toEqual(['a', 'c']);
    exec.undo();
    expect(exec.spec.root.children.map((n: any) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('capacity truncates oldest history (drops earliest)', () => {
    const exec = new CommandExecutor(baseSpec, { capacity: 2 });
    exec.execute(createUpdateNodePropsCommand({ id: 'a', props: { x: 1 } }));
    exec.execute(createUpdateNodePropsCommand({ id: 'a', props: { x: 2 } }));
    exec.execute(createUpdateNodePropsCommand({ id: 'a', props: { x: 3 } }));
    // Now first action should have been dropped; two undos bring us to x=1? Actually only last two stored -> undo twice -> x=1? Wait truncation removes oldest after pushing third, remaining history has last two (x=2, x=3). Undo twice -> back to initial x=0.
  exec.undo(); // revert x=3 -> x=2
  exec.undo(); // revert x=2 -> x=1 (first action was truncated, so we do not reach 0)
  expect(exec.spec.root.children[0].x).toBe(1);
  exec.undo(); // nothing happens
  expect(exec.spec.root.children[0].x).toBe(1);
  });

  it('ignores no-op commands (no spec change)', () => {
    const exec = new CommandExecutor(baseSpec);
    // update with empty props should be no-op
    exec.execute(createUpdateNodePropsCommand({ id: 'a', props: {} }));
    expect(exec.historySize).toBe(0);
  });
});
