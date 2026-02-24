import type { NodeSpec, RootSpec, StackNode, GridNode, TextNode, BoxNode, ImageNode, IconNode, BadgeNode, ProgressNode } from "../dsl.ts";

function escapeLuaString(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/"/g, '\\"');
}

/** Convert DSL gap/padding (Tailwind scale, 1 unit = 4px) to pixels */
function toPx(units: number | undefined): number {
  return (units ?? 0) * 4;
}

/** Counter for unique variable names */
let _counter = 0;
function nextVar(prefix: string): string {
  _counter += 1;
  return `${prefix}_${_counter}`;
}

function resetCounter() {
  _counter = 0;
}

/**
 * Recursively emit Instance.new() lines for a DSL node.
 * @param node   DSL node
 * @param parent Lua variable name of the parent instance
 * @param lines  Output line accumulator
 */
function nodeToInstanceLines(node: NodeSpec, parent: string, lines: string[]): void {
  switch (node.type) {
    case "stack": {
      const s = node as StackNode;
      const frame = nextVar("Frame");
      const layout = nextVar("UIListLayout");
      const paddingInst = toPx(s.padding) > 0 ? nextVar("UIPadding") : null;
      lines.push(`local ${frame} = Instance.new("Frame")`);
      lines.push(`${frame}.BackgroundTransparency = 1`);
      lines.push(`${frame}.Size = UDim2.new(1, 0, 1, 0)`);
      lines.push(`${frame}.Parent = ${parent}`);
      lines.push(`local ${layout} = Instance.new("UIListLayout")`);
      lines.push(`${layout}.FillDirection = Enum.FillDirection.${s.direction === "horizontal" ? "Horizontal" : "Vertical"}`);
      if (s.align) {
        const alignMap: Record<string, string> = { start: "Min", center: "Center", end: "Max", stretch: "Min" };
        lines.push(`${layout}.HorizontalAlignment = Enum.HorizontalAlignment.${alignMap[s.align] ?? "Min"}`);
      }
      lines.push(`${layout}.Padding = UDim.new(0, ${toPx(s.gap)})`);
      lines.push(`${layout}.Parent = ${frame}`);
      if (paddingInst) {
        const p = toPx(s.padding);
        lines.push(`local ${paddingInst} = Instance.new("UIPadding")`);
        lines.push(`${paddingInst}.PaddingTop = UDim.new(0, ${p})`);
        lines.push(`${paddingInst}.PaddingBottom = UDim.new(0, ${p})`);
        lines.push(`${paddingInst}.PaddingLeft = UDim.new(0, ${p})`);
        lines.push(`${paddingInst}.PaddingRight = UDim.new(0, ${p})`);
        lines.push(`${paddingInst}.Parent = ${frame}`);
      }
      s.children.forEach((c) => nodeToInstanceLines(c, frame, lines));
      break;
    }
    case "grid": {
      const g = node as GridNode;
      const frame = nextVar("Frame");
      const layout = nextVar("UIGridLayout");
      lines.push(`local ${frame} = Instance.new("Frame")`);
      lines.push(`${frame}.BackgroundTransparency = 1`);
      lines.push(`${frame}.Size = UDim2.new(1, 0, 1, 0)`);
      lines.push(`${frame}.Parent = ${parent}`);
      lines.push(`local ${layout} = Instance.new("UIGridLayout")`);
      lines.push(`${layout}.CellPadding = UDim2.new(0, ${toPx(g.gap)}, 0, ${toPx(g.gap)})`);
      lines.push(`${layout}.FillDirectionMaxCells = ${g.columns}`);
      lines.push(`${layout}.Parent = ${frame}`);
      g.children.forEach((c) => nodeToInstanceLines(c, frame, lines));
      break;
    }
    case "box": {
      const b = node as BoxNode;
      const frame = nextVar("Frame");
      const isCard = !b.variant || b.variant === "card";
      lines.push(`local ${frame} = Instance.new("Frame")`);
      lines.push(`${frame}.BackgroundTransparency = ${isCard ? 0 : 1}`);
      if (isCard) {
        lines.push(`${frame}.BackgroundColor3 = Color3.fromRGB(30, 41, 59)`);
        lines.push(`${frame}.BorderSizePixel = 0`);
        const corner = nextVar("UICorner");
        lines.push(`local ${corner} = Instance.new("UICorner")`);
        lines.push(`${corner}.CornerRadius = UDim.new(0, 8)`);
        lines.push(`${corner}.Parent = ${frame}`);
      }
      lines.push(`${frame}.Size = UDim2.new(1, 0, 0, 0)`);
      lines.push(`${frame}.AutomaticSize = Enum.AutomaticSize.Y`);
      lines.push(`${frame}.Parent = ${parent}`);
      const p = toPx(b.padding);
      if (p > 0) {
        const paddingInst = nextVar("UIPadding");
        lines.push(`local ${paddingInst} = Instance.new("UIPadding")`);
        lines.push(`${paddingInst}.PaddingTop = UDim.new(0, ${p})`);
        lines.push(`${paddingInst}.PaddingBottom = UDim.new(0, ${p})`);
        lines.push(`${paddingInst}.PaddingLeft = UDim.new(0, ${p})`);
        lines.push(`${paddingInst}.PaddingRight = UDim.new(0, ${p})`);
        lines.push(`${paddingInst}.Parent = ${frame}`);
      }
      if ((b.gap ?? 0) > 0) {
        const listLayout = nextVar("UIListLayout");
        lines.push(`local ${listLayout} = Instance.new("UIListLayout")`);
        lines.push(`${listLayout}.Padding = UDim.new(0, ${toPx(b.gap)})`);
        lines.push(`${listLayout}.Parent = ${frame}`);
      }
      b.children.forEach((c) => nodeToInstanceLines(c, frame, lines));
      break;
    }
    case "text": {
      const t = node as TextNode;
      const label = nextVar("TextLabel");
      const fontSizeMap: Record<string, number> = { h1: 36, h2: 28, h3: 22, body: 16, caption: 12 };
      const fontSize = fontSizeMap[t.variant ?? "body"] ?? 16;
      const alignMap: Record<string, string> = { start: "Left", center: "Center", end: "Right" };
      lines.push(`local ${label} = Instance.new("TextLabel")`);
      lines.push(`${label}.BackgroundTransparency = 1`);
      lines.push(`${label}.Size = UDim2.new(1, 0, 0, ${fontSize + 8})`);
      lines.push(`${label}.Text = "${escapeLuaString(t.text)}"`);
      lines.push(`${label}.TextColor3 = Color3.fromRGB(226, 232, 240)`);
      lines.push(`${label}.TextSize = ${fontSize}`);
      lines.push(`${label}.TextXAlignment = Enum.TextXAlignment.${alignMap[t.align ?? "start"] ?? "Left"}`);
      lines.push(`${label}.TextWrapped = true`);
      if (t.variant === "h1" || t.variant === "h2" || t.variant === "h3") {
        lines.push(`${label}.Font = Enum.Font.GothamBold`);
      } else {
        lines.push(`${label}.Font = Enum.Font.Gotham`);
      }
      lines.push(`${label}.Parent = ${parent}`);
      break;
    }
    case "image": {
      const i = node as ImageNode;
      const img = nextVar("ImageLabel");
      lines.push(`local ${img} = Instance.new("ImageLabel")`);
      lines.push(`${img}.BackgroundTransparency = 1`);
      lines.push(`${img}.Size = UDim2.new(1, 0, 0, 100)`);
      lines.push(`${img}.Image = "${escapeLuaString(i.src)}"`);
      lines.push(`${img}.ScaleType = Enum.ScaleType.Fit`);
      lines.push(`${img}.Parent = ${parent}`);
      break;
    }
    case "icon": {
      const ic = node as IconNode;
      const label = nextVar("TextLabel");
      lines.push(`local ${label} = Instance.new("TextLabel")`);
      lines.push(`${label}.BackgroundTransparency = 1`);
      lines.push(`${label}.Size = UDim2.new(0, 32, 0, 32)`);
      lines.push(`${label}.Text = "${escapeLuaString(ic.emoji ?? "")}"`);
      lines.push(`${label}.TextColor3 = Color3.fromRGB(226, 232, 240)`);
      lines.push(`${label}.TextSize = 24`);
      lines.push(`${label}.Font = Enum.Font.Gotham`);
      if (ic.label) {
        lines.push(`${label}.Name = "${escapeLuaString(ic.label)}"`);
      }
      lines.push(`${label}.Parent = ${parent}`);
      break;
    }
    case "badge": {
      const b = node as BadgeNode;
      const frame = nextVar("Frame");
      const label = nextVar("TextLabel");
      const corner = nextVar("UICorner");
      lines.push(`local ${frame} = Instance.new("Frame")`);
      lines.push(`${frame}.BackgroundColor3 = Color3.fromRGB(99, 102, 241)`);
      lines.push(`${frame}.BorderSizePixel = 0`);
      lines.push(`${frame}.Size = UDim2.new(0, 28, 0, 18)`);
      lines.push(`${frame}.Parent = ${parent}`);
      lines.push(`local ${corner} = Instance.new("UICorner")`);
      lines.push(`${corner}.CornerRadius = UDim.new(1, 0)`);
      lines.push(`${corner}.Parent = ${frame}`);
      lines.push(`local ${label} = Instance.new("TextLabel")`);
      lines.push(`${label}.BackgroundTransparency = 1`);
      lines.push(`${label}.Size = UDim2.new(1, 0, 1, 0)`);
      lines.push(`${label}.Text = "${escapeLuaString(b.text)}"`);
      lines.push(`${label}.TextColor3 = Color3.fromRGB(255, 255, 255)`);
      lines.push(`${label}.TextSize = 11`);
      lines.push(`${label}.Font = Enum.Font.GothamBold`);
      lines.push(`${label}.Parent = ${frame}`);
      break;
    }
    case "progress": {
      const pr = node as ProgressNode;
      const track = nextVar("Frame");
      const bar = nextVar("Frame");
      const corner1 = nextVar("UICorner");
      const corner2 = nextVar("UICorner");
      const clamped = Math.max(0, Math.min(100, pr.value ?? 0));
      lines.push(`local ${track} = Instance.new("Frame")`);
      lines.push(`${track}.BackgroundColor3 = Color3.fromRGB(51, 65, 85)`);
      lines.push(`${track}.BorderSizePixel = 0`);
      lines.push(`${track}.Size = UDim2.new(1, 0, 0, 12)`);
      lines.push(`${track}.Parent = ${parent}`);
      lines.push(`local ${corner1} = Instance.new("UICorner")`);
      lines.push(`${corner1}.CornerRadius = UDim.new(1, 0)`);
      lines.push(`${corner1}.Parent = ${track}`);
      lines.push(`local ${bar} = Instance.new("Frame")`);
      lines.push(`${bar}.BackgroundColor3 = Color3.fromRGB(99, 102, 241)`);
      lines.push(`${bar}.BorderSizePixel = 0`);
      lines.push(`${bar}.Size = UDim2.new(${clamped / 100}, 0, 1, 0)`);
      lines.push(`${bar}.Parent = ${track}`);
      lines.push(`local ${corner2} = Instance.new("UICorner")`);
      lines.push(`${corner2}.CornerRadius = UDim.new(1, 0)`);
      lines.push(`${corner2}.Parent = ${bar}`);
      if (pr.label) {
        const lbl = nextVar("TextLabel");
        lines.push(`local ${lbl} = Instance.new("TextLabel")`);
        lines.push(`${lbl}.BackgroundTransparency = 1`);
        lines.push(`${lbl}.Size = UDim2.new(1, 0, 0, 16)`);
        lines.push(`${lbl}.Text = "${escapeLuaString(pr.label)}"`);
        lines.push(`${lbl}.TextColor3 = Color3.fromRGB(148, 163, 184)`);
        lines.push(`${lbl}.TextSize = 12`);
        lines.push(`${lbl}.Font = Enum.Font.Gotham`);
        lines.push(`${lbl}.TextXAlignment = Enum.TextXAlignment.Left`);
        lines.push(`${lbl}.Parent = ${parent}`);
      }
      break;
    }
    default: {
      const frame = nextVar("Frame");
      lines.push(`local ${frame} = Instance.new("Frame")`);
      lines.push(`${frame}.BackgroundTransparency = 1`);
      lines.push(`${frame}.Size = UDim2.new(1, 0, 0, 40)`);
      lines.push(`${frame}.Parent = ${parent}`);
      break;
    }
  }
}

/**
 * Export a RootSpec as a Roblox LocalScript that creates the GUI using Instance.new().
 * Drop the output into a LocalScript inside StarterPlayerScripts.
 */
export function exportRobloxLua(spec: RootSpec): string {
  resetCounter();
  const lines: string[] = [];
  lines.push("-- Roblox GUI generated by Vizail");
  lines.push("-- Place this LocalScript inside StarterPlayerScripts");
  lines.push("local Players = game:GetService(\"Players\")");
  lines.push("local LocalPlayer = Players.LocalPlayer");
  lines.push("local PlayerGui = LocalPlayer:WaitForChild(\"PlayerGui\")");
  lines.push("");
  lines.push("local ScreenGui = Instance.new(\"ScreenGui\")");
  lines.push("ScreenGui.Name = \"VizailUI\"");
  lines.push("ScreenGui.ResetOnSpawn = false");
  lines.push("ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling");
  lines.push("ScreenGui.Parent = PlayerGui");
  lines.push("");
  const rootPadding = toPx(spec.padding);
  lines.push("local RootFrame = Instance.new(\"Frame\")");
  lines.push("RootFrame.Name = \"RootFrame\"");
  lines.push("RootFrame.Size = UDim2.new(1, 0, 1, 0)");
  lines.push("RootFrame.BackgroundTransparency = 1");
  lines.push("RootFrame.Parent = ScreenGui");
  if (rootPadding > 0) {
    lines.push("local RootPadding = Instance.new(\"UIPadding\")");
    lines.push(`RootPadding.PaddingTop = UDim.new(0, ${rootPadding})`);
    lines.push(`RootPadding.PaddingBottom = UDim.new(0, ${rootPadding})`);
    lines.push(`RootPadding.PaddingLeft = UDim.new(0, ${rootPadding})`);
    lines.push(`RootPadding.PaddingRight = UDim.new(0, ${rootPadding})`);
    lines.push("RootPadding.Parent = RootFrame");
  }
  lines.push("");
  nodeToInstanceLines(spec.body, "RootFrame", lines);
  return lines.join("\n") + "\n";
}

/**
 * Export a RootSpec as an rbxmx XML file.
 * The XML represents the Roblox instance tree so it can be imported directly
 * into Roblox Studio via the Explorer panel.
 */
export function exportRobloxRbxmx(spec: RootSpec): string {
  resetCounter();
  const xmlLines: string[] = [];
  xmlLines.push(`<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">`);
  xmlLines.push(`  <!-- Roblox GUI generated by Vizail -->`);
  xmlLines.push(`  <Item class="ScreenGui">`);
  xmlLines.push(`    <Properties>`);
  xmlLines.push(`      <string name="Name">VizailUI</string>`);
  xmlLines.push(`      <bool name="ResetOnSpawn">false</bool>`);
  xmlLines.push(`    </Properties>`);
  nodeToXml(spec.body, xmlLines, 4);
  xmlLines.push(`  </Item>`);
  xmlLines.push(`</roblox>`);
  return xmlLines.join("\n") + "\n";
}

function nodeToXml(node: NodeSpec, lines: string[], depth: number): void {
  const indent = " ".repeat(depth);
  switch (node.type) {
    case "stack": {
      const s = node as StackNode;
      lines.push(`${indent}<Item class="Frame">`);
      lines.push(`${indent}  <Properties>`);
      lines.push(`${indent}    <bool name="BackgroundTransparency">true</bool>`);
      lines.push(`${indent}    <token name="AutomaticSize">XY</token>`);
      lines.push(`${indent}  </Properties>`);
      lines.push(`${indent}  <Item class="UIListLayout">`);
      lines.push(`${indent}    <Properties>`);
      lines.push(`${indent}      <token name="FillDirection">${s.direction === "horizontal" ? "Horizontal" : "Vertical"}</token>`);
      lines.push(`${indent}      <UDim name="Padding"><X>0</X><Offset>${toPx(s.gap)}</Offset></UDim>`);
      lines.push(`${indent}    </Properties>`);
      lines.push(`${indent}  </Item>`);
      s.children.forEach((c) => nodeToXml(c, lines, depth + 2));
      lines.push(`${indent}</Item>`);
      break;
    }
    case "text": {
      const t = node as TextNode;
      const fontSizeMap: Record<string, number> = { h1: 36, h2: 28, h3: 22, body: 16, caption: 12 };
      const fontSize = fontSizeMap[t.variant ?? "body"] ?? 16;
      lines.push(`${indent}<Item class="TextLabel">`);
      lines.push(`${indent}  <Properties>`);
      lines.push(`${indent}    <bool name="BackgroundTransparency">true</bool>`);
      lines.push(`${indent}    <string name="Text">${escapeXml(t.text)}</string>`);
      lines.push(`${indent}    <float name="TextSize">${fontSize}</float>`);
      lines.push(`${indent}    <bool name="TextWrapped">true</bool>`);
      lines.push(`${indent}  </Properties>`);
      lines.push(`${indent}</Item>`);
      break;
    }
    case "box": {
      const b = node as BoxNode;
      const isCard = !b.variant || b.variant === "card";
      lines.push(`${indent}<Item class="Frame">`);
      lines.push(`${indent}  <Properties>`);
      lines.push(`${indent}    <bool name="BackgroundTransparency">${isCard ? "false" : "true"}</bool>`);
      lines.push(`${indent}    <token name="AutomaticSize">Y</token>`);
      lines.push(`${indent}  </Properties>`);
      b.children.forEach((c) => nodeToXml(c, lines, depth + 2));
      lines.push(`${indent}</Item>`);
      break;
    }
    default: {
      lines.push(`${indent}<Item class="Frame">`);
      lines.push(`${indent}  <Properties>`);
      lines.push(`${indent}    <bool name="BackgroundTransparency">true</bool>`);
      lines.push(`${indent}  </Properties>`);
      lines.push(`${indent}</Item>`);
      break;
    }
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
