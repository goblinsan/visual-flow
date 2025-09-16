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
        type: "grid",
        columns: 12,
        gap: 6,
        children: [
          // Left column (span 3)
          {
            type: "box", id: "equipped", variant: "card", padding: 4, className: "col-span-3",
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
                  { type: "text", text: "🔥 E", variant: "body", align: "end" },
                  { type: "text", text: "Shield", variant: "caption" },
                  { type: "text", text: "🛡️", variant: "body", align: "end" },
                ],
              },
            ],
          },
          // Middle inventory grid (span 6)
          {
            type: "stack", direction: "vertical", gap: 4, className: "col-span-6",
            children: [
              { type: "text", text: "Inventory", variant: "h3" },
              {
                type: "grid", columns: 6, gap: 4,
                children: [
                  // First row
                  { type: "box", id: "item-1", variant: "card", selectable: true, children: [ { type: "text", text: "⚔️", variant: "h3", align: "center" } ] },
                  { type: "box", id: "item-2", variant: "card", selectable: true, children: [ { type: "text", text: "🔥", variant: "h3", align: "center" } ] },
                  { type: "box", id: "item-3", variant: "card", selectable: true, children: [ { type: "text", text: "🐲", variant: "h3", align: "center" } ] },
                  { type: "box", id: "item-4", variant: "card", selectable: true, children: [ { type: "text", text: "🧢", variant: "h3", align: "center" } ] },
                  { type: "box", id: "item-5", variant: "card", selectable: true, children: [ { type: "text", text: "🪖", variant: "h3", align: "center" } ] },
                  { type: "box", id: "item-6", variant: "card", selectable: true, children: [ { type: "text", text: "🧙", variant: "h3", align: "center" } ] },
                  // Second row
                  { type: "box", id: "item-7", variant: "card", selectable: true, children: [ { type: "text", text: "🧪", variant: "h3", align: "center" }, { type: "badge", text: "12", position: "top-right" } ] },
                  { type: "box", id: "item-8", variant: "card", selectable: true, children: [ { type: "text", text: "�", variant: "h3", align: "center" }, { type: "badge", text: "8", position: "top-right" } ] },
                  { type: "box", id: "item-9", variant: "card", selectable: true, children: [ { type: "text", text: "�", variant: "h3", align: "center" }, { type: "badge", text: "3", position: "top-right" } ] },
                  { type: "box", id: "item-10", variant: "card", selectable: true, children: [ { type: "text", text: "🪨", variant: "h3", align: "center" }, { type: "badge", text: "24", position: "top-right" } ] },
                  { type: "box", id: "item-11", variant: "card", selectable: true, children: [ { type: "text", text: "�", variant: "h3", align: "center" }, { type: "badge", text: "2", position: "top-right" } ] },
                  { type: "box", id: "item-12", variant: "card", selectable: true, children: [ { type: "text", text: "�", variant: "h3", align: "center" }, { type: "badge", text: "6", position: "top-right" } ] },
                ],
              },
            ],
          },
          // Right details panel (span 3)
          {
            type: "box", id: "details", variant: "card", padding: 4, className: "col-span-3",
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
