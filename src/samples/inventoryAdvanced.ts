import { type RootSpec, type NodeSpec } from "../dsl";

// Build a full inventory layout inspired by the referenced image
export type Rarity = "common" | "rare" | "epic" | "legendary" | "unique";

function rarityRing(r: Rarity): string {
  switch (r) {
    case "unique": return "ring-2 ring-[--rarity-unique]";
    case "legendary": return "ring-2 ring-[--rarity-legendary]";
    case "epic": return "ring-2 ring-[--rarity-epic]";
    case "rare": return "ring-2 ring-[--rarity-rare]";
    default: return "ring-2 ring-[--rarity-common]";
  }
}

export type Item = {
  id: string;
  name: string;
  icon: string; // emoji placeholder
  rarity: Rarity;
  power: number; // 0..100 for bar
  speed: number; // 0..100 for bar
  area: number; // 0..100 for bar
  enchantments?: Array<{ name: string; tier: "I"|"II"|"III"; rarity: Rarity }>
}

export type InventoryModel = {
  gold: number;
  gems: number;
  level: number;
  power: number;
  items: Item[];
  selectedId?: string;
}

export function buildInventoryAdvanced(model: InventoryModel): RootSpec {
  const header: NodeSpec = {
    type: "grid", columns: 12, gap: 4,
    className: "items-center",
    children: [
      { type: "text", text: `Level ${model.level}`, variant: "h3", className: "col-span-2" },
      { type: "stack", direction: "horizontal", gap: 4, className: "col-span-4", children: [
        { type: "box", variant: "card", padding: 2, className: "flex items-center gap-2", children: [
          { type: "text", text: "💰", variant: "body" },
          { type: "text", text: model.gold.toLocaleString(), variant: "body" },
        ]},
        { type: "box", variant: "card", padding: 2, className: "flex items-center gap-2", children: [
          { type: "text", text: "💎", variant: "body" },
          { type: "text", text: model.gems.toLocaleString(), variant: "body" },
        ]},
      ]},
    ],
  };

  const left: NodeSpec = {
    type: "box", variant: "card", padding: 4, className: "col-span-3",
    children: [
      { type: "text", text: "Equipped", variant: "h3" },
      { type: "grid", columns: 2, gap: 3, children: [
        { type: "text", text: "Head", variant: "caption" },
        { type: "text", text: "🪖", variant: "body", align: "end" },
        { type: "text", text: "Chest", variant: "caption" },
        { type: "text", text: "🦺", variant: "body", align: "end" },
        { type: "text", text: "Weapon", variant: "caption" },
        { type: "text", text: "⚔️", variant: "body", align: "end" },
        { type: "text", text: "Artifact", variant: "caption" },
        { type: "text", text: "🌀", variant: "body", align: "end" },
      ]},
    ],
  };

  // 48-slot grid
  const gridItems: NodeSpec[] = model.items.slice(0, 48).map((it) => ({
    type: "box", id: it.id, variant: "card", selectable: true,
    className: `${rarityRing(it.rarity)} aspect-square flex items-center justify-center` ,
    children: [
      { type: "text", text: it.icon, variant: "h3", align: "center" },
    ]
  }));

  const middle: NodeSpec = {
    type: "stack", direction: "vertical", gap: 4, className: "col-span-6",
    children: [
      { type: "text", text: "Inventory", variant: "h3" },
      { type: "grid", columns: 6, gap: 4, children: gridItems },
    ],
  };

  const selected = model.items.find(i => i.id === model.selectedId) ?? model.items[0];
  const enchRow: NodeSpec = selected?.enchantments?.length ? {
    type: "stack", direction: "horizontal", gap: 3,
    children: selected.enchantments!.map((e) => ({
      type: "box", variant: "card", padding: 2,
      className: `min-w-[90px] text-center ${rarityRing(e.rarity)}`,
      children: [
        { type: "text", text: e.name, variant: "caption", align: "center" },
        { type: "text", text: e.tier, variant: "body", align: "center" },
      ],
    }))
  } : { type: "text", text: "No enchantments", variant: "caption" };

  const right: NodeSpec = {
    type: "box", variant: "card", padding: 4, className: "col-span-3",
    children: [
      { type: "text", text: selected ? selected.name : "Item", variant: "h3" },
      { type: "text", text: "Power", variant: "caption" },
      { type: "progress", value: selected?.power ?? 0 },
      { type: "text", text: "Speed", variant: "caption" },
      { type: "progress", value: selected?.speed ?? 0 },
      { type: "text", text: "Area", variant: "caption" },
      { type: "progress", value: selected?.area ?? 0 },
      { type: "text", text: "Enchantments", variant: "h3" },
      enchRow,
    ],
  };

  const body: NodeSpec = {
    type: "stack", direction: "vertical", gap: 4,
    children: [
      header,
      { type: "grid", columns: 12, gap: 6, children: [left, middle, right] },
    ],
  };

  return {
    id: "inventory-advanced",
    background: "transparent",
    padding: 6,
    className: "text-slate-100",
    body,
  };
}
