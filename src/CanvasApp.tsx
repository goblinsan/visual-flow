import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import type { JSX } from "react";
import { findNode, updateNode, type SpecPatch } from './utils/specUtils';
import RectAttributesPanel from './components/RectAttributesPanel';
import EllipseAttributesPanel from './components/EllipseAttributesPanel';
import LineAttributesPanel from './components/LineAttributesPanel';
import CurveAttributesPanel from './components/CurveAttributesPanel';
import TextAttributesPanel from './components/TextAttributesPanel';
import ImageAttributesPanel from './components/ImageAttributesPanel';
import DefaultsPanel from './components/DefaultsPanel';
import { FlowAttributesPanel } from './components/FlowAttributesPanel';
import { usePersistentRectDefaults } from './hooks/usePersistentRectDefaults';
import { useRecentColors } from './hooks/useRecentColors';
import { useDesignPersistence } from './hooks/useDesignPersistence';
import { useSelection } from './hooks/useSelection';
import { Modal } from "./components/Modal";
import { logger } from "./utils/logger";
import { dashArrayToInput } from './utils/paint';
import CanvasStage from "./canvas/CanvasStage.tsx";
import type {
  LayoutSpec,
  LayoutNode,
  RectNode,
  EllipseNode,
  LineNode,
  CurveNode,
  TextNode,
  ImageNode,
  FlowTransition,
  Flow,
} from "./layout-schema.ts";
import { saveNamedDesign, getSavedDesigns, getCurrentDesignName, setCurrentDesignName, type SavedDesign } from './utils/persistence';
import useElementSize from './hooks/useElementSize';
import { COMPONENT_LIBRARY, ICON_LIBRARY } from "./library";
// Collaboration imports
import { useRealtimeCanvas } from './collaboration';
import { ConnectionStatusIndicator } from './components/ConnectionStatusIndicator';
import { CursorOverlay } from './components/CursorOverlay';
import { SelectionOverlay } from './components/SelectionOverlay';
import { ActiveUsersList } from './components/ActiveUsersList';

/** Get room ID from URL query param ?room=xxx */
function getRoomIdFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}

/** Generate a random room ID */
function generateRoomId(): string {
  return `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Get or generate a persistent user ID for this browser */
function getUserId(): string {
  const key = 'vizail_user_id';
  let userId = localStorage.getItem(key);
  if (!userId) {
    userId = `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    localStorage.setItem(key, userId);
  }
  return userId;
}

/** Get display name (can be customized later) */
function getDisplayName(): string {
  const key = 'vizail_display_name';
  let name = localStorage.getItem(key);
  if (!name) {
    name = `User ${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem(key, name);
  }
  return name;
}

/** Get WebSocket URL based on environment */
function getWebSocketUrl(): string {
  // Check for environment variable first
  const envUrl = import.meta.env.VITE_WEBSOCKET_URL;
  if (envUrl) return envUrl;
  // Default to localhost for development
  return 'ws://localhost:8787';
}

function buildInitialSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 1600, height: 1200 },
      background: undefined,
      children: [],
    },
  };
}

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
  // Collaboration state
  const [roomId, setRoomId] = useState<string | null>(getRoomIdFromURL);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const userId = useMemo(() => getUserId(), []);
  const displayName = useMemo(() => getDisplayName(), []);
  const wsUrl = useMemo(() => getWebSocketUrl(), []);
  const isCollaborative = roomId !== null;

  // Viewport state for collaboration overlays
  const [viewport, setViewport] = useState<{ scale: number; x: number; y: number }>({ scale: 1, x: 0, y: 0 });

  // Local persistence (used when NOT in collaborative mode)
  const localPersistence = useDesignPersistence({ buildInitial: buildInitialSpec });

  // Real-time collaboration (used when in collaborative mode)
  const realtimeCanvas = useRealtimeCanvas({
    canvasId: roomId || 'unused',
    userId,
    displayName,
    buildInitial: buildInitialSpec,
    wsUrl,
    enabled: isCollaborative,
  });

  // Use the appropriate spec/setSpec based on mode
  const { spec, setSpec: setSpecRaw } = isCollaborative
    ? { spec: realtimeCanvas.spec, setSpec: realtimeCanvas.setSpec }
    : { spec: localPersistence.spec, setSpec: localPersistence.setSpec };

  // Collaboration helpers
  const { status, collaborators, isSyncing, lastError, updateCursor, updateSelection, reconnect, clientId } = realtimeCanvas;

  const historyRef = useRef<{ past: LayoutSpec[]; future: LayoutSpec[] }>({ past: [], future: [] });
  const historyLockRef = useRef(false);
  const setSpec = useCallback((next: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => {
    // In collaborative mode, skip history wrapper and use setSpec directly
    if (isCollaborative) {
      setSpecRaw(next);
      return;
    }
    
    // In local mode, wrap with history tracking
    setSpecRaw((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: LayoutSpec) => LayoutSpec)(prev) : next;
      if (!historyLockRef.current && resolved !== prev) {
        historyRef.current.past.push(prev);
        historyRef.current.future = [];
      }
      return resolved;
    });
  }, [setSpecRaw, isCollaborative]);

  const undo = useCallback(() => {
    const past = historyRef.current.past;
    if (past.length === 0) return;
    const prev = past.pop()!;
    historyLockRef.current = true;
    setSpecRaw((current) => {
      historyRef.current.future.unshift(current);
      return prev;
    });
    historyLockRef.current = false;
  }, [setSpecRaw]);

  const redo = useCallback(() => {
    const future = historyRef.current.future;
    if (future.length === 0) return;
    const next = future.shift()!;
    historyLockRef.current = true;
    setSpecRaw((current) => {
      historyRef.current.past.push(current);
      return next;
    });
    historyLockRef.current = false;
  }, [setSpecRaw]);
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
  const [iconLibraryOpen, setIconLibraryOpen] = useState(false);
  const [componentLibraryOpen, setComponentLibraryOpen] = useState(false);
  const [selectedIconId, setSelectedIconId] = useState(ICON_LIBRARY[0]?.id || "star");
  const [selectedComponentId, setSelectedComponentId] = useState(COMPONENT_LIBRARY[0]?.id || "button");
  const [iconSearch, setIconSearch] = useState('');
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [attributeTab, setAttributeTab] = useState<'element' | 'flow'>('element');
  const [draggingGroupIndex, setDraggingGroupIndex] = useState<number | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);
  const [viewportTransition, setViewportTransition] = useState<null | { targetId: string; durationMs?: number; easing?: FlowTransition["easing"]; _key: string }>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false); // New design template dialog
  const [openDialogOpen, setOpenDialogOpen] = useState(false); // Open design dialog
  const [currentDesignName, setCurrentDesignNameState] = useState<string | null>(getCurrentDesignName);
  const [fitToContentKey, setFitToContentKey] = useState(0); // Increment to trigger fit-to-content in CanvasStage
  // Curve control point selection
  const [selectedCurvePointIndex, setSelectedCurvePointIndex] = useState<number | null>(null);
  const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0';

  const pushRecent = useCallback((col: string) => { commitRecent(col); }, [commitRecent]);

  const updateFlows = useCallback((nextFlows: Flow[]) => {
    setSpec(prev => ({ ...prev, flows: nextFlows }));
  }, [setSpec]);

  const focusScreen = useCallback((screenId: string) => {
    setSelection([screenId]);
    setFocusNodeId(screenId);
  }, [setSelection]);

  const playTransitionPreview = useCallback((toId: string, transition?: FlowTransition) => {
    if (!transition || transition.animation === 'none') {
      setViewportTransition(null);
      return;
    }
    setViewportTransition({
      targetId: toId,
      durationMs: transition.durationMs,
      easing: transition.easing,
      _key: `${transition.id}_${Date.now().toString(36)}`,
    });
  }, []);

  // Clear curve point selection when selection changes
  useEffect(() => {
    setSelectedCurvePointIndex(null);
  }, [selectedIds]);

  useEffect(() => {
    if (selectedIds.length !== 1) {
      setAttributeTab('element');
    }
  }, [selectedIds]);

  // Debug: log spec on mount
  useEffect(() => {
    logger.debug('CanvasApp mount');
  }, []);

  useEffect(() => {
    logger.debug('CanvasApp size', canvasSize.width, canvasSize.height);
  }, [canvasSize.width, canvasSize.height, setSpec]);

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
  }, [canvasSize.width, canvasSize.height, setSpec]);

  // Sync raw dash input based on selection / tool changes
  useEffect(() => {
    if (selectedIds.length === 1) {
      const node = findNode(spec.root, selectedIds[0]) as LayoutNode | null;
      if (node && node.type === 'rect') {
        const dashStr = dashArrayToInput(node.strokeDash);
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
    // Only fit to content in local mode (not collaborative)
    if (!isCollaborative) {
      setTimeout(() => setFitToContentKey(k => k + 1), 50);
    }
    logger.info(`Loaded design: ${design.name}`);
  }, [setSpec, setSelection, isCollaborative]);

  // Apply a template from the New dialog
  const applyTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const newSpec = template.build();
      setSpec(newSpec);
      setSelection([]);
      // Only fit to content in local mode (not collaborative)
      if (!isCollaborative) {
        setTimeout(() => setFitToContentKey(k => k + 1), 50);
      }
      logger.info(`Applied template: ${template.name}`);
    }
    setNewDialogOpen(false);
  }, [setSpec, setSelection, isCollaborative]);


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
              <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center shadow-sm overflow-hidden">
                <img src="/vizail-mark.svg" alt="Vizail" className="w-7 h-7" />
              </div>
              <h1 className="tracking-wide text-white" style={{ fontFamily: '"Cal Sans", "Cal Sans Semibold", sans-serif', fontWeight: 600, fontSize: '2em' }}>Viz<span className="text-cyan-300">ai</span>l</h1>
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
        <div className="flex items-center gap-4">
          {/* Collaboration status (when in collaborative mode) */}
          {isCollaborative && (
            <div className="flex items-center gap-3">
              <ConnectionStatusIndicator
                status={status}
                collaboratorCount={collaborators.size}
                isSyncing={isSyncing}
                lastError={lastError}
                onReconnect={reconnect}
              />
              <ActiveUsersList collaborators={collaborators} maxVisible={4} />
            </div>
          )}
          {/* Share button */}
          <button
            onClick={() => setShareDialogOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 px-4 py-2 rounded-lg shadow-md transition-all duration-150"
          >
            <i className="fa-solid fa-share-nodes" />
            Share
          </button>
          {/* Tool indicator */}
          <div className="flex items-center gap-2 text-xs font-medium text-white/90 bg-white/15 backdrop-blur px-4 py-2 rounded-full border border-white/10">
            <i className="fa-solid fa-wand-magic-sparkles text-cyan-300" />
            <span className="capitalize">{tool}</span>
          </div>
        </div>
      </header>
      {/* Modals */}
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
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${roomId}`);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <i className="fa-regular fa-copy mr-1.5" />
                  Copy
                </button>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => {
                    // Leave collaborative mode
                    const url = new URL(window.location.href);
                    url.searchParams.delete('room');
                    window.history.pushState({}, '', url.toString());
                    setRoomId(null);
                    setShareDialogOpen(false);
                  }}
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
                onClick={() => {
                  const newRoomId = generateRoomId();
                  const url = new URL(window.location.href);
                  url.searchParams.set('room', newRoomId);
                  window.history.pushState({}, '', url.toString());
                  setRoomId(newRoomId);
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all text-sm font-medium shadow-md"
              >
                <i className="fa-solid fa-play mr-2" />
                Start Collaborative Session
              </button>
            </>
          )}
        </div>
      </Modal>
      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About Vizail" size="sm" variant="light">
        <p><strong>Vizail</strong> version <code>{appVersion}</code></p>
        <p className="mt-2">Experimental canvas + layout editor. Transforms are baked to schema on release.</p>
        <p className="mt-4 opacity-70 text-[10px]">© {new Date().getFullYear()} Vizail</p>
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
                <div className="mt-3 text-[11px] text-gray-500">No icons match “{iconSearch}”.</div>
              )}
            </>
          );
        })()}
      </Modal>
      <Modal open={componentLibraryOpen} onClose={() => setComponentLibraryOpen(false)} title="Components" size="md" variant="light">
        <p className="text-xs text-gray-600 mb-3">Choose a component to place on the canvas.</p>
        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1">
          {COMPONENT_LIBRARY.map((component) => (
            <button
              key={component.id}
              type="button"
              onClick={() => {
                setSelectedComponentId(component.id);
                setComponentLibraryOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                selectedComponentId === component.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                <i className={`${component.iconClassName}`} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">{component.name}</div>
                <div className="text-[11px] text-gray-500">{component.description}</div>
              </div>
            </button>
          ))}
        </div>
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
            { icon: "fa-solid fa-arrow-pointer", val: "select", tooltip: "Select (V)" },
            { icon: "fa-regular fa-square", val: "rect", tooltip: "Rectangle (R)" },
            { icon: "fa-regular fa-circle", val: "ellipse", tooltip: "Ellipse (O)" },
            { icon: "fa-solid fa-minus", val: "line", tooltip: "Line (L)" },
            { icon: "fa-solid fa-bezier-curve", val: "curve", tooltip: "Curve (P)" },
            { icon: "fa-solid fa-font", val: "text", tooltip: "Text (T)" },
            { icon: "fa-regular fa-image", val: "image", tooltip: "Image (I)" },
            { icon: "fa-solid fa-icons", val: "icon", tooltip: "Icon Library" },
            { icon: "fa-solid fa-layer-group", val: "component", tooltip: "Components" },
          ].map(({ icon, val, tooltip }) => (
            <button
              key={val}
              onClick={() => {
                if (val === 'icon') {
                  setTool('icon');
                  setIconLibraryOpen(true);
                  return;
                }
                if (val === 'component') {
                  setTool('component');
                  setComponentLibraryOpen(true);
                  return;
                }
                setTool(val);
              }}
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
          <div className="flex flex-col gap-1 mb-2">
            <button
              onClick={() => setTool('zoom')}
              title="Zoom tool (click to zoom in, Alt-click to zoom out)"
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
                tool === 'zoom'
                  ? "text-white"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
            >
              {tool === 'zoom' && (
                <span className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md" />
              )}
              <i className="fa-solid fa-magnifying-glass text-base relative z-10" />
            </button>
            <button
              onClick={() => setTool('pan')}
              title="Pan tool (drag to pan)"
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
                tool === 'pan'
                  ? "text-white"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
            >
              {tool === 'pan' && (
                <span className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md" />
              )}
              <i className="fa-regular fa-hand text-base relative z-10" />
            </button>
          </div>
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
        <main 
          className="flex-1 relative min-w-0"
        >
          <div 
            ref={canvasRef} 
            className="absolute inset-0 overflow-hidden"
            onMouseMove={isCollaborative ? (e) => {
              // Update cursor position for collaborators
              // Convert screen coordinates to canvas space (inverse of viewport transform)
              const rect = e.currentTarget.getBoundingClientRect();
              const screenX = e.clientX - rect.left;
              const screenY = e.clientY - rect.top;
              const canvasX = (screenX - viewport.x) / viewport.scale;
              const canvasY = (screenY - viewport.y) / viewport.scale;
              updateCursor(canvasX, canvasY);
            } : undefined}
          >
            {stageWidth > 0 && stageHeight > 0 && (
              <CanvasStage
                tool={tool}
                spec={spec}
                setSpec={setSpec}
                width={stageWidth}
                height={stageHeight}
                onToolChange={setTool}
                onUndo={undo}
                onRedo={redo}
                focusNodeId={focusNodeId}
                onUngroup={(ids) => {
                  if (!spec.flows || ids.length === 0) return;
                  const nextFlows = spec.flows
                    .map(f => ({
                      ...f,
                      screenIds: f.screenIds.filter(id => !ids.includes(id)),
                      transitions: f.transitions.filter(t => !ids.includes(t.from) && !ids.includes(t.to)),
                    }))
                    .filter(f => f.screenIds.length > 0);
                  setSpec(prev => ({ ...prev, flows: nextFlows }));
                }}
                selectedIconId={selectedIconId}
                selectedComponentId={selectedComponentId}
                selection={selectedIds}
                setSelection={(ids) => {
                  setSelection(ids);
                  // Sync selection to collaborators
                  if (isCollaborative) {
                    updateSelection(ids);
                  }
                }}
                fitToContentKey={fitToContentKey}
                rectDefaults={{
                  fill: rectDefaults.fill,
                  stroke: rectDefaults.stroke,
                  strokeWidth: rectDefaults.strokeWidth ?? 1,
                  radius: rectDefaults.radius ?? 0,
                  opacity: rectDefaults.opacity ?? 1,
                  strokeDash: rectDefaults.strokeDash,
                }}
                viewportTransition={viewportTransition}
                onViewportChange={(newViewport) => setViewport(newViewport)}
              />
            )}
            {/* Collaboration presence overlays */}
            {isCollaborative && (
              <>
                <CursorOverlay collaborators={collaborators} localClientId={clientId} zoom={viewport.scale} pan={{ x: viewport.x, y: viewport.y }} />
                <SelectionOverlay
                  collaborators={collaborators}
                  localClientId={clientId}
                  getNodeBounds={(nodeId) => {
                    // Find node and return its bounds
                    const node = findNode(spec.root, nodeId);
                    if (!node || !('position' in node) || !('size' in node)) return null;
                    const pos = node.position as { x: number; y: number } | undefined;
                    const size = node.size as { width: number; height: number } | undefined;
                    if (!pos || !size) return null;
                    return { x: pos.x, y: pos.y, width: size.width, height: size.height };
                  }}
                  zoom={viewport.scale}
                  pan={{ x: viewport.x, y: viewport.y }}
                />
              </>
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
              const node = findNode(spec.root, selectedIds[0]) as LayoutNode | null;
              if (!node) return <div className="text-[11px] text-gray-400">Node not found.</div>;
              
              const createUpdateFn = (nodeId: string) => (patch: SpecPatch) => {
                setSpec(prev => ({
                  ...prev,
                  root: updateNode(prev.root, nodeId, patch)
                }));
              };

              const isScreenEligible = ['group', 'frame', 'stack', 'grid', 'box'].includes(node.type);
              const screenMeta = node.screen;
              const flows = spec.flows ?? [];

              const removeScreenFromFlows = (screenId: string) => {
                const nextFlows = flows
                  .map(f => ({
                    ...f,
                    screenIds: f.screenIds.filter(id => id !== screenId),
                    transitions: f.transitions.filter(t => t.from !== screenId && t.to !== screenId),
                  }))
                  .filter(f => f.screenIds.length > 0);
                updateFlows(nextFlows);
              };

              const screenPanel = isScreenEligible ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-gray-600 flex items-center gap-2">
                    <i className="fa-solid fa-rectangle-list text-gray-400 text-[10px]" />
                    Screen
                  </div>
                  <label className="flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={!!screenMeta}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const name = (node.name || `Screen ${selectedIds[0].slice(0, 4)}`) as string;
                          createUpdateFn(node.id)({ screen: { id: node.id, name } });
                          if (!flows.some(f => f.screenIds.includes(node.id))) {
                            const id = `flow_${Date.now().toString(36)}`;
                            updateFlows([...flows, { id, name: `Flow ${flows.length + 1}`, screenIds: [node.id], transitions: [] }]);
                            setActiveFlowId(id);
                          }
                        } else {
                          createUpdateFn(node.id)({ screen: undefined });
                          removeScreenFromFlows(node.id);
                        }
                      }}
                    />
                    Mark as Screen
                  </label>
                  {screenMeta && (
                    <input
                      value={screenMeta.name}
                      onChange={(e) => createUpdateFn(node.id)({ screen: { id: node.id, name: e.target.value } })}
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-[11px]"
                      placeholder="Screen name"
                    />
                  )}
                </div>
              ) : null;

              const flowPanel = screenMeta ? (
                <FlowAttributesPanel
                  flows={flows}
                  activeFlowId={activeFlowId}
                  setActiveFlowId={setActiveFlowId}
                  screenId={screenMeta.id}
                  screenName={screenMeta.name}
                  onUpdateFlows={updateFlows}
                  onFocusScreen={focusScreen}
                  onSelectScreen={focusScreen}
                  onTriggerTransition={(toId, transition) => {
                    focusScreen(toId);
                    playTransitionPreview(toId, transition);
                  }}
                />
              ) : null;

              const screenFlowPanel = isScreenEligible ? (
                <>
                  {screenPanel}
                  {flowPanel}
                </>
              ) : (
                <div className="text-[11px] text-gray-400">Screen/flow attributes are available for groups, frames, stacks, grids, and boxes.</div>
              );

              const renderElementPanelFor = (targetNode: LayoutNode): JSX.Element => {
                if (targetNode.type === 'rect') {
                  const rect = targetNode as RectNode;
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

                if (targetNode.type === 'ellipse') {
                  const ellipse = targetNode as EllipseNode;
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

                if (targetNode.type === 'line') {
                  const line = targetNode as LineNode;
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

                if (targetNode.type === 'curve') {
                  const curve = targetNode as CurveNode;
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

                if (targetNode.type === 'text') {
                  const textNode = targetNode as TextNode;
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

                if (targetNode.type === 'image') {
                  const imageNode = targetNode as ImageNode;
                  const updateImage = createUpdateFn(imageNode.id);
                  return (
                    <ImageAttributesPanel
                      imageNode={imageNode}
                      updateNode={updateImage}
                    />
                  );
                }

                return <div className="text-[11px] text-gray-400">No editable attributes for type: {targetNode.type}</div>;
              };

              const elementPanel = renderElementPanelFor(node);
              const groupChildren = node.children;
              const hasChildren = Array.isArray(groupChildren) && groupChildren.length > 0;
              const moveChild = (fromIndex: number, toIndex: number) => {
                if (!groupChildren) return;
                if (toIndex < 0 || toIndex >= groupChildren.length) return;
                const nextChildren = [...groupChildren];
                const [moved] = nextChildren.splice(fromIndex, 1);
                nextChildren.splice(toIndex, 0, moved);
                createUpdateFn(node.id)({ children: nextChildren });
              };

              const orderedChildren = groupChildren
                ? groupChildren.map((child, index) => ({ child, index })).reverse()
                : [];

              const moveChildByDisplayIndex = (fromDisplayIndex: number, toDisplayIndex: number) => {
                if (!groupChildren) return;
                if (toDisplayIndex < 0 || toDisplayIndex >= orderedChildren.length) return;
                const fromOriginal = orderedChildren[fromDisplayIndex].index;
                const toOriginal = orderedChildren[toDisplayIndex].index;
                if (fromOriginal === toOriginal) return;
                moveChild(fromOriginal, toOriginal);
              };

              const groupPanel = hasChildren ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-gray-600 flex items-center gap-2">
                    <i className="fa-solid fa-layer-group text-gray-400 text-[10px]" />
                    Elements
                  </div>
                  <div className="space-y-2">
                    {orderedChildren.map(({ child }, displayIndex) => (
                      <details
                        key={child.id}
                        className={`rounded-md border ${dragOverGroupIndex === displayIndex ? 'border-blue-400' : 'border-gray-200'} bg-white/70`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverGroupIndex(displayIndex);
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setDragOverGroupIndex(displayIndex);
                        }}
                        onDragLeave={() => {
                          if (dragOverGroupIndex === displayIndex) setDragOverGroupIndex(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggingGroupIndex === null) return;
                          moveChildByDisplayIndex(draggingGroupIndex, displayIndex);
                          setDraggingGroupIndex(null);
                          setDragOverGroupIndex(null);
                        }}
                      >
                        <summary
                          className="cursor-pointer select-none px-2 py-1.5 text-[11px] text-gray-600 flex items-center justify-between gap-2"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', child.id);
                            setDraggingGroupIndex(displayIndex);
                            setDragOverGroupIndex(displayIndex);
                          }}
                          onDragEnd={() => {
                            setDraggingGroupIndex(null);
                            setDragOverGroupIndex(null);
                          }}
                        >
                          <span
                            className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-gray-600 cursor-grab"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            aria-label="Reorder layer"
                          >
                            <i className="fa-solid fa-grip-vertical text-[10px]" />
                          </span>
                          <span className="font-medium truncate">
                            {child.name ?? (child.type === 'text' ? child.text : undefined) ?? `Untitled ${child.type}`}
                          </span>
                          <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">{child.type}</span>
                        </summary>
                        <div className="px-2 py-2 space-y-2">
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400">Name</div>
                            <input
                              value={(child.name as string) ?? ''}
                              onChange={(e) => createUpdateFn(child.id)({ name: e.target.value })}
                              className="w-full border border-gray-200 rounded-md px-2 py-1 text-[11px]"
                              placeholder="Layer name"
                            />
                          </div>
                          {renderElementPanelFor(child)}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400">No child elements to edit.</div>
              );

              if (!hasChildren) {
                return elementPanel;
              }

              return (
                <>
                  <div className="flex items-center gap-1 rounded-md bg-gray-100 p-1 text-[11px]">
                    <button
                      className={`flex-1 rounded-md px-2 py-1 transition ${attributeTab === 'element' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setAttributeTab('element')}
                    >
                      Group
                    </button>
                    <button
                      className={`flex-1 rounded-md px-2 py-1 transition ${attributeTab === 'flow' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setAttributeTab('flow')}
                    >
                      Screen/Flow
                    </button>
                  </div>
                  {attributeTab === 'element' ? groupPanel : screenFlowPanel}
                </>
              );
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
