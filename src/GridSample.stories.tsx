import type { Meta, StoryObj } from "@storybook/react";
import { Renderer } from "./renderer/Renderer";
import { gridSample } from "./samples";

const meta: Meta<typeof Renderer> = {
  title: "VisualFlow/GridSample",
  component: Renderer,
};
export default meta;

type Story = StoryObj<typeof Renderer>;

export const Example: Story = {
  args: { spec: gridSample },
};
