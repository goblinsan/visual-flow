import type { Meta, StoryObj } from "@storybook/react";
import CanvasStage from "./canvas/CanvasStage.tsx";

const meta: Meta<typeof CanvasStage> = {
  title: "Editor/CanvasStage",
  component: CanvasStage,
};

export default meta;

type Story = StoryObj<typeof CanvasStage>;

export const Default: Story = {
  args: {
    width: 640,
    height: 480,
  },
};
