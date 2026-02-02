import { describe, it, expect } from "vitest";
import type { LayoutSpec, LayoutNode, GroupNode } from "../layout-schema";
import { deleteNodes, duplicateNodes, nudgeNodes, normalizeRect, rectsIntersect } from "./editing";

function mkSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 800, height: 600 },
      children: [
        { id: "a", type: "box", position: { x: 10, y: 10 }, size: { width: 100, height: 50 } },
        { id: "b", type: "text", position: { x: 20, y: 70 }, size: { width: 100, height: 20 }, text: "Hello" },
        { id: "group", type: "group", children: [
          { id: "c", type: "image", position: { x: 100, y: 120 }, size: { width: 64, height: 64 }, src: "x.png" }
        ]}
      ]
    }
  } as LayoutSpec;
}

describe("CanvasStage helpers", () => {
  it("normalizeRect returns normalized dims", () => {
    const r = normalizeRect({ x: 10, y: 10, w: -5, h: 20 });
    expect(r).toEqual({ x: 5, y: 10, width: 5, height: 20 });
  });

  it("rectsIntersect detects overlaps", () => {
    expect(rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 9, width: 10, height: 10 })).toBe(true);
    expect(rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 11, y: 11, width: 10, height: 10 })).toBe(false);
  });

  it("deleteNodes removes matching ids recursively", () => {
    const spec = mkSpec();
    const next = deleteNodes(spec, new Set(["a", "c"]));
    const kids = next.root.children;
  expect(kids.find(k => k.id === "a")).toBeUndefined();
  const group = kids.find(k => k.id === "group") as GroupNode;
  expect(group.children.find((k) => k.id === "c")).toBeUndefined();
  });

  it("duplicateNodes clones nodes with new ids and offset", () => {
    const spec = mkSpec();
    const next = duplicateNodes(spec, new Set(["b"]));
    const kids = next.root.children;
  const copies = kids.filter(k => k.id.startsWith("b-copy"));
  expect(copies.length).toBe(1);
    const origB = (spec.root.children.find(k => k.id === "b") as LayoutNode & { position: { x: number; y: number } }).position;
  const copyPos = (copies[0] as LayoutNode & { position: { x: number; y: number } }).position;
  expect(copyPos.x).toBe(origB.x + 16);
  });

  it("nudgeNodes adjusts positions by dx/dy", () => {
    const spec = mkSpec();
    const next = nudgeNodes(spec, new Set(["a", "c"]), 3, -2);
    const kids = next.root.children;
  const aPos = (kids.find(k => k.id === "a") as LayoutNode & { position: { x: number; y: number } }).position;
  expect(aPos).toEqual({ x: 13, y: 8 });
  const group = kids.find(k => k.id === "group") as GroupNode;
  const cPos = (group.children.find(k => k.id === "c") as LayoutNode & { position: { x: number; y: number } }).position;
  expect(cPos).toEqual({ x: 103, y: 118 });
  });
});
