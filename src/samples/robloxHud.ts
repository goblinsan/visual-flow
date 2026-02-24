import type { RootSpec } from "../dsl";

/**
 * A starter Roblox HUD / inventory layout.
 * Exported via "Export to Roblox" it becomes a working LocalScript.
 */
export const robloxHud: RootSpec = {
  id: "roblox-hud",
  background: "transparent",
  padding: 4,
  body: {
    type: "stack",
    direction: "vertical",
    gap: 4,
    children: [
      // Top bar: player info
      {
        type: "box",
        id: "top-bar",
        variant: "card",
        padding: 3,
        gap: 2,
        children: [
          {
            type: "stack",
            direction: "horizontal",
            gap: 4,
            align: "center",
            children: [
              { type: "icon", emoji: "🧙", label: "Player Avatar" },
              {
                type: "stack",
                direction: "vertical",
                gap: 1,
                children: [
                  { type: "text", text: "Hero", variant: "h3" },
                  { type: "text", text: "Level 12  ·  Knight", variant: "caption" },
                ],
              },
              {
                type: "stack",
                direction: "vertical",
                gap: 1,
                children: [
                  { type: "text", text: "HP", variant: "caption", align: "end" },
                  { type: "progress", value: 75, label: "75 / 100" },
                ],
              },
              {
                type: "stack",
                direction: "vertical",
                gap: 1,
                children: [
                  { type: "text", text: "XP", variant: "caption", align: "end" },
                  { type: "progress", value: 40, label: "400 / 1000" },
                ],
              },
            ],
          },
        ],
      },

      // Middle: inventory grid
      {
        type: "box",
        id: "inventory",
        variant: "card",
        padding: 3,
        gap: 3,
        children: [
          { type: "text", text: "Inventory", variant: "h2" },
          {
            type: "grid",
            columns: 6,
            gap: 3,
            children: [
              { type: "box", id: "slot-1", variant: "card", padding: 2, children: [{ type: "text", text: "⚔️", variant: "h3", align: "center" }] },
              { type: "box", id: "slot-2", variant: "card", padding: 2, children: [{ type: "text", text: "🛡️", variant: "h3", align: "center" }] },
              { type: "box", id: "slot-3", variant: "card", padding: 2, children: [{ type: "text", text: "🧪", variant: "h3", align: "center" }, { type: "badge", text: "12", position: "top-right" }] },
              { type: "box", id: "slot-4", variant: "card", padding: 2, children: [{ type: "text", text: "🪖", variant: "h3", align: "center" }] },
              { type: "box", id: "slot-5", variant: "card", padding: 2, children: [{ type: "text", text: "🔥", variant: "h3", align: "center" }, { type: "badge", text: "3", position: "top-right" }] },
              { type: "box", id: "slot-6", variant: "card", padding: 2, children: [{ type: "text", text: "🧙", variant: "h3", align: "center" }] },
              { type: "box", id: "slot-7", variant: "card", padding: 2, children: [{ type: "text", text: "🐲", variant: "h3", align: "center" }] },
              { type: "box", id: "slot-8", variant: "card", padding: 2, children: [{ type: "text", text: "🌿", variant: "h3", align: "center" }, { type: "badge", text: "5", position: "top-right" }] },
              { type: "box", id: "slot-9", variant: "plain", padding: 2, children: [] },
              { type: "box", id: "slot-10", variant: "plain", padding: 2, children: [] },
              { type: "box", id: "slot-11", variant: "plain", padding: 2, children: [] },
              { type: "box", id: "slot-12", variant: "plain", padding: 2, children: [] },
            ],
          },
        ],
      },

      // Bottom: stats row
      {
        type: "stack",
        direction: "horizontal",
        gap: 4,
        children: [
          {
            type: "box",
            variant: "card",
            padding: 3,
            gap: 2,
            children: [
              { type: "text", text: "💰 Gold", variant: "caption" },
              { type: "text", text: "1,200", variant: "h3" },
            ],
          },
          {
            type: "box",
            variant: "card",
            padding: 3,
            gap: 2,
            children: [
              { type: "text", text: "💎 Gems", variant: "caption" },
              { type: "text", text: "5", variant: "h3" },
            ],
          },
          {
            type: "box",
            variant: "card",
            padding: 3,
            gap: 2,
            children: [
              { type: "text", text: "⚡ Power", variant: "caption" },
              { type: "text", text: "200", variant: "h3" },
            ],
          },
        ],
      },
    ],
  },
};
