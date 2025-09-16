import type { Meta, StoryObj } from "@storybook/react";
import { Renderer } from "./renderer/Renderer";
import { adventureInventory } from "./samples";

const meta: Meta<typeof Renderer> = {
  title: "VisualFlow/AdventureInventory",
  component: Renderer,
};
export default meta;

type Story = StoryObj<typeof Renderer>;

export const Example: Story = {
  args: { spec: adventureInventory },
  parameters: { backgrounds: { default: "dark" } },
};
