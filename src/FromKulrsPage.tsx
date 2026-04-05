import { useEffect, useMemo, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type { LayoutSpec } from './layout-schema';
import { saveDesignSpec, setCurrentDesignName } from './utils/persistence';
import { loadGoogleFont } from './utils/googleFonts';
import {
  safe,
  heroTint,
  resolveTheme,
  buildTopNav,
  buildLeftNav,
  buildMobile,
  buildDashboard,
  buildLanding,
} from './canvas/kulrsBuilders';
import { renderNode, useFontLoading } from './canvas/CanvasRenderer';
import type { ThemeColors, ThemeMode } from './canvas/kulrsBuilders';
import type { DesignTheme } from './theme/types';

/* ── URL param parsing ─────────────────────────────────────────────── */

type KulrsTemplate = 'top-nav' | 'left-nav' | 'mobile' | 'dashboard' | 'landing';

interface KulrsParams {
  colors: string[];
  headingFont: string;
  bodyFont: string;
  template: KulrsTemplate;
  theme: ThemeMode;
  customBg: string;
}

function parseKulrsParams(): KulrsParams {
  const sp = new URLSearchParams(window.location.search);
  const rawColors = sp.get('colors') || '';
  const colors = rawColors
    .split(',')
    .map(c => (c.startsWith('#') ? c : `#${c}`))
    .filter(c => /^#[0-9a-fA-F]{6}$/.test(c));
  const rawTheme = sp.get('theme') || 'light';
  const theme = (['light', 'dark', 'custom'].includes(rawTheme) ? rawTheme : 'light') as ThemeMode;
  const rawBg = sp.get('bg') || '';
  const customBg = /^[0-9a-fA-F]{6}$/.test(rawBg) ? `#${rawBg}` : '#ffffff';
  return {
    colors: colors.length > 0 ? colors : ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'],
    headingFont: sp.get('headingFont') || 'Inter',
    bodyFont: sp.get('bodyFont') || 'Roboto',
    template: (sp.get('template') as KulrsTemplate) || 'top-nav',
    theme,
    customBg,
  };
}

/* ── Google Fonts loader ───────────────────────────────────────────── */

function useGoogleFonts(fonts: string[]) {
  useEffect(() => {
    fonts.filter(Boolean).forEach(f => loadGoogleFont(f, [300, 400, 500, 600, 700]));
  }, [fonts]);
}

/* ── LayoutSpec builders ── (imported from canvas/kulrsBuilders) */

const TEMPLATE_BUILDERS: Record<KulrsTemplate, (c: string[], hf: string, bf: string, t: ThemeColors) => LayoutSpec> = {
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

function buildImportTheme(
  colors: string[],
  headingFont: string,
  bodyFont: string,
  theme: ThemeMode,
  resolved: ThemeColors,
): DesignTheme {
  const primary = safe(colors, 0);
  const secondary = safe(colors, 1);
  const tertiary = safe(colors, 2);
  const mode: 'light' | 'dark' = theme === 'dark' ? 'dark' : (resolved.isDark ? 'dark' : 'light');

  return {
    id: `kulrs_import_${Date.now().toString(36)}`,
    name: `Kulrs ${mode === 'dark' ? 'Dark' : 'Light'}`,
    paletteColors: colors,
    mode,
    colors: {
      'color.background.primary': resolved.pageBg,
      'color.background.secondary': heroTint(secondary, resolved.isDark),
      'color.background.tertiary': heroTint(primary, resolved.isDark),
      'color.background.inverse': resolved.isDark ? '#f1f5f9' : '#0f172a',
      'color.text.primary': resolved.textPrimary,
      'color.text.secondary': resolved.textSecondary,
      'color.text.inverse': resolved.isDark ? '#0f172a' : '#ffffff',
      'color.text.link': primary,
      'color.border.primary': resolved.border,
      'color.border.secondary': resolved.border,
      'color.border.focus': primary,
      'color.action.primary': primary,
      'color.action.primaryHover': secondary,
      'color.action.secondary': secondary,
      'color.action.secondaryHover': tertiary,
      'color.status.success': colors[2] ?? '#22c55e',
      'color.status.warning': colors[3] ?? '#eab308',
      'color.status.error': colors[4] ?? '#ef4444',
      'color.status.info': colors[1] ?? '#3b82f6',
      'color.surface.card': resolved.cardBg,
      'color.surface.overlay': resolved.isDark ? '#0b1220' : '#e2e8f0',
      'color.accent.primary': primary,
      'color.accent.secondary': secondary,
    },
    typography: {
      headingFont,
      bodyFont,
      monoFont: 'Fira Code',
    },
  };
}

/* ── Main page component ───────────────────────────────────────────── */

export default function FromKulrsPage() {
  const params = useMemo(() => parseKulrsParams(), []);
  const { colors, headingFont, bodyFont, template, theme, customBg } = params;
  const themeColors = useMemo(() => resolveTheme(theme, customBg), [theme, customBg]);
  useFontLoading();

  useGoogleFonts(useMemo(() => [headingFont, bodyFont], [headingFont, bodyFont]));

  const [editOpened, setEditOpened] = useState(false);

  const spec = useMemo(
    () => (TEMPLATE_BUILDERS[template] || buildTopNav)(colors, headingFont, bodyFont, themeColors),
    [colors, headingFont, bodyFont, template, themeColors],
  );

  const handleEditInVizail = () => {
    saveDesignSpec(spec);
    setCurrentDesignName(`Kulrs Import — ${TEMPLATE_LABELS[template]}`);
    // Save a theme that matches the exact imported structure/colors.
    const designTheme = buildImportTheme(colors, headingFont, bodyFont, theme, themeColors);
    try {
      localStorage.setItem('vizail_design_theme', JSON.stringify(designTheme));
    } catch { /* ignore */ }
    setEditOpened(true);
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
          {theme !== 'light' && (
            <span style={{
              padding: '2px 8px', borderRadius: 4, background: '#334155',
              fontSize: 11, color: '#94a3b8', fontWeight: 500,
            }}>
              {theme === 'dark' ? '🌙 Dark' : '🎨 Custom'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          width: spec.root.size.width,
          maxWidth: '100%',
          background: themeColors.pageBg,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          minHeight: spec.root.size.height,
        }}>
          <Stage width={spec.root.size.width} height={spec.root.size.height}>
            <Layer>
              {spec.root.children.map(renderNode)}
            </Layer>
          </Stage>
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
