import type { LayoutSpec } from "./layout-schema";

export interface CanvasTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  build: () => LayoutSpec;
}

export const TEMPLATES: CanvasTemplate[] = [
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
  // Presentation deck template
  {
    id: 'presentation-deck',
    name: 'Presentation Deck',
    icon: 'fa-solid fa-tv',
    description: 'Clean slide deck for visual storytelling',
    category: 'presentation',
    build: () => ({
      root: {
        id: "root", type: "frame", size: { width: 1920, height: 1080 }, background: undefined,
        children: [
          // Slide background
          { id: "slide-bg", type: "rect", position: { x: 0, y: 0 }, size: { width: 1920, height: 1080 }, fill: "#ffffff", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          // Accent bar at top
          { id: "accent-bar", type: "rect", position: { x: 0, y: 0 }, size: { width: 1920, height: 8 }, fill: "#3b82f6", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          // Title
          { id: "title", type: "text", text: "Presentation Title", variant: "h1", position: { x: 120, y: 200 }, size: { width: 1000, height: 72 }, color: "#0f172a" },
          // Subtitle
          { id: "subtitle", type: "text", text: "A brief tagline or description of the presentation goes here", variant: "h2", position: { x: 120, y: 290 }, size: { width: 900, height: 36 }, color: "#64748b" },
          // Divider
          { id: "divider", type: "rect", position: { x: 120, y: 360 }, size: { width: 200, height: 4 }, fill: "#3b82f6", stroke: undefined, strokeWidth: 0, radius: 2, opacity: 1 },
          // Content area — three columns
          { id: "col1-box", type: "rect", position: { x: 120, y: 430 }, size: { width: 520, height: 380 }, fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1, radius: 16, opacity: 1 },
          { id: "col1-icon-bg", type: "rect", position: { x: 160, y: 470 }, size: { width: 56, height: 56 }, fill: "#dbeafe", stroke: undefined, strokeWidth: 0, radius: 12, opacity: 1 },
          { id: "col1-title", type: "text", text: "First Point", variant: "h2", position: { x: 160, y: 550 }, size: { width: 440, height: 32 }, color: "#0f172a" },
          { id: "col1-body", type: "text", text: "Explain the first key idea or takeaway for your audience.", variant: "body", position: { x: 160, y: 600 }, size: { width: 440, height: 60 }, color: "#64748b" },
          { id: "col2-box", type: "rect", position: { x: 700, y: 430 }, size: { width: 520, height: 380 }, fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1, radius: 16, opacity: 1 },
          { id: "col2-icon-bg", type: "rect", position: { x: 740, y: 470 }, size: { width: 56, height: 56 }, fill: "#f3e8ff", stroke: undefined, strokeWidth: 0, radius: 12, opacity: 1 },
          { id: "col2-title", type: "text", text: "Second Point", variant: "h2", position: { x: 740, y: 550 }, size: { width: 440, height: 32 }, color: "#0f172a" },
          { id: "col2-body", type: "text", text: "Elaborate on the second key idea with supporting details.", variant: "body", position: { x: 740, y: 600 }, size: { width: 440, height: 60 }, color: "#64748b" },
          { id: "col3-box", type: "rect", position: { x: 1280, y: 430 }, size: { width: 520, height: 380 }, fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1, radius: 16, opacity: 1 },
          { id: "col3-icon-bg", type: "rect", position: { x: 1320, y: 470 }, size: { width: 56, height: 56 }, fill: "#dcfce7", stroke: undefined, strokeWidth: 0, radius: 12, opacity: 1 },
          { id: "col3-title", type: "text", text: "Third Point", variant: "h2", position: { x: 1320, y: 550 }, size: { width: 440, height: 32 }, color: "#0f172a" },
          { id: "col3-body", type: "text", text: "Share the third key idea and conclude your argument.", variant: "body", position: { x: 1320, y: 600 }, size: { width: 440, height: 60 }, color: "#64748b" },
          // Footer
          { id: "footer-line", type: "rect", position: { x: 120, y: 960 }, size: { width: 1680, height: 1 }, fill: "#e2e8f0", stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: "footer-name", type: "text", text: "Your Name", variant: "body", position: { x: 120, y: 990 }, size: { width: 200, height: 24 }, color: "#94a3b8" },
          { id: "footer-date", type: "text", text: "2026", variant: "body", position: { x: 1680, y: 990 }, size: { width: 120, height: 24 }, color: "#94a3b8" },
          // Page number
          { id: "page-num", type: "text", text: "01", variant: "h2", position: { x: 1760, y: 200 }, size: { width: 80, height: 36 }, color: "#e2e8f0" },
        ],
      }
    }),
  },
];
