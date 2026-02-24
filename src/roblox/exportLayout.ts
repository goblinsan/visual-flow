/**
 * exportLayoutToRobloxLua
 *
 * Converts a CanvasApp LayoutSpec (absolute-positioned nodes) into a Roblox
 * LocalScript using Instance.new() calls.
 *
 * Mapping:
 *   FrameNode / BoxNode → Frame (+ optional UICorner)
 *   RectNode            → Frame (fill, radius)
 *   EllipseNode         → Frame (+ UICorner radius=0.5 scale)
 *   StackNode           → Frame + UIListLayout
 *   GridNode            → Frame + UIGridLayout
 *   TextNode            → TextLabel
 *   ImageNode           → ImageLabel
 *   GroupNode           → Frame (transparent, no background)
 *   Other shapes        → skipped (line/curve/draw/polygon not representable)
 */

import type {
  LayoutSpec,
  LayoutNode,
  FrameNode,
  StackNode as LSStackNode,
  GridNode as LSGridNode,
  TextNode as LSTextNode,
  ImageNode as LSImageNode,
  RectNode,
  EllipseNode,
  BoxNode,
  GroupNode,
} from "../layout-schema";

let _counter = 0;
function nextVar(prefix: string): string {
  _counter += 1;
  return `${prefix}_${_counter}`;
}

/** Convert a CSS hex/rgb color to Roblox Color3.fromRGB() call. */
function cssColorToRoblox(color: string | undefined): string | null {
  if (!color || color === "transparent" || color === "none") return null;
  // Hex 3/4/6/8 digit
  const hex6 = color.match(/^#([0-9a-f]{6})$/i);
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    return `Color3.fromRGB(${r}, ${g}, ${b})`;
  }
  const hex3 = color.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const r = parseInt(hex3[1][0] + hex3[1][0], 16);
    const g = parseInt(hex3[1][1] + hex3[1][1], 16);
    const b = parseInt(hex3[1][2] + hex3[1][2], 16);
    return `Color3.fromRGB(${r}, ${g}, ${b})`;
  }
  // rgb(r,g,b)
  const rgb = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgb) {
    return `Color3.fromRGB(${rgb[1]}, ${rgb[2]}, ${rgb[3]})`;
  }
  return null;
}

/** Get absolute position from a node. */
function pos(node: LayoutNode): { x: number; y: number } {
  const p = (node as { position?: { x?: number; y?: number } }).position;
  return { x: p?.x ?? 0, y: p?.y ?? 0 };
}

/** Get size from a node. */
function size(node: LayoutNode): { width: number; height: number } {
  const s = (node as { size?: { width?: number; height?: number } }).size;
  return { width: s?.width ?? 100, height: s?.height ?? 40 };
}

function emitChildren(children: LayoutNode[] | undefined, parentVar: string, lines: string[]): void {
  if (!children) return;
  for (const child of children) {
    nodeToLua(child, parentVar, lines);
  }
}

function nodeToLua(node: LayoutNode, parent: string, lines: string[]): void {
  const { x, y } = pos(node);
  const { width, height } = size(node);

  switch (node.type) {
    case "frame": {
      const n = node as FrameNode;
      const v = nextVar("Frame");
      lines.push(`local ${v} = Instance.new("Frame")`);
      lines.push(`${v}.Name = "${n.id}"`);
      const bg = cssColorToRoblox(n.background);
      if (bg) {
        lines.push(`${v}.BackgroundColor3 = ${bg}`);
      } else {
        lines.push(`${v}.BackgroundTransparency = 1`);
      }
      lines.push(`${v}.Size = UDim2.new(0, ${width}, 0, ${height})`);
      if (x !== 0 || y !== 0) {
        lines.push(`${v}.Position = UDim2.new(0, ${x}, 0, ${y})`);
      }
      lines.push(`${v}.Parent = ${parent}`);
      emitChildren(n.children, v, lines);
      break;
    }

    case "rect": {
      const n = node as RectNode;
      const v = nextVar("Frame");
      lines.push(`local ${v} = Instance.new("Frame")`);
      lines.push(`${v}.Name = "${n.id}"`);
      const bg = cssColorToRoblox(n.fill);
      if (bg) {
        lines.push(`${v}.BackgroundColor3 = ${bg}`);
      } else {
        lines.push(`${v}.BackgroundTransparency = 1`);
      }
      lines.push(`${v}.BorderSizePixel = 0`);
      lines.push(`${v}.Size = UDim2.new(0, ${width}, 0, ${height})`);
      lines.push(`${v}.Position = UDim2.new(0, ${x}, 0, ${y})`);
      lines.push(`${v}.Parent = ${parent}`);
      if (n.radius && n.radius > 0) {
        const vc = nextVar("UICorner");
        lines.push(`local ${vc} = Instance.new("UICorner")`);
        lines.push(`${vc}.CornerRadius = UDim.new(0, ${Math.round(n.radius)})`);
        lines.push(`${vc}.Parent = ${v}`);
      }
      if (n.stroke && n.strokeWidth && n.strokeWidth > 0) {
        const vs = nextVar("UIStroke");
        const strokeColor = cssColorToRoblox(n.stroke);
        lines.push(`local ${vs} = Instance.new("UIStroke")`);
        lines.push(`${vs}.Thickness = ${n.strokeWidth}`);
        if (strokeColor) lines.push(`${vs}.Color = ${strokeColor}`);
        lines.push(`${vs}.Parent = ${v}`);
      }
      break;
    }

    case "ellipse": {
      const n = node as EllipseNode;
      const v = nextVar("Frame");
      lines.push(`local ${v} = Instance.new("Frame")`);
      lines.push(`${v}.Name = "${n.id}"`);
      const bg = cssColorToRoblox(n.fill);
      if (bg) {
        lines.push(`${v}.BackgroundColor3 = ${bg}`);
      } else {
        lines.push(`${v}.BackgroundTransparency = 1`);
      }
      lines.push(`${v}.BorderSizePixel = 0`);
      lines.push(`${v}.Size = UDim2.new(0, ${width}, 0, ${height})`);
      lines.push(`${v}.Position = UDim2.new(0, ${x}, 0, ${y})`);
      lines.push(`${v}.Parent = ${parent}`);
      const vc = nextVar("UICorner");
      lines.push(`local ${vc} = Instance.new("UICorner")`);
      lines.push(`${vc}.CornerRadius = UDim.new(0.5, 0)`);
      lines.push(`${vc}.Parent = ${v}`);
      break;
    }

    case "text": {
      const n = node as LSTextNode;
      const v = nextVar("TextLabel");
      const text = n.text ?? "";
      const color = cssColorToRoblox(n.color) ?? "Color3.fromRGB(255, 255, 255)";
      const fontSizeMap: Record<string, number> = { h1: 36, h2: 28, h3: 22, body: 16, caption: 12 };
      const fontSize = n.fontSize ?? fontSizeMap[n.variant ?? "body"] ?? 16;
      const isBold = n.fontWeight === "bold" || n.fontWeight === "700" || n.fontWeight === "800" || n.fontWeight === "900";
      const isHeading = n.variant === "h1" || n.variant === "h2" || n.variant === "h3";
      const font = (isBold || isHeading) ? "GothamBold" : "Gotham";
      const alignMap: Record<string, string> = { left: "Left", center: "Center", right: "Right" };
      const textAlign = alignMap[n.align ?? "left"] ?? "Left";
      lines.push(`local ${v} = Instance.new("TextLabel")`);
      lines.push(`${v}.Name = "${n.id}"`);
      lines.push(`${v}.Text = "${text.replace(/"/g, '\\"')}"`);
      lines.push(`${v}.TextColor3 = ${color}`);
      lines.push(`${v}.TextSize = ${fontSize}`);
      lines.push(`${v}.Font = Enum.Font.${font}`);
      lines.push(`${v}.TextXAlignment = Enum.TextXAlignment.${textAlign}`);
      lines.push(`${v}.BackgroundTransparency = 1`);
      lines.push(`${v}.BorderSizePixel = 0`);
      lines.push(`${v}.Size = UDim2.new(0, ${width}, 0, ${height})`);
      lines.push(`${v}.Position = UDim2.new(0, ${x}, 0, ${y})`);
      lines.push(`${v}.Parent = ${parent}`);
      break;
    }

    case "image": {
      const n = node as LSImageNode;
      const v = nextVar("ImageLabel");
      const src = (n.src ?? "").startsWith("rbxassetid://") ? n.src : "rbxassetid://0";
      lines.push(`local ${v} = Instance.new("ImageLabel")`);
      lines.push(`${v}.Name = "${n.id}"`);
      lines.push(`${v}.Image = "${src}"`);
      lines.push(`${v}.ScaleType = Enum.ScaleType.Fit`);
      lines.push(`${v}.BackgroundTransparency = 1`);
      lines.push(`${v}.Size = UDim2.new(0, ${width}, 0, ${height})`);
      lines.push(`${v}.Position = UDim2.new(0, ${x}, 0, ${y})`);
      lines.push(`${v}.Parent = ${parent}`);
      if (n.radius && n.radius > 0) {
        const vc = nextVar("UICorner");
        lines.push(`local ${vc} = Instance.new("UICorner")`);
        lines.push(`${vc}.CornerRadius = UDim.new(0, ${Math.round(n.radius)})`);
        lines.push(`${vc}.Parent = ${v}`);
      }
      break;
    }

    case "box": {
      const n = node as BoxNode;
      const v = nextVar("Frame");
      lines.push(`local ${v} = Instance.new("Frame")`);
      lines.push(`${v}.Name = "${n.id}"`);
      const bg = cssColorToRoblox(n.background);
      if (bg) {
        lines.push(`${v}.BackgroundColor3 = ${bg}`);
      } else {
        lines.push(`${v}.BackgroundTransparency = 1`);
      }
      lines.push(`${v}.BorderSizePixel = 0`);
      lines.push(`${v}.Size = UDim2.new(0, ${width}, 0, ${height})`);
      lines.push(`${v}.Position = UDim2.new(0, ${x}, 0, ${y})`);
      lines.push(`${v}.Parent = ${parent}`);
      if (n.radius && n.radius > 0) {
        const vc = nextVar("UICorner");
        lines.push(`local ${vc} = Instance.new("UICorner")`);
        lines.push(`${vc}.CornerRadius = UDim.new(0, ${Math.round(n.radius)})`);
        lines.push(`${vc}.Parent = ${v}`);
      }
      emitChildren(n.children, v, lines);
      break;
    }

    case "stack": {
      const n = node as LSStackNode;
      const v = nextVar("Frame");
      const layout = nextVar("UIListLayout");
      lines.push(`local ${v} = Instance.new("Frame")`);
      lines.push(`${v}.Name = "${n.id}"`);
      lines.push(`${v}.BackgroundTransparency = 1`);
      lines.push(`${v}.Size = UDim2.new(0, ${width}, 0, ${height})`);
      lines.push(`${v}.Position = UDim2.new(0, ${x}, 0, ${y})`);
      lines.push(`${v}.Parent = ${parent}`);
      lines.push(`local ${layout} = Instance.new("UIListLayout")`);
      lines.push(`${layout}.FillDirection = Enum.FillDirection.${n.direction === "row" ? "Horizontal" : "Vertical"}`);
      if (n.gap && n.gap > 0) {
        lines.push(`${layout}.Padding = UDim.new(0, ${n.gap})`);
      }
      lines.push(`${layout}.Parent = ${v}`);
      if (n.padding && n.padding > 0) {
        const vp = nextVar("UIPadding");
        lines.push(`local ${vp} = Instance.new("UIPadding")`);
        lines.push(`${vp}.PaddingTop = UDim.new(0, ${n.padding})`);
        lines.push(`${vp}.PaddingBottom = UDim.new(0, ${n.padding})`);
        lines.push(`${vp}.PaddingLeft = UDim.new(0, ${n.padding})`);
        lines.push(`${vp}.PaddingRight = UDim.new(0, ${n.padding})`);
        lines.push(`${vp}.Parent = ${v}`);
      }
      emitChildren(n.children, v, lines);
      break;
    }

    case "grid": {
      const n = node as LSGridNode;
      const v = nextVar("Frame");
      const layout = nextVar("UIGridLayout");
      const cellWidth = n.columns > 0 ? Math.floor((width - (n.columns - 1) * (n.gap ?? 0)) / n.columns) : width;
      lines.push(`local ${v} = Instance.new("Frame")`);
      lines.push(`${v}.Name = "${n.id}"`);
      lines.push(`${v}.BackgroundTransparency = 1`);
      lines.push(`${v}.Size = UDim2.new(0, ${width}, 0, ${height})`);
      lines.push(`${v}.Position = UDim2.new(0, ${x}, 0, ${y})`);
      lines.push(`${v}.Parent = ${parent}`);
      lines.push(`local ${layout} = Instance.new("UIGridLayout")`);
      lines.push(`${layout}.CellSize = UDim2.new(0, ${cellWidth}, 0, ${cellWidth})`);
      if (n.gap && n.gap > 0) {
        lines.push(`${layout}.CellPadding = UDim2.new(0, ${n.gap}, 0, ${n.gap})`);
      }
      lines.push(`${layout}.Parent = ${v}`);
      emitChildren(n.children, v, lines);
      break;
    }

    case "group": {
      const n = node as GroupNode;
      const v = nextVar("Frame");
      lines.push(`local ${v} = Instance.new("Frame")`);
      lines.push(`${v}.Name = "${n.id}"`);
      lines.push(`${v}.BackgroundTransparency = 1`);
      lines.push(`${v}.Size = UDim2.new(0, ${width}, 0, ${height})`);
      lines.push(`${v}.Position = UDim2.new(0, ${x}, 0, ${y})`);
      lines.push(`${v}.Parent = ${parent}`);
      emitChildren(n.children, v, lines);
      break;
    }

    // line, curve, draw, polygon — not representable in Roblox GUI instances
    default:
      break;
  }
}

/**
 * Export a CanvasApp LayoutSpec as a Roblox LocalScript.
 * The script creates a ScreenGui matching the canvas design when placed in StarterPlayerScripts.
 */
export function exportLayoutToRobloxLua(spec: LayoutSpec): string {
  _counter = 0;
  const { root } = spec;
  const lines: string[] = [
    "-- Roblox GUI generated by Vizail",
    "-- Place this LocalScript inside StarterPlayerScripts",
    "local Players = game:GetService(\"Players\")",
    "local LocalPlayer = Players.LocalPlayer",
    "local PlayerGui = LocalPlayer:WaitForChild(\"PlayerGui\")",
    "",
    "local ScreenGui = Instance.new(\"ScreenGui\")",
    "local name = \"" + (root.id ?? "VizailUI") + "\"",
    "ScreenGui.Name = name",
    "ScreenGui.ResetOnSpawn = false",
    "ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling",
    "ScreenGui.Parent = PlayerGui",
    "",
    `-- Root frame: ${root.size.width} x ${root.size.height}`,
    "local RootFrame = Instance.new(\"Frame\")",
    "RootFrame.Name = \"RootFrame\"",
    "RootFrame.Size = UDim2.new(1, 0, 1, 0)",
    "RootFrame.BackgroundTransparency = 1",
    "RootFrame.Parent = ScreenGui",
    "",
  ];

  for (const child of root.children) {
    nodeToLua(child, "RootFrame", lines);
    lines.push("");
  }

  return lines.join("\n");
}
