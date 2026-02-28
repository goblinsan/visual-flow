import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { usePersistentRectDefaults } from './hooks/usePersistentRectDefaults';
import { useRecentColors } from './hooks/useRecentColors';
import { useDesignPersistence } from './hooks/useDesignPersistence';
import { useSelection } from './hooks/useSelection';
import { useToolState } from './hooks/canvas/useToolState';
import { useDialogState } from './hooks/canvas/useDialogState';
import { useAttributeState } from './hooks/canvas/useAttributeState';
import { useLibraryState } from './hooks/canvas/useLibraryState';
import { useProposalState } from './hooks/canvas/useProposalState';
import { logger } from "./utils/logger";
import { DialogManager } from "./components/dialogs/DialogManager";
import { findNode, updateNode } from './utils/specUtils';
import { dashArrayToInput } from './utils/paint';
import { applyProposalOperations } from './utils/proposalHelpers';
import CanvasStage from "./canvas/CanvasStage.tsx";
import type {
  LayoutSpec,
  LayoutNode,
  FrameNode,
  FlowTransition,
  Flow,
} from "./layout-schema.ts";
import { saveNamedDesign, getCurrentDesignName, setCurrentDesignName, type SavedDesign } from './utils/persistence';
import useElementSize from './hooks/useElementSize';
// Collaboration imports
import { useRealtimeCanvas } from './collaboration';
import { CursorOverlay } from './components/CursorOverlay';
import { SelectionOverlay } from './components/SelectionOverlay';
import { useProposals } from './hooks/useProposals';
import { useAuth } from './hooks/useAuth';
import { HeaderToolbar } from './components/canvas/HeaderToolbar';
import { LeftToolbar } from './components/canvas/LeftToolbar';
import { AttributesSidebar } from './components/canvas/AttributesSidebar';
import { AgentPanel } from './components/canvas/AgentPanel';
import { ThemePanel } from './components/ThemePanel';
import { KulrsPalettePanel } from './components/KulrsPalettePanel';
import { ToolSettingsBar } from './components/canvas/ToolSettingsBar';
import { ChooseModeModal } from './roblox/ChooseModeModal';
import type { DesignMode } from './roblox/ChooseModeModal';
import { useDesignTheme } from './theme';
import { bindAndApplyTheme } from './theme';

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
  // Auto-detect production
  if (typeof window !== 'undefined' && window.location.hostname === 'vizail.com') {
    return 'wss://vizail-websocket.coghlanjames.workers.dev';
  }
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

const TEMPLATES: { id: string; name: string; icon: string; description: string; category: string; build: () => LayoutSpec }[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    icon: 'fa-regular fa-file',
    description: 'Start with an empty canvas',
    category: 'general',
    build: () => ({
      root: { id: "root", type: "frame", size: { width: 1600, height: 1200 }, background: undefined, children: [] }
    }),
  },
  {
    id: 'top-nav',
    name: 'Top Nav Website',
    icon: 'fa-solid fa-window-maximize',
    description: 'Website layout with top navigation bar',
    category: 'web',
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
    category: 'web',
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
    category: 'layout',
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
    category: 'mobile',
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
    category: 'ecommerce',
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
  // 4.1 Game map templates
  {
    id: 'game-map-square',
    name: 'Square Grid Game Map',
    icon: 'fa-solid fa-chess-board',
    description: 'Square grid layout for tile-based games',
    category: 'game',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1200, height: 900 }, background: "#2d3748",
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 1200, height: 900 }, fill: "#1a202c", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "map-title", type: "text", text: "Dungeon Map", variant: "h1", position: { x: 40, y: 30 }, size: { width: 300, height: 36 }, color: "#f7fafc" },
          // Grid container
          { id: "grid-container", type: "rect", position: { x: 100, y: 120 }, size: { width: 640, height: 640 }, fill: "#374151", stroke: "#4b5563", strokeWidth: 2, radius: 8, opacity: 1 },
          // Grid cells (8x8)
          ...Array.from({ length: 64 }, (_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const size = 80;
            const x = 100 + col * size;
            const y = 120 + row * size;
            const isWalkable = Math.random() > 0.3;
            return {
              id: `cell-${i}`,
              type: "rect" as const,
              position: { x, y },
              size: { width: size, height: size },
              fill: isWalkable ? "#6b7280" : "#1f2937",
              stroke: "#4b5563",
              strokeWidth: 1,
              radius: 0,
              opacity: 1
            };
          }),
          // Legend
          { id: "legend-bg", type: "rect", position: { x: 780, y: 120 }, size: { width: 360, height: 300 }, fill: "#374151", stroke: "#4b5563", strokeWidth: 2, radius: 8, opacity: 1 },
          { id: "legend-title", type: "text", text: "Legend", variant: "h2", position: { x: 810, y: 150 }, size: { width: 200, height: 28 }, color: "#f7fafc" },
          { id: "walkable-box", type: "rect", position: { x: 810, y: 200 }, size: { width: 40, height: 40 }, fill: "#6b7280", stroke: "#4b5563", strokeWidth: 1, radius: 4, opacity: 1 },
          { id: "walkable-text", type: "text", text: "Walkable", variant: "body", position: { x: 870, y: 210 }, size: { width: 100, height: 20 }, color: "#d1d5db" },
          { id: "wall-box", type: "rect", position: { x: 810, y: 260 }, size: { width: 40, height: 40 }, fill: "#1f2937", stroke: "#4b5563", strokeWidth: 1, radius: 4, opacity: 1 },
          { id: "wall-text", type: "text", text: "Wall", variant: "body", position: { x: 870, y: 270 }, size: { width: 100, height: 20 }, color: "#d1d5db" },
          // Info panel
          { id: "info-bg", type: "rect", position: { x: 780, y: 460 }, size: { width: 360, height: 300 }, fill: "#374151", stroke: "#4b5563", strokeWidth: 2, radius: 8, opacity: 1 },
          { id: "info-title", type: "text", text: "Map Info", variant: "h2", position: { x: 810, y: 490 }, size: { width: 200, height: 28 }, color: "#f7fafc" },
          { id: "info-text1", type: "text", text: "Size: 8x8 Grid", variant: "body", position: { x: 810, y: 540 }, size: { width: 250, height: 20 }, color: "#d1d5db" },
          { id: "info-text2", type: "text", text: "Click cells to edit", variant: "body", position: { x: 810, y: 580 }, size: { width: 250, height: 20 }, color: "#d1d5db" },
        ],
      }
    }),
  },
  {
    id: 'game-map-hex',
    name: 'Hex Grid Game Map',
    icon: 'fa-solid fa-dice-d20',
    description: 'Hexagonal grid for strategy games',
    category: 'game',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1200, height: 900 }, background: "#2d3748",
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 1200, height: 900 }, fill: "#1a202c", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "map-title", type: "text", text: "Hex Battle Map", variant: "h1", position: { x: 40, y: 30 }, size: { width: 350, height: 36 }, color: "#f7fafc" },
          // Hex grid area
          { id: "hex-container", type: "rect", position: { x: 80, y: 120 }, size: { width: 680, height: 680 }, fill: "#374151", stroke: "#4b5563", strokeWidth: 2, radius: 8, opacity: 1 },
          // Hex tiles (7 rows, alternating 6-7 hexes per row)
          ...Array.from({ length: 45 }, (_, i) => {
            const row = Math.floor(i / 7);
            const col = i % 7;
            const hexWidth = 85;
            const hexHeight = 75;
            const offsetX = (row % 2) * (hexWidth / 2);
            const x = 115 + offsetX + col * hexWidth;
            const y = 145 + row * hexHeight;
            const terrainType = Math.floor(Math.random() * 4);
            const fills = ["#3b82f6", "#10b981", "#fbbf24", "#9ca3af"];
            return {
              id: `hex-${i}`,
              type: "polygon" as const,
              position: { x, y },
              size: { width: 70, height: 60 },
              points: [35, 0, 70, 15, 70, 45, 35, 60, 0, 45, 0, 15],
              fill: fills[terrainType],
              stroke: "#1f2937",
              strokeWidth: 2,
              opacity: 0.8
            };
          }),
          // Legend
          { id: "legend-bg", type: "rect", position: { x: 800, y: 120 }, size: { width: 340, height: 400 }, fill: "#374151", stroke: "#4b5563", strokeWidth: 2, radius: 8, opacity: 1 },
          { id: "legend-title", type: "text", text: "Terrain Types", variant: "h2", position: { x: 830, y: 150 }, size: { width: 250, height: 28 }, color: "#f7fafc" },
          { id: "water-hex", type: "polygon", position: { x: 830, y: 200 }, size: { width: 50, height: 43 }, points: [25, 0, 50, 11, 50, 32, 25, 43, 0, 32, 0, 11], fill: "#3b82f6", stroke: "#1f2937", strokeWidth: 2, opacity: 0.8 },
          { id: "water-text", type: "text", text: "Water", variant: "body", position: { x: 900, y: 215 }, size: { width: 100, height: 20 }, color: "#d1d5db" },
          { id: "grass-hex", type: "polygon", position: { x: 830, y: 260 }, size: { width: 50, height: 43 }, points: [25, 0, 50, 11, 50, 32, 25, 43, 0, 32, 0, 11], fill: "#10b981", stroke: "#1f2937", strokeWidth: 2, opacity: 0.8 },
          { id: "grass-text", type: "text", text: "Grass", variant: "body", position: { x: 900, y: 275 }, size: { width: 100, height: 20 }, color: "#d1d5db" },
          { id: "sand-hex", type: "polygon", position: { x: 830, y: 320 }, size: { width: 50, height: 43 }, points: [25, 0, 50, 11, 50, 32, 25, 43, 0, 32, 0, 11], fill: "#fbbf24", stroke: "#1f2937", strokeWidth: 2, opacity: 0.8 },
          { id: "sand-text", type: "text", text: "Desert", variant: "body", position: { x: 900, y: 335 }, size: { width: 100, height: 20 }, color: "#d1d5db" },
          { id: "mountain-hex", type: "polygon", position: { x: 830, y: 380 }, size: { width: 50, height: 43 }, points: [25, 0, 50, 11, 50, 32, 25, 43, 0, 32, 0, 11], fill: "#9ca3af", stroke: "#1f2937", strokeWidth: 2, opacity: 0.8 },
          { id: "mountain-text", type: "text", text: "Mountain", variant: "body", position: { x: 900, y: 395 }, size: { width: 100, height: 20 }, color: "#d1d5db" },
        ],
      }
    }),
  },
  // 4.2 Game inventory template
  {
    id: 'game-inventory',
    name: 'Game Inventory UI',
    icon: 'fa-solid fa-box',
    description: 'RPG-style inventory interface',
    category: 'game',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1400, height: 900 }, background: "#1e1b2e",
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 1400, height: 900 }, fill: "#1e1b2e", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "title", type: "text", text: "Inventory", variant: "h1", position: { x: 50, y: 40 }, size: { width: 300, height: 40 }, color: "#f8d97a" },
          // Character info panel
          { id: "char-panel", type: "rect", position: { x: 50, y: 120 }, size: { width: 380, height: 720 }, fill: "#2a2640", stroke: "#6b5ca5", strokeWidth: 2, radius: 12, opacity: 1 },
          { id: "char-title", type: "text", text: "Character", variant: "h2", position: { x: 80, y: 150 }, size: { width: 250, height: 30 }, color: "#f8d97a" },
          { id: "char-portrait", type: "rect", position: { x: 130, y: 200 }, size: { width: 160, height: 160 }, fill: "#4a4563", stroke: "#6b5ca5", strokeWidth: 2, radius: 80, opacity: 1 },
          { id: "char-name", type: "text", text: "Hero Name", variant: "h2", position: { x: 80, y: 380 }, size: { width: 300, height: 28 }, color: "#ffffff", align: "center" },
          { id: "char-level", type: "text", text: "Level 42", variant: "body", position: { x: 80, y: 420 }, size: { width: 300, height: 24 }, color: "#a0aec0", align: "center" },
          // Stats
          { id: "stat-hp", type: "text", text: "HP: 580/800", variant: "body", position: { x: 80, y: 480 }, size: { width: 250, height: 20 }, color: "#ef4444" },
          { id: "stat-hp-bar", type: "rect", position: { x: 80, y: 510 }, size: { width: 300, height: 12 }, fill: "#4a4563", stroke: undefined, strokeWidth: 0, radius: 6, opacity: 1 },
          { id: "stat-hp-fill", type: "rect", position: { x: 80, y: 510 }, size: { width: 217, height: 12 }, fill: "#ef4444", stroke: undefined, strokeWidth: 0, radius: 6, opacity: 1 },
          { id: "stat-mp", type: "text", text: "MP: 220/300", variant: "body", position: { x: 80, y: 540 }, size: { width: 250, height: 20 }, color: "#3b82f6" },
          { id: "stat-mp-bar", type: "rect", position: { x: 80, y: 570 }, size: { width: 300, height: 12 }, fill: "#4a4563", stroke: undefined, strokeWidth: 0, radius: 6, opacity: 1 },
          { id: "stat-mp-fill", type: "rect", position: { x: 80, y: 570 }, size: { width: 220, height: 12 }, fill: "#3b82f6", stroke: undefined, strokeWidth: 0, radius: 6, opacity: 1 },
          // Additional stats
          { id: "stat-atk", type: "text", text: "Attack: 145", variant: "body", position: { x: 80, y: 610 }, size: { width: 150, height: 20 }, color: "#f8d97a" },
          { id: "stat-def", type: "text", text: "Defense: 98", variant: "body", position: { x: 80, y: 640 }, size: { width: 150, height: 20 }, color: "#f8d97a" },
          { id: "stat-spd", type: "text", text: "Speed: 72", variant: "body", position: { x: 80, y: 670 }, size: { width: 150, height: 20 }, color: "#f8d97a" },
          { id: "gold", type: "text", text: "💰 Gold: 12,450", variant: "h3", position: { x: 80, y: 740 }, size: { width: 300, height: 28 }, color: "#fbbf24" },
          // Inventory grid
          { id: "inv-panel", type: "rect", position: { x: 470, y: 120 }, size: { width: 620, height: 720 }, fill: "#2a2640", stroke: "#6b5ca5", strokeWidth: 2, radius: 12, opacity: 1 },
          { id: "inv-title", type: "text", text: "Items (24 / 50)", variant: "h2", position: { x: 500, y: 150 }, size: { width: 250, height: 30 }, color: "#f8d97a" },
          // Inventory slots (5x6 grid)
          ...Array.from({ length: 30 }, (_, i) => {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const x = 500 + col * 110;
            const y = 200 + row * 110;
            const hasItem = i < 24;
            const items = ["⚔️", "🛡️", "🧪", "📜", "💎", "🗝️"];
            const rarityColors = ["#9ca3af", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];
            const item = items[i % items.length];
            const rarity = rarityColors[i % rarityColors.length];
            return [
              {
                id: `slot-${i}`,
                type: "rect" as const,
                position: { x, y },
                size: { width: 100, height: 100 },
                fill: hasItem ? rarity : "#4a4563",
                stroke: "#6b5ca5",
                strokeWidth: 2,
                radius: 8,
                opacity: hasItem ? 0.3 : 1
              },
              ...(hasItem ? [{
                id: `item-${i}`,
                type: "text" as const,
                text: item,
                variant: "h1" as const,
                position: { x: x + 30, y: y + 28 },
                size: { width: 40, height: 40 },
                color: "#ffffff",
                align: "center" as const
              }] : [])
            ];
          }).flat(),
          // Equipment panel
          { id: "equip-panel", type: "rect", position: { x: 1130, y: 120 }, size: { width: 220, height: 720 }, fill: "#2a2640", stroke: "#6b5ca5", strokeWidth: 2, radius: 12, opacity: 1 },
          { id: "equip-title", type: "text", text: "Equipped", variant: "h2", position: { x: 1150, y: 150 }, size: { width: 180, height: 30 }, color: "#f8d97a" },
          // Equipment slots
          { id: "eq-weapon-slot", type: "rect", position: { x: 1170, y: 200 }, size: { width: 140, height: 80 }, fill: "#4a4563", stroke: "#6b5ca5", strokeWidth: 2, radius: 8, opacity: 1 },
          { id: "eq-weapon-label", type: "text", text: "Weapon", variant: "caption", position: { x: 1175, y: 210 }, size: { width: 130, height: 16 }, color: "#a0aec0" },
          { id: "eq-weapon", type: "text", text: "⚔️", variant: "h2", position: { x: 1215, y: 235 }, size: { width: 40, height: 30 }, color: "#ffffff" },
          { id: "eq-armor-slot", type: "rect", position: { x: 1170, y: 300 }, size: { width: 140, height: 80 }, fill: "#4a4563", stroke: "#6b5ca5", strokeWidth: 2, radius: 8, opacity: 1 },
          { id: "eq-armor-label", type: "text", text: "Armor", variant: "caption", position: { x: 1175, y: 310 }, size: { width: 130, height: 16 }, color: "#a0aec0" },
          { id: "eq-armor", type: "text", text: "🛡️", variant: "h2", position: { x: 1215, y: 335 }, size: { width: 40, height: 30 }, color: "#ffffff" },
          { id: "eq-accessory-slot", type: "rect", position: { x: 1170, y: 400 }, size: { width: 140, height: 80 }, fill: "#4a4563", stroke: "#6b5ca5", strokeWidth: 2, radius: 8, opacity: 1 },
          { id: "eq-accessory-label", type: "text", text: "Accessory", variant: "caption", position: { x: 1175, y: 410 }, size: { width: 130, height: 16 }, color: "#a0aec0" },
          { id: "eq-accessory", type: "text", text: "💍", variant: "h2", position: { x: 1215, y: 435 }, size: { width: 40, height: 30 }, color: "#ffffff" },
        ],
      }
    }),
  },
  // 4.3 Social login buttons template
  {
    id: 'social-login',
    name: 'Social Login Buttons',
    icon: 'fa-solid fa-user-lock',
    description: 'Social authentication buttons layout',
    category: 'web',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 800, height: 900 }, background: "#f9fafb",
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 800, height: 900 }, fill: "#f9fafb", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          // Login card
          { id: "card", type: "rect", position: { x: 200, y: 150 }, size: { width: 400, height: 600 }, fill: "#ffffff", stroke: "#e5e7eb", strokeWidth: 1, radius: 16, opacity: 1 },
          { id: "title", type: "text", text: "Sign In", variant: "h1", position: { x: 250, y: 200 }, size: { width: 300, height: 40 }, color: "#111827", align: "center" },
          { id: "subtitle", type: "text", text: "Choose your preferred sign-in method", variant: "body", position: { x: 250, y: 250 }, size: { width: 300, height: 24 }, color: "#6b7280", align: "center" },
          // Google button
          { id: "google-btn", type: "rect", position: { x: 250, y: 310 }, size: { width: 300, height: 48 }, fill: "#ffffff", stroke: "#d1d5db", strokeWidth: 1, radius: 8, opacity: 1 },
          { id: "google-icon-bg", type: "rect", position: { x: 265, y: 322 }, size: { width: 24, height: 24 }, fill: "#4285f4", stroke: undefined, strokeWidth: 0, radius: 4, opacity: 1 },
          { id: "google-text", type: "text", text: "Continue with Google", variant: "body", position: { x: 305, y: 326 }, size: { width: 220, height: 20 }, color: "#374151", fontWeight: "500" },
          // Facebook button
          { id: "fb-btn", type: "rect", position: { x: 250, y: 380 }, size: { width: 300, height: 48 }, fill: "#1877f2", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "fb-icon-bg", type: "rect", position: { x: 265, y: 392 }, size: { width: 24, height: 24 }, fill: "#ffffff", stroke: undefined, strokeWidth: 0, radius: 4, opacity: 1 },
          { id: "fb-text", type: "text", text: "Continue with Facebook", variant: "body", position: { x: 305, y: 396 }, size: { width: 220, height: 20 }, color: "#ffffff", fontWeight: "500" },
          // Apple button
          { id: "apple-btn", type: "rect", position: { x: 250, y: 450 }, size: { width: 300, height: 48 }, fill: "#000000", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "apple-icon-bg", type: "rect", position: { x: 265, y: 462 }, size: { width: 24, height: 24 }, fill: "#ffffff", stroke: undefined, strokeWidth: 0, radius: 4, opacity: 1 },
          { id: "apple-text", type: "text", text: "Continue with Apple", variant: "body", position: { x: 305, y: 466 }, size: { width: 220, height: 20 }, color: "#ffffff", fontWeight: "500" },
          // GitHub button
          { id: "github-btn", type: "rect", position: { x: 250, y: 520 }, size: { width: 300, height: 48 }, fill: "#24292e", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "github-icon-bg", type: "rect", position: { x: 265, y: 532 }, size: { width: 24, height: 24 }, fill: "#ffffff", stroke: undefined, strokeWidth: 0, radius: 4, opacity: 1 },
          { id: "github-text", type: "text", text: "Continue with GitHub", variant: "body", position: { x: 305, y: 536 }, size: { width: 220, height: 20 }, color: "#ffffff", fontWeight: "500" },
          // Twitter/X button
          { id: "twitter-btn", type: "rect", position: { x: 250, y: 590 }, size: { width: 300, height: 48 }, fill: "#000000", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "twitter-icon-bg", type: "rect", position: { x: 265, y: 602 }, size: { width: 24, height: 24 }, fill: "#ffffff", stroke: undefined, strokeWidth: 0, radius: 4, opacity: 1 },
          { id: "twitter-text", type: "text", text: "Continue with X", variant: "body", position: { x: 305, y: 606 }, size: { width: 220, height: 20 }, color: "#ffffff", fontWeight: "500" },
          // Divider
          { id: "divider", type: "line", position: { x: 250, y: 670 }, points: [0, 0, 300, 0], stroke: "#e5e7eb", strokeWidth: 1 },
          // Email option
          { id: "email-link", type: "text", text: "Or sign in with email", variant: "body", position: { x: 250, y: 690 }, size: { width: 300, height: 20 }, color: "#3b82f6", align: "center", fontWeight: "500" },
        ],
      }
    }),
  },
  // 4.4 Payment cart template
  {
    id: 'payment-cart',
    name: 'Payment Cart UI',
    icon: 'fa-solid fa-credit-card',
    description: 'Shopping cart and checkout interface',
    category: 'ecommerce',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1400, height: 1000 }, background: "#f9fafb",
        children: [
          { id: "bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 1400, height: 1000 }, fill: "#f9fafb", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "title", type: "text", text: "Shopping Cart", variant: "h1", position: { x: 60, y: 60 }, size: { width: 400, height: 40 }, color: "#111827" },
          // Cart items section
          { id: "cart-section", type: "rect", position: { x: 60, y: 140 }, size: { width: 820, height: 760 }, fill: "#ffffff", stroke: "#e5e7eb", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "cart-header", type: "text", text: "Items (3)", variant: "h2", position: { x: 90, y: 170 }, size: { width: 200, height: 28 }, color: "#374151" },
          // Cart item 1
          { id: "item1-bg", type: "rect", position: { x: 90, y: 230 }, size: { width: 760, height: 140 }, fill: "#f9fafb", stroke: "#e5e7eb", strokeWidth: 1, radius: 8, opacity: 1 },
          { id: "item1-img", type: "rect", position: { x: 110, y: 250 }, size: { width: 100, height: 100 }, fill: "#e5e7eb", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "item1-name", type: "text", text: "Wireless Headphones", variant: "h3", position: { x: 230, y: 260 }, size: { width: 300, height: 24 }, color: "#111827" },
          { id: "item1-desc", type: "text", text: "Premium noise-cancelling audio", variant: "body", position: { x: 230, y: 295 }, size: { width: 300, height: 20 }, color: "#6b7280" },
          { id: "item1-qty", type: "text", text: "Qty: 1", variant: "body", position: { x: 230, y: 325 }, size: { width: 100, height: 20 }, color: "#6b7280" },
          { id: "item1-price", type: "text", text: "$129.99", variant: "h3", position: { x: 720, y: 280 }, size: { width: 100, height: 24 }, color: "#111827", align: "right" },
          // Cart item 2
          { id: "item2-bg", type: "rect", position: { x: 90, y: 390 }, size: { width: 760, height: 140 }, fill: "#f9fafb", stroke: "#e5e7eb", strokeWidth: 1, radius: 8, opacity: 1 },
          { id: "item2-img", type: "rect", position: { x: 110, y: 410 }, size: { width: 100, height: 100 }, fill: "#e5e7eb", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "item2-name", type: "text", text: "Smart Watch", variant: "h3", position: { x: 230, y: 420 }, size: { width: 300, height: 24 }, color: "#111827" },
          { id: "item2-desc", type: "text", text: "Fitness tracking & notifications", variant: "body", position: { x: 230, y: 455 }, size: { width: 300, height: 20 }, color: "#6b7280" },
          { id: "item2-qty", type: "text", text: "Qty: 2", variant: "body", position: { x: 230, y: 485 }, size: { width: 100, height: 20 }, color: "#6b7280" },
          { id: "item2-price", type: "text", text: "$398.00", variant: "h3", position: { x: 720, y: 440 }, size: { width: 100, height: 24 }, color: "#111827", align: "right" },
          // Cart item 3
          { id: "item3-bg", type: "rect", position: { x: 90, y: 550 }, size: { width: 760, height: 140 }, fill: "#f9fafb", stroke: "#e5e7eb", strokeWidth: 1, radius: 8, opacity: 1 },
          { id: "item3-img", type: "rect", position: { x: 110, y: 570 }, size: { width: 100, height: 100 }, fill: "#e5e7eb", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "item3-name", type: "text", text: "USB-C Cable (3-Pack)", variant: "h3", position: { x: 230, y: 580 }, size: { width: 300, height: 24 }, color: "#111827" },
          { id: "item3-desc", type: "text", text: "Fast charging, 6ft length", variant: "body", position: { x: 230, y: 615 }, size: { width: 300, height: 20 }, color: "#6b7280" },
          { id: "item3-qty", type: "text", text: "Qty: 1", variant: "body", position: { x: 230, y: 645 }, size: { width: 100, height: 20 }, color: "#6b7280" },
          { id: "item3-price", type: "text", text: "$24.99", variant: "h3", position: { x: 720, y: 600 }, size: { width: 100, height: 24 }, color: "#111827", align: "right" },
          // Continue shopping button
          { id: "continue-btn", type: "rect", position: { x: 90, y: 730 }, size: { width: 200, height: 44 }, fill: "#ffffff", stroke: "#d1d5db", strokeWidth: 1, radius: 8, opacity: 1 },
          { id: "continue-text", type: "text", text: "Continue Shopping", variant: "body", position: { x: 110, y: 742 }, size: { width: 160, height: 20 }, color: "#374151", fontWeight: "500", align: "center" },
          // Order summary section
          { id: "summary-section", type: "rect", position: { x: 920, y: 140 }, size: { width: 420, height: 560 }, fill: "#ffffff", stroke: "#e5e7eb", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "summary-title", type: "text", text: "Order Summary", variant: "h2", position: { x: 950, y: 170 }, size: { width: 300, height: 28 }, color: "#111827" },
          // Summary details
          { id: "subtotal-label", type: "text", text: "Subtotal", variant: "body", position: { x: 950, y: 240 }, size: { width: 200, height: 20 }, color: "#6b7280" },
          { id: "subtotal-value", type: "text", text: "$552.98", variant: "body", position: { x: 1220, y: 240 }, size: { width: 100, height: 20 }, color: "#111827", align: "right" },
          { id: "shipping-label", type: "text", text: "Shipping", variant: "body", position: { x: 950, y: 280 }, size: { width: 200, height: 20 }, color: "#6b7280" },
          { id: "shipping-value", type: "text", text: "$15.00", variant: "body", position: { x: 1220, y: 280 }, size: { width: 100, height: 20 }, color: "#111827", align: "right" },
          { id: "tax-label", type: "text", text: "Tax", variant: "body", position: { x: 950, y: 320 }, size: { width: 200, height: 20 }, color: "#6b7280" },
          { id: "tax-value", type: "text", text: "$45.24", variant: "body", position: { x: 1220, y: 320 }, size: { width: 100, height: 20 }, color: "#111827", align: "right" },
          { id: "divider", type: "line", position: { x: 950, y: 360 }, points: [0, 0, 370, 0], stroke: "#e5e7eb", strokeWidth: 1 },
          { id: "total-label", type: "text", text: "Total", variant: "h2", position: { x: 950, y: 380 }, size: { width: 200, height: 28 }, color: "#111827" },
          { id: "total-value", type: "text", text: "$613.22", variant: "h2", position: { x: 1220, y: 380 }, size: { width: 100, height: 28 }, color: "#111827", align: "right" },
          // Promo code section
          { id: "promo-label", type: "text", text: "Promo Code", variant: "body", position: { x: 950, y: 450 }, size: { width: 150, height: 20 }, color: "#6b7280" },
          { id: "promo-input", type: "rect", position: { x: 950, y: 480 }, size: { width: 260, height: 44 }, fill: "#f9fafb", stroke: "#d1d5db", strokeWidth: 1, radius: 8, opacity: 1 },
          { id: "promo-placeholder", type: "text", text: "Enter code", variant: "body", position: { x: 970, y: 492 }, size: { width: 150, height: 20 }, color: "#9ca3af" },
          { id: "promo-btn", type: "rect", position: { x: 1230, y: 480 }, size: { width: 90, height: 44 }, fill: "#e5e7eb", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "promo-btn-text", type: "text", text: "Apply", variant: "body", position: { x: 1250, y: 492 }, size: { width: 50, height: 20 }, color: "#374151", fontWeight: "500", align: "center" },
          // Checkout button
          { id: "checkout-btn", type: "rect", position: { x: 950, y: 580 }, size: { width: 370, height: 56 }, fill: "#3b82f6", stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
          { id: "checkout-text", type: "text", text: "Proceed to Checkout", variant: "h3", position: { x: 1020, y: 596 }, size: { width: 230, height: 24 }, color: "#ffffff", fontWeight: "600", align: "center" },
          // Security badges
          { id: "secure-badge", type: "rect", position: { x: 1030, y: 660 }, size: { width: 180, height: 24 }, fill: "#f0fdf4", stroke: "#86efac", strokeWidth: 1, radius: 12, opacity: 1 },
          { id: "secure-text", type: "text", text: "🔒 Secure Checkout", variant: "caption", position: { x: 1045, y: 666 }, size: { width: 150, height: 12 }, color: "#166534", align: "center" },
        ],
      }
    }),
  },
  // 4.5 Game UI template (mini-map, health bar, inventory)
  {
    id: 'game-ui-hud',
    name: 'Game HUD Template',
    icon: 'fa-solid fa-gamepad',
    description: 'Complete in-game HUD with mini-map, health, and quick inventory',
    category: 'game',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1920, height: 1080 }, background: "transparent",
        children: [
          // Background (game world placeholder)
          { id: "game-world", type: "rect", position: { x: 0, y: 0 }, size: { width: 1920, height: 1080 }, fill: "#1a4d2e", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 0.3 },
          // Top-left: Health and status
          { id: "health-panel", type: "rect", position: { x: 30, y: 30 }, size: { width: 380, height: 120 }, fill: "#1e1b2e", stroke: "#6b5ca5", strokeWidth: 2, radius: 12, opacity: 0.9 },
          { id: "player-name", type: "text", text: "Player One", variant: "h3", position: { x: 50, y: 50 }, size: { width: 200, height: 24 }, color: "#f8d97a" },
          { id: "level-text", type: "text", text: "Lv. 42", variant: "body", position: { x: 270, y: 53 }, size: { width: 100, height: 20 }, color: "#a0aec0" },
          // Health bar
          { id: "hp-label", type: "text", text: "HP", variant: "caption", position: { x: 50, y: 85 }, size: { width: 30, height: 16 }, color: "#ef4444" },
          { id: "hp-bar-bg", type: "rect", position: { x: 90, y: 83 }, size: { width: 280, height: 20 }, fill: "#4a4563", stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
          { id: "hp-bar-fill", type: "rect", position: { x: 90, y: 83 }, size: { width: 210, height: 20 }, fill: "#ef4444", stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
          { id: "hp-text", type: "text", text: "750/1000", variant: "caption", position: { x: 180, y: 86 }, size: { width: 80, height: 14 }, color: "#ffffff", align: "center" },
          // Mana bar
          { id: "mp-label", type: "text", text: "MP", variant: "caption", position: { x: 50, y: 115 }, size: { width: 30, height: 16 }, color: "#3b82f6" },
          { id: "mp-bar-bg", type: "rect", position: { x: 90, y: 113 }, size: { width: 280, height: 20 }, fill: "#4a4563", stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
          { id: "mp-bar-fill", type: "rect", position: { x: 90, y: 113 }, size: { width: 196, height: 20 }, fill: "#3b82f6", stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
          { id: "mp-text", type: "text", text: "350/500", variant: "caption", position: { x: 180, y: 116 }, size: { width: 80, height: 14 }, color: "#ffffff", align: "center" },
          // Experience bar (under health panel)
          { id: "xp-bar-bg", type: "rect", position: { x: 30, y: 165 }, size: { width: 380, height: 12 }, fill: "#4a4563", stroke: undefined, strokeWidth: 0, radius: 6, opacity: 0.9 },
          { id: "xp-bar-fill", type: "rect", position: { x: 30, y: 165 }, size: { width: 266, height: 12 }, fill: "#fbbf24", stroke: undefined, strokeWidth: 0, radius: 6, opacity: 0.9 },
          { id: "xp-text", type: "text", text: "XP: 8,450 / 12,000", variant: "caption", position: { x: 140, y: 167 }, size: { width: 150, height: 10 }, color: "#ffffff", align: "center" },
          // Top-right: Mini-map
          { id: "minimap-panel", type: "rect", position: { x: 1520, y: 30 }, size: { width: 370, height: 370 }, fill: "#1e1b2e", stroke: "#6b5ca5", strokeWidth: 2, radius: 12, opacity: 0.9 },
          { id: "minimap-title", type: "text", text: "Map", variant: "h3", position: { x: 1550, y: 50 }, size: { width: 100, height: 24 }, color: "#f8d97a" },
          { id: "minimap-bg", type: "rect", position: { x: 1550, y: 85 }, size: { width: 310, height: 290 }, fill: "#2a2640", stroke: "#4a4563", strokeWidth: 1, radius: 8, opacity: 1 },
          // Map elements (simple grid representation)
          ...Array.from({ length: 16 }, (_, i) => {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const size = 70;
            const x = 1555 + col * size;
            const y = 90 + row * size;
            const explored = Math.random() > 0.4;
            return {
              id: `map-cell-${i}`,
              type: "rect" as const,
              position: { x, y },
              size: { width: size, height: size },
              fill: explored ? "#4a4563" : "#2a2640",
              stroke: "#6b5ca5",
              strokeWidth: 1,
              radius: 0,
              opacity: 1
            };
          }),
          // Player marker on mini-map
          { id: "player-marker", type: "rect", position: { x: 1660, y: 195 }, size: { width: 16, height: 16 }, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2, radius: 8, opacity: 1 },
          // Compass directions
          { id: "compass-n", type: "text", text: "N", variant: "caption", position: { x: 1695, y: 90 }, size: { width: 20, height: 14 }, color: "#f8d97a", align: "center" },
          // Bottom-left: Quick inventory slots
          { id: "quickbar-panel", type: "rect", position: { x: 720, y: 970 }, size: { width: 480, height: 80 }, fill: "#1e1b2e", stroke: "#6b5ca5", strokeWidth: 2, radius: 12, opacity: 0.9 },
          ...Array.from({ length: 6 }, (_, i) => {
            const x = 740 + i * 75;
            const items = ["Sword", "Shield", "Potion", "Scroll", "Fire", "Gem"];
            const keybinds = ["1", "2", "3", "4", "5", "6"];
            return [
              {
                id: `qslot-${i}`,
                type: "rect" as const,
                position: { x, y: 985 },
                size: { width: 60, height: 50 },
                fill: "#4a4563",
                stroke: i === 0 ? "#f8d97a" : "#6b5ca5",
                strokeWidth: i === 0 ? 3 : 2,
                radius: 6,
                opacity: 1
              },
              {
                id: `qitem-${i}`,
                type: "text" as const,
                text: items[i],
                variant: "caption" as const,
                position: { x: x + 5, y: 1000 },
                size: { width: 50, height: 24 },
                color: "#ffffff",
                align: "center" as const
              },
              {
                id: `qkey-${i}`,
                type: "text" as const,
                text: keybinds[i],
                variant: "caption" as const,
                position: { x: x + 45, y: 1020 },
                size: { width: 10, height: 12 },
                color: "#a0aec0"
              }
            ];
          }).flat(),
          // Bottom-right: Currency and resources
          { id: "resources-panel", type: "rect", position: { x: 1520, y: 970 }, size: { width: 370, height: 80 }, fill: "#1e1b2e", stroke: "#6b5ca5", strokeWidth: 2, radius: 12, opacity: 0.9 },
          { id: "gold-icon", type: "text", text: "Gold", variant: "body", position: { x: 1550, y: 990 }, size: { width: 40, height: 28 }, color: "#fbbf24" },
          { id: "gold-amount", type: "text", text: "12,450", variant: "h3", position: { x: 1600, y: 995 }, size: { width: 120, height: 24 }, color: "#fbbf24" },
          { id: "gem-icon", type: "text", text: "Gems", variant: "body", position: { x: 1730, y: 990 }, size: { width: 40, height: 28 }, color: "#a855f7" },
          { id: "gem-amount", type: "text", text: "87", variant: "h3", position: { x: 1780, y: 995 }, size: { width: 80, height: 24 }, color: "#a855f7" },
        ],
      }
    }),
  },
];

export default function CanvasApp() {
  // Design mode (#142): null = not chosen yet, shown as modal on first load
  // Auto-select 'general' when arriving from the Kulrs import flow
  const [designMode, setDesignMode] = useState<DesignMode | null>(() => {
    const name = getCurrentDesignName();
    if (name && name.startsWith('Kulrs Import')) return 'general';
    return null;
  });

  // Collaboration state
  const [roomId, setRoomId] = useState<string | null>(getRoomIdFromURL);
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
  
  // Custom hooks for domain-specific state management
  const {
    tool,
    setTool,
    editingCurveId,
    setEditingCurveId,
    selectedCurvePointIndex,
    setSelectedCurvePointIndex,
  } = useToolState();
  
  const {
    helpOpen,
    setHelpOpen,
    fileOpen,
    setFileOpen,
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
    shareDialogOpen,
    setShareDialogOpen,
    templateBrowserOpen,
    setTemplateBrowserOpen,
    exportDialogOpen,
    setExportDialogOpen,
  } = useDialogState();
  
  const {
    attributeTab,
    setAttributeTab,
    panelMode,
    setPanelMode,
    rawDashInput,
    setRawDashInput,
    lastFillById,
    setLastFillById,
    lastStrokeById,
    setLastStrokeById,
  } = useAttributeState();
  
  const {
    selectedIconId,
    setSelectedIconId,
    selectedComponentId,
    setSelectedComponentId,
    iconSearch,
    setIconSearch,
  } = useLibraryState();
  
  const {
    selectedProposalId,
    setSelectedProposalId,
    viewingProposedSpec,
    setViewingProposedSpec,
  } = useProposalState();
  
  const { selection: selectedIds, setSelection } = useSelection();
  
  // Rectangle default attributes (persisted)
  const { defaults: rectDefaults, update: updateRectDefaults } = usePersistentRectDefaults({ fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 0, opacity: 1, strokeDash: undefined });
  // Line default attributes
  const [lineDefaults, setLineDefaults] = useState({ stroke: '#334155', strokeWidth: 2, startArrow: false, endArrow: false, arrowSize: 1 });
  const updateLineDefaults = useCallback((patch: Record<string, unknown>) => {
    setLineDefaults(prev => ({ ...prev, ...patch }));
  }, []);
  // Curve default attributes
  const [curveDefaults, setCurveDefaults] = useState({ fill: undefined as string | undefined, stroke: '#334155', strokeWidth: 2, opacity: 1, closed: false, tension: 0.5 });
  const updateCurveDefaults = useCallback((patch: Record<string, unknown>) => {
    setCurveDefaults(prev => ({ ...prev, ...patch }));
  }, []);
  // Draw default attributes
  const [drawDefaults, setDrawDefaults] = useState({ stroke: '#334155', strokeWidth: 2, strokeDash: undefined as number[] | undefined, lineCap: 'round' as CanvasLineCap, smoothing: 15 });
  const updateDrawDefaults = useCallback((patch: Record<string, unknown>) => {
    setDrawDefaults(prev => ({ ...prev, ...patch }));
  }, []);
  // Text default attributes
  const [textDefaults, setTextDefaults] = useState({ fontFamily: 'Arial', fontSize: 14, fontWeight: '400' as string, fontStyle: 'normal' as string, color: '#000000' });
  const updateTextDefaults = useCallback((patch: Record<string, unknown>) => {
    setTextDefaults(prev => ({ ...prev, ...patch }));
  }, []);
  // Polygon sides (lifted from CanvasStage so ToolSettingsBar can control it)
  const [polygonSides, setPolygonSides] = useState(5);
  // Snapping toggles
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToObjects, setSnapToObjects] = useState(true);
  const [snapToSpacing, setSnapToSpacing] = useState(true);
  // Grid size (px between dots)
  const [gridSize, setGridSize] = useState(20);
  // Snap anchor mode: which part of the object snaps
  const [snapAnchor, setSnapAnchor] = useState<'center' | 'border' | 'both'>('both');
  // Recent colors via hook
  const { recentColors, beginSession: beginRecentSession, previewColor: previewRecent, commitColor: commitRecent } = useRecentColors();
  const [canvasRef, canvasSize] = useElementSize<HTMLDivElement>();
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [draggingGroupIndex, setDraggingGroupIndex] = useState<number | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);
  const [viewportTransition, setViewportTransition] = useState<null | { targetId: string; durationMs?: number; easing?: FlowTransition["easing"]; _key: string }>(null);
  const [currentDesignName, setCurrentDesignNameState] = useState<string | null>(getCurrentDesignName);
  const [fitToContentKey, setFitToContentKey] = useState(0); // Increment to trigger fit-to-content in CanvasStage
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const blockCanvasClicksRef = useRef(false);
  const skipNormalizationRef = useRef(false);
  const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0';

  // Design theme (Kulrs integration)
  const {
    theme: activeTheme,
    applyPalette,
    toggleMode: toggleThemeMode,
    updateTokenColor,
    updateTypography,
    updatePaletteOrder,
  } = useDesignTheme();

  // ── Propagate theme changes to all elements on the canvas ──────────
  // We use a ref to track whether this is the initial mount so we don't
  // double-apply on first render (handleApplyPaletteAsTheme already does it).
  const themeAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeTheme) return;
    // Build fingerprint that includes colors, mode, AND typography
    const fingerprint = activeTheme.id
      + JSON.stringify(activeTheme.colors)
      + activeTheme.mode
      + (activeTheme.typography?.headingFont ?? '')
      + (activeTheme.typography?.bodyFont ?? '');
    // Skip if the theme instance hasn't actually changed
    if (themeAppliedRef.current === fingerprint) return;
    themeAppliedRef.current = fingerprint;
    setSpec(prev => bindAndApplyTheme(prev, activeTheme));

    // Also update tool default colours to match the theme
    updateRectDefaults({
      fill: activeTheme.colors['color.background.primary'],
      stroke: activeTheme.colors['color.border.primary'],
    });
  }, [activeTheme, setSpec, updateRectDefaults]);

  const { isAuthenticated } = useAuth();

  // Toast notification for save feedback
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Phase 4: Agent Proposals
  // Persist canvas ID per design name so it survives re-renders / remounts
  const canvasIdStorageKey = `vizail_canvas_id_${currentDesignName ?? '__default__'}`;
  const [currentCanvasId, setCurrentCanvasIdRaw] = useState<string | null>(() => {
    try { return localStorage.getItem(canvasIdStorageKey); } catch { return null; }
  });
  const setCurrentCanvasId = useCallback((id: string | null) => {
    setCurrentCanvasIdRaw(id);
    try {
      if (id) localStorage.setItem(canvasIdStorageKey, id);
      else localStorage.removeItem(canvasIdStorageKey);
    } catch { /* ignore */ }
  }, [canvasIdStorageKey]);
  // Re-read from storage when the design name changes
  useEffect(() => {
    try {
      setCurrentCanvasIdRaw(localStorage.getItem(canvasIdStorageKey));
    } catch { setCurrentCanvasIdRaw(null); }
  }, [canvasIdStorageKey]);
  const [creatingCanvasId, setCreatingCanvasId] = useState(false);
  
  const proposals = useProposals({
    canvasId: currentCanvasId ?? '',
    enabled: !!currentCanvasId, // Auto-load when canvas ID exists
    refreshInterval: currentCanvasId ? 30000 : 0, // Poll every 30s when shared
  });

  const pushRecent = useCallback((col?: string) => { if (col) commitRecent(col); }, [commitRecent]);
  const wrappedPreviewRecent = useCallback((col?: string) => { if (col) previewRecent(col); }, [previewRecent]);

  /** Apply a Kulrs palette as the active design theme and update the spec */
  const handleApplyPaletteAsTheme = useCallback((paletteColors: string[], mode: 'light' | 'dark', paletteId?: string) => {
    const newTheme = applyPalette(paletteColors, mode, {
      name: `Kulrs ${mode === 'dark' ? 'Dark' : 'Light'}`,
      kulrsPaletteId: paletteId,
    });
    // Infer bindings for existing nodes + resolve all bindings
    setSpec(prev => bindAndApplyTheme(prev, newTheme));
  }, [applyPalette, setSpec]);

  /** Handle picking a theme color — apply to selected element or current tool */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePickThemeColor = useCallback((hex: string, _token: import('./theme/types').ColorTokenName) => {
    pushRecent(hex);
  }, [pushRecent]);

  const updateFlows = useCallback((nextFlows: Flow[]) => {
    setSpec(prev => ({ ...prev, flows: nextFlows }));
  }, [setSpec]);
  
  const handleViewportChange = useCallback((newViewport: { scale: number; x: number; y: number }) => {
    setViewport(newViewport);
  }, []);

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
    if (action === 'templates') {
      setTemplateBrowserOpen(true);
      logger.info('File action templates: opening template browser');
    }
    if (action === 'save') {
      const designName = currentDesignName || (() => {
        const name = window.prompt("Save: Enter a name for this design", "Untitled Design");
        if (name && name.trim()) {
          setCurrentDesignNameState(name.trim());
          setCurrentDesignName(name.trim());
          return name.trim();
        }
        return null;
      })();
      if (!designName) return;

      // Always save to localStorage as a backup
      saveNamedDesign(designName, spec);

      if (isAuthenticated) {
        // Cloud save for authenticated users
        (async () => {
          try {
            const { apiClient } = await import('./api/client');
            if (currentCanvasId) {
              const result = await apiClient.updateCanvas(currentCanvasId, { name: designName, spec });
              if (result.error) {
                showToast(`Cloud save failed: ${result.error}. Saved locally.`, 'warning');
              } else {
                showToast('Saved to cloud', 'success');
              }
            } else {
              // Create a new canvas in the cloud
              const result = await apiClient.createCanvas(designName, spec);
              if (result.data) {
                setCurrentCanvasId(result.data.id);
                showToast('Saved to cloud', 'success');
              } else {
                showToast(`Cloud save failed: ${result.error}. Saved locally.`, 'warning');
              }
            }
          } catch {
            showToast('Cloud save failed. Saved locally.', 'warning');
          }
        })();
      } else {
        showToast('Saved locally. Sign in to save to the cloud.', 'warning');
      }
      logger.info(`Saved design: ${designName}`);
    }
    if (action === 'saveAs') {
      const defaultName = currentDesignName ? `${currentDesignName} (copy)` : "Untitled Design";
      const name = window.prompt("Save As: Enter a name for this design", defaultName);
      if (name && name.trim()) {
        const designName = name.trim();
        saveNamedDesign(designName, spec);
        setCurrentDesignNameState(designName);
        setCurrentDesignName(designName);

        if (isAuthenticated) {
          (async () => {
            try {
              const { apiClient } = await import('./api/client');
              const result = await apiClient.createCanvas(designName, spec);
              if (result.data) {
                setCurrentCanvasId(result.data.id);
                showToast('Saved to cloud', 'success');
              } else {
                showToast(`Cloud save failed: ${result.error}. Saved locally.`, 'warning');
              }
            } catch {
              showToast('Cloud save failed. Saved locally.', 'warning');
            }
          })();
        } else {
          showToast('Saved locally. Sign in to save to the cloud.', 'warning');
        }
        logger.info(`Saved design as: ${designName}`);
      }
    }
  }, [spec, currentDesignName, currentCanvasId, isAuthenticated, showToast, setCurrentCanvasId]);

  // Load a saved design
  const loadDesign = useCallback((design: SavedDesign) => {
    setSpec(design.spec);
    setCurrentDesignNameState(design.name);
    setCurrentDesignName(design.name);
    setSelection([]);
    // Clear cloud canvas ID — loaded design may have a different one stored per name
    // (the canvasIdStorageKey will be re-read via the useEffect above)
    setSelectedProposalId(null);
    setViewingProposedSpec(false);
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
      let newSpec = template.build();
      // Apply the active theme (colors + fonts) to the new template
      if (activeTheme) {
        newSpec = bindAndApplyTheme(newSpec, activeTheme);
      }
      setSpec(newSpec);
      setSelection([]);
      // Clear canvas ID — this is a brand new design, not yet saved to cloud
      setCurrentCanvasId(null);
      setCurrentDesignNameState(null);
      setCurrentDesignName(null);
      // Reset proposal state
      setSelectedProposalId(null);
      setViewingProposedSpec(false);
      // Only fit to content in local mode (not collaborative)
      if (!isCollaborative) {
        setTimeout(() => setFitToContentKey(k => k + 1), 50);
      }
      logger.info(`Applied template: ${template.name}`);
    }
    setNewDialogOpen(false);
  }, [setSpec, setSelection, isCollaborative, setCurrentCanvasId, activeTheme]);

  // Handle Choose Design Mode selection (#142)
  const onChooseMode = useCallback((chosen: DesignMode) => {
    setDesignMode(chosen);
    if (chosen === 'roblox') {
      applyTemplate('game-ui-hud');
    }
    logger.info(`Design mode selected: ${chosen}`);
  }, [applyTemplate]);

  // Dialog action callbacks
  const handleStartCollaborativeSession = useCallback(() => {
    const newRoomId = generateRoomId();
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoomId);
    window.history.pushState({}, '', url.toString());
    setRoomId(newRoomId);
  }, []);

  const handleLeaveCollaborativeSession = useCallback(() => {
    // Leave collaborative mode
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.toString());
    setRoomId(null);
    setShareDialogOpen(false);
  }, []);

  const handleCopyShareLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${roomId}`);
  }, [roomId]);

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
      {/* Choose Design Mode modal (#142) — shown until user picks a mode */}
      {designMode === null && <ChooseModeModal onSelect={onChooseMode} />}
      {/* Header */}
      <HeaderToolbar
        headerRef={headerRef}
        fileOpen={fileOpen}
        setFileOpen={setFileOpen}
        fileAction={fileAction}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
        setAboutOpen={setAboutOpen}
        setCheatOpen={setCheatOpen}
        setGettingStartedOpen={setGettingStartedOpen}
        setCanvasGuideOpen={setCanvasGuideOpen}
        isCollaborative={isCollaborative}
        status={status}
        collaborators={collaborators}
        isSyncing={isSyncing}
        lastError={lastError}
        reconnect={reconnect}
        setShareDialogOpen={setShareDialogOpen}
        setExportDialogOpen={setExportDialogOpen}
        tool={tool}
      />
      {/* Dialogs */}
      <DialogManager
        shareDialogOpen={shareDialogOpen}
        setShareDialogOpen={setShareDialogOpen}
        aboutOpen={aboutOpen}
        setAboutOpen={setAboutOpen}
        cheatOpen={cheatOpen}
        setCheatOpen={setCheatOpen}
        gettingStartedOpen={gettingStartedOpen}
        setGettingStartedOpen={setGettingStartedOpen}
        canvasGuideOpen={canvasGuideOpen}
        setCanvasGuideOpen={setCanvasGuideOpen}
        iconLibraryOpen={iconLibraryOpen}
        setIconLibraryOpen={setIconLibraryOpen}
        componentLibraryOpen={componentLibraryOpen}
        setComponentLibraryOpen={setComponentLibraryOpen}
        newDialogOpen={newDialogOpen}
        setNewDialogOpen={setNewDialogOpen}
        openDialogOpen={openDialogOpen}
        setOpenDialogOpen={setOpenDialogOpen}
        templateBrowserOpen={templateBrowserOpen}
        setTemplateBrowserOpen={setTemplateBrowserOpen}
        isCollaborative={isCollaborative}
        roomId={roomId}
        selectedIconId={selectedIconId}
        setSelectedIconId={setSelectedIconId}
        iconSearch={iconSearch}
        setIconSearch={setIconSearch}
        selectedComponentId={selectedComponentId}
        setSelectedComponentId={setSelectedComponentId}
        appVersion={appVersion}
        onApplyTemplate={applyTemplate}
        onLoadDesign={loadDesign}
        onStartCollaborativeSession={handleStartCollaborativeSession}
        onLeaveCollaborativeSession={handleLeaveCollaborativeSession}
        onCopyShareLink={handleCopyShareLink}
        templates={TEMPLATES}
        exportDialogOpen={exportDialogOpen}
        setExportDialogOpen={setExportDialogOpen}
        currentSpec={spec}
        activeTheme={activeTheme}
      />
      {/* Body layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left toolbar */}
        <LeftToolbar
          tool={tool}
          setTool={setTool}
          setIconLibraryOpen={setIconLibraryOpen}
          setComponentLibraryOpen={setComponentLibraryOpen}
        />
        {/* Canvas center */}
        <main 
          className="flex-1 relative min-w-0"
        >
          {/* Tool settings bar overlays the top of the canvas */}
          <ToolSettingsBar
            tool={tool}
            polygonSides={polygonSides}
            setPolygonSides={setPolygonSides}
            rectDefaults={{
              fill: rectDefaults.fill,
              stroke: rectDefaults.stroke,
              strokeWidth: rectDefaults.strokeWidth ?? 1,
              radius: rectDefaults.radius ?? 0,
              opacity: rectDefaults.opacity ?? 1,
            }}
            updateRectDefaults={updateRectDefaults}
            lineDefaults={lineDefaults}
            updateLineDefaults={updateLineDefaults}
            curveDefaults={curveDefaults}
            updateCurveDefaults={updateCurveDefaults}
            drawDefaults={drawDefaults}
            updateDrawDefaults={updateDrawDefaults}
            textDefaults={textDefaults}
            updateTextDefaults={updateTextDefaults}
            snapToGrid={snapToGrid}
            setSnapToGrid={setSnapToGrid}
            snapToObjects={snapToObjects}
            setSnapToObjects={setSnapToObjects}
            snapToSpacing={snapToSpacing}
            setSnapToSpacing={setSnapToSpacing}
            gridSize={gridSize}
            setGridSize={setGridSize}
            snapAnchor={snapAnchor}
            setSnapAnchor={setSnapAnchor}
            selectedCount={selectedIds.length}
          />
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
            {stageWidth > 0 && stageHeight > 0 && (() => {
              // Compute the spec to display (current or proposed)
              const selectedProposal = proposals.proposals.find(p => p.id === selectedProposalId);
              const displaySpec = viewingProposedSpec && selectedProposal
                ? applyProposalOperations(spec, selectedProposal.operations)
                : spec;
              
              return (
                <CanvasStage
                  tool={tool}
                  spec={displaySpec}
                  setSpec={viewingProposedSpec ? () => {} : setSpec} // Read-only when viewing proposal
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
                selectedCurvePointIndex={selectedCurvePointIndex}
                setSelectedCurvePointIndex={setSelectedCurvePointIndex}
                editingCurveId={editingCurveId}
                onEditingCurveIdChange={setEditingCurveId}
                blockCanvasClicksRef={blockCanvasClicksRef}
                skipNormalizationRef={skipNormalizationRef}
                fitToContentKey={fitToContentKey}
                polygonSides={polygonSides}
                setPolygonSides={setPolygonSides}
                rectDefaults={{
                  fill: rectDefaults.fill,
                  stroke: rectDefaults.stroke,
                  strokeWidth: rectDefaults.strokeWidth ?? 1,
                  radius: rectDefaults.radius ?? 0,
                  opacity: rectDefaults.opacity ?? 1,
                  strokeDash: rectDefaults.strokeDash,
                }}
                lineDefaults={lineDefaults}
                curveDefaults={curveDefaults}
                drawDefaults={drawDefaults}
                textDefaults={textDefaults}
                viewportTransition={viewportTransition}
                onViewportChange={handleViewportChange}
                snapToGrid={snapToGrid}
                snapToObjects={snapToObjects}
                snapToSpacing={snapToSpacing}
                gridSize={gridSize}
                snapAnchor={snapAnchor}
                activeTheme={activeTheme}
                />
              );
            })()}
            {/* Proposal preview indicator */}
            {viewingProposedSpec && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg font-semibold text-sm z-50">
                👁️ Viewing Proposed Changes
              </div>
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
        {!sidebarVisible && (
          <>
            <button
              onClick={() => {
                setSidebarVisible(true);
              }}
              className="fixed right-0 z-10 h-12 bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 shadow-md transition-colors flex items-center justify-center"
              title="Show Panel"
              style={{ 
                padding: 0,
                width: '20px',
                top: '116px',
                borderRadius: '8px 0 0 8px',
                borderLeft: '1px solid #9ca3af',
                borderTop: '1px solid #9ca3af',
                borderBottom: '1px solid #9ca3af'
              }}
            >
              <span className="text-xs text-gray-600">◀</span>
            </button>
            <button
              onClick={() => {
                setSidebarVisible(true);
                setPanelMode('attributes');
              }}
              className={`fixed right-0 z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'attributes'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Show Attributes"
              style={{ 
                padding: 0,
                width: '20px',
                top: '168px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'attributes' ? 'text-white' : 'text-gray-700'}`}
                style={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                ATTRIBUTES
              </span>
            </button>
            <button
              onClick={() => {
                setSidebarVisible(true);
                setPanelMode('theme');
              }}
              className={`fixed right-0 z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'theme'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Show Theme"
              style={{
                padding: 0,
                width: '20px',
                top: '300px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'theme' ? 'text-white' : 'text-gray-700'}`}
                style={{
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                THEME
              </span>
            </button>
            <button
              onClick={() => {
                setSidebarVisible(true);
                setPanelMode('agent');
              }}
              className={`fixed right-0 z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'agent'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Show Agent Control"
              style={{ 
                padding: 0,
                width: '20px',
                top: '432px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'agent' ? 'text-white' : 'text-gray-700'}`}
                style={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                AGENT
              </span>
            </button>
          </>
        )}
        {sidebarVisible && (
          <aside className="w-72 border-l border-gray-200 bg-gradient-to-b from-white to-gray-50 flex flex-col shadow-sm relative">
            {/* Vertical tab buttons on left edge — collapse first, then panel tabs */}
            <button
              onClick={() => setSidebarVisible(false)}
              className="fixed z-10 h-12 bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 shadow-md transition-colors flex items-center justify-center"
              title="Hide Panel"
              style={{ 
                padding: 0,
                width: '20px',
                top: '116px',
                right: '288px',
                borderRadius: '8px 0 0 8px',
                borderLeft: '1px solid #9ca3af',
                borderTop: '1px solid #9ca3af',
                borderBottom: '1px solid #9ca3af'
              }}
            >
              <span className="text-xs text-gray-600">▶</span>
            </button>
            <button
              onClick={() => setPanelMode('attributes')}
              className={`fixed z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'attributes'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Attributes"
              style={{ 
                padding: 0,
                width: '20px',
                top: '168px',
                right: '288px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'attributes' ? 'text-white' : 'text-gray-700'}`}
                style={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                ATTRIBUTES
              </span>
            </button>
            <button
              onClick={() => setPanelMode('theme')}
              className={`fixed z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'theme'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Theme"
              style={{
                padding: 0,
                width: '20px',
                top: '300px',
                right: '288px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'theme' ? 'text-white' : 'text-gray-700'}`}
                style={{
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                THEME
              </span>
            </button>
            <button
              onClick={() => setPanelMode('agent')}
              className={`fixed z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'agent'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Agent Control"
              style={{ 
                padding: 0,
                width: '20px',
                top: '432px',
                right: '288px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'agent' ? 'text-white' : 'text-gray-700'}`}
                style={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                AGENT
              </span>
            </button>
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              {panelMode === 'attributes' ? (
                <>
                  <i className="fa-solid fa-sliders text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Attributes</span>
                </>
              ) : panelMode === 'theme' ? (
                <>
                  <i className="fa-solid fa-palette text-teal-500" />
                  <span className="text-sm font-semibold text-gray-700">Theme</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles text-teal-500" />
                  <span className="text-sm font-semibold text-gray-700">Agent Control</span>
                </>
              )}
            </div>
            <div className="p-4 text-xs text-gray-600 space-y-4 overflow-auto flex-1">
              {panelMode === 'attributes' && (
                <AttributesSidebar
                  spec={spec}
                  setSpec={setSpec}
                  selectedIds={selectedIds}
                  tool={tool}
                  editingCurveId={editingCurveId}
                  setEditingCurveId={setEditingCurveId}
                  selectedCurvePointIndex={selectedCurvePointIndex}
                  setSelectedCurvePointIndex={setSelectedCurvePointIndex}
                  attributeTab={attributeTab}
                  setAttributeTab={setAttributeTab}
                  draggingGroupIndex={draggingGroupIndex}
                  setDraggingGroupIndex={setDraggingGroupIndex}
                  dragOverGroupIndex={dragOverGroupIndex}
                  setDragOverGroupIndex={setDragOverGroupIndex}
                  lastFillById={lastFillById}
                  setLastFillById={setLastFillById}
                  lastStrokeById={lastStrokeById}
                  setLastStrokeById={setLastStrokeById}
                  rawDashInput={rawDashInput}
                  setRawDashInput={setRawDashInput}
                  beginRecentSession={beginRecentSession}
                  previewRecent={wrappedPreviewRecent}
                  commitRecent={commitRecent}
                  pushRecent={pushRecent}
                  recentColors={recentColors}
                  rectDefaults={rectDefaults}
                  updateRectDefaults={updateRectDefaults}
                  activeFlowId={activeFlowId}
                  setActiveFlowId={setActiveFlowId}
                  updateFlows={updateFlows}
                  focusScreen={focusScreen}
                  playTransitionPreview={playTransitionPreview}
                  setSelection={setSelection}
                  isCollaborative={isCollaborative}
                  updateSelection={updateSelection}
                  blockCanvasClicksRef={blockCanvasClicksRef}
                  skipNormalizationRef={skipNormalizationRef}
                  activeTheme={activeTheme}
                />
              )}

              {/* Theme Panel Content */}
              {panelMode === 'theme' && (
                <>
                <KulrsPalettePanel
                  onPickColor={(hex) => pushRecent(hex)}
                  onApplyFill={selectedIds.length === 1 ? (hex) => {
                    setSpec(prev => ({
                      ...prev,
                      root: updateNode(prev.root, selectedIds[0], { fill: hex, fillGradient: undefined })
                    }));
                    pushRecent(hex);
                  } : undefined}
                  onApplyStroke={selectedIds.length === 1 ? (hex) => {
                    setSpec(prev => ({
                      ...prev,
                      root: updateNode(prev.root, selectedIds[0], { stroke: hex })
                    }));
                    pushRecent(hex);
                  } : undefined}
                  spec={spec}
                  setSpec={setSpec}
                  onApplyAsTheme={handleApplyPaletteAsTheme}
                />
                <ThemePanel
                  theme={activeTheme}
                  onUpdateTokenColor={updateTokenColor}
                  onUpdateTypography={updateTypography}
                  onUpdatePaletteOrder={updatePaletteOrder}
                  onToggleMode={toggleThemeMode}
                  onPickThemeColor={(hex, token) => {
                    // Apply to selection fill if something is selected
                    if (selectedIds.length === 1) {
                      setSpec(prev => ({
                        ...prev,
                        root: {
                          ...prev.root,
                          children: prev.root.children.map(function updateNode(n: LayoutNode): LayoutNode {
                            if (n.id === selectedIds[0]) {
                              return {
                                ...n,
                                fill: hex,
                                fillGradient: undefined,
                                themeBindings: {
                                  ...((n as unknown as Record<string, unknown>)?.themeBindings as Record<string, unknown> ?? {}),
                                  fill: token,
                                },
                              } as LayoutNode;
                            }
                            if ('children' in n && Array.isArray((n as { children?: LayoutNode[] }).children)) {
                              return { ...n, children: (n as { children: LayoutNode[] }).children.map(updateNode) } as LayoutNode;
                            }
                            return n;
                          }),
                        } as FrameNode,
                      }));
                    }
                    pushRecent(hex);
                    handlePickThemeColor(hex, token);
                  }}
                />
                </>
              )}

              {/* Agent Panel Content */}
              {panelMode === 'agent' && (
                <AgentPanel
                  currentCanvasId={currentCanvasId}
                  setCurrentCanvasId={setCurrentCanvasId}
                  creatingCanvasId={creatingCanvasId}
                  setCreatingCanvasId={setCreatingCanvasId}
                  currentDesignName={currentDesignName}
                  spec={spec}
                  proposals={proposals}
                  selectedProposalId={selectedProposalId}
                  setSelectedProposalId={setSelectedProposalId}
                  viewingProposedSpec={viewingProposedSpec}
                  setViewingProposedSpec={setViewingProposedSpec}
                  setSpec={setSpec}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'success' ? 'bg-green-600 text-white' :
          toast.type === 'warning' ? 'bg-amber-500 text-white' :
          'bg-gray-800 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
