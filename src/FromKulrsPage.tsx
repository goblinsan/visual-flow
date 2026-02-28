import { useEffect, useMemo, useState } from 'react';
import type { LayoutSpec, LayoutNode } from './layout-schema';
import { saveDesignSpec, setCurrentDesignName } from './utils/persistence';

/* ── URL param parsing ─────────────────────────────────────────────── */

type KulrsTemplate = 'top-nav' | 'left-nav' | 'mobile' | 'dashboard' | 'landing';

interface KulrsParams {
  colors: string[];
  headingFont: string;
  bodyFont: string;
  template: KulrsTemplate;
}

function parseKulrsParams(): KulrsParams {
  const sp = new URLSearchParams(window.location.search);
  const rawColors = sp.get('colors') || '';
  const colors = rawColors
    .split(',')
    .map(c => (c.startsWith('#') ? c : `#${c}`))
    .filter(c => /^#[0-9a-fA-F]{6}$/.test(c));
  return {
    colors: colors.length > 0 ? colors : ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'],
    headingFont: sp.get('headingFont') || 'Inter',
    bodyFont: sp.get('bodyFont') || 'Roboto',
    template: (sp.get('template') as KulrsTemplate) || 'top-nav',
  };
}

/* ── Google Fonts loader ───────────────────────────────────────────── */

function useGoogleFonts(fonts: string[]) {
  useEffect(() => {
    if (fonts.length === 0) return;
    const families = fonts
      .filter(Boolean)
      .map(f => f.replace(/ /g, '+'))
      .map(f => `family=${f}:wght@300;400;500;600;700`)
      .join('&');
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, [fonts]);
}

/* ── Color helpers ─────────────────────────────────────────────────── */

function safe(colors: string[], idx: number): string {
  return colors[idx % colors.length] || '#888888';
}

/** Lighten a hex color by mixing toward white */
function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

/** Darken a hex color by mixing toward black */
function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/** Perceived brightness (0-255) */
function brightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function textOn(bg: string): string {
  return brightness(bg) > 140 ? '#1a1a2e' : '#ffffff';
}

/* ── LayoutSpec builders (parameterized with kulrs colors + fonts) ── */

function buildTopNav(c: string[], hf: string, bf: string): LayoutSpec {
  const nav = safe(c, 0);
  const hero = safe(c, 1);
  const accent = safe(c, 2);
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1440, height: 900 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 900 }, fill: '#f9fafb', stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'nav', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 64 }, fill: nav, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'nav-logo', type: 'text', text: 'Brand', variant: 'h2', position: { x: 32, y: 18 }, size: { width: 120, height: 28 }, color: textOn(nav), fontFamily: hf },
        { id: 'nav-link1', type: 'text', text: 'Home', variant: 'body', position: { x: 200, y: 22 }, size: { width: 60, height: 20 }, color: textOn(nav), fontFamily: bf },
        { id: 'nav-link2', type: 'text', text: 'Features', variant: 'body', position: { x: 280, y: 22 }, size: { width: 70, height: 20 }, color: textOn(nav), fontFamily: bf },
        { id: 'nav-link3', type: 'text', text: 'Pricing', variant: 'body', position: { x: 370, y: 22 }, size: { width: 60, height: 20 }, color: textOn(nav), fontFamily: bf },
        { id: 'hero', type: 'rect', position: { x: 0, y: 64 }, size: { width: 1440, height: 400 }, fill: lighten(hero, 0.85), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'hero-title', type: 'text', text: 'Welcome to Our Platform', variant: 'h1', position: { x: 120, y: 180 }, size: { width: 500, height: 48 }, color: darken(hero, 0.3), fontFamily: hf },
        { id: 'hero-subtitle', type: 'text', text: 'Build amazing things with our tools', variant: 'body', position: { x: 120, y: 240 }, size: { width: 400, height: 24 }, color: hero, fontFamily: bf },
        { id: 'hero-cta', type: 'rect', position: { x: 120, y: 290 }, size: { width: 160, height: 44 }, fill: accent, stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
        { id: 'hero-cta-text', type: 'text', text: 'Get Started', variant: 'body', position: { x: 142, y: 302 }, size: { width: 120, height: 20 }, color: textOn(accent), fontFamily: bf },
        { id: 'content', type: 'rect', position: { x: 120, y: 520 }, size: { width: 1200, height: 320 }, fill: '#ffffff', stroke: lighten(nav, 0.7), strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'content-title', type: 'text', text: 'Featured Content', variant: 'h2', position: { x: 152, y: 548 }, size: { width: 300, height: 28 }, color: darken(nav, 0.2), fontFamily: hf },
      ] as LayoutNode[],
    },
  };
}

function buildLeftNav(c: string[], hf: string, bf: string): LayoutSpec {
  const sidebar = safe(c, 0);
  const accent = safe(c, 1);
  const card = c.length > 2 ? safe(c, 2) : accent;
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1440, height: 900 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 900 }, fill: '#f1f5f9', stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'sidebar', type: 'rect', position: { x: 0, y: 0 }, size: { width: 240, height: 900 }, fill: sidebar, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'sidebar-logo', type: 'text', text: 'Dashboard', variant: 'h2', position: { x: 24, y: 24 }, size: { width: 180, height: 28 }, color: textOn(sidebar), fontFamily: hf },
        { id: 'nav-active', type: 'rect', position: { x: 12, y: 80 }, size: { width: 216, height: 40 }, fill: lighten(sidebar, 0.15), stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
        { id: 'nav-text1', type: 'text', text: 'Overview', variant: 'body', position: { x: 24, y: 90 }, size: { width: 150, height: 20 }, color: textOn(sidebar), fontFamily: bf },
        { id: 'nav-text2', type: 'text', text: 'Analytics', variant: 'body', position: { x: 24, y: 140 }, size: { width: 150, height: 20 }, color: lighten(textOn(sidebar), 0.3), fontFamily: bf },
        { id: 'nav-text3', type: 'text', text: 'Settings', variant: 'body', position: { x: 24, y: 180 }, size: { width: 150, height: 20 }, color: lighten(textOn(sidebar), 0.3), fontFamily: bf },
        { id: 'header', type: 'rect', position: { x: 240, y: 0 }, size: { width: 1200, height: 64 }, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1, radius: 0, opacity: 1 },
        { id: 'header-title', type: 'text', text: 'Overview', variant: 'h2', position: { x: 272, y: 18 }, size: { width: 200, height: 28 }, color: '#0f172a', fontFamily: hf },
        { id: 'card1', type: 'rect', position: { x: 272, y: 96 }, size: { width: 280, height: 160 }, fill: '#ffffff', stroke: lighten(accent, 0.6), strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'card1-accent', type: 'rect', position: { x: 272, y: 96 }, size: { width: 280, height: 4 }, fill: accent, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card2', type: 'rect', position: { x: 576, y: 96 }, size: { width: 280, height: 160 }, fill: '#ffffff', stroke: lighten(card, 0.6), strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'card2-accent', type: 'rect', position: { x: 576, y: 96 }, size: { width: 280, height: 4 }, fill: card, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card3', type: 'rect', position: { x: 880, y: 96 }, size: { width: 280, height: 160 }, fill: '#ffffff', stroke: lighten(safe(c, 3), 0.6), strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'card3-accent', type: 'rect', position: { x: 880, y: 96 }, size: { width: 280, height: 4 }, fill: safe(c, 3), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'main-content', type: 'rect', position: { x: 272, y: 280 }, size: { width: 888, height: 580 }, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1, radius: 12, opacity: 1 },
      ] as LayoutNode[],
    },
  };
}

function buildMobile(c: string[], hf: string, bf: string): LayoutSpec {
  const primary = safe(c, 0);
  const accent = safe(c, 1);
  const card = c.length > 2 ? safe(c, 2) : lighten(primary, 0.9);
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 800, height: 1000 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 800, height: 1000 }, fill: '#e5e7eb', stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'phone', type: 'rect', position: { x: 200, y: 40 }, size: { width: 390, height: 844 }, fill: '#ffffff', stroke: '#d1d5db', strokeWidth: 2, radius: 48, opacity: 1 },
        { id: 'status-bar', type: 'rect', position: { x: 200, y: 40 }, size: { width: 390, height: 44 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'status-time', type: 'text', text: '9:41', variant: 'body', position: { x: 220, y: 52 }, size: { width: 50, height: 20 }, color: textOn(primary), fontFamily: bf },
        { id: 'nav-bar', type: 'rect', position: { x: 200, y: 84 }, size: { width: 390, height: 56 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'nav-title', type: 'text', text: 'Home', variant: 'h2', position: { x: 340, y: 100 }, size: { width: 100, height: 24 }, color: textOn(primary), fontFamily: hf },
        { id: 'card1', type: 'rect', position: { x: 216, y: 160 }, size: { width: 358, height: 120 }, fill: lighten(card, 0.85), stroke: lighten(card, 0.5), strokeWidth: 1, radius: 16, opacity: 1 },
        { id: 'card1-bar', type: 'rect', position: { x: 216, y: 160 }, size: { width: 6, height: 120 }, fill: card, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card2', type: 'rect', position: { x: 216, y: 300 }, size: { width: 358, height: 120 }, fill: lighten(accent, 0.85), stroke: lighten(accent, 0.5), strokeWidth: 1, radius: 16, opacity: 1 },
        { id: 'card2-bar', type: 'rect', position: { x: 216, y: 300 }, size: { width: 6, height: 120 }, fill: accent, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'card3', type: 'rect', position: { x: 216, y: 440 }, size: { width: 358, height: 120 }, fill: lighten(safe(c, 3), 0.85), stroke: lighten(safe(c, 3), 0.5), strokeWidth: 1, radius: 16, opacity: 1 },
        { id: 'card3-bar', type: 'rect', position: { x: 216, y: 440 }, size: { width: 6, height: 120 }, fill: safe(c, 3), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'fab', type: 'ellipse', position: { x: 500, y: 740 }, size: { width: 56, height: 56 }, fill: accent, stroke: undefined, strokeWidth: 0, radius: undefined, opacity: 1 } as LayoutNode,
        { id: 'tab-bar', type: 'rect', position: { x: 200, y: 800 }, size: { width: 390, height: 84 }, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 1, radius: 0, opacity: 1 },
        { id: 'tab-active', type: 'rect', position: { x: 252, y: 810 }, size: { width: 40, height: 3 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 2, opacity: 1 },
        { id: 'home-ind', type: 'rect', position: { x: 340, y: 860 }, size: { width: 120, height: 5 }, fill: '#1f2937', stroke: undefined, strokeWidth: 0, radius: 3, opacity: 1 },
      ] as LayoutNode[],
    },
  };
}

function buildDashboard(c: string[], hf: string, bf: string): LayoutSpec {
  const primary = safe(c, 0);
  const accent = safe(c, 1);
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1440, height: 900 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 900 }, fill: '#f8fafc', stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'header', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 64 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'logo', type: 'text', text: 'Dashboard', variant: 'h2', position: { x: 32, y: 18 }, size: { width: 200, height: 28 }, color: textOn(primary), fontFamily: hf },
        ...[0, 1, 2, 3].map((i) => {
          const x = 40 + i * 340;
          const cc = safe(c, i);
          return [
            { id: `stat-${i}`, type: 'rect' as const, position: { x, y: 96 }, size: { width: 320, height: 140 }, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1, radius: 12, opacity: 1 },
            { id: `stat-${i}-top`, type: 'rect' as const, position: { x, y: 96 }, size: { width: 320, height: 4 }, fill: cc, stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
            { id: `stat-${i}-val`, type: 'text' as const, text: `${(i + 1) * 1234}`, variant: 'h1' as const, position: { x: x + 24, y: 120 }, size: { width: 200, height: 36 }, color: cc, fontFamily: hf },
            { id: `stat-${i}-lbl`, type: 'text' as const, text: ['Users', 'Revenue', 'Orders', 'Growth'][i], variant: 'body' as const, position: { x: x + 24, y: 166 }, size: { width: 200, height: 20 }, color: '#64748b', fontFamily: bf },
          ];
        }).flat(),
        { id: 'chart-area', type: 'rect', position: { x: 40, y: 268 }, size: { width: 900, height: 400 }, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'chart-title', type: 'text', text: 'Performance Overview', variant: 'h2', position: { x: 72, y: 292 }, size: { width: 300, height: 28 }, color: '#0f172a', fontFamily: hf },
        // Chart bars
        ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({
          id: `bar-${i}`, type: 'rect' as const,
          position: { x: 100 + i * 110, y: 620 - (80 + Math.sin(i * 0.8) * 200) },
          size: { width: 60, height: 80 + Math.sin(i * 0.8) * 200 },
          fill: safe(c, i % c.length), stroke: undefined, strokeWidth: 0, radius: 4, opacity: 0.85,
        })),
        { id: 'side-panel', type: 'rect', position: { x: 960, y: 268 }, size: { width: 440, height: 400 }, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1, radius: 12, opacity: 1 },
        { id: 'side-title', type: 'text', text: 'Recent Activity', variant: 'h2', position: { x: 992, y: 292 }, size: { width: 300, height: 28 }, color: '#0f172a', fontFamily: hf },
        ...[0, 1, 2, 3, 4].map((i) => ({
          id: `activity-${i}`, type: 'rect' as const,
          position: { x: 976, y: 340 + i * 60 }, size: { width: 408, height: 48 },
          fill: i === 0 ? lighten(accent, 0.92) : '#f8fafc',
          stroke: '#e2e8f0', strokeWidth: 1, radius: 8, opacity: 1,
        })),
      ] as LayoutNode[],
    },
  };
}

function buildLanding(c: string[], hf: string, bf: string): LayoutSpec {
  const primary = safe(c, 0);
  const accent = safe(c, 1);
  const secondary = c.length > 2 ? safe(c, 2) : accent;
  return {
    root: {
      id: 'root', type: 'frame', size: { width: 1440, height: 1200 }, background: undefined,
      children: [
        { id: 'bg', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 1200 }, fill: '#ffffff', stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        // Nav
        { id: 'nav', type: 'rect', position: { x: 0, y: 0 }, size: { width: 1440, height: 72 }, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 1, radius: 0, opacity: 1 },
        { id: 'nav-brand', type: 'text', text: 'Brand', variant: 'h2', position: { x: 60, y: 22 }, size: { width: 120, height: 28 }, color: primary, fontFamily: hf },
        { id: 'nav-cta', type: 'rect', position: { x: 1280, y: 18 }, size: { width: 120, height: 36 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 8, opacity: 1 },
        { id: 'nav-cta-text', type: 'text', text: 'Sign Up', variant: 'body', position: { x: 1305, y: 26 }, size: { width: 80, height: 20 }, color: textOn(primary), fontFamily: bf },
        // Hero
        { id: 'hero-bg', type: 'rect', position: { x: 0, y: 72 }, size: { width: 1440, height: 480 }, fill: lighten(primary, 0.92), stroke: undefined, strokeWidth: 0, radius: 0, opacity: 1 },
        { id: 'hero-h1', type: 'text', text: 'Build Something Amazing', variant: 'h1', position: { x: 200, y: 200 }, size: { width: 600, height: 56 }, color: darken(primary, 0.2), fontFamily: hf, fontSize: 48 },
        { id: 'hero-p', type: 'text', text: 'The all-in-one platform for creators, designers,\nand developers to bring their ideas to life.', variant: 'body', position: { x: 200, y: 280 }, size: { width: 500, height: 48 }, color: '#64748b', fontFamily: bf },
        { id: 'hero-btn1', type: 'rect', position: { x: 200, y: 350 }, size: { width: 160, height: 48 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
        { id: 'hero-btn1-t', type: 'text', text: 'Get Started', variant: 'body', position: { x: 228, y: 364 }, size: { width: 120, height: 20 }, color: textOn(primary), fontFamily: bf },
        { id: 'hero-btn2', type: 'rect', position: { x: 380, y: 350 }, size: { width: 160, height: 48 }, fill: 'transparent', stroke: primary, strokeWidth: 2, radius: 10, opacity: 1 },
        { id: 'hero-btn2-t', type: 'text', text: 'Learn More', variant: 'body', position: { x: 410, y: 364 }, size: { width: 120, height: 20 }, color: primary, fontFamily: bf },
        // Feature section
        { id: 'features-title', type: 'text', text: 'Features', variant: 'h1', position: { x: 580, y: 600 }, size: { width: 280, height: 40 }, color: '#0f172a', fontFamily: hf },
        ...[0, 1, 2].map((i) => {
          const x = 120 + i * 420;
          const cc = safe(c, i);
          return [
            { id: `feat-${i}`, type: 'rect' as const, position: { x, y: 680 }, size: { width: 380, height: 240 }, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 1, radius: 16, opacity: 1 },
            { id: `feat-${i}-icon`, type: 'rect' as const, position: { x: x + 24, y: 704 }, size: { width: 48, height: 48 }, fill: lighten(cc, 0.85), stroke: undefined, strokeWidth: 0, radius: 12, opacity: 1 },
            { id: `feat-${i}-dot`, type: 'ellipse' as const, position: { x: x + 36, y: 716 }, size: { width: 24, height: 24 }, fill: cc, stroke: undefined, strokeWidth: 0, opacity: 1 } as LayoutNode,
            { id: `feat-${i}-h`, type: 'text' as const, text: ['Fast', 'Secure', 'Scalable'][i], variant: 'h2' as const, position: { x: x + 24, y: 770 }, size: { width: 300, height: 28 }, color: '#0f172a', fontFamily: hf },
            { id: `feat-${i}-p`, type: 'text' as const, text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', variant: 'body' as const, position: { x: x + 24, y: 810 }, size: { width: 332, height: 40 }, color: '#64748b', fontFamily: bf },
          ];
        }).flat(),
        // CTA section
        { id: 'cta-bg', type: 'rect', position: { x: 120, y: 980 }, size: { width: 1200, height: 180 }, fill: primary, stroke: undefined, strokeWidth: 0, radius: 20, opacity: 1 },
        { id: 'cta-h', type: 'text', text: 'Ready to get started?', variant: 'h1', position: { x: 200, y: 1020 }, size: { width: 500, height: 40 }, color: textOn(primary), fontFamily: hf },
        { id: 'cta-btn', type: 'rect', position: { x: 200, y: 1080 }, size: { width: 180, height: 48 }, fill: textOn(primary), stroke: undefined, strokeWidth: 0, radius: 10, opacity: 1 },
        { id: 'cta-btn-t', type: 'text', text: 'Start Free Trial', variant: 'body', position: { x: 224, y: 1094 }, size: { width: 140, height: 20 }, color: primary, fontFamily: bf },
      ] as LayoutNode[],
    },
  };
}

const TEMPLATE_BUILDERS: Record<KulrsTemplate, (c: string[], hf: string, bf: string) => LayoutSpec> = {
  'top-nav': buildTopNav,
  'left-nav': buildLeftNav,
  'mobile': buildMobile,
  'dashboard': buildDashboard,
  'landing': buildLanding,
};

const TEMPLATE_LABELS: Record<KulrsTemplate, string> = {
  'top-nav': 'Top Navigation Website',
  'left-nav': 'Side Navigation App',
  'mobile': 'Mobile App',
  'dashboard': 'Admin Dashboard',
  'landing': 'Landing Page',
};

/* ── HTML Preview Components ───────────────────────────────────────── */

function PreviewTopNav({ colors, hf, bf }: { colors: string[]; hf: string; bf: string }) {
  const nav = safe(colors, 0);
  const hero = safe(colors, 1);
  const accent = safe(colors, 2);
  return (
    <div style={{ fontFamily: bf, background: '#f9fafb', minHeight: '100%' }}>
      <header style={{ background: nav, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 32 }}>
        <span style={{ fontFamily: hf, fontWeight: 700, fontSize: 20, color: textOn(nav) }}>Brand</span>
        {['Home', 'Features', 'Pricing', 'About'].map(l => (
          <span key={l} style={{ fontSize: 14, color: textOn(nav), opacity: 0.8 }}>{l}</span>
        ))}
      </header>
      <section style={{ background: lighten(hero, 0.85), padding: '64px 80px' }}>
        <h1 style={{ fontFamily: hf, fontSize: 40, fontWeight: 700, color: darken(hero, 0.3), margin: 0 }}>Welcome to Our Platform</h1>
        <p style={{ fontSize: 18, color: hero, marginTop: 12 }}>Build amazing things with our tools</p>
        <button style={{ marginTop: 24, padding: '12px 28px', background: accent, color: textOn(accent), border: 'none', borderRadius: 8, fontFamily: bf, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Get Started</button>
      </section>
      <section style={{ padding: '48px 80px' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${lighten(nav, 0.7)}`, padding: 32 }}>
          <h2 style={{ fontFamily: hf, fontSize: 22, color: darken(nav, 0.2), margin: 0 }}>Featured Content</h2>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {colors.map((c, i) => (
              <div key={i} style={{ height: 80, borderRadius: 8, background: lighten(c, 0.88), border: `1px solid ${lighten(c, 0.5)}` }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function PreviewLeftNav({ colors, hf, bf }: { colors: string[]; hf: string; bf: string }) {
  const sidebar = safe(colors, 0);
  const accent = safe(colors, 1);
  return (
    <div style={{ fontFamily: bf, display: 'flex', minHeight: '100%' }}>
      <aside style={{ width: 220, background: sidebar, padding: '24px 16px', flexShrink: 0 }}>
        <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 18, color: textOn(sidebar), marginBottom: 32 }}>Dashboard</div>
        {['Overview', 'Analytics', 'Settings'].map((item, i) => (
          <div key={item} style={{ padding: '10px 12px', borderRadius: 8, background: i === 0 ? lighten(sidebar, 0.15) : 'transparent', color: textOn(sidebar), opacity: i === 0 ? 1 : 0.7, fontSize: 14, marginBottom: 4 }}>{item}</div>
        ))}
      </aside>
      <main style={{ flex: 1, background: '#f1f5f9' }}>
        <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
          <span style={{ fontFamily: hf, fontWeight: 600, fontSize: 18, color: '#0f172a' }}>Overview</span>
        </header>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {colors.slice(0, 3).map((c, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ height: 4, background: c }} />
              <div style={{ padding: 20 }}>
                <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 28, color: c }}>{(i + 1) * 2847}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{['Users', 'Revenue', 'Orders'][i]}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ margin: '0 24px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', height: 260, padding: 20 }}>
          <span style={{ fontFamily: hf, fontWeight: 600, color: '#0f172a' }}>Main Content</span>
        </div>
      </main>
    </div>
  );
}

function PreviewMobile({ colors, hf, bf }: { colors: string[]; hf: string; bf: string }) {
  const primary = safe(colors, 0);
  const accent = safe(colors, 1);
  return (
    <div style={{ fontFamily: bf, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%', background: '#e5e7eb', padding: 32 }}>
      <div style={{ width: 375, height: 760, background: '#fff', borderRadius: 44, border: '2px solid #d1d5db', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: primary, padding: '12px 20px 0' }}>
          <div style={{ fontSize: 13, color: textOn(primary), fontWeight: 600 }}>9:41</div>
          <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 20, color: textOn(primary), padding: '12px 0 16px' }}>Home</div>
        </div>
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {colors.map((c, i) => (
            <div key={i} style={{ borderRadius: 16, background: lighten(c, 0.88), border: `1px solid ${lighten(c, 0.5)}`, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 6, height: 48, borderRadius: 3, background: c, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: hf, fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>Card {i + 1}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Description text here</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'center', padding: '12px 0 24px', gap: 32 }}>
          {['Home', 'Search', 'Profile'].map((t, i) => (
            <span key={t} style={{ fontSize: 12, color: i === 0 ? primary : '#9ca3af', fontWeight: i === 0 ? 600 : 400 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewDashboard({ colors, hf, bf }: { colors: string[]; hf: string; bf: string }) {
  const primary = safe(colors, 0);
  return (
    <div style={{ fontFamily: bf, background: '#f8fafc', minHeight: '100%' }}>
      <header style={{ background: primary, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: hf, fontWeight: 700, fontSize: 18, color: textOn(primary) }}>Dashboard</span>
      </header>
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
        {colors.slice(0, 4).map((c, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ height: 4, background: c }} />
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 32, color: c }}>{(i + 1) * 1234}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{['Users', 'Revenue', 'Orders', 'Growth'][i]}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <span style={{ fontFamily: hf, fontWeight: 600, fontSize: 16, color: '#0f172a' }}>Performance Overview</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 24, height: 160 }}>
            {[0.6, 0.9, 0.4, 0.75, 0.55, 0.85, 0.7].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h * 100}%`, background: safe(colors, i % colors.length), borderRadius: 4, opacity: 0.85 }} />
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <span style={{ fontFamily: hf, fontWeight: 600, fontSize: 16, color: '#0f172a' }}>Recent Activity</span>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ padding: 12, borderRadius: 8, background: i === 0 ? lighten(safe(colors, 1), 0.92) : '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13 }}>
                Activity item {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewLanding({ colors, hf, bf }: { colors: string[]; hf: string; bf: string }) {
  const primary = safe(colors, 0);
  const accent = safe(colors, 1);
  return (
    <div style={{ fontFamily: bf, background: '#fff', minHeight: '100%' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', height: 64, borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontFamily: hf, fontWeight: 700, fontSize: 22, color: primary }}>Brand</span>
        <button style={{ padding: '8px 20px', background: primary, color: textOn(primary), border: 'none', borderRadius: 8, fontFamily: bf, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Sign Up</button>
      </nav>
      <section style={{ background: lighten(primary, 0.92), padding: '80px 120px' }}>
        <h1 style={{ fontFamily: hf, fontSize: 48, fontWeight: 700, color: darken(primary, 0.2), margin: 0, lineHeight: 1.2 }}>Build Something Amazing</h1>
        <p style={{ fontSize: 18, color: '#64748b', marginTop: 16, maxWidth: 500 }}>The all-in-one platform for creators, designers, and developers to bring their ideas to life.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button style={{ padding: '14px 28px', background: primary, color: textOn(primary), border: 'none', borderRadius: 10, fontFamily: bf, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Get Started</button>
          <button style={{ padding: '14px 28px', background: 'transparent', color: primary, border: `2px solid ${primary}`, borderRadius: 10, fontFamily: bf, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Learn More</button>
        </div>
      </section>
      <section style={{ padding: '64px 120px' }}>
        <h2 style={{ fontFamily: hf, textAlign: 'center', fontSize: 28, color: '#0f172a' }}>Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 40 }}>
          {['Fast', 'Secure', 'Scalable'].map((f, i) => (
            <div key={f} style={{ padding: 28, borderRadius: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: lighten(safe(colors, i), 0.85), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: safe(colors, i) }} />
              </div>
              <h3 style={{ fontFamily: hf, fontSize: 18, color: '#0f172a', marginTop: 16 }}>{f}</h3>
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{ margin: '0 60px 48px', padding: '48px 80px', background: primary, borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: hf, fontSize: 28, color: textOn(primary), fontWeight: 700, margin: 0 }}>Ready to get started?</h2>
        <button style={{ padding: '14px 28px', background: textOn(primary), color: primary, border: 'none', borderRadius: 10, fontFamily: bf, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Start Free Trial</button>
      </section>
    </div>
  );
}

const PREVIEW_MAP: Record<KulrsTemplate, React.FC<{ colors: string[]; hf: string; bf: string }>> = {
  'top-nav': PreviewTopNav,
  'left-nav': PreviewLeftNav,
  'mobile': PreviewMobile,
  'dashboard': PreviewDashboard,
  'landing': PreviewLanding,
};

/* ── Main page component ───────────────────────────────────────────── */

export default function FromKulrsPage() {
  const params = useMemo(() => parseKulrsParams(), []);
  const { colors, headingFont, bodyFont, template } = params;

  useGoogleFonts(useMemo(() => [headingFont, bodyFont], [headingFont, bodyFont]));

  const [editOpened, setEditOpened] = useState(false);

  const Preview = PREVIEW_MAP[template] || PreviewTopNav;
  const spec = useMemo(
    () => (TEMPLATE_BUILDERS[template] || buildTopNav)(colors, headingFont, bodyFont),
    [colors, headingFont, bodyFont, template],
  );

  const handleEditInVizail = () => {
    // Save the built LayoutSpec to localStorage so CanvasApp picks it up
    saveDesignSpec(spec);
    setCurrentDesignName(`Kulrs Import — ${TEMPLATE_LABELS[template]}`);
    setEditOpened(true);
    // Navigate to the main editor
    window.location.href = '/';
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const [copiedLink, setCopiedLink] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 24px', height: 56, background: '#1e293b', borderBottom: '1px solid #334155',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>
            Kulrs <span style={{ color: '#64748b', margin: '0 4px' }}>×</span> Vizail
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: 4, background: '#334155',
            fontSize: 11, color: '#94a3b8', fontWeight: 500,
          }}>
            {TEMPLATE_LABELS[template]}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Palette strip */}
          <div style={{ display: 'flex', gap: 3, marginRight: 16 }}>
            {colors.map((c, i) => (
              <div key={i} style={{ width: 24, height: 24, borderRadius: 6, background: c, border: '2px solid #334155' }} title={c} />
            ))}
          </div>
          <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 8 }}>
            {headingFont} / {bodyFont}
          </span>
          <button
            onClick={handleCopyLink}
            style={{
              padding: '6px 14px', background: '#334155', color: '#e2e8f0', border: 'none',
              borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500,
            }}
          >
            {copiedLink ? '✓ Copied' : 'Copy Link'}
          </button>
          <button
            onClick={handleEditInVizail}
            disabled={editOpened}
            style={{
              padding: '6px 16px', background: '#6366f1', color: '#fff', border: 'none',
              borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600,
              opacity: editOpened ? 0.6 : 1,
            }}
          >
            {editOpened ? 'Opening…' : 'Edit in Vizail →'}
          </button>
        </div>
      </header>

      {/* Preview area */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 32 }}>
        <div style={{
          width: template === 'mobile' ? 500 : 1200,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          minHeight: template === 'mobile' ? 860 : 600,
        }}>
          <Preview colors={colors} hf={headingFont} bf={bodyFont} />
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '12px 24px', background: '#1e293b', borderTop: '1px solid #334155',
        fontSize: 12, color: '#64748b', gap: 16, flexShrink: 0,
      }}>
        <span>Palette from <a href="https://kulrs.com" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'underline' }}>kulrs.com</a></span>
        <span>•</span>
        <span>Design with <a href="https://vizail.com" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'underline' }}>vizail.com</a></span>
      </footer>
    </div>
  );
}
