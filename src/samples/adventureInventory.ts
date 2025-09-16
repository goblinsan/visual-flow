import { type RootSpec } from "../dsl";

// A simplified layout resembling the "AdventureHero's Inventory" UI
export const adventureInventory: RootSpec = {
  id: "adventure-inventory",
  background: "transparent",
  padding: 4,
  body: {
    type: "stack",
    direction: "vertical",
    gap: 4,
    children: [
      { type: "text", text: "AdventureHero's Inventory", variant: "h2", align: "start" },
      {
        type: "stack",
        direction: "horizontal",
        gap: 8,
        children: [
          // Left: Equipped list
          {
            type: "stack",
            direction: "vertical",
            gap: 3,
            className: "min-w-64",
            children: [
              { type: "text", text: "Equipped", variant: "h3" },
              {
                type: "grid",
                columns: 2,
                gap: 3,
                children: [
                  { type: "text", text: "Head", variant: "caption" },
                  { type: "text", text: "🪖 E", variant: "body", align: "end" },
                  { type: "text", text: "Chest", variant: "caption" },
                  { type: "text", text: "🦺", variant: "body", align: "end" },
                  { type: "text", text: "Weapon", variant: "caption" },
                  { type: "text", text: "🔥 E", variant: "body", align: "end" },
                  { type: "text", text: "Shield", variant: "caption" },
                  { type: "text", text: "🛡️", variant: "body", align: "end" },
                ],
              },
            ],
          },
          // Middle: Inventory grid (emojis as items)
          {
            type: "grid",
            columns: 6,
            gap: 2,
            className: "flex-1",
            children: [
              { type: "text", text: "⚔️", variant: "h3", align: "center" },
              { type: "text", text: "🔥", variant: "h3", align: "center" },
              { type: "text", text: "🐲", variant: "h3", align: "center" },
              { type: "text", text: "🧢", variant: "h3", align: "center" },
              { type: "text", text: "🪖", variant: "h3", align: "center" },
              { type: "text", text: "🧙", variant: "h3", align: "center" },
              { type: "text", text: "🧪 12", variant: "body", align: "center" },
              { type: "text", text: "🔵 8", variant: "body", align: "center" },
              { type: "text", text: "💪 3", variant: "body", align: "center" },
              { type: "text", text: "🪨 24", variant: "body", align: "center" },
              { type: "text", text: "🐲 2", variant: "body", align: "center" },
              { type: "text", text: "💎 6", variant: "body", align: "center" },
              { type: "text", text: "🌿 45", variant: "body", align: "center" },
              { type: "text", text: "📜", variant: "body", align: "center" },
              { type: "text", text: "👑", variant: "body", align: "center" },
              { type: "text", text: "🗺️", variant: "body", align: "center" },
            ],
          },
          // Right: Details panel
          {
            type: "stack",
            direction: "vertical",
            gap: 2,
            className: "min-w-56",
            children: [
              { type: "text", text: "📦", variant: "h3", align: "center" },
              { type: "text", text: "Select an item to view details", variant: "body", align: "center" },
            ],
          },
        ],
      },
    ],
  },
};
