import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import CanvasStage from "./canvas/CanvasStage.tsx";
import type { LayoutSpec } from "./layout-schema.ts";

const meta: Meta<typeof CanvasStage> = {
  title: "Editor/CanvasGrid",
  component: CanvasStage,
};

export default meta;

type Story = StoryObj<typeof CanvasStage>;

export const Grid: Story = {
  render: () => <GridCanvas />
};

export function GridCanvas() {
  const initial: LayoutSpec = {
    root: {
      id: "root",
      type: "frame",
      size: { width: 640, height: 480 },
      background: "#ffffff",
      children: [
        { id: "grid", type: "grid", position: { x: 20, y: 20 }, size: { width: 600, height: 400 }, columns: 3, gap: 8, padding: 8, children: [
          { id: "a", type: "box", position: { x: 0, y: 0 }, size: { width: 180, height: 100 }, background: "#f1f5f9" },
          { id: "b", type: "box", position: { x: 0, y: 0 }, size: { width: 180, height: 80 }, background: "#f1f5f9" },
          { id: "c", type: "box", position: { x: 0, y: 0 }, size: { width: 180, height: 120 }, background: "#f1f5f9" },
          { id: "d", type: "box", position: { x: 0, y: 0 }, size: { width: 180, height: 90 }, background: "#f1f5f9" },
        ] },
      ],
    },
  };
  const [spec, setSpec] = useState<LayoutSpec>(initial);
  return <CanvasStage spec={spec} setSpec={setSpec} width={640} height={480} />;
}
