import type { Meta, StoryObj } from "@storybook/react";
import { VisualFlowEditor } from "./editor/VisualFlowEditor";
import { buildInventoryAdvanced } from "./samples/inventoryAdvanced";

const meta: Meta<typeof VisualFlowEditor> = {
  title: "VisualFlow/Editor",
  component: VisualFlowEditor,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof VisualFlowEditor>;

const spec = buildInventoryAdvanced({
  gold: 118554,
  gems: 26,
  level: 393,
  power: 249,
  items: Array.from({ length: 60 }, (_, i) => ({
    id: `item-${i+1}`,
    name: `Item ${i+1}`,
    rarity: (['common','rare','epic','legendary','unique'] as const)[i % 5],
    icon: ["⚔️","🪖","🛡️","🧙","🧪","🔥","🐲","🧢","🎯","🧿"][i % 10],
    power: (i * 7) % 100,
    speed: (i * 11) % 100,
    area: (i * 17) % 100,
    enchantments: [
      { name: "Echo", tier: "III", rarity: (['common','rare','epic','legendary','unique'] as const)[i % 5] },
      { name: "Pain Cycle", tier: "II", rarity: (['common','rare','epic','legendary','unique'] as const)[(i+1) % 5] },
      { name: "Void Strike", tier: "I", rarity: (['common','rare','epic','legendary','unique'] as const)[(i+2) % 5] },
    ],
  })),
  selectedId: "item-1",
});

export const Editor: Story = {
  args: {
    initial: spec,
  },
};
