import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import CanvasStage from "./canvas/CanvasStage.tsx";
import type { LayoutSpec } from "./layout-schema.ts";

const meta: Meta<typeof CanvasStage> = {
  title: "Editor/CanvasImage",
  component: CanvasStage,
};

export default meta;

type Story = StoryObj<typeof CanvasStage>;

export const Image: Story = {
  render: () => <ImageCanvas />,
};

export function ImageCanvas() {
  const initial: LayoutSpec = {
    root: {
      id: "root",
      type: "frame",
      size: { width: 640, height: 480 },
      background: "#ffffff",
      children: [
        { id: "img1", type: "image", position: { x: 40, y: 40 }, size: { width: 240, height: 180 }, src: "/vite.svg", radius: 8, objectFit: "cover" },
        { id: "img2", type: "image", position: { x: 320, y: 200 }, size: { width: 240, height: 180 }, src: "/vite.svg", radius: 12, objectFit: "contain" },
      ],
    },
  };
  const [spec, setSpec] = useState<LayoutSpec>(initial);
  const [selection, setSelection] = useState<string[]>([]);
  return <CanvasStage spec={spec} setSpec={setSpec} selection={selection} setSelection={setSelection} width={640} height={480} />;
}
