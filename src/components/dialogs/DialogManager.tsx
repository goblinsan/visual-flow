import { useState, type JSX } from "react";
import { Modal } from "../Modal";
import type { LayoutSpec } from "../../layout-schema";
import type { SavedDesign } from "../../utils/persistence";
import { getSavedDesigns } from "../../utils/persistence";
import { COMPONENT_LIBRARY, ICON_LIBRARY } from "../../library";
import { ExportDialog } from "../ExportDialog";
import type { DesignTheme } from "../../theme/types";

const COMPONENT_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "buttons", label: "Buttons" },
  { key: "inputs", label: "Inputs" },
  { key: "navigation", label: "Navigation" },
  { key: "surfaces", label: "Surfaces" },
  { key: "feedback", label: "Feedback" },
  { key: "data-display", label: "Data" },
  { key: "layout", label: "Layout" },
  { key: "roblox", label: "Roblox" },
] as const;

const TEMPLATE_CATEGORIES = [
  { key: "all", label: "All Templates" },
  { key: "general", label: "General" },
  { key: "web", label: "Web" },
  { key: "mobile", label: "Mobile" },
  { key: "game", label: "Game" },
  { key: "ecommerce", label: "E-Commerce" },
  { key: "layout", label: "Layout" },
] as const;

export interface DialogManagerProps {
  // Dialog state
  shareDialogOpen: boolean;
  setShareDialogOpen: (open: boolean) => void;
  aboutOpen: boolean;
  setAboutOpen: (open: boolean) => void;
  cheatOpen: boolean;
  setCheatOpen: (open: boolean) => void;
  gettingStartedOpen: boolean;
  setGettingStartedOpen: (open: boolean) => void;
  canvasGuideOpen: boolean;
  setCanvasGuideOpen: (open: boolean) => void;
  iconLibraryOpen: boolean;
  setIconLibraryOpen: (open: boolean) => void;
  componentLibraryOpen: boolean;
  setComponentLibraryOpen: (open: boolean) => void;
  newDialogOpen: boolean;
  setNewDialogOpen: (open: boolean) => void;
  openDialogOpen: boolean;
  setOpenDialogOpen: (open: boolean) => void;
  templateBrowserOpen: boolean;
  setTemplateBrowserOpen: (open: boolean) => void;
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;
  
  // Current spec for export
  currentSpec: LayoutSpec;
  
  // Active theme (for themed template/component icons)
  activeTheme?: DesignTheme | null;
  
  // Collaboration state
  isCollaborative: boolean;
  roomId: string | null;
  
  // Icon library state
  selectedIconId: string;
  setSelectedIconId: React.Dispatch<React.SetStateAction<string>>;
  iconSearch: string;
  setIconSearch: (search: string) => void;
  
  // Component library state
  selectedComponentId: string;
  setSelectedComponentId: React.Dispatch<React.SetStateAction<string>>;
  
  // App version
  appVersion: string;
  
  // Callbacks
  onApplyTemplate: (templateId: string) => void;
  onLoadDesign: (design: SavedDesign) => void;
  onStartCollaborativeSession: () => void;
  onLeaveCollaborativeSession: () => void;
  onCopyShareLink: () => void;
  
  // Templates data
  templates: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    category: string;
    build: () => LayoutSpec;
  }>;
}

function ComponentLibraryBrowser({
  selectedComponentId,
  onSelect,
}: {
  selectedComponentId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const q = search.trim().toLowerCase();
  const filtered = COMPONENT_LIBRARY.filter((c) => {
    const matchesCategory = activeCategory === "all" || c.category === activeCategory;
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      {/* Search */}
      <div className="relative mb-3">
        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components..."
          className="w-full border border-gray-200 rounded-md pl-7 pr-2 py-2 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
      </div>
      {/* Category tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {COMPONENT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
              activeCategory === cat.key
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {/* Component grid */}
      <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
        {filtered.map((component) => (
          <button
            key={component.id}
            type="button"
            onClick={() => onSelect(component.id)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${
              selectedComponentId === component.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <i className={component.iconClassName} />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-gray-800 truncate">{component.name}</div>
              <div className="text-[10px] text-gray-500 truncate">{component.description}</div>
            </div>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-3 text-[11px] text-gray-500">No components match your search.</div>
      )}
    </>
  );
}

function TemplateBrowser({
  templates,
  onSelectTemplate,
  activeTheme,
}: {
  templates: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    category: string;
    build: () => LayoutSpec;
  }>;
  onSelectTemplate: (templateId: string) => void;
  activeTheme?: DesignTheme | null;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const q = search.trim().toLowerCase();
  const filtered = templates.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      {/* Search */}
      <div className="relative mb-3">
        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="w-full border border-gray-200 rounded-md pl-7 pr-2 py-2 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-4 pb-2 border-b border-gray-200 overflow-x-auto">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all whitespace-nowrap ${
              activeCategory === cat.key
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.map((template) => {
          // Use theme accent colors for the icon background when a theme is active
          const iconBg = activeTheme
            ? `linear-gradient(135deg, ${activeTheme.colors['color.accent.primary'] ?? '#3b82f6'}, ${activeTheme.colors['color.accent.secondary'] ?? '#06b6d4'})`
            : undefined;
          const iconTextColor = activeTheme
            ? (activeTheme.colors['color.text.inverse'] ?? '#ffffff')
            : '#ffffff';
          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className="flex flex-col items-start p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all duration-150 text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${!activeTheme ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : ''}`}
                  style={activeTheme ? { background: iconBg, color: iconTextColor } : { color: '#ffffff' }}
                >
                  <i className={`${template.icon} text-lg`} />
                </div>
                <span className="font-medium text-gray-900">{template.name}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{template.description}</p>
              <span className="mt-2 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {TEMPLATE_CATEGORIES.find(c => c.key === template.category)?.label || template.category}
              </span>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="mt-3 text-[11px] text-gray-500 text-center py-8">
          <i className="fa-solid fa-search text-3xl text-gray-300 mb-2" />
          <p>No templates match your search.</p>
        </div>
      )}
    </>
  );
}

export function DialogManager({
  shareDialogOpen,
  setShareDialogOpen,
  aboutOpen,
  setAboutOpen,
  cheatOpen,
  setCheatOpen,
  gettingStartedOpen,
  setGettingStartedOpen,
  canvasGuideOpen,
  setCanvasGuideOpen,
  iconLibraryOpen,
  setIconLibraryOpen,
  componentLibraryOpen,
  setComponentLibraryOpen,
  newDialogOpen,
  setNewDialogOpen,
  openDialogOpen,
  setOpenDialogOpen,
  templateBrowserOpen,
  setTemplateBrowserOpen,
  isCollaborative,
  roomId,
  selectedIconId,
  setSelectedIconId,
  iconSearch,
  setIconSearch,
  selectedComponentId,
  setSelectedComponentId,
  appVersion,
  onApplyTemplate,
  onLoadDesign,
  onStartCollaborativeSession,
  onLeaveCollaborativeSession,
  onCopyShareLink,
  templates,
  exportDialogOpen,
  setExportDialogOpen,
  currentSpec,
  activeTheme,
}: DialogManagerProps): JSX.Element {
  return (
    <>
      {/* Share / Collaboration Dialog */}
      <Modal open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} title="Share & Collaborate" size="md" variant="light">
        <div className="space-y-4">
          {isCollaborative ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                  <i className="fa-solid fa-check-circle" />
                  You're in a collaborative session
                </div>
                <p className="text-sm text-green-600">
                  Share this link with others to collaborate in real-time:
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${window.location.pathname}?room=${roomId}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={onCopyShareLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <i className="fa-regular fa-copy mr-1.5" />
                  Copy
                </button>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={onLeaveCollaborativeSession}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket mr-1.5" />
                  Leave collaborative session
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Start a collaborative session to work with others in real-time. 
                Everyone with the link can see and edit the design together.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                  <i className="fa-solid fa-users" />
                  Real-time collaboration features:
                </div>
                <ul className="text-sm text-blue-600 space-y-1 ml-6 list-disc">
                  <li>See other users' cursors in real-time</li>
                  <li>View who has what selected</li>
                  <li>Changes sync instantly across all users</li>
                  <li>Works with humans and AI agents</li>
                </ul>
              </div>
              <button
                onClick={onStartCollaborativeSession}
                className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all text-sm font-medium shadow-md"
              >
                <i className="fa-solid fa-play mr-2" />
                Start Collaborative Session
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* About Modal */}
      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About Vizail" size="sm" variant="light">
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-pen-nib text-white text-lg" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Vizail</p>
              <p className="text-xs text-gray-500">Version {appVersion}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">A visual canvas and layout editor for designing interfaces. Create, prototype, and export design specifications with real-time collaboration.</p>
          <p className="mt-3 text-[10px] text-gray-400">© {new Date().getFullYear()} Vizail. All rights reserved.</p>
        </div>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <Modal open={cheatOpen} onClose={() => setCheatOpen(false)} title="Keyboard Shortcuts" size="lg" variant="light">
        <div className="grid grid-cols-2 gap-6">
          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <i className="fa-solid fa-arrows-up-down-left-right text-blue-400" />
              Navigation
            </h3>
            <div className="space-y-1.5">
              {[
                ['Click', 'Select element'],
                ['Shift / Ctrl + Click', 'Multi-select'],
                ['Drag empty space', 'Marquee select'],
                ['Space + Drag', 'Pan canvas'],
                ['Middle mouse drag', 'Pan canvas'],
                ['Alt + Drag', 'Pan canvas'],
                ['Scroll wheel', 'Zoom (cursor focus)'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-600">{desc}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-500 font-mono whitespace-nowrap">{key}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <i className="fa-solid fa-wand-magic-sparkles text-purple-400" />
              Tool Shortcuts
            </h3>
            <div className="space-y-1.5">
              {[
                ['V', 'Select tool'],
                ['R', 'Rectangle'],
                ['O', 'Ellipse'],
                ['L', 'Line'],
                ['P', 'Curve / Pen'],
                ['T', 'Text'],
                ['I', 'Image'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-600">{desc}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-500 font-mono">{key}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Transform */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <i className="fa-solid fa-up-right-and-down-left-from-center text-green-400" />
              Transform
            </h3>
            <div className="space-y-1.5">
              {[
                ['Drag handles', 'Resize element'],
                ['Shift + Drag', 'Maintain aspect ratio'],
                ['Alt + Drag', 'Resize from center'],
                ['Shift + Alt + Drag', 'Center + aspect ratio'],
                ['Rotation handle', 'Rotate (snaps 0/90/180/270)'],
                ['Arrows', 'Nudge 1px'],
                ['Shift + Arrows', 'Nudge 10px'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-600">{desc}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-500 font-mono whitespace-nowrap">{key}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <i className="fa-solid fa-bolt text-amber-400" />
              Actions
            </h3>
            <div className="space-y-1.5">
              {[
                ['⌘ + Z', 'Undo'],
                ['⌘ + Shift + Z', 'Redo'],
                ['⌘ + C', 'Copy'],
                ['⌘ + V', 'Paste'],
                ['⌘ + D', 'Duplicate'],
                ['⌘ + G', 'Group selection'],
                ['⌘ + Shift + G', 'Ungroup'],
                ['Delete / Backspace', 'Delete selected'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-600">{desc}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-500 font-mono whitespace-nowrap">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawing tips */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <i className="fa-solid fa-lightbulb text-yellow-400" />
            Drawing Tips
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              ['Rectangle / Ellipse', 'Drag to draw; Shift = square/circle; Alt = center-out'],
              ['Line', 'Click and drag to draw a straight line'],
              ['Curve', 'Click to add points; Enter or double-click to finish'],
              ['Text / Image', 'Click to place at cursor position'],
              ['Images', 'Non-uniform stretch disables aspect lock; right-click to restore'],
            ].map(([tool, tip]) => (
              <div key={tool} className="text-[12px]">
                <span className="font-medium text-gray-700">{tool}:</span>{' '}
                <span className="text-gray-500">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Getting Started Modal */}
      <Modal open={gettingStartedOpen} onClose={() => setGettingStartedOpen(false)} title="Getting Started" size="lg" variant="light">
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Welcome to Vizail! Here's a quick overview to get you up and running.</p>

          <div className="grid grid-cols-1 gap-4">
            {[
              {
                icon: 'fa-solid fa-pen-ruler',
                color: 'from-blue-500 to-cyan-400',
                title: 'Create Designs',
                desc: 'Use the left toolbar to select drawing tools — rectangles, ellipses, lines, curves, and text. Click or drag on the canvas to place elements.',
              },
              {
                icon: 'fa-solid fa-layer-group',
                color: 'from-purple-500 to-pink-400',
                title: 'Organize with Layers',
                desc: 'Group elements with ⌘G and ungroup with ⌘⇧G. Use the right sidebar to inspect and adjust properties of selected elements.',
              },
              {
                icon: 'fa-solid fa-palette',
                color: 'from-amber-500 to-orange-400',
                title: 'Apply Themes',
                desc: 'Switch to the Theme tab in the right sidebar to browse and apply color palettes. Themes propagate to all canvas elements automatically.',
              },
              {
                icon: 'fa-solid fa-puzzle-piece',
                color: 'from-green-500 to-emerald-400',
                title: 'Use Components & Templates',
                desc: 'Open the component or template library from File menu to quickly scaffold designs. Templates come pre-styled with the active theme.',
              },
              {
                icon: 'fa-solid fa-users',
                color: 'from-cyan-500 to-blue-400',
                title: 'Collaborate in Real-Time',
                desc: 'Click Share to start or join a collaborative session. Changes sync instantly across all participants — both humans and AI agents.',
              },
              {
                icon: 'fa-solid fa-file-export',
                color: 'from-rose-500 to-pink-400',
                title: 'Export Your Work',
                desc: 'Export your design as JSON, PNG, or SVG from File → Export. Save your work at any time with ⌘S.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 items-start">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <i className={`${item.icon} text-white text-sm`} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-gray-800">{item.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700 flex items-center gap-1.5">
              <i className="fa-solid fa-lightbulb text-blue-400" />
              <strong>Tip:</strong> Press <kbd className="px-1 py-0.5 rounded bg-white border border-blue-200 text-[10px] font-mono">?</kbd> at any time to open keyboard shortcuts.
            </p>
          </div>
        </div>
      </Modal>

      {/* Canvas Tools Guide Modal */}
      <Modal open={canvasGuideOpen} onClose={() => setCanvasGuideOpen(false)} title="Canvas Tools Guide" size="lg" variant="light">
        <div className="space-y-5">
          <p className="text-sm text-gray-600">A detailed guide to each tool available in the canvas editor.</p>

          {[
            {
              icon: 'fa-solid fa-arrow-pointer',
              key: 'V',
              title: 'Select Tool',
              color: 'text-gray-600',
              details: [
                'Click any element to select it',
                'Hold Shift or Ctrl to add to the selection',
                'Drag on empty space to create a marquee selection box',
                'Drag selected elements to move them',
                'Use corner handles to resize; edge handles for single-axis resize',
              ],
            },
            {
              icon: 'fa-regular fa-square',
              key: 'R',
              title: 'Rectangle Tool',
              color: 'text-blue-500',
              details: [
                'Click and drag to draw a rectangle',
                'Hold Shift while dragging for a perfect square',
                'Hold Alt to draw from center outward',
                'Combine Shift + Alt for a centered square',
                'Adjust corner radius in the right sidebar after drawing',
              ],
            },
            {
              icon: 'fa-regular fa-circle',
              key: 'O',
              title: 'Ellipse Tool',
              color: 'text-purple-500',
              details: [
                'Click and drag to draw an ellipse',
                'Hold Shift for a perfect circle',
                'Hold Alt to draw from center outward',
              ],
            },
            {
              icon: 'fa-solid fa-minus',
              key: 'L',
              title: 'Line Tool',
              color: 'text-green-500',
              details: [
                'Click and drag to draw a straight line',
                'Adjust stroke width and color in the right sidebar',
              ],
            },
            {
              icon: 'fa-solid fa-bezier-curve',
              key: 'P',
              title: 'Curve / Pen Tool',
              color: 'text-amber-500',
              details: [
                'Click to place anchor points along a path',
                'Press Enter or double-click the last point to finish',
                'Creates smooth, editable vector curves',
              ],
            },
            {
              icon: 'fa-solid fa-font',
              key: 'T',
              title: 'Text Tool',
              color: 'text-rose-500',
              details: [
                'Click on the canvas to place a text element',
                'Double-click an existing text to edit it inline',
                'Change font family, size, weight, and color in the sidebar',
                'Supports theme-aware font propagation',
              ],
            },
            {
              icon: 'fa-regular fa-image',
              key: 'I',
              title: 'Image Tool',
              color: 'text-cyan-500',
              details: [
                'Click on the canvas to place an image placeholder',
                'Upload or paste an image URL in the sidebar',
                'Drag handles to resize; Shift to maintain aspect ratio',
              ],
            },
          ].map((tool) => (
            <div key={tool.key} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <i className={`${tool.icon} ${tool.color} w-4`} />
                <h4 className="text-sm font-semibold text-gray-800">{tool.title}</h4>
                <kbd className="ml-auto px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-500 font-mono">{tool.key}</kbd>
              </div>
              <ul className="space-y-1 ml-6">
                {tool.details.map((d, i) => (
                  <li key={i} className="text-xs text-gray-500 list-disc leading-relaxed">{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>

      {/* Icon Library Modal */}
      <Modal open={iconLibraryOpen} onClose={() => setIconLibraryOpen(false)} title="Icons" size="md" variant="light">
        <p className="text-xs text-gray-600 mb-3">Choose an icon to place on the canvas.</p>
        <div className="relative mb-3">
          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
          <input
            value={iconSearch}
            onChange={(e) => setIconSearch(e.target.value)}
            placeholder="Search icons..."
            className="w-full border border-gray-200 rounded-md pl-7 pr-2 py-2 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
        </div>
        {(() => {
          const q = iconSearch.trim().toLowerCase();
          const filteredIcons = q
            ? ICON_LIBRARY.filter((icon) => icon.label.toLowerCase().includes(q) || icon.id.toLowerCase().includes(q))
            : ICON_LIBRARY;

          return (
            <>
              <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {filteredIcons.map((icon) => {
                  const [w, h, , , d] = icon.icon.icon;
                  const path = Array.isArray(d) ? d.join(' ') : d;
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => {
                        setSelectedIconId(icon.id);
                        setIconLibraryOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[10px] transition-colors ${
                        selectedIconId === icon.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <svg viewBox={`0 0 ${w} ${h}`} className="w-4 h-4" fill="currentColor" aria-hidden="true">
                        <path d={path} />
                      </svg>
                      <span className="truncate w-full text-center">{icon.label}</span>
                    </button>
                  );
                })}
              </div>
              {filteredIcons.length === 0 && (
                <div className="mt-3 text-[11px] text-gray-500">No icons match "{iconSearch}".</div>
              )}
            </>
          );
        })()}
      </Modal>

      {/* Component Library Modal */}
      <Modal open={componentLibraryOpen} onClose={() => setComponentLibraryOpen(false)} title="Components" size="md" variant="light">
        <p className="text-xs text-gray-600 mb-3">Choose a component to place on the canvas.</p>
        <ComponentLibraryBrowser
          selectedComponentId={selectedComponentId}
          onSelect={(id) => {
            setSelectedComponentId(id);
            setComponentLibraryOpen(false);
          }}
        />
      </Modal>

      {/* New Design Template Dialog */}
      <Modal open={newDialogOpen} onClose={() => setNewDialogOpen(false)} title="Create New Design" size="lg" variant="light">
        <p className="text-sm text-gray-600 mb-4">Choose a template to get started:</p>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {templates.map((template) => {
            const iconBg = activeTheme
              ? `linear-gradient(135deg, ${activeTheme.colors['color.accent.primary'] ?? '#3b82f6'}, ${activeTheme.colors['color.accent.secondary'] ?? '#06b6d4'})`
              : undefined;
            const iconTextColor = activeTheme
              ? (activeTheme.colors['color.text.inverse'] ?? '#ffffff')
              : '#ffffff';
            return (
              <button
                key={template.id}
                onClick={() => onApplyTemplate(template.id)}
                className="flex flex-col items-start p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all duration-150 text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${!activeTheme ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : ''}`}
                    style={activeTheme ? { background: iconBg, color: iconTextColor } : { color: '#ffffff' }}
                  >
                    <i className={`${template.icon} text-lg`} />
                  </div>
                  <span className="font-medium text-gray-900">{template.name}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{template.description}</p>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Open Design Dialog */}
      <Modal open={openDialogOpen} onClose={() => setOpenDialogOpen(false)} title="Open Design" size="lg" variant="light">
        <p className="text-sm text-gray-600 mb-4">Select a saved design to open:</p>
        {(() => {
          const designs = getSavedDesigns();
          if (designs.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                <i className="fa-regular fa-folder-open text-4xl mb-3 text-gray-300" />
                <p>No saved designs yet.</p>
                <p className="text-sm mt-1">Use "Save" or "Save As" to save your work.</p>
              </div>
            );
          }
          return (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {designs
                .sort((a, b) => b.savedAt - a.savedAt)
                .map((design) => (
                  <button
                    key={design.name}
                    onClick={() => onLoadDesign(design)}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all duration-150 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                        <i className="fa-regular fa-file text-lg" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 block">{design.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(design.savedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <i className="fa-solid fa-arrow-right text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
            </div>
          );
        })()}
      </Modal>

      {/* Template Browser Dialog */}
      <Modal open={templateBrowserOpen} onClose={() => setTemplateBrowserOpen(false)} title="Template Browser" size="lg" variant="light">
        <TemplateBrowser
          templates={templates}
          activeTheme={activeTheme}
          onSelectTemplate={(templateId) => {
            onApplyTemplate(templateId);
            setTemplateBrowserOpen(false);
          }}
        />
      </Modal>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        spec={currentSpec}
      />
    </>
  );
}
