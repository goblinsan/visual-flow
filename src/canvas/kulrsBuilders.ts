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
  const nav = safe(c, 0);
  const hero = safe(c, 1);
  const accent = safe(c, 2);
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1440, height: 900 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 900 }, fill: t.pageBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'nav', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 64 }, fill: nav, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'nav-logo', type: 'text', text: 'Brand', variant: 'h2', position: { x: 32, y: 18 }, size: { width: 120, height: 28 }, color: textOn(nav), fontFamily: hf },
        { id: 'nav-link1', type: 'text', text: 'Home', variant: 'body', position: { x: 200, y: 22 }, size: { width: 60, height: 20 }, color: textOn(nav), fontFamily: bf },
        { id: 'nav-link2', type: 'text', text: 'Features', variant: 'body', position: { x: 280, y: 22 }, size: { width: 70, height: 20 }, color: textOn(nav), fontFamily: bf },
        { id: 'nav-link3', type: 'text', text: 'Pricing', variant: 'body', position: { x: 370, y: 22 }, size: { width: 60, height: 20 }, color: textOn(nav), fontFamily: bf },
        { id: 'hero', type: 'rect', position: { x: 0, y: 64 }, size: { width: 1440, height: 400 }, fill: heroTint(hero, t.isDark), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'hero-title', type: 'text', text: 'Welcome to Our Platform', variant: 'h1', position: { x: 120, y: 180 }, size: { width: 500, height: 48 }, color: t.isDark ? lighten(hero, 0.3) : darken(hero, 0.3), fontFamily: hf },
        { id: 'hero-subtitle', type: 'text', text: 'Build amazing things with our tools', variant: 'body', position: { x: 120, y: 240 }, size: { width: 400, height: 24 }, color: t.isDark ? lighten(hero, 0.5) : hero, fontFamily: bf },
        { id: 'hero-cta', type: 'rect', position: { x: 120, y: 290 }, size: { width: 160, height: 44 }, fill: accent, stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
        { id: 'hero-cta-text', type: 'text', text: 'Get Started', variant: 'body', position: { x: 142, y: 302 }, size: { width: 120, height: 20 }, color: textOn(accent), fontFamily: bf },
        { id: 'content', type: 'rect', position: { x: 120, y: 520 }, size: { width: 1200, height: 320 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'content-title', type: 'text', text: 'Featured Content', variant: 'h2', position: { x: 152, y: 548 }, size: { width: 300, height: 28 }, color: t.textPrimary, fontFamily: hf },
      ] as LayoutNode[],
    },
  };
}

export function buildLeftNav(c: string[], hf: string, bf: string, t: ThemeColors): LayoutSpec {
  const sidebar = safe(c, 0);
  const accent = safe(c, 1);
  const card = c.length > 2 ? safe(c, 2) : accent;
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1440, height: 900 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 900 }, fill: t.pageBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'sidebar', type: 'rect', position: { x: 0, y: 0 }, size: { width: 240, height: 900 }, fill: sidebar, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'sidebar-logo', type: 'text', text: 'Dashboard', variant: 'h2', position: { x: 24, y: 24 }, size: { width: 180, height: 28 }, color: textOn(sidebar), fontFamily: hf },
        { id: 'nav-active', type: 'rect', position: { x: 12, y: 80 }, size: { width: 216, height: 40 }, fill: lighten(sidebar, 0.15), stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
        { id: 'nav-text1', type: 'text', text: 'Overview', variant: 'body', position: { x: 24, y: 90 }, size: { width: 150, height: 20 }, color: textOn(sidebar), fontFamily: bf },
        { id: 'nav-text2', type: 'text', text: 'Analytics', variant: 'body', position: { x: 24, y: 140 }, size: { width: 150, height: 20 }, color: lighten(textOn(sidebar), 0.3), fontFamily: bf },
        { id: 'nav-text3', type: 'text', text: 'Settings', variant: 'body', position: { x: 24, y: 180 }, size: { width: 150, height: 20 }, color: lighten(textOn(sidebar), 0.3), fontFamily: bf },
        { id: 'header', type: 'rect', position: { x: 240, y: 0 }, size: { width: 1200, height: 64 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 0, opacity: 1 },
        { id: 'header-title', type: 'text', text: 'Overview', variant: 'h2', position: { x: 272, y: 18 }, size: { width: 200, height: 28 }, color: t.textPrimary, fontFamily: hf },
        { id: 'card1', type: 'rect', position: { x: 272, y: 96 }, size: { width: 280, height: 160 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'card1-accent', type: 'rect', position: { x: 272, y: 96 }, size: { width: 280, height: 4 }, fill: accent, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card2', type: 'rect', position: { x: 576, y: 96 }, size: { width: 280, height: 160 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'card2-accent', type: 'rect', position: { x: 576, y: 96 }, size: { width: 280, height: 4 }, fill: card, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card3', type: 'rect', position: { x: 880, y: 96 }, size: { width: 280, height: 160 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'card3-accent', type: 'rect', position: { x: 880, y: 96 }, size: { width: 280, height: 4 }, fill: safe(c, 3), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'main-content', type: 'rect', position: { x: 272, y: 280 }, size: { width: 888, height: 580 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
      ] as LayoutNode[],
    },
  };
}

export function buildMobile(c: string[], hf: string, bf: string, t: ThemeColors): LayoutSpec {
  const primary = safe(c, 0);
  const accent = safe(c, 1);
  const card = c.length > 2 ? safe(c, 2) : lighten(primary, 0.9);
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 800, height: 1000 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 800, height: 1000 }, fill: t.pageBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'phone', type: 'rect', position: { x: 200, y: 40 }, size: { width: 390, height: 844 }, fill: t.cardBg, stroke: t.border, strokeWidth: 2, radius: 48, opacity: 1 },
        { id: 'status-bar', type: 'rect', position: { x: 200, y: 40 }, size: { width: 390, height: 44 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'status-time', type: 'text', text: '9:41', variant: 'body', position: { x: 220, y: 52 }, size: { width: 50, height: 20 }, color: textOn(primary), fontFamily: bf },
        { id: 'nav-bar', type: 'rect', position: { x: 200, y: 84 }, size: { width: 390, height: 56 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'nav-title', type: 'text', text: 'Home', variant: 'h2', position: { x: 340, y: 100 }, size: { width: 100, height: 24 }, color: textOn(primary), fontFamily: hf },
        { id: 'card1', type: 'rect', position: { x: 216, y: 160 }, size: { width: 358, height: 120 }, fill: cardTint(card, t.isDark), stroke: borderTint(card, t.isDark), strokeWidth: 1, radius: 16, opacity: 1 },
        { id: 'card1-bar', type: 'rect', position: { x: 216, y: 160 }, size: { width: 6, height: 120 }, fill: card, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card2', type: 'rect', position: { x: 216, y: 300 }, size: { width: 358, height: 120 }, fill: cardTint(accent, t.isDark), stroke: borderTint(accent, t.isDark), strokeWidth: 1, radius: 16, opacity: 1 },
        { id: 'card2-bar', type: 'rect', position: { x: 216, y: 300 }, size: { width: 6, height: 120 }, fill: accent, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card3', type: 'rect', position: { x: 216, y: 440 }, size: { width: 358, height: 120 }, fill: cardTint(safe(c, 3), t.isDark), stroke: borderTint(safe(c, 3), t.isDark), strokeWidth: 1, radius: 16, opacity: 1 },
        { id: 'card3-bar', type: 'rect', position: { x: 216, y: 440 }, size: { width: 6, height: 120 }, fill: safe(c, 3), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'fab', type: 'ellipse', position: { x: 500, y: 740 }, size: { width: 56, height: 56 }, fill: accent, stroke: undefined, strokeWidth: 0, radius: undefined, opacity: 1 } as LayoutNode,
        { id: 'tab-bar', type: 'rect', position: { x: 200, y: 800 }, size: { width: 390, height: 84 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 0, opacity: 1 },
        { id: 'tab-active', type: 'rect', position: { x: 252, y: 810 }, size: { width: 40, height: 3 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 2, opacity: 1 },
        { id: 'home-ind', type: 'rect', position: { x: 340, y: 860 }, size: { width: 120, height: 5 }, fill: t.textPrimary, stroke: undefined, strokeWidth: 0, radius: 3, opacity: 1 },
      ] as LayoutNode[],
    },
  };
}

export function buildDashboard(c: string[], hf: string, bf: string, t: ThemeColors): LayoutSpec {
  const primary = safe(c, 0);
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1440, height: 900 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 900 }, fill: t.pageBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'header', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 64 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'logo', type: 'text', text: 'Dashboard', variant: 'h2', position: { x: 32, y: 18 }, size: { width: 200, height: 28 }, color: textOn(primary), fontFamily: hf },
        ...[0, 1, 2, 3].map((i) => {
          const x = 40 + i * 340;
          const cc = safe(c, i);
          return [
            { id: `stat-${i}`, type: 'rect' as const, position: { x, y: 96 }, size: { width: 320, height: 140 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
            { id: `stat-${i}-top`, type: 'rect' as const, position: { x, y: 96 }, size: { width: 320, height: 4 }, fill: cc, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
            { id: `stat-${i}-val`, type: 'text' as const, text: `${(i + 1) * 1234}`, variant: 'h1' as const, position: { x: x + 24, y: 120 }, size: { width: 200, height: 36 }, color: cc, fontFamily: hf },
            { id: `stat-${i}-lbl`, type: 'text' as const, text: ['Users', 'Revenue', 'Orders', 'Growth'][i], variant: 'body' as const, position: { x: x + 24, y: 166 }, size: { width: 200, height: 20 }, color: t.textSecondary, fontFamily: bf },
          ];
        }).flat(),
        { id: 'chart-area', type: 'rect', position: { x: 40, y: 268 }, size: { width: 900, height: 400 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'chart-title', type: 'text', text: 'Performance Overview', variant: 'h2', position: { x: 72, y: 292 }, size: { width: 300, height: 28 }, color: t.textPrimary, fontFamily: hf },
        ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({
          id: `bar-${i}`, type: 'rect' as const,
          position: { x: 100 + i * 110, y: 620 - (80 + Math.sin(i * 0.8) * 200) },
          size: { width: 60, height: 80 + Math.sin(i * 0.8) * 200 },
          fill: safe(c, i % c.length), stroke: undefined, strokeWidth: 0, radius: 4, opacity: 0.85,
        })),
        { id: 'side-panel', type: 'rect', position: { x: 960, y: 268 }, size: { width: 440, height: 400 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'side-title', type: 'text', text: 'Recent Activity', variant: 'h2', position: { x: 992, y: 292 }, size: { width: 300, height: 28 }, color: t.textPrimary, fontFamily: hf },
        ...[0, 1, 2, 3, 4].map((i) => ({
          id: `activity-${i}`, type: 'rect' as const,
          position: { x: 976, y: 340 + i * 60 }, size: { width: 408, height: 48 },
          fill: i === 0 ? (t.isDark ? darken(safe(c, 1), 0.7) : lighten(safe(c, 1), 0.92)) : (t.isDark ? lighten(t.pageBg, 0.05) : '#f8fafc'),
          stroke: t.border, strokeWidth: 1, radius: 8, opacity: 1,
        })),
      ] as LayoutNode[],
    },
  };
}

export function buildLanding(c: string[], hf: string, bf: string, t: ThemeColors): LayoutSpec {
  const primary = safe(c, 0);
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1440, height: 1200 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 1200 }, fill: t.pageBg, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'nav', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 72 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 0, opacity: 1 },
        { id: 'nav-brand', type: 'text', text: 'Brand', variant: 'h2', position: { x: 60, y: 22 }, size: { width: 120, height: 28 }, color: primary, fontFamily: hf },
        { id: 'nav-cta', type: 'rect', position: { x: 1280, y: 18 }, size: { width: 120, height: 36 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
        { id: 'nav-cta-text', type: 'text', text: 'Sign Up', variant: 'body', position: { x: 1305, y: 26 }, size: { width: 80, height: 20 }, color: textOn(primary), fontFamily: bf },
        { id: 'hero-bg', type: 'rect', position: { x: 0, y: 72 }, size: { width: 1440, height: 480 }, fill: heroTint(primary, t.isDark), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'hero-h1', type: 'text', text: 'Build Something Amazing', variant: 'h1', position: { x: 200, y: 200 }, size: { width: 600, height: 56 }, color: t.isDark ? lighten(primary, 0.3) : darken(primary, 0.2), fontFamily: hf, fontSize: 48 },
        { id: 'hero-p', type: 'text', text: 'The all-in-one platform for creators, designers,\nand developers to bring their ideas to life.', variant: 'body', position: { x: 200, y: 280 }, size: { width: 500, height: 48 }, color: t.textSecondary, fontFamily: bf },
        { id: 'hero-btn1', type: 'rect', position: { x: 200, y: 350 }, size: { width: 160, height: 48 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
        { id: 'hero-btn1-t', type: 'text', text: 'Get Started', variant: 'body', position: { x: 228, y: 364 }, size: { width: 120, height: 20 }, color: textOn(primary), fontFamily: bf },
        { id: 'hero-btn2', type: 'rect', position: { x: 380, y: 350 }, size: { width: 160, height: 48 }, fill: 'transparent', stroke: primary, strokeWidth: 2, radius: 10, opacity: 1 },
        { id: 'hero-btn2-t', type: 'text', text: 'Learn More', variant: 'body', position: { x: 410, y: 364 }, size: { width: 120, height: 20 }, color: t.isDark ? lighten(primary, 0.4) : primary, fontFamily: bf },
        { id: 'features-title', type: 'text', text: 'Features', variant: 'h1', position: { x: 580, y: 600 }, size: { width: 280, height: 40 }, color: t.textPrimary, fontFamily: hf },
        ...[0, 1, 2].map((i) => {
          const x = 120 + i * 420;
          const cc = safe(c, i);
          return [
            { id: `feat-${i}`, type: 'rect' as const, position: { x, y: 680 }, size: { width: 380, height: 240 }, fill: t.cardBg, stroke: t.border, strokeWidth: 1, radius: 16, opacity: 1 },
            { id: `feat-${i}-icon`, type: 'rect' as const, position: { x: x + 24, y: 704 }, size: { width: 48, height: 48 }, fill: t.isDark ? darken(cc, 0.5) : lighten(cc, 0.85), stroke: undefined, strokeWidth: 0, radius: 12, opacity: 1 },
            { id: `feat-${i}-dot`, type: 'ellipse' as const, position: { x: x + 36, y: 716 }, size: { width: 24, height: 24 }, fill: cc, stroke: undefined, strokeWidth: 0, opacity: 1 } as LayoutNode,
            { id: `feat-${i}-h`, type: 'text' as const, text: ['Fast', 'Secure', 'Scalable'][i], variant: 'h2' as const, position: { x: x + 24, y: 770 }, size: { width: 300, height: 28 }, color: t.textPrimary, fontFamily: hf },
            { id: `feat-${i}-p`, type: 'text' as const, text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', variant: 'body' as const, position: { x: x + 24, y: 810 }, size: { width: 332, height: 40 }, color: t.textSecondary, fontFamily: bf },
          ];
        }).flat(),
        { id: 'cta-bg', type: 'rect', position: { x: 120, y: 980 }, size: { width: 1200, height: 180 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 20, opacity: 1 },
        { id: 'cta-h', type: 'text', text: 'Ready to get started?', variant: 'h1', position: { x: 200, y: 1020 }, size: { width: 500, height: 40 }, color: textOn(primary), fontFamily: hf },
        { id: 'cta-btn', type: 'rect', position: { x: 200, y: 1080 }, size: { width: 180, height: 48 }, fill: textOn(primary), stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
        { id: 'cta-btn-t', type: 'text', text: 'Start Free Trial', variant: 'body', position: { x: 224, y: 1094 }, size: { width: 140, height: 20 }, color: primary, fontFamily: bf },
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
