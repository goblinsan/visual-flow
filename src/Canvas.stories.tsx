import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import CanvasStage from "./canvas/CanvasStage.tsx";
import type { LayoutSpec } from "./layout-schema.ts";

const meta: Meta<typeof CanvasStage> = {
  title: "Editor/Canvas",
  component: CanvasStage,
};
export default meta;

type Story = StoryObj<typeof CanvasStage>;

export const CanvasBasic: Story = {
  render: () => <CanvasStoryWrapper />,
};

function CanvasStoryWrapper() {
  const initial: LayoutSpec = {
    root: {
      id: "root",
      type: "frame",
      size: { width: 800, height: 520 },
      background: "#0f172a",
      children: [
        { id: "title", type: "text", text: "Visual Flow Canvas", variant: "h1", position: { x: 24, y: 24 }, size: { width: 300, height: 40 }, color: "#f8fafc" },
        { id: "img", type: "image", position: { x: 24, y: 90 }, size: { width: 120, height: 120 }, src: "/vite.svg", radius: 10, objectFit: "contain" },
        { id: "box", type: "box", position: { x: 170, y: 90 }, size: { width: 240, height: 120 }, background: "#1f2937", border: "1px solid #334155", radius: 10 },
      ],
    },
  };
  const [spec, setSpec] = useState<LayoutSpec>(initial);
  const [selection, setSelection] = useState<string[]>([]);
  return (
    <div className="p-3 bg-slate-900 text-slate-100">
      <CanvasStage spec={spec} setSpec={setSpec} selection={selection} setSelection={setSelection} width={820} height={540} />
    </div>
  );
}
