import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useState } from "react";
import { Renderer } from "./renderer/Renderer";
import { buildInventoryAdvanced, type InventoryModel, type Item, type Rarity } from "./samples/inventoryAdvanced";

const meta: Meta<typeof Renderer> = {
  title: "VisualFlow/InventoryAdvanced",
  component: Renderer,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="bg-dark-gradient min-h-screen min-w-[70vw] w-full max-w-7xl mx-auto p-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Renderer>;

function makeItems(): Item[] {
  const rarities: Rarity[] = ["common", "rare", "epic", "legendary", "unique"];
  const icons = ["⚔️","🪖","🛡️","🧙","🧪","🔥","🐲","🧢","🎯","🧿"];
  const items: Item[] = [];
  for (let i=0;i<60;i++) {
    const rarity = rarities[i % rarities.length];
    items.push({
      id: `item-${i+1}`,
      name: `${rarity.toUpperCase()} Item ${i+1}`,
      rarity,
      icon: icons[i % icons.length],
      power: Math.floor(Math.random()*100),
      speed: Math.floor(Math.random()*100),
      area: Math.floor(Math.random()*100),
      enchantments: [
        { name: "Echo", tier: "III", rarity },
        { name: "Pain Cycle", tier: "II", rarity },
        { name: "Void Strike", tier: "I", rarity },
      ],
    });
  }
  return items;
}

function InventoryInteractiveComponent() {
  const [selectedId, setSelectedId] = useState<string | undefined>("item-1");
  const model: InventoryModel = useMemo(() => ({
    gold: 118554,
    gems: 26,
    level: 393,
    power: 249,
    items: makeItems(),
    selectedId,
  }), [selectedId]);
  const spec = useMemo(() => buildInventoryAdvanced(model), [model]);
  return <Renderer spec={spec} selectedId={selectedId} onSelect={setSelectedId} />;
}

export const Interactive: Story = {
  render: () => <InventoryInteractiveComponent />,
};
