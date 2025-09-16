import type { Meta, StoryObj } from "@storybook/react";
import { Renderer } from "./renderer/Renderer";
import { adventureInventory } from "./samples";
import type { RootSpec, NodeSpec } from "./dsl";

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

function sectionEquipped(): NodeSpec {
  return {
    type: "box", id: "equipped", variant: "card", padding: 4, className: "col-span-12 md:col-span-3",
    children: [
      { type: "text", text: "Equipped", variant: "h3" },
      {
        type: "grid", columns: 2, gap: 3,
        children: [
          { type: "text", text: "Head", variant: "caption" },
          { type: "text", text: "🪖 E", variant: "body", align: "end" },
          { type: "text", text: "Chest", variant: "caption" },
          { type: "text", text: "🦺", variant: "body", align: "end" },
          { type: "text", text: "Weapon", variant: "caption" },
          { type: "text", text: "� E", variant: "body", align: "end" },
          { type: "text", text: "Shield", variant: "caption" },
          { type: "text", text: "🛡️", variant: "body", align: "end" },
        ],
      },
    ],
  };
}

function sectionDetails(): NodeSpec {
  return {
    type: "box", id: "details", variant: "card", padding: 4, className: "col-span-12 md:col-span-3",
    children: [
      { type: "text", text: "📦", variant: "h3", align: "center" },
      { type: "text", text: "Select an item to view details", variant: "body", align: "center" },
    ],
  };
}

function sectionInventory(title: string, columns: number, gap: number, count: number, emoji: string): NodeSpec {
  const items: NodeSpec[] = Array.from({ length: count }, (_, i) => ({
    type: "box", id: `${title.toLowerCase()}-${i + 1}`, variant: "card", selectable: true,
    children: [ { type: "text", text: emoji, variant: "h3", align: "center" } ],
  }));
  return {
    type: "stack", direction: "vertical", gap: 3, className: "col-span-12 md:col-span-6",
    children: [
      { type: "text", text: title, variant: "h3" },
      { type: "grid", columns, gap, children: items },
    ],
  };
}

function buildSpec(bodyChildren: NodeSpec[]): RootSpec {
  return {
    ...adventureInventory,
    body: {
      type: "grid",
      columns: 12,
      gap: 6,
      children: bodyChildren,
    },
  } as RootSpec;
}

export const DenseGrid: Story = {
  args: {
    spec: buildSpec([
      sectionEquipped(),
      sectionInventory("Inventory (Dense)", 8, 2, 24, "🔹"),
      sectionDetails(),
    ]),
  },
  parameters: { backgrounds: { default: "dark" } },
};

export const SparseGrid: Story = {
  args: {
    spec: buildSpec([
      sectionEquipped(),
      sectionInventory("Inventory (Sparse)", 4, 4, 6, "📦"),
      sectionDetails(),
    ]),
  },
  parameters: { backgrounds: { default: "dark" } },
};
