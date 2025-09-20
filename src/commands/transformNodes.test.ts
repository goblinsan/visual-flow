import { describe, it, expect } from 'vitest';
import { createTransformNodesCommand } from './transformNodes';
import type { CommandContext } from './types';
import { cloneSpec } from './types';

function makeSpec() {
  return {
    root: { id: 'root', type: 'frame', children: [
      { id: 'a', type: 'rect', position:{x:0,y:0}, size:{width:50,height:40}, rotation:0 },
      { id: 'b', type: 'text', position:{x:100,y:100}, size:{width:80,height:30}, rotation:0, textScaleX:1, textScaleY:1 },
    ] }
  } as any;
}

function ctx(spec: any): CommandContext { return { spec, selection: [] }; }

describe('TransformNodesCommand', () => {
  it('applies position/size/rotation and inverts', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createTransformNodesCommand({ updates: [
      { id: 'a', position:{x:10,y:5}, size:{width:60,height:55}, rotation: 45 },
      { id: 'b', position:{x:120,y:110}, textScaleX:1.2, textScaleY:0.9 }
    ]});
    const after = cmd.apply(ctx(spec));
  const a = after.root.children.find((c:any)=>c.id==='a') as any;
  expect(a && a.position).toEqual({x:10,y:5});
  expect(a && a.size).toEqual({width:60,height:55});
  expect(a && a.rotation).toBe(45);
  const b = after.root.children.find((c:any)=>c.id==='b') as any;
  expect(b && b.position).toEqual({x:120,y:110});
  expect(b && b.textScaleX).toBe(1.2);
  expect(b && b.textScaleY).toBe(0.9);
    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
  const ar = reverted.root.children.find((c:any)=>c.id==='a') as any;
  expect(ar && ar.position).toEqual({x:0,y:0});
  expect(ar && ar.size).toEqual({width:50,height:40});
  expect(ar && ar.rotation).toBe(0);
  const br = reverted.root.children.find((c:any)=>c.id==='b') as any;
  expect(br && br.position).toEqual({x:100,y:100});
  expect(br && br.textScaleX).toBe(1);
  expect(br && br.textScaleY).toBe(1);
  });

  it('no-ops when updates empty', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createTransformNodesCommand({ updates: [] });
    const after = cmd.apply(ctx(spec));
    expect(after).toBe(spec);
    expect(cmd.invert!(before, after)).toBeNull();
  });
});
