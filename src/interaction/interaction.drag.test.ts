import { describe, it, expect } from 'vitest';
import { beginDrag, updateDrag, finalizeDrag, __test } from './drag';

const originPositions = {
  a: { x: 10, y: 5 },
  b: { x: 30, y: 15 },
};

describe('interaction.drag', () => {
  it('does not pass threshold immediately', () => {
    const s = beginDrag(['a'], { x: 0, y: 0 }, { a: { x: 0, y: 0 } });
    const upd = updateDrag(s, { x: 1, y: 1 });
    expect(upd.passedThreshold).toBe(false);
    expect(upd.moved.length).toBe(0);
  });

  it('passes threshold and moves nodes', () => {
    const s = beginDrag(['a','b'], { x: 0, y: 0 }, originPositions);
    updateDrag(s, { x: 4, y: 0 }); // cross threshold (3)
    const upd = updateDrag(s, { x: 6, y: 2 });
    expect(upd.passedThreshold).toBe(true);
    expect(upd.moved.find(m => m.id === 'a')?.x).toBe(10 + 6);
    expect(upd.moved.find(m => m.id === 'b')?.y).toBe(15 + 2);
  });

  it('finalize returns moved summary only if threshold crossed', () => {
    const s1 = beginDrag(['a'], { x: 0, y: 0 }, { a: { x: 0, y: 0 } });
    updateDrag(s1, { x: 2, y: 0 }); // below threshold
    const f1 = finalizeDrag(s1);
    expect(f1.moved.length).toBe(0);

    const s2 = beginDrag(['a'], { x: 0, y: 0 }, { a: { x: 5, y: 5 } });
    updateDrag(s2, { x: 4, y: 0 }); // cross threshold
    const f2 = finalizeDrag(s2);
    expect(f2.moved.length).toBe(1);
    expect(f2.moved[0].to.x).toBe(9); // 5 + 4
  });

  it('distance helper works (exposed for test determinism)', () => {
    const d = __test.distance({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(d).toBe(5);
  });
});
