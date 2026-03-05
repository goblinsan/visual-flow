/**
 * Shared Kulrs-style canvas builders.
 *
 * Used by both FromKulrsPage (live previews with injected palette colors) and
 * templates.data.ts (static templates colored with the default indigo palette,
 * then recolored at runtime via themeBindings).
 *
 * This is the single source of truth for all five canonical Kulrs templates —
 * top-nav, left-nav, mobile, dashboard, landing.
 */

import type { LayoutSpec, LayoutNode } from '../layout-schema';
import type { ThemeBindings } from '../layout-schema';
import { brightness, lighten, darken } from '../utils/color';

// ── Color helpers ─────────────────────────────────────────────────────────

export function safe(colors: string[], idx: number): string {
  return colors[idx % colors.length] || '#888888';
}

export function textOn(bg: string): string {
  return brightness(bg) > 140 ? '#1a1a2e' : '#ffffff';
}

export function heroTint(color: string, isDark: boolean): string {
  return isDark ? darken(color, 0.6) : lighten(color, 0.85);
}

export function cardTint(color: string, isDark: boolean): string {
  return isDark ? darken(color, 0.7) : lighten(color, 0.88);
}

export function borderTint(color: string, isDark: boolean): string {
  return isDark ? darken(color, 0.4) : lighten(color, 0.5);
}

// ── Theme resolution ──────────────────────────────────────────────────────

export interface ThemeColors {
  pageBg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  isDark: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'custom';

export function resolveTheme(theme: ThemeMode, customBg = '#ffffff'): ThemeColors {
  if (theme === 'dark') {
    return { pageBg: '#0f172a', cardBg: '#1e293b', textPrimary: '#f1f5f9', textSecondary: '#94a3b8', border: '#334155', isDark: true };
  }
  if (theme === 'custom') {
    const dark = brightness(customBg) < 140;
    return {
      pageBg: customBg,
      cardBg: dark ? lighten(customBg, 0.08) : '#ffffff',
      textPrimary: dark ? '#f1f5f9' : '#0f172a',
      textSecondary: dark ? '#94a3b8' : '#64748b',
      border: dark ? lighten(customBg, 0.15) : '#e2e8f0',
      isDark: dark,
    };
  }
  return { pageBg: '#f9fafb', cardBg: '#ffffff', textPrimary: '#0f172a', textSecondary: '#64748b', border: '#e2e8f0', isDark: false };
}

/** Default palette used when no Kulrs palette has been applied yet. */
export const DEFAULT_PALETTE = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];
export const DEFAULT_LIGHT_THEME = resolveTheme('light');

// ── Builder functions ─────────────────────────────────────────────────────

export function buildTopNav(c: string[], hf: string, bf: string, t: ThemeColors): LayoutSpec {
  // Canvas is 1200×860 — matches the HTML preview container exactly (no scaling distortion).
  // HTML nav: height 56, padding 0 32px. Hero: padding 64px 80px. Content: padding 48px 80px.
  const nav = safe(c, 0);
  const hero = safe(c, 1);
  const accent = safe(c, 2);
  // card swatches: ~80px tall, 3 columns in a 1040px inner area (minus 32px padding each side)
  const swatchW = Math.floor((1040 - 32) / 3);  // ~336
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1200, height: 860 }, background: undefined,
      children: [
        // Page background
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1200, height: 860 }, fill: t.pageBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        // Nav bar — 56px tall, full width
        { id: 'nav', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1200, height: 56 }, fill: nav, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        // Brand text — vertically centred in 56px bar: (56-20)/2 = 18
        { id: 'nav-logo', type: 'text', text: 'Brand', variant: 'h2', fontSize: 20, fontWeight: 700, position: { x: 32, y: 18 }, size: { width: 80, height: 22 }, color: textOn(nav), fontFamily: hf },
        // Nav links — gap: 32px, start after brand ~160; text centred at (56-14)/2 = 21
        { id: 'nav-link1', type: 'text', text: 'Home',     variant: 'body', fontSize: 14, position: { x: 160, y: 21 }, size: { width: 50, height: 16 }, color: textOn(nav), opacity: 0.8, fontFamily: bf },
        { id: 'nav-link2', type: 'text', text: 'Features', variant: 'body', fontSize: 14, position: { x: 242, y: 21 }, size: { width: 64, height: 16 }, color: textOn(nav), opacity: 0.8, fontFamily: bf },
        { id: 'nav-link3', type: 'text', text: 'Pricing',  variant: 'body', fontSize: 14, position: { x: 338, y: 21 }, size: { width: 54, height: 16 }, color: textOn(nav), opacity: 0.8, fontFamily: bf },
        { id: 'nav-link4', type: 'text', text: 'About',    variant: 'body', fontSize: 14, position: { x: 424, y: 21 }, size: { width: 44, height: 16 }, color: textOn(nav), opacity: 0.8, fontFamily: bf },
        // Hero section — padding 64px 80px; starts at y=56
        { id: 'hero', type: 'rect', position: { x: 0, y: 56 }, size: { width: 1200, height: 320 }, fill: heroTint(hero, t.isDark), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        // h1 40px — top of section (56+64=120)
        { id: 'hero-title', type: 'text', text: 'Welcome to Our Platform', variant: 'h1', fontSize: 40, fontWeight: 700, position: { x: 80, y: 120 }, size: { width: 700, height: 48 }, color: t.isDark ? lighten(hero, 0.3) : darken(hero, 0.3), fontFamily: hf },
        // subtitle 18px — marginTop 12 after h1 (120+48+12=180)
        { id: 'hero-subtitle', type: 'text', text: 'Build amazing things with our tools', variant: 'body', fontSize: 18, position: { x: 80, y: 180 }, size: { width: 500, height: 24 }, color: t.isDark ? lighten(hero, 0.5) : hero, fontFamily: bf },
        // CTA button — padding 12px 28px → height 14+14+12+12=~42 → use 44; marginTop 24 (180+24+24=228)
        { id: 'hero-cta', type: 'rect', position: { x: 80, y: 228 }, size: { width: 152, height: 44 }, fill: accent, stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
        { id: 'hero-cta-text', type: 'text', text: 'Get Started', variant: 'body', fontSize: 15, fontWeight: 600, position: { x: 108, y: 240 }, size: { width: 100, height: 20 }, color: textOn(accent), fontFamily: bf },
        // Content section — starts at y=376 (56+320), padding 48px 80px
        { id: 'content', type: 'rect', position: { x: 80, y: 376 }, size: { width: 1040, height: 436 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        // Content title — 22px h2; y=376+32=408
        { id: 'content-title', type: 'text', text: 'Featured Content', variant: 'h2', fontSize: 22, fontWeight: 600, position: { x: 112, y: 408 }, size: { width: 280, height: 28 }, color: t.textPrimary, fontFamily: hf },
        // 3 colour swatches — 80px tall, marginTop 20 from title (408+28+20=456), gap 16
        { id: 'swatch-0', type: 'rect', position: { x: 112, y: 456 }, size: { width: swatchW, height: 80 }, fill: cardTint(safe(c, 0), t.isDark), stroke: borderTint(safe(c, 0), t.isDark), strokeWidth: 1, radius: 8, opacity: 1 },
        { id: 'swatch-1', type: 'rect', position: { x: 112 + swatchW + 16, y: 456 }, size: { width: swatchW, height: 80 }, fill: cardTint(safe(c, 1), t.isDark), stroke: borderTint(safe(c, 1), t.isDark), strokeWidth: 1, radius: 8, opacity: 1 },
        { id: 'swatch-2', type: 'rect', position: { x: 112 + (swatchW + 16) * 2, y: 456 }, size: { width: swatchW, height: 80 }, fill: cardTint(safe(c, 2), t.isDark), stroke: borderTint(safe(c, 2), t.isDark), strokeWidth: 1, radius: 8, opacity: 1 },
      ] as LayoutNode[],
    },
  };
}

export function buildLeftNav(c: string[], hf: string, bf: string, t: ThemeColors): LayoutSpec {
  // Canvas: 1200×860. HTML: sidebar 220px wide; main area flex:1.
  // Sidebar padding 24px 16px. Header padding 16px 24px. Grid padding 24px.
  // 3 stat cards in grid with gap 16: (932-48-32)/3 = ~284px each; but simpler: 280px each, gap 16
  const sidebar = safe(c, 0);
  const mainBg = t.pageBg;
  // sidebar items: padding 10px 12px, height 40; gap 4
  // active bg: full width minus 2*8px margin on each side
  const cardW = 280;
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1200, height: 860 }, background: undefined,
      children: [
        // Page background
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1200, height: 860 }, fill: mainBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        // Sidebar — 220px wide, full height
        { id: 'sidebar', type: 'rect', position: { x: 0, y: 0 }, size: { width: 220, height: 860 }, fill: sidebar, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        // Sidebar logo — 18px, y=24 (padding-top 24)
        { id: 'sidebar-logo', type: 'text', text: 'Dashboard', variant: 'h2', fontSize: 18, fontWeight: 700, position: { x: 16, y: 24 }, size: { width: 180, height: 24 }, color: textOn(sidebar), fontFamily: hf },
        // Active nav item highlight — marginBottom 32 after logo (24+24+32=80), height 40
        { id: 'nav-active', type: 'rect', position: { x: 8, y: 80 }, size: { width: 204, height: 40 }, fill: lighten(sidebar, 0.15), stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
        // Nav text centred in 40px items: (40-14)/2=13 from top of item
        { id: 'nav-text1', type: 'text', text: 'Overview',  variant: 'body', fontSize: 14, position: { x: 24, y: 93 },  size: { width: 150, height: 16 }, color: textOn(sidebar), fontFamily: bf },
        { id: 'nav-text2', type: 'text', text: 'Analytics', variant: 'body', fontSize: 14, position: { x: 24, y: 137 }, size: { width: 150, height: 16 }, color: lighten(textOn(sidebar), 0.3), fontFamily: bf },
        { id: 'nav-text3', type: 'text', text: 'Settings',  variant: 'body', fontSize: 14, position: { x: 24, y: 181 }, size: { width: 150, height: 16 }, color: lighten(textOn(sidebar), 0.3), fontFamily: bf },
        // Top header bar — 64px tall, padding 16px 24px
        { id: 'header', type: 'rect', position: { x: 220, y: 0 }, size: { width: 980, height: 64 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 0, opacity: 1 },
        { id: 'header-title', type: 'text', text: 'Overview', variant: 'h2', fontSize: 18, fontWeight: 600, position: { x: 244, y: 20 }, size: { width: 200, height: 24 }, color: t.textPrimary, fontFamily: hf },
        // 3 stat cards — padding 24, gap 16; starts at y=64+24=88
        // card width = (980 - 24 - 24 - 16 - 16) / 3 = (900) / 3 = 300... approx 300px
        { id: 'card1', type: 'rect', position: { x: 244, y: 88 }, size: { width: cardW, height: 160 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'card1-accent', type: 'rect', position: { x: 244, y: 88 }, size: { width: cardW, height: 4 }, fill: safe(c, 0), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card1-val', type: 'text', text: '2847', variant: 'h1', fontSize: 28, fontWeight: 700, position: { x: 264, y: 112 }, size: { width: 200, height: 36 }, color: safe(c, 0), fontFamily: hf },
        { id: 'card1-lbl', type: 'text', text: 'Users', variant: 'body', fontSize: 13, position: { x: 264, y: 154 }, size: { width: 150, height: 18 }, color: t.textSecondary, fontFamily: bf },
        { id: 'card2', type: 'rect', position: { x: 244 + cardW + 16, y: 88 }, size: { width: cardW, height: 160 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'card2-accent', type: 'rect', position: { x: 244 + cardW + 16, y: 88 }, size: { width: cardW, height: 4 }, fill: safe(c, 1), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card2-val', type: 'text', text: '5694', variant: 'h1', fontSize: 28, fontWeight: 700, position: { x: 264 + cardW + 16, y: 112 }, size: { width: 200, height: 36 }, color: safe(c, 1), fontFamily: hf },
        { id: 'card2-lbl', type: 'text', text: 'Revenue', variant: 'body', fontSize: 13, position: { x: 264 + cardW + 16, y: 154 }, size: { width: 150, height: 18 }, color: t.textSecondary, fontFamily: bf },
        { id: 'card3', type: 'rect', position: { x: 244 + (cardW + 16) * 2, y: 88 }, size: { width: cardW, height: 160 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'card3-accent', type: 'rect', position: { x: 244 + (cardW + 16) * 2, y: 88 }, size: { width: cardW, height: 4 }, fill: safe(c, 2), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card3-val', type: 'text', text: '8541', variant: 'h1', fontSize: 28, fontWeight: 700, position: { x: 264 + (cardW + 16) * 2, y: 112 }, size: { width: 200, height: 36 }, color: safe(c, 2), fontFamily: hf },
        { id: 'card3-lbl', type: 'text', text: 'Orders', variant: 'body', fontSize: 13, position: { x: 264 + (cardW + 16) * 2, y: 154 }, size: { width: 150, height: 18 }, color: t.textSecondary, fontFamily: bf },
        // Main content area — margin 0 24px, fills remaining height
        { id: 'main-content', type: 'rect', position: { x: 244, y: 272 }, size: { width: 932, height: 564 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'main-content-title', type: 'text', text: 'Main Content', variant: 'h2', fontSize: 18, fontWeight: 600, position: { x: 264, y: 292 }, size: { width: 200, height: 24 }, color: t.textPrimary, fontFamily: hf },
      ] as LayoutNode[],
    },
  };
}

export function buildMobile(c: string[], hf: string, bf: string, t: ThemeColors): LayoutSpec {
  // Canvas: 500×860 — matches HTML preview container width for mobile.
  // HTML: outer padding 32. Phone: 375×760, borderRadius 44, centered.
  // Phone starts at x=(500-375)/2=62.5→63, y=50
  const primary = safe(c, 0);
  const px = 63;  // phone left edge
  const py = 50;  // phone top edge
  const pw = 375;
  // Status bar: padding '12px 20px 0' → height 44
  // Nav bar: below status bar, padding '12px 0 16px' → 48px height; title 20px
  const cardColors = [safe(c, 0), safe(c, 1), safe(c, 2), safe(c, 3), safe(c, 4)];
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 500, height: 860 }, background: undefined,
      children: [
        // Outer background
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 500, height: 860 }, fill: t.pageBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        // Phone shell
        { id: 'phone', type: 'rect', position: { x: px, y: py }, size: { width: pw, height: 760 }, fill: t.cardBg, stroke: t.border, strokeWidth: 2, radius: 44, opacity: 1 },
        // Status bar: height 44
        { id: 'status-bar', type: 'rect', position: { x: px, y: py }, size: { width: pw, height: 44 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'status-time', type: 'text', text: '9:41', variant: 'body', fontSize: 13, fontWeight: 600, position: { x: px + 20, y: py + 15 }, size: { width: 50, height: 16 }, color: textOn(primary), fontFamily: bf },
        // Nav bar: below status, padding 12px 0 16px → height 48
        { id: 'nav-bar', type: 'rect', position: { x: px, y: py + 44 }, size: { width: pw, height: 48 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'nav-title', type: 'text', text: 'Home', variant: 'h2', fontSize: 20, fontWeight: 700, position: { x: px + 20, y: py + 56 }, size: { width: 100, height: 24 }, color: textOn(primary), fontFamily: hf },
        // Cards: padding 16, gap 12, starting y = py+44+48+16 = py+108, each card 16px padding, 80px content + border → ~120px
        ...cardColors.slice(0, 5).map((cc, i) => [
          { id: `card${i + 1}`, type: 'rect' as const, position: { x: px + 16, y: py + 108 + i * 132 }, size: { width: pw - 32, height: 120 }, fill: cardTint(cc, t.isDark), stroke: borderTint(cc, t.isDark), strokeWidth: 1, radius: 16, opacity: 1 },
          { id: `card${i + 1}-bar`, type: 'rect' as const, position: { x: px + 16, y: py + 108 + i * 132 }, size: { width: 6, height: 120 }, fill: cc, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
          { id: `card${i + 1}-title`, type: 'text' as const, text: `Card ${i + 1}`, variant: 'body' as const, fontSize: 15, fontWeight: 600, position: { x: px + 40, y: py + 132 + i * 132 }, size: { width: 200, height: 20 }, color: t.textPrimary, fontFamily: hf },
          { id: `card${i + 1}-sub`, type: 'text' as const, text: 'Description text here', variant: 'body' as const, fontSize: 13, position: { x: px + 40, y: py + 156 + i * 132 }, size: { width: 240, height: 16 }, color: t.textSecondary, fontFamily: bf },
        ]).flat(),
        // Tab bar: at bottom of phone (py+760-80=py+680), height 80
        { id: 'tab-bar', type: 'rect', position: { x: px, y: py + 680 }, size: { width: pw, height: 80 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 0, opacity: 1 },
        { id: 'tab-home', type: 'text', text: 'Home',   variant: 'body', fontSize: 12, fontWeight: 600, position: { x: px + 48,  y: py + 706 }, size: { width: 50, height: 16 }, color: primary, fontFamily: bf },
        { id: 'tab-search', type: 'text', text: 'Search', variant: 'body', fontSize: 12, position: { x: px + 161, y: py + 706 }, size: { width: 56, height: 16 }, color: t.textSecondary, fontFamily: bf },
        { id: 'tab-profile', type: 'text', text: 'Profile', variant: 'body', fontSize: 12, position: { x: px + 277, y: py + 706 }, size: { width: 56, height: 16 }, color: t.textSecondary, fontFamily: bf },
        // Home indicator bar
        { id: 'home-ind', type: 'rect', position: { x: px + 126, y: py + 736 }, size: { width: 120, height: 5 }, fill: t.textPrimary, stroke: undefined, strokeWidth: 0, radius: 3, opacity: 0.4 },
      ] as LayoutNode[],
    },
  };
}

export function buildDashboard(c: string[], hf: string, bf: string, t: ThemeColors): LayoutSpec {
  // Canvas: 1200×860. HTML: header 56px. Stat cards: padding 24, 4 cols, gap 16.
  // Chart area: 2fr; side panel: 1fr; grid padding 0 24px, gap 16.
  const primary = safe(c, 0);
  // 4 stat cards: width = (1200 - 24 - 24 - 3*16) / 4 = (1200 - 96) / 4 = 276
  const statW = 276;
  const statX = (i: number) => 24 + i * (statW + 16);
  // Chart 2fr, sidebar 1fr, gap 16, padding 0 24px:
  // total = 1200 - 48 = 1152; chart = 768; sidebar = 368
  const chartW = 768;
  const sideW = 1152 - chartW - 16;  // 368
  const chartX = 24;
  const sideX = 24 + chartW + 16;
  // Panels start at y = 56 + 24 + 140 + 16 = 236
  const panelY = 236;
  const panelH = 860 - panelY - 24; // 600
  // Bar heights simulating the HTML ratios
  const barHeights = [0.6, 0.9, 0.4, 0.75, 0.55, 0.85, 0.7];
  const maxBarH = 180;
  const barW = 50;
  const barXStart = chartX + 48;
  const barBottom = panelY + panelH - 40;
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1200, height: 860 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1200, height: 860 }, fill: t.pageBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        // Header — 56px
        { id: 'header', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1200, height: 56 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'logo', type: 'text', text: 'Dashboard', variant: 'h2', fontSize: 18, fontWeight: 700, position: { x: 32, y: 16 }, size: { width: 200, height: 24 }, color: textOn(primary), fontFamily: hf },
        // 4 stat cards — y=56+24=80
        ...[0, 1, 2, 3].flatMap((i) => {
          const cc = safe(c, i);
          const x = statX(i);
          return [
            { id: `stat-${i}`, type: 'rect' as const, position: { x, y: 80 }, size: { width: statW, height: 140 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
            { id: `stat-${i}-top`, type: 'rect' as const, position: { x, y: 80 }, size: { width: statW, height: 4 }, fill: cc, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
            { id: `stat-${i}-val`, type: 'text' as const, text: `${(i + 1) * 1234}`, variant: 'h1' as const, fontSize: 32, fontWeight: 700, position: { x: x + 20, y: 104 }, size: { width: 200, height: 40 }, color: cc, fontFamily: hf },
            { id: `stat-${i}-lbl`, type: 'text' as const, text: ['Users', 'Revenue', 'Orders', 'Growth'][i], variant: 'body' as const, fontSize: 13, position: { x: x + 20, y: 150 }, size: { width: 180, height: 18 }, color: t.textSecondary, fontFamily: bf },
          ];
        }),
        // Chart area
        { id: 'chart-area', type: 'rect', position: { x: chartX, y: panelY }, size: { width: chartW, height: panelH }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'chart-title', type: 'text', text: 'Performance Overview', variant: 'h2', fontSize: 16, fontWeight: 600, position: { x: chartX + 24, y: panelY + 20 }, size: { width: 300, height: 22 }, color: t.textPrimary, fontFamily: hf },
        // Bar chart
        ...barHeights.map((h, i) => ({
          id: `bar-${i}`, type: 'rect' as const,
          position: { x: barXStart + i * (barW + 16), y: barBottom - Math.round(h * maxBarH) },
          size: { width: barW, height: Math.round(h * maxBarH) },
          fill: safe(c, i % c.length), stroke: undefined, strokeWidth: 0, radius: 4, opacity: 0.85,
        })),
        // Side panel
        { id: 'side-panel', type: 'rect', position: { x: sideX, y: panelY }, size: { width: sideW, height: panelH }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'side-title', type: 'text', text: 'Recent Activity', variant: 'h2', fontSize: 16, fontWeight: 600, position: { x: sideX + 24, y: panelY + 20 }, size: { width: 280, height: 22 }, color: t.textPrimary, fontFamily: hf },
        ...[0, 1, 2, 3].map((i) => ({
          id: `activity-${i}`, type: 'rect' as const,
          position: { x: sideX + 16, y: panelY + 60 + i * 56 }, size: { width: sideW - 32, height: 44 },
          fill: i === 0
            ? (t.isDark ? darken(safe(c, 1), 0.7) : lighten(safe(c, 1), 0.92))
            : (t.isDark ? lighten(t.pageBg, 0.05) : '#f8fafc'),
          stroke: t.border, strokeWidth: 1, radius: 8, opacity: 1,
        })),
      ] as LayoutNode[],
    },
  };
}

export function buildLanding(c: string[], hf: string, bf: string, t: ThemeColors): LayoutSpec {
  // Canvas: 1200×1160. HTML:
  //   nav: height 64, padding 0 48px
  //   hero: padding 80px 120px → starts y=64, height ~360
  //   features: padding 64px 120px → 3 cols, gap 24; cards 240px tall
  //   cta: margin 0 60px 48px, padding 48px 80px, flex row → height ~160
  const primary = safe(c, 0);
  // Hero section height: 80 top + ~48 h1 + 16 + 48 p + 32 + 48 btn + 80 bottom ≈ 352 → use 360
  const heroY = 64;
  const heroH = 360;
  // Features section: starts at y=64+360=424, padding 64px 120px
  const featY = heroY + heroH;  // 424
  const featInnerY = featY + 64;  // 488 — where title sits
  // Feature cards: marginTop 40 from title (488+40+32=560)
  const cardY = featInnerY + 40 + 32;  // 560 (40 after title, 32 for title height)
  // Card width: (1200 - 120 - 120 - 24 - 24) / 3 = (912) / 3 = 304
  const featCardW = 304;
  const featCardH = 240;
  const featX = (i: number) => 120 + i * (featCardW + 24);
  // CTA section
  const ctaY = cardY + featCardH + 64;  // 864
  const ctaH = 160;
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1200, height: 1120 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1200, height: 1120 }, fill: t.pageBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        // Nav — height 64, border-bottom
        { id: 'nav', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1200, height: 64 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 0, opacity: 1 },
        { id: 'nav-brand', type: 'text', text: 'Brand', variant: 'h2', fontSize: 22, fontWeight: 700, position: { x: 48, y: 18 }, size: { width: 120, height: 28 }, color: primary, fontFamily: hf },
        { id: 'nav-cta', type: 'rect', position: { x: 1032, y: 14 }, size: { width: 120, height: 36 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
        { id: 'nav-cta-text', type: 'text', text: 'Sign Up', variant: 'body', fontSize: 14, fontWeight: 600, position: { x: 1050, y: 23 }, size: { width: 80, height: 18 }, color: textOn(primary), fontFamily: bf },
        // Hero — padding 80px 120px
        { id: 'hero-bg', type: 'rect', position: { x: 0, y: heroY }, size: { width: 1200, height: heroH }, fill: heroTint(primary, t.isDark), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'hero-h1', type: 'text', text: 'Build Something Amazing', variant: 'h1', fontSize: 48, fontWeight: 700, position: { x: 120, y: heroY + 80 }, size: { width: 700, height: 58 }, color: t.isDark ? lighten(primary, 0.3) : darken(primary, 0.2), fontFamily: hf },
        { id: 'hero-p', type: 'text', text: 'The all-in-one platform for creators, designers,\nand developers to bring their ideas to life.', variant: 'body', fontSize: 18, position: { x: 120, y: heroY + 154 }, size: { width: 500, height: 52 }, color: t.textSecondary, fontFamily: bf },
        { id: 'hero-btn1', type: 'rect', position: { x: 120, y: heroY + 222 }, size: { width: 160, height: 48 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
        { id: 'hero-btn1-t', type: 'text', text: 'Get Started', variant: 'body', fontSize: 15, fontWeight: 600, position: { x: 148, y: heroY + 235 }, size: { width: 108, height: 20 }, color: textOn(primary), fontFamily: bf },
        { id: 'hero-btn2', type: 'rect', position: { x: 296, y: heroY + 222 }, size: { width: 160, height: 48 }, fill: 'transparent', stroke: primary, strokeWidth: 2, radius: 10, opacity: 1 },
        { id: 'hero-btn2-t', type: 'text', text: 'Learn More', variant: 'body', fontSize: 15, fontWeight: 600, position: { x: 324, y: heroY + 235 }, size: { width: 108, height: 20 }, color: t.isDark ? lighten(primary, 0.4) : primary, fontFamily: bf },
        // Features section — title centred; y = featInnerY
        { id: 'features-title', type: 'text', text: 'Features', variant: 'h1', fontSize: 28, fontWeight: 700, position: { x: 480, y: featInnerY }, size: { width: 240, height: 36 }, color: t.textPrimary, fontFamily: hf },
        // 3 feature cards
        ...[0, 1, 2].flatMap((i) => {
          const cc = safe(c, i);
          const x = featX(i);
          return [
            { id: `feat-${i}`, type: 'rect' as const, position: { x, y: cardY }, size: { width: featCardW, height: featCardH }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 16, opacity: 1 },
            { id: `feat-${i}-icon`, type: 'rect' as const, position: { x: x + 24, y: cardY + 24 }, size: { width: 44, height: 44 }, fill: t.isDark ? darken(cc, 0.5) : lighten(cc, 0.85), stroke: undefined, strokeWidth: 0, radius: 12, opacity: 1 },
            { id: `feat-${i}-dot`, type: 'ellipse' as const, position: { x: x + 36, y: cardY + 36 }, size: { width: 20, height: 20 }, fill: cc, stroke: undefined, strokeWidth: 0, opacity: 1 } as LayoutNode,
            { id: `feat-${i}-h`, type: 'text' as const, text: ['Fast', 'Secure', 'Scalable'][i], variant: 'h2' as const, fontSize: 18, fontWeight: 600, position: { x: x + 24, y: cardY + 88 }, size: { width: 240, height: 24 }, color: t.textPrimary, fontFamily: hf },
            { id: `feat-${i}-p`, type: 'text' as const, text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', variant: 'body' as const, fontSize: 14, position: { x: x + 24, y: cardY + 120 }, size: { width: 256, height: 64 }, color: t.textSecondary, fontFamily: bf },
          ];
        }),
        // CTA section
        { id: 'cta-bg', type: 'rect', position: { x: 60, y: ctaY }, size: { width: 1080, height: ctaH }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 20, opacity: 1 },
        { id: 'cta-h', type: 'text', text: 'Ready to get started?', variant: 'h1', fontSize: 28, fontWeight: 700, position: { x: 140, y: ctaY + 56 }, size: { width: 500, height: 36 }, color: textOn(primary), fontFamily: hf },
        { id: 'cta-btn', type: 'rect', position: { x: 920, y: ctaY + 46 }, size: { width: 180, height: 48 }, fill: textOn(primary), stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
        { id: 'cta-btn-t', type: 'text', text: 'Start Free Trial', variant: 'body', fontSize: 15, fontWeight: 600, position: { x: 940, y: ctaY + 60 }, size: { width: 144, height: 20 }, color: primary, fontFamily: bf },
      ] as LayoutNode[],
    },
  };
}

// ── themeBindings maps (node id → token bindings) ─────────────────────────
//
// Each map tells the runtime which color token governs each visual prop,
// so applying any Kulrs palette instantly recolors the whole design.

export const TOP_NAV_BINDINGS: Record<string, ThemeBindings> = {
  'bg':            { fill: 'color.background.primary' },
  'nav':           { fill: 'color.action.primary' },
  'nav-logo':      { color: 'color.text.inverse' },
  'nav-link1':     { color: 'color.text.inverse' },
  'nav-link2':     { color: 'color.text.inverse' },
  'nav-link3':     { color: 'color.text.inverse' },
  'hero':          { fill: 'color.background.secondary' },
  'hero-title':    { color: 'color.action.secondary' },
  'hero-subtitle': { color: 'color.action.secondary' },
  'hero-cta':      { fill: 'color.accent.primary' },
  'hero-cta-text': { color: 'color.text.inverse' },
  'content':       { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'content-title': { color: 'color.text.primary' },
};

export const LEFT_NAV_BINDINGS: Record<string, ThemeBindings> = {
  'bg':            { fill: 'color.background.primary' },
  'sidebar':       { fill: 'color.action.primary' },
  'sidebar-logo':  { color: 'color.text.inverse' },
  'nav-active':    { fill: 'color.action.primaryHover' },
  'nav-text1':     { color: 'color.text.inverse' },
  'nav-text2':     { color: 'color.text.inverse' },
  'nav-text3':     { color: 'color.text.inverse' },
  'header':        { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'header-title':  { color: 'color.text.primary' },
  'card1':         { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'card1-accent':  { fill: 'color.action.secondary' },
  'card2':         { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'card2-accent':  { fill: 'color.accent.primary' },
  'card3':         { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'card3-accent':  { fill: 'color.accent.secondary' },
  'main-content':  { fill: 'color.surface.card', stroke: 'color.border.primary' },
};

export const MOBILE_BINDINGS: Record<string, ThemeBindings> = {
  'bg':          { fill: 'color.background.primary' },
  'phone':       { fill: 'color.surface.card', stroke: 'color.border.secondary' },
  'status-bar':  { fill: 'color.action.primary' },
  'status-time': { color: 'color.text.inverse' },
  'nav-bar':     { fill: 'color.action.primary' },
  'nav-title':   { color: 'color.text.inverse' },
  'card1':       { fill: 'color.background.tertiary', stroke: 'color.border.secondary' },
  'card1-bar':   { fill: 'color.accent.primary' },
  'card2':       { fill: 'color.background.secondary', stroke: 'color.border.secondary' },
  'card2-bar':   { fill: 'color.action.secondary' },
  'card3':       { fill: 'color.background.secondary', stroke: 'color.border.secondary' },
  'card3-bar':   { fill: 'color.accent.secondary' },
  'fab':         { fill: 'color.action.secondary' },
  'tab-bar':     { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'tab-active':  { fill: 'color.action.primary' },
  'home-ind':    { fill: 'color.text.primary' },
};

export const DASHBOARD_BINDINGS: Record<string, ThemeBindings> = {
  'bg':           { fill: 'color.background.primary' },
  'header':       { fill: 'color.action.primary' },
  'logo':         { color: 'color.text.inverse' },
  'stat-0':       { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'stat-0-top':   { fill: 'color.action.primary' },
  'stat-0-val':   { color: 'color.action.primary' },
  'stat-0-lbl':   { color: 'color.text.secondary' },
  'stat-1':       { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'stat-1-top':   { fill: 'color.action.secondary' },
  'stat-1-val':   { color: 'color.action.secondary' },
  'stat-1-lbl':   { color: 'color.text.secondary' },
  'stat-2':       { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'stat-2-top':   { fill: 'color.accent.primary' },
  'stat-2-val':   { color: 'color.accent.primary' },
  'stat-2-lbl':   { color: 'color.text.secondary' },
  'stat-3':       { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'stat-3-top':   { fill: 'color.accent.secondary' },
  'stat-3-val':   { color: 'color.accent.secondary' },
  'stat-3-lbl':   { color: 'color.text.secondary' },
  'chart-area':   { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'chart-title':  { color: 'color.text.primary' },
  'bar-0':        { fill: 'color.action.primary' },
  'bar-1':        { fill: 'color.action.secondary' },
  'bar-2':        { fill: 'color.accent.primary' },
  'bar-3':        { fill: 'color.accent.secondary' },
  'bar-4':        { fill: 'color.action.primary' },
  'bar-5':        { fill: 'color.action.secondary' },
  'bar-6':        { fill: 'color.accent.primary' },
  'side-panel':   { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'side-title':   { color: 'color.text.primary' },
  'activity-0':   { fill: 'color.background.secondary', stroke: 'color.border.secondary' },
  'activity-1':   { fill: 'color.background.primary', stroke: 'color.border.secondary' },
  'activity-2':   { fill: 'color.background.primary', stroke: 'color.border.secondary' },
  'activity-3':   { fill: 'color.background.primary', stroke: 'color.border.secondary' },
  'activity-4':   { fill: 'color.background.primary', stroke: 'color.border.secondary' },
};

export const LANDING_BINDINGS: Record<string, ThemeBindings> = {
  'bg':             { fill: 'color.background.primary' },
  'nav':            { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'nav-brand':      { color: 'color.action.primary' },
  'nav-cta':        { fill: 'color.action.primary' },
  'nav-cta-text':   { color: 'color.text.inverse' },
  'hero-bg':        { fill: 'color.background.secondary' },
  'hero-h1':        { color: 'color.action.secondary' },
  'hero-p':         { color: 'color.text.secondary' },
  'hero-btn1':      { fill: 'color.action.primary' },
  'hero-btn1-t':    { color: 'color.text.inverse' },
  'hero-btn2':      { stroke: 'color.action.primary' },
  'hero-btn2-t':    { color: 'color.action.primary' },
  'features-title': { color: 'color.text.primary' },
  'feat-0':         { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'feat-0-icon':    { fill: 'color.background.secondary' },
  'feat-0-dot':     { fill: 'color.action.primary' },
  'feat-0-h':       { color: 'color.text.primary' },
  'feat-0-p':       { color: 'color.text.secondary' },
  'feat-1':         { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'feat-1-icon':    { fill: 'color.background.tertiary' },
  'feat-1-dot':     { fill: 'color.action.secondary' },
  'feat-1-h':       { color: 'color.text.primary' },
  'feat-1-p':       { color: 'color.text.secondary' },
  'feat-2':         { fill: 'color.surface.card', stroke: 'color.border.primary' },
  'feat-2-icon':    { fill: 'color.background.secondary' },
  'feat-2-dot':     { fill: 'color.accent.primary' },
  'feat-2-h':       { color: 'color.text.primary' },
  'feat-2-p':       { color: 'color.text.secondary' },
  'cta-bg':         { fill: 'color.action.primary' },
  'cta-h':          { color: 'color.text.inverse' },
  'cta-btn':        { fill: 'color.surface.card' },
  'cta-btn-t':      { color: 'color.action.primary' },
};

// ── Utility: stamp themeBindings onto a LayoutSpec ────────────────────────

export function withThemeBindings(
  spec: LayoutSpec,
  bindings: Record<string, ThemeBindings>,
): LayoutSpec {
  function annotate(node: LayoutNode): LayoutNode {
    const b = bindings[node.id];
    const annotated: LayoutNode = b ? { ...node, themeBindings: b } : node;
    if ('children' in annotated && Array.isArray(annotated.children)) {
      return { ...annotated, children: annotated.children.map(annotate) } as LayoutNode;
    }
    return annotated;
  }
  return { root: annotate(spec.root) as import('../layout-schema').FrameNode };
}
