import { useState, type JSX } from "react";
import { Modal } from "../Modal";
import type { LayoutSpec } from "../../layout-schema";
import type { SavedDesign } from "../../utils/persistence";
import { getSavedDesigns } from "../../utils/persistence";
import { COMPONENT_LIBRARY, ICON_LIBRARY } from "../../library";
import { ExportDialog } from "../ExportDialog";

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
        {filtered.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className="flex flex-col items-start p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all duration-150 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <i className={`${template.icon} text-lg`} />
              </div>
              <span className="font-medium text-gray-900">{template.name}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{template.description}</p>
            <span className="mt-2 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {TEMPLATE_CATEGORIES.find(c => c.key === template.category)?.label || template.category}
            </span>
          </button>
        ))}
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
        <p><strong>Vizail</strong> version <code>{appVersion}</code></p>
        <p className="mt-2">Experimental canvas + layout editor. Transforms are baked to schema on release.</p>
        <p className="mt-4 opacity-70 text-[10px]">© {new Date().getFullYear()} Vizail</p>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <Modal open={cheatOpen} onClose={() => setCheatOpen(false)} title="Interaction Cheatsheet" size="sm" variant="light">
        <ul className="space-y-1 list-disc pl-4 pr-1 max-h-72 overflow-auto text-xs">
          <li>Select: Click; Shift/Ctrl multi; marquee drag empty space.</li>
          <li>Pan: Space+Drag / Middle / Alt+Drag.</li>
          <li>Zoom: Wheel (cursor focus).</li>
          <li>Resize: Drag handles; Shift=aspect; Alt=center; Shift+Alt=center+aspect.</li>
          <li>Rotate: Handle (snaps 0/90/180/270).</li>
          <li>Images: Non-uniform stretch disables aspect; context menu to restore.</li>
          <li><strong>Tool Shortcuts:</strong> V=Select, R=Rectangle, O=Ellipse, L=Line, P=Curve, T=Text, I=Image.</li>
          <li>Rectangle/Ellipse: Drag to draw; Shift=circle/square; Alt=center-out.</li>
          <li>Line: Click and drag to draw a straight line.</li>
          <li>Curve: Click to add points, Enter or double-click to finish.</li>
          <li>Text/Image: Click to place at cursor position.</li>
          <li>Group: Ctrl/Cmd+G; Ungroup: Ctrl/Cmd+Shift+G.</li>
          <li>Duplicate: Ctrl/Cmd+D. Delete: Del/Backspace.</li>
          <li>Nudge: Arrows (1px) / Shift+Arrows (10px).</li>
        </ul>
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
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onApplyTemplate(template.id)}
              className="flex flex-col items-start p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all duration-150 text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                  <i className={`${template.icon} text-lg`} />
                </div>
                <span className="font-medium text-gray-900">{template.name}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{template.description}</p>
            </button>
          ))}
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
