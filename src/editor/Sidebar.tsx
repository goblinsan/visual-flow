
import type { NodeSpec, StackNode, GridNode, BoxNode, TextNode, IconNode, ImageNode, BadgeNode, ProgressNode } from "../dsl";
import type { DesignMode } from "../roblox/ChooseModeModal";

export type FileEntry = { id: string; name: string };

/** Roblox UI component palette entries (#143) */
const ROBLOX_COMPONENTS: { label: string; abbr: string; node: NodeSpec }[] = [
  {
    label: "TextLabel",
    abbr: "T",
    node: { type: "text", text: "Label", variant: "body" } satisfies TextNode,
  },
  {
    label: "Heading",
    abbr: "H",
    node: { type: "text", text: "Heading", variant: "h2" } satisfies TextNode,
  },
  {
    label: "Frame (card)",
    abbr: "Fr",
    node: { type: "box", variant: "card", padding: 3, children: [] } satisfies BoxNode,
  },
  {
    label: "VStack",
    abbr: "VS",
    node: { type: "stack", direction: "vertical", gap: 2, children: [] } satisfies StackNode,
  },
  {
    label: "HStack",
    abbr: "HS",
    node: { type: "stack", direction: "horizontal", gap: 2, children: [] } satisfies StackNode,
  },
  {
    label: "Grid 3-col",
    abbr: "Gr",
    node: { type: "grid", columns: 3, gap: 2, children: [] } satisfies GridNode,
  },
  {
    label: "ImageLabel",
    abbr: "Img",
    node: { type: "image", src: "rbxassetid://0", alt: "image" } satisfies ImageNode,
  },
  {
    label: "Icon",
    abbr: "Ic",
    node: { type: "icon", label: "icon" } satisfies IconNode,
  },
  {
    label: "Badge",
    abbr: "Bg",
    node: { type: "badge", text: "1" } satisfies BadgeNode,
  },
  {
    label: "ProgressBar",
    abbr: "Pb",
    node: { type: "progress", value: 50, label: "Progress" } satisfies ProgressNode,
  },
];

export function Sidebar({
  files,
  activeId,
  mode,
  onSelect,
  onCreateSample,
  onCreateRobloxSample,
  onInsertNode,
}: {
  files: FileEntry[];
  activeId?: string | null;
  mode?: DesignMode;
  onSelect: (id: string) => void;
  onCreateSample: () => void;
  onCreateRobloxSample: () => void;
  onInsertNode?: (node: NodeSpec) => void;
}) {
  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-semibold">Files</div>
      <div className="space-y-1">
        {files.length === 0 ? (
          <div className="text-xs opacity-70">No files yet.</div>
        ) : (
          files.map((f) => (
            <button key={f.id} className={`w-full text-left px-2 py-1 rounded ${activeId === f.id ? "bg-slate-800 border border-slate-700" : "hover:bg-slate-900/60"}`} onClick={() => onSelect(f.id)}>
              <div className="text-sm">{f.name}</div>
              <div className="text-[10px] opacity-60">{f.id}</div>
            </button>
          ))
        )}
      </div>
      <div className="pt-2 border-t border-slate-800/60 space-y-2">
        <button className="w-full px-2 py-1 rounded border border-slate-700 bg-slate-800" onClick={onCreateSample}>New from Sample</button>
        <button className="w-full px-2 py-1 rounded border border-[--color-brand] bg-[--color-brand]/20 text-[--color-brand]" onClick={onCreateRobloxSample}>New Roblox HUD</button>
      </div>

      {/* Roblox component palette (#143) */}
      {mode === "roblox" && onInsertNode && (
        <div className="pt-2 border-t border-slate-800/60">
          <div className="text-xs font-semibold text-[--color-brand] mb-2">
            Roblox Components
          </div>
          <div className="grid grid-cols-2 gap-1">
            {ROBLOX_COMPONENTS.map((c) => (
              <button
                key={c.label}
                className="flex items-center gap-1 px-2 py-1 rounded border border-slate-700/60 bg-slate-800/60 hover:bg-slate-800 text-left"
                onClick={() => onInsertNode(c.node)}
                title={`Insert ${c.label}`}
              >
                <span className="text-[10px] w-6 text-center opacity-70 font-mono">{c.abbr}</span>
                <span className="text-[10px] truncate">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
