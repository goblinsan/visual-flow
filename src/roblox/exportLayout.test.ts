import { describe, it, expect } from "vitest";
import { exportLayoutToRobloxLua } from "./exportLayout";
import type { LayoutSpec } from "../layout-schema";

function blankSpec(children: LayoutSpec["root"]["children"] = []): LayoutSpec {
  return {
    root: { id: "root", type: "frame", size: { width: 1920, height: 1080 }, children },
  };
}

describe("exportLayoutToRobloxLua", () => {
  it("produces a LocalScript header with ScreenGui and RootFrame", () => {
    const lua = exportLayoutToRobloxLua(blankSpec());
    expect(lua).toContain('Instance.new("ScreenGui")');
    expect(lua).toContain('Instance.new("Frame")');
    expect(lua).toContain("RootFrame.Parent = ScreenGui");
    expect(lua).toContain("StarterPlayerScripts");
  });

  it("maps a rect child to Frame with position and size", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "bg", type: "rect", position: { x: 10, y: 20 }, size: { width: 200, height: 100 }, fill: "#ff0000" },
    ]));
    expect(lua).toContain('Instance.new("Frame")');
    expect(lua).toContain("UDim2.new(0, 200, 0, 100)");
    expect(lua).toContain("UDim2.new(0, 10, 0, 20)");
    expect(lua).toContain("Color3.fromRGB(255, 0, 0)");
  });

  it("maps a text node to TextLabel", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "lbl", type: "text", text: "Hello Roblox", position: { x: 0, y: 0 }, size: { width: 200, height: 30 }, color: "#ffffff" },
    ]));
    expect(lua).toContain('Instance.new("TextLabel")');
    expect(lua).toContain('Text = "Hello Roblox"');
    expect(lua).toContain("Color3.fromRGB(255, 255, 255)");
  });

  it("uses GothamBold for heading variants", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "h1", type: "text", text: "Title", variant: "h1", position: { x: 0, y: 0 }, size: { width: 300, height: 40 } },
    ]));
    expect(lua).toContain("Enum.Font.GothamBold");
  });

  it("maps an image node to ImageLabel", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "img", type: "image", src: "rbxassetid://12345", position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
    ]));
    expect(lua).toContain('Instance.new("ImageLabel")');
    expect(lua).toContain('"rbxassetid://12345"');
    expect(lua).toContain("Enum.ScaleType.Fit");
  });

  it("maps a rect with radius to Frame + UICorner", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "r", type: "rect", position: { x: 0, y: 0 }, size: { width: 100, height: 50 }, radius: 8, fill: "#333333" },
    ]));
    expect(lua).toContain('Instance.new("UICorner")');
    expect(lua).toContain("UDim.new(0, 8)");
  });

  it("maps an ellipse to Frame with UICorner 0.5 scale", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "circle", type: "ellipse", position: { x: 0, y: 0 }, size: { width: 50, height: 50 }, fill: "#0000ff" },
    ]));
    expect(lua).toContain('Instance.new("UICorner")');
    expect(lua).toContain("UDim.new(0.5, 0)");
  });

  it("maps a stack node to Frame + UIListLayout", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "st", type: "stack", direction: "column", gap: 8, position: { x: 0, y: 0 }, size: { width: 400, height: 200 }, children: [] },
    ]));
    expect(lua).toContain('Instance.new("UIListLayout")');
    expect(lua).toContain("Enum.FillDirection.Vertical");
    expect(lua).toContain("UDim.new(0, 8)");
  });

  it("maps a grid node to Frame + UIGridLayout", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "g", type: "grid", columns: 3, gap: 4, position: { x: 0, y: 0 }, size: { width: 300, height: 200 }, children: [] },
    ]));
    expect(lua).toContain('Instance.new("UIGridLayout")');
    expect(lua).toContain("CellSize");
  });

  it("skips unsupported node types silently", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "ln", type: "line", points: [0, 0, 100, 100] } as LayoutSpec["root"]["children"][0],
    ]));
    // Should not throw and should still have the header
    expect(lua).toContain("ScreenGui");
  });

  it("escapes double quotes in text content", () => {
    const lua = exportLayoutToRobloxLua(blankSpec([
      { id: "t", type: "text", text: 'Say "hello"', position: { x: 0, y: 0 }, size: { width: 200, height: 30 } },
    ]));
    expect(lua).toContain('Say \\"hello\\"');
  });
});
