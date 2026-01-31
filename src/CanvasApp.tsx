import { useCallback, useRef, useState, useEffect } from "react";
import { findNode, updateNode } from './utils/specUtils';
import RectAttributesPanel from './components/RectAttributesPanel';
import EllipseAttributesPanel from './components/EllipseAttributesPanel';
import LineAttributesPanel from './components/LineAttributesPanel';
import CurveAttributesPanel from './components/CurveAttributesPanel';
import TextAttributesPanel from './components/TextAttributesPanel';
import ImageAttributesPanel from './components/ImageAttributesPanel';
import DefaultsPanel from './components/DefaultsPanel';
import { usePersistentRectDefaults } from './hooks/usePersistentRectDefaults';
import { useRecentColors } from './hooks/useRecentColors';
import { useDesignPersistence } from './hooks/useDesignPersistence';
import { useSelection } from './hooks/useSelection';
import { Modal } from "./components/Modal";
import { logger } from "./utils/logger";
import { dashArrayToInput } from './utils/paint';
import CanvasStage from "./canvas/CanvasStage.tsx";
import type { LayoutSpec } from "./layout-schema.ts";
import { saveNamedDesign, getSavedDesigns, loadNamedDesign, getCurrentDesignName, setCurrentDesignName, type SavedDesign } from './utils/persistence';

// Extracted hook
import useElementSize from './hooks/useElementSize';

function buildInitialSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 1600, height: 1200 },
      background: undefined, // No background - let the grid show through
      children: [],
    },
  };
}

// Template definitions for New dialog
const TEMPLATES: { id: string; name: string; icon: string; description: string; build: () => LayoutSpec }[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    icon: 'fa-regular fa-file',
    description: 'Start with an empty canvas',
    build: () => ({
      root: { id: "root", type: "frame", size: { width: 1600, height: 1200 }, background: undefined, children: [] }
    }),
  },
  {
    id: 'top-nav',
    name: 'Top Nav Website',
    icon: 'fa-solid fa-window-maximize',
    description: 'Website layout with top navigation bar',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1440, height: 900 }, background: undefined,
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 1440, height: 900 }, fill: "#f9fafb", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "nav", type: "rect", position: { x: 0, y: 0 }, size: { width: 1440, height: 64 }, fill: "#1e293b", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "nav-logo", type: "text", text: "Logo", variant: "h2", position: { x: 32, y: 18 }, size: { width: 100, height: 28 }, color: "#ffffff" },
          { id: "nav-link1", type: "text", text: "Home", variant: "body", position: { x: 200, y: 22 }, size: { width: 60, height: 20 }, color: "#94a3b8" },
          { id: "nav-link2", type: "text", text: "Features", variant: "body", position: { x: 280, y: 22 }, size: { width: 70, height: 20 }, color: "#94a3b8" },
          { id: "nav-link3", type: "text", text: "Pricing", variant: "body", position: { x: 370, y: 22 }, size: { width: 60, height: 20 }, color: "#94a3b8" },
          { id: "hero", type: "rect", position: { x: 0, y: 64 }, size: { width: 1440, height: 400 }, fill: "#e0f2fe", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "hero-title", type: "text", text: "Welcome to Our Platform", variant: "h1", position: { x: 120, y: 180 }, size: { width: 500, height: 48 }, color: "#0c4a6e" },
          { id: "hero-subtitle", type: "text", text: "Build amazing things with our tools", variant: "body", position: { x: 120, y: 240 }, size: { width: 400, height: 24 }, color: "#0369a1" },
          { id: "content", type: "rect", position: { x: 120, y: 520 }, size: { width: 1200, height: 320 }, fill: "#ffffff", stroke: "#e5e7eb", strokeWidth: 1, radius: 12, opacity: 1 },
        ],
      }
    }),
  },
  {
    id: 'left-nav',
    name: 'Left Nav Website',
    icon: 'fa-solid fa-table-columns',
    description: 'Dashboard-style layout with left sidebar',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1440, height: 900 }, background: undefined,
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 1440, height: 900 }, fill: "#f1f5f9", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "sidebar", type: "rect", position: { x: 0, y: 0 }, size: { width: 240, height: 900 }, fill: "#1e293b", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "sidebar-logo", type: "text", text: "Dashboard", variant: "h2", position: { x: 24, y: 24 }, size: { width: 180, height: 28 }, color: "#ffffff" },
          { id: "nav-item1", type: "rect", position: { x: 12, y: 80 }, size: { width: 216, height: 40 }, fill: "#334155", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "nav-text1", type: "text", text: "Overview", variant: "body", position: { x: 24, y: 90 }, size: { width: 150, height: 20 }, color: "#ffffff" },
          { id: "nav-text2", type: "text", text: "Analytics", variant: "body", position: { x: 24, y: 140 }, size: { width: 150, height: 20 }, color: "#94a3b8" },
          { id: "nav-text3", type: "text", text: "Settings", variant: "body", position: { x: 24, y: 180 }, size: { width: 150, height: 20 }, color: "#94a3b8" },
          { id: "header", type: "rect", position: { x: 240, y: 0 }, size: { width: 1200, height: 64 }, fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 1, radius: 0, opacity: 1 },
          { id: "header-title", type: "text", text: "Overview", variant: "h2", position: { x: 272, y: 18 }, size: { width: 200, height: 28 }, color: "#0f172a" },
          { id: "card1", type: "rect", position: { x: 272, y: 96 }, size: { width: 280, height: 160 }, fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "card2", type: "rect", position: { x: 576, y: 96 }, size: { width: 280, height: 160 }, fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "card3", type: "rect", position: { x: 880, y: 96 }, size: { width: 280, height: 160 }, fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "main-content", type: "rect", position: { x: 272, y: 280 }, size: { width: 888, height: 580 }, fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 1, radius: 12, opacity: 1 },
        ],
      }
    }),
  },
  {
    id: '3-column',
    name: '3 Column Grid',
    icon: 'fa-solid fa-grip',
    description: 'Three column layout for content',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1200, height: 800 }, background: undefined,
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 1200, height: 800 }, fill: "#ffffff", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "header", type: "rect", position: { x: 0, y: 0 }, size: { width: 1200, height: 80 }, fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1, radius: 0, opacity: 1 },
          { id: "title", type: "text", text: "Page Title", variant: "h1", position: { x: 40, y: 24 }, size: { width: 300, height: 32 }, color: "#0f172a" },
          { id: "col1", type: "rect", position: { x: 40, y: 120 }, size: { width: 360, height: 640 }, fill: "#f1f5f9", stroke: "#e2e8f0", strokeWidth: 1, radius: 8, opacity: 1 },
          { id: "col1-title", type: "text", text: "Column 1", variant: "h2", position: { x: 60, y: 140 }, size: { width: 200, height: 24 }, color: "#334155" },
          { id: "col2", type: "rect", position: { x: 420, y: 120 }, size: { width: 360, height: 640 }, fill: "#f1f5f9", stroke: "#e2e8f0", strokeWidth: 1, radius: 8, opacity: 1 },
          { id: "col2-title", type: "text", text: "Column 2", variant: "h2", position: { x: 440, y: 140 }, size: { width: 200, height: 24 }, color: "#334155" },
          { id: "col3", type: "rect", position: { x: 800, y: 120 }, size: { width: 360, height: 640 }, fill: "#f1f5f9", stroke: "#e2e8f0", strokeWidth: 1, radius: 8, opacity: 1 },
          { id: "col3-title", type: "text", text: "Column 3", variant: "h2", position: { x: 820, y: 140 }, size: { width: 200, height: 24 }, color: "#334155" },
        ],
      }
    }),
  },
  {
    id: 'mobile-ui',
    name: 'Mobile UI Layout',
    icon: 'fa-solid fa-mobile-screen',
    description: 'Mobile app screen layout',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 800, height: 1000 }, background: undefined,
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 800, height: 1000 }, fill: "#e5e7eb", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "phone-frame", type: "rect", position: { x: 200, y: 40 }, size: { width: 390, height: 844 }, fill: "#ffffff", stroke: "#d1d5db", strokeWidth: 2, radius: 48, opacity: 1 },
          { id: "status-bar", type: "rect", position: { x: 200, y: 40 }, size: { width: 390, height: 44 }, fill: "#f9fafb", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "status-time", type: "text", text: "9:41", variant: "body", position: { x: 220, y: 52 }, size: { width: 50, height: 20 }, color: "#111827" },
          { id: "nav-bar", type: "rect", position: { x: 200, y: 84 }, size: { width: 390, height: 56 }, fill: "#ffffff", stroke: "#e5e7eb", strokeWidth: 1, radius: 0, opacity: 1 },
          { id: "nav-title", type: "text", text: "Home", variant: "h2", position: { x: 340, y: 100 }, size: { width: 100, height: 24 }, color: "#111827" },
          { id: "content-card1", type: "rect", position: { x: 216, y: 160 }, size: { width: 358, height: 120 }, fill: "#f3f4f6", stroke: "#e5e7eb", strokeWidth: 1, radius: 16, opacity: 1 },
          { id: "content-card2", type: "rect", position: { x: 216, y: 300 }, size: { width: 358, height: 120 }, fill: "#f3f4f6", stroke: "#e5e7eb", strokeWidth: 1, radius: 16, opacity: 1 },
          { id: "content-card3", type: "rect", position: { x: 216, y: 440 }, size: { width: 358, height: 120 }, fill: "#f3f4f6", stroke: "#e5e7eb", strokeWidth: 1, radius: 16, opacity: 1 },
          { id: "tab-bar", type: "rect", position: { x: 200, y: 800 }, size: { width: 390, height: 84 }, fill: "#ffffff", stroke: "#e5e7eb", strokeWidth: 1, radius: 0, opacity: 1 },
          { id: "home-indicator", type: "rect", position: { x: 340, y: 860 }, size: { width: 120, height: 5 }, fill: "#1f2937", stroke: undefined, strokeWidth: 0, radius: 3, opacity: 1 },
        ],
      }
    }),
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Layout',
    icon: 'fa-solid fa-cart-shopping',
    description: 'Online store product grid layout',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1440, height: 1000 }, background: undefined,
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 1440, height: 1000 }, fill: "#ffffff", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "header", type: "rect", position: { x: 0, y: 0 }, size: { width: 1440, height: 72 }, fill: "#111827", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "logo", type: "text", text: "STORE", variant: "h1", position: { x: 60, y: 20 }, size: { width: 120, height: 32 }, color: "#ffffff" },
          { id: "search", type: "rect", position: { x: 400, y: 18 }, size: { width: 400, height: 36 }, fill: "#374151", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "search-text", type: "text", text: "Search products...", variant: "body", position: { x: 416, y: 26 }, size: { width: 200, height: 20 }, color: "#9ca3af" },
          { id: "cart-btn", type: "rect", position: { x: 1320, y: 18 }, size: { width: 80, height: 36 }, fill: "#3b82f6", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "cart-text", type: "text", text: "Cart", variant: "body", position: { x: 1340, y: 26 }, size: { width: 40, height: 20 }, color: "#ffffff" },
          { id: "category-nav", type: "rect", position: { x: 0, y: 72 }, size: { width: 1440, height: 48 }, fill: "#f9fafb", stroke: "#e5e7eb", strokeWidth: 1, radius: 0, opacity: 1 },
          { id: "cat1", type: "text", text: "All", variant: "body", position: { x: 60, y: 84 }, size: { width: 40, height: 24 }, color: "#111827" },
          { id: "cat2", type: "text", text: "Electronics", variant: "body", position: { x: 120, y: 84 }, size: { width: 80, height: 24 }, color: "#6b7280" },
          { id: "cat3", type: "text", text: "Clothing", variant: "body", position: { x: 220, y: 84 }, size: { width: 70, height: 24 }, color: "#6b7280" },
          { id: "cat4", type: "text", text: "Home", variant: "body", position: { x: 310, y: 84 }, size: { width: 50, height: 24 }, color: "#6b7280" },
          { id: "product1", type: "rect", position: { x: 60, y: 160 }, size: { width: 320, height: 380 }, fill: "#f9fafb", stroke: "#e5e7eb", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "product1-img", type: "rect", position: { x: 76, y: 176 }, size: { width: 288, height: 220 }, fill: "#e5e7eb", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "product1-name", type: "text", text: "Product Name", variant: "h2", position: { x: 76, y: 420 }, size: { width: 200, height: 24 }, color: "#111827" },
          { id: "product1-price", type: "text", text: "$99.00", variant: "body", position: { x: 76, y: 456 }, size: { width: 80, height: 20 }, color: "#059669" },
          { id: "product2", type: "rect", position: { x: 400, y: 160 }, size: { width: 320, height: 380 }, fill: "#f9fafb", stroke: "#e5e7eb", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "product2-img", type: "rect", position: { x: 416, y: 176 }, size: { width: 288, height: 220 }, fill: "#e5e7eb", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "product2-name", type: "text", text: "Product Name", variant: "h2", position: { x: 416, y: 420 }, size: { width: 200, height: 24 }, color: "#111827" },
          { id: "product2-price", type: "text", text: "$149.00", variant: "body", position: { x: 416, y: 456 }, size: { width: 80, height: 20 }, color: "#059669" },
          { id: "product3", type: "rect", position: { x: 740, y: 160 }, size: { width: 320, height: 380 }, fill: "#f9fafb", stroke: "#e5e7eb", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "product3-img", type: "rect", position: { x: 756, y: 176 }, size: { width: 288, height: 220 }, fill: "#e5e7eb", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "product3-name", type: "text", text: "Product Name", variant: "h2", position: { x: 756, y: 420 }, size: { width: 200, height: 24 }, color: "#111827" },
          { id: "product3-price", type: "text", text: "$79.00", variant: "body", position: { x: 756, y: 456 }, size: { width: 80, height: 20 }, color: "#059669" },
          { id: "product4", type: "rect", position: { x: 1080, y: 160 }, size: { width: 320, height: 380 }, fill: "#f9fafb", stroke: "#e5e7eb", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "product4-img", type: "rect", position: { x: 1096, y: 176 }, size: { width: 288, height: 220 }, fill: "#e5e7eb", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "product4-name", type: "text", text: "Product Name", variant: "h2", position: { x: 1096, y: 420 }, size: { width: 200, height: 24 }, color: "#111827" },
          { id: "product4-price", type: "text", text: "$199.00", variant: "body", position: { x: 1096, y: 456 }, size: { width: 80, height: 20 }, color: "#059669" },
        ],
      }
    }),
  },
];

export default function CanvasApp() {
  const { spec, setSpec, reset: resetSpec } = useDesignPersistence({ buildInitial: buildInitialSpec });
  const [tool, setTool] = useState<string>("select");
  const { selection: selectedIds, setSelection } = useSelection();
  // Rectangle default attributes (persisted)
  const { defaults: rectDefaults, update: updateRectDefaults } = usePersistentRectDefaults({ fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 0, opacity: 1, strokeDash: undefined });
  // Remember last non-undefined colors so toggling off/on restores previous value
  const [lastFillById, setLastFillById] = useState<Record<string,string>>({});
  const [lastStrokeById, setLastStrokeById] = useState<Record<string,string>>({});
  // (Removed lastDefaultFill/Stroke state – now encapsulated in DefaultsPanel)
  // Recent colors via hook
  const { recentColors, beginSession: beginRecentSession, previewColor: previewRecent, commitColor: commitRecent } = useRecentColors();
  // Raw dash pattern input (for both selected rect and defaults) to preserve user typing
  const [rawDashInput, setRawDashInput] = useState<string>('');
  const [canvasRef, canvasSize] = useElementSize<HTMLDivElement>(); // State for default last colors moved into DefaultsPanel component
  const [helpOpen, setHelpOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false); // New design template dialog
  const [openDialogOpen, setOpenDialogOpen] = useState(false); // Open design dialog
  const [currentDesignName, setCurrentDesignNameState] = useState<string | null>(getCurrentDesignName);
  const [fitToContentKey, setFitToContentKey] = useState(0); // Increment to trigger fit-to-content in CanvasStage
  // Curve control point selection
  const [selectedCurvePointIndex, setSelectedCurvePointIndex] = useState<number | null>(null);
  const appVersion = (import.meta as any).env?.VITE_APP_VERSION || '0.0.0';

  const pushRecent = useCallback((col: string) => { commitRecent(col); }, [commitRecent]);

  // Clear curve point selection when selection changes
  useEffect(() => {
    setSelectedCurvePointIndex(null);
  }, [selectedIds]);

  // Debug: log spec on mount
  useEffect(() => {
    logger.debug('CanvasApp mount: root children', spec.root.children.map(c => c.id));
  }, []);

  useEffect(() => {
    logger.debug('CanvasApp size', canvasSize.width, canvasSize.height);
  }, [canvasSize.width, canvasSize.height]);

  // Load persisted defaults once
  // (Removed legacy load of rect defaults – handled in hook)

  // (Removed duplicate localStorage persistence effects – hooks handle persistence internally)

  // Keep root frame sized to at least viewport to avoid gray background gaps
  useEffect(() => {
    setSpec(prev => {
      const root = prev.root;
      const need = root.size?.width !== canvasSize.width || root.size?.height !== canvasSize.height;
      if (!need) return prev;
      return { ...prev, root: { ...root, size: { width: canvasSize.width, height: canvasSize.height } } };
    });
  }, [canvasSize.width, canvasSize.height]);

  // Sync raw dash input based on selection / tool changes
  useEffect(() => {
    // If exactly one rectangle selected, mirror its strokeDash
    if (selectedIds.length === 1) {
      const node = findNode(spec.root as any, selectedIds[0]) as any;
      if (node && node.type === 'rect') {
        const dashStr = dashArrayToInput(node.strokeDash as number[] | undefined);
        setRawDashInput(prev => prev === dashStr ? prev : dashStr);
        return;
      }
    }
    // If no selection and rect tool active, show defaults value
    if (selectedIds.length === 0 && tool === 'rect') {
      const dashStr = dashArrayToInput(rectDefaults.strokeDash as number[] | undefined);
      setRawDashInput(prev => prev === dashStr ? prev : dashStr);
      return;
    }
    // Otherwise don't overwrite user input (e.g., multi-select or other tool)
  }, [selectedIds, tool, rectDefaults.strokeDash, spec.root]);

  // File menu handlers
  const fileAction = useCallback((action: string) => {
    if (action === "new") {
      setNewDialogOpen(true);
      logger.info('File action new: opening template dialog');
    }
    if (action === 'open') {
      setOpenDialogOpen(true);
      logger.info('File action open: opening saved designs dialog');
    }
    if (action === 'save') {
      if (currentDesignName) {
        // Save to existing name
        saveNamedDesign(currentDesignName, spec);
        logger.info(`Saved design: ${currentDesignName}`);
      } else {
        // No current name, prompt for one (like Save As)
        const name = window.prompt("Save: Enter a name for this design", "Untitled Design");
        if (name && name.trim()) {
          saveNamedDesign(name.trim(), spec);
          setCurrentDesignNameState(name.trim());
          setCurrentDesignName(name.trim());
          logger.info(`Saved new design: ${name.trim()}`);
        }
      }
    }
    if (action === 'saveAs') {
      const defaultName = currentDesignName ? `${currentDesignName} (copy)` : "Untitled Design";
      const name = window.prompt("Save As: Enter a name for this design", defaultName);
      if (name && name.trim()) {
        saveNamedDesign(name.trim(), spec);
        setCurrentDesignNameState(name.trim());
        setCurrentDesignName(name.trim());
        logger.info(`Saved design as: ${name.trim()}`);
      }
    }
  }, [spec, currentDesignName]);

  // Load a saved design
  const loadDesign = useCallback((design: SavedDesign) => {
    setSpec(design.spec);
    setCurrentDesignNameState(design.name);
    setCurrentDesignName(design.name);
    setSelection([]);
    setOpenDialogOpen(false);
    setTimeout(() => setFitToContentKey(k => k + 1), 50);
    logger.info(`Loaded design: ${design.name}`);
  }, [setSpec, setSelection]);

  // Apply a template from the New dialog
  const applyTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const newSpec = template.build();
      setSpec(newSpec);
      setSelection([]);
      // Trigger fit-to-content after a small delay to ensure spec is applied
      setTimeout(() => setFitToContentKey(k => k + 1), 50);
      logger.info(`Applied template: ${template.name}`);
    }
    setNewDialogOpen(false);
  }, [setSpec, setSelection]);


  // Derive stage width/height from container size (padding adjustments if needed)
  const stageWidth = Math.max(0, canvasSize.width);
  const stageHeight = Math.max(0, canvasSize.height);

  // Close menus on global ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      
      if (e.key === 'Escape') {
        setHelpOpen(false);
        setFileOpen(false);
        if (tool !== 'select') setTool('select');
      }
      // Tool shortcuts (no modifiers)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') setTool('select'); // V for select (pointer)
        if (key === 'r') setTool(prev => prev === 'rect' ? 'select' : 'rect');
        if (key === 'o') setTool(prev => prev === 'ellipse' ? 'select' : 'ellipse'); // O for oval/ellipse
        if (key === 'l') setTool(prev => prev === 'line' ? 'select' : 'line');
        if (key === 'p') setTool(prev => prev === 'curve' ? 'select' : 'curve'); // P for pen/path
        if (key === 't') setTool(prev => prev === 'text' ? 'select' : 'text');
        if (key === 'i') setTool(prev => prev === 'image' ? 'select' : 'image');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool]);

  // Outside click for menus
  const headerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
        setFileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100 text-gray-900 flex flex-col">
      {/* Header */}
      <header ref={headerRef} className="flex items-center justify-between border-b border-blue-900/30 bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-700 shadow-lg select-none" style={{ padding: '20px' }}>
        <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center shadow-sm">
                <i className="fa-solid fa-pen-nib text-cyan-300 text-lg" />
              </div>
              <h1 className="tracking-wide text-white" style={{ fontFamily: '"Cal Sans", "Cal Sans Semibold", sans-serif', fontWeight: 600, fontSize: '2em' }}>Visual Flow</h1>
            </div>
            {/* File menu */}
            <div className="relative">
              <button
                onClick={() => setFileOpen(o => !o)}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10 ${fileOpen ? 'bg-white/10' : ''}`}
                aria-haspopup="true"
                aria-expanded={fileOpen}
              >
                <i className="fa-regular fa-folder mr-1.5 text-cyan-300" />
                File
                <i className="fa-solid fa-chevron-down ml-1.5 text-[10px] text-white/50" />
              </button>
              {fileOpen && (
                <div className="absolute left-0 mt-1.5 w-48 rounded-lg border border-gray-200 bg-white shadow-xl z-30 p-1.5 flex flex-col overflow-hidden">
                  {[
                    ["fa-regular fa-file", "New", "new", "⌘N"],
                    ["fa-regular fa-folder-open", "Open…", "open", "⌘O"],
                    ["fa-regular fa-floppy-disk", "Save", "save", "⌘S"],
                    ["fa-solid fa-file-export", "Save As…", "saveAs", "⇧⌘S"],
                  ].map(([icon, label, act, shortcut]) => (
                    <button
                      key={act}
                      onClick={() => { fileAction(act); setFileOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors duration-100"
                    >
                      <span className="flex items-center gap-2.5">
                        <i className={`${icon} text-gray-500 w-4`} />
                        {label}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{shortcut}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Help menu */}
            <div className="relative">
              <button
                onClick={() => setHelpOpen(o => !o)}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10 ${helpOpen ? 'bg-white/10' : ''}`}
                aria-haspopup="true"
                aria-expanded={helpOpen}
              >
                <i className="fa-regular fa-circle-question mr-1.5 text-cyan-300" />
                Help
                <i className="fa-solid fa-chevron-down ml-1.5 text-[10px] text-white/50" />
              </button>
              {helpOpen && (
                <div className="absolute left-0 mt-1.5 w-52 rounded-lg border border-gray-200 bg-white shadow-xl z-30 p-1.5 flex flex-col overflow-hidden">
                  <button
                    onClick={() => { setAboutOpen(true); setHelpOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors duration-100"
                  >
                    <i className="fa-solid fa-info-circle text-gray-500 w-4" />
                    About
                  </button>
                  <button
                    onClick={() => { setCheatOpen(true); setHelpOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors duration-100"
                  >
                    <i className="fa-regular fa-keyboard text-gray-500 w-4" />
                    Keyboard Shortcuts
                  </button>
                </div>
              )}
            </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-white/90 bg-white/15 backdrop-blur px-4 py-2 rounded-full border border-white/10">
          <i className="fa-solid fa-wand-magic-sparkles text-cyan-300" />
          <span className="capitalize">{tool}</span>
        </div>
      </header>
      {/* Modals */}
      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About Visual Flow" size="sm" variant="light">
        <p><strong>visual-flow</strong> version <code>{appVersion}</code></p>
        <p className="mt-2">Experimental canvas + layout editor. Transforms are baked to schema on release.</p>
        <p className="mt-4 opacity-70 text-[10px]">© {new Date().getFullYear()} visual-flow</p>
      </Modal>
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
      {/* New Design Template Dialog */}
      <Modal open={newDialogOpen} onClose={() => setNewDialogOpen(false)} title="Create New Design" size="lg" variant="light">
        <p className="text-sm text-gray-600 mb-4">Choose a template to get started:</p>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template.id)}
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
                    onClick={() => loadDesign(design)}
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
      {/* Body layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left toolbar */}
        <aside className="w-14 border-r border-gray-200 bg-gradient-to-b from-white to-gray-50 flex flex-col items-center py-3 gap-1 shadow-sm">
          {[
            ["fa-solid fa-arrow-pointer", "select", "Select (V)"],
            ["fa-regular fa-square", "rect", "Rectangle (R)"],
            ["fa-regular fa-circle", "ellipse", "Ellipse (O)"],
            ["fa-solid fa-minus", "line", "Line (L)"],
            ["fa-solid fa-bezier-curve", "curve", "Curve (P)"],
            ["fa-solid fa-font", "text", "Text (T)"],
            ["fa-regular fa-image", "image", "Image (I)"],
          ].map(([icon, val, tooltip]) => (
            <button
              key={val}
              onClick={() => setTool(val)}
              title={tooltip}
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
                tool === val 
                  ? "text-white" 
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {tool === val && (
                <span className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md" />
              )}
              <i className={`${icon} text-base relative z-10`} />
            </button>
          ))}
          <div className="flex-1" />
          <div className="w-8 h-px bg-gray-200 my-2" />
          <button
            onClick={() => setCheatOpen(true)}
            title="Keyboard shortcuts"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-150"
          >
            <i className="fa-regular fa-keyboard text-base" />
          </button>
        </aside>
        {/* Canvas center */}
        <main className="flex-1 relative min-w-0">
          <div ref={canvasRef} className="absolute inset-0">
            {stageWidth > 0 && stageHeight > 0 && (
              <CanvasStage
                tool={tool}
                spec={spec}
                setSpec={setSpec}
                width={stageWidth}
                height={stageHeight}
                onToolChange={setTool}
                selection={selectedIds}
                setSelection={setSelection}
                fitToContentKey={fitToContentKey}
                rectDefaults={{
                  fill: rectDefaults.fill,
                  stroke: rectDefaults.stroke,
                  strokeWidth: rectDefaults.strokeWidth ?? 1,
                  radius: rectDefaults.radius ?? 0,
                  opacity: rectDefaults.opacity ?? 1,
                  strokeDash: rectDefaults.strokeDash,
                }}
              />
            )}
          </div>
        </main>
        {/* Right attributes panel */}
        <aside className="w-72 border-l border-gray-200 bg-gradient-to-b from-white to-gray-50 flex flex-col shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <i className="fa-solid fa-sliders text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Attributes</span>
          </div>
          <div className="p-4 text-xs text-gray-600 space-y-4 overflow-auto flex-1">
            <div className="bg-gray-100/70 rounded-lg p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-info text-blue-400" />
                Context
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <span className="text-gray-400">Tool</span><span className="font-medium capitalize">{tool}</span>
                <span className="text-gray-400">Nodes</span><span className="font-medium">{spec.root.children.length}</span>
                <span className="text-gray-400">Selected</span><span className="font-medium">{selectedIds.length}</span>
              </div>
            </div>
            {selectedIds.length === 1 && (() => {
              // Find node
              const node = findNode(spec.root as any, selectedIds[0]);
              if (!node) return <div className="text-[11px] text-gray-400">Node not found.</div>;
              
              const createUpdateFn = (nodeId: string) => (patch: Record<string, any>) => {
                setSpec(prev => ({ ...prev, root: updateNode(prev.root as any, nodeId, patch) as any }));
              };
              
              if (node.type === 'rect') {
                const rect = node as any;
                const updateRect = createUpdateFn(rect.id);
                return (
                  <RectAttributesPanel
                    rect={rect}
                    lastFillById={lastFillById}
                    lastStrokeById={lastStrokeById}
                    setLastFillById={setLastFillById}
                    setLastStrokeById={setLastStrokeById}
                    updateRect={updateRect}
                    rawDashInput={rawDashInput}
                    setRawDashInput={setRawDashInput}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }
              
              if (node.type === 'ellipse') {
                const ellipse = node as any;
                const updateEllipse = createUpdateFn(ellipse.id);
                return (
                  <EllipseAttributesPanel
                    ellipse={ellipse}
                    lastFillById={lastFillById}
                    lastStrokeById={lastStrokeById}
                    setLastFillById={setLastFillById}
                    setLastStrokeById={setLastStrokeById}
                    updateNode={updateEllipse}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }
              
              if (node.type === 'line') {
                const line = node as any;
                const updateLine = createUpdateFn(line.id);
                return (
                  <LineAttributesPanel
                    line={line}
                    updateNode={updateLine}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }
              
              if (node.type === 'curve') {
                const curve = node as any;
                const updateCurve = createUpdateFn(curve.id);
                return (
                  <CurveAttributesPanel
                    curve={curve}
                    updateNode={updateCurve}
                    selectedPointIndex={selectedCurvePointIndex}
                    setSelectedPointIndex={setSelectedCurvePointIndex}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }
              
              if (node.type === 'text') {
                const textNode = node as any;
                const updateText = createUpdateFn(textNode.id);
                return (
                  <TextAttributesPanel
                    textNode={textNode}
                    updateNode={updateText}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }
              
              if (node.type === 'image') {
                const imageNode = node as any;
                const updateImage = createUpdateFn(imageNode.id);
                return (
                  <ImageAttributesPanel
                    imageNode={imageNode}
                    updateNode={updateImage}
                  />
                );
              }
              
              return <div className="text-[11px] text-gray-400">No editable attributes for type: {node.type}</div>;
            })()}
            {selectedIds.length !== 1 && tool==='rect' && selectedIds.length===0 && (
              <DefaultsPanel
                defaults={rectDefaults}
                updateDefaults={updateRectDefaults}
                beginRecentSession={beginRecentSession}
                previewRecent={previewRecent}
                commitRecent={commitRecent}
                recentColors={recentColors}
              />
            )}
            {selectedIds.length !== 1 && !(tool==='rect' && selectedIds.length===0) && (
              <div className="text-[11px] text-gray-400">{selectedIds.length === 0 ? 'No selection' : 'Multiple selection (attributes coming soon).'}</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
