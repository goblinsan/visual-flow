import { useEffect, useMemo, useState } from 'react';
import type { LayoutSpec } from './layout-schema';
import { saveDesignSpec, setCurrentDesignName } from './utils/persistence';
import { generateThemeFromPalette } from './theme/themeGenerator';
import { loadGoogleFont } from './utils/googleFonts';
import {
  resolveTheme, buildTopNav, buildLeftNav, buildMobile, buildDashboard, buildLanding,
} from './canvas/kulrsBuilders';
import type { ThemeColors, ThemeMode } from './canvas/kulrsBuilders';
import { CanvasPreview } from './canvas/CanvasPreview';

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

/* ── Preview widths per template ───────────────────────────────────── */

const PREVIEW_WIDTHS: Record<KulrsTemplate, number> = {
  'top-nav': 1200,
  'left-nav': 1200,
  'mobile': 500,
  'dashboard': 1200,
  'landing': 1200,
};

/* ── Main page component ───────────────────────────────────────────── */

export default function FromKulrsPage() {
  const params = useMemo(() => parseKulrsParams(), []);
  const { colors, headingFont, bodyFont, template, theme, customBg } = params;
  const themeColors = useMemo(() => resolveTheme(theme, customBg), [theme, customBg]);

  useGoogleFonts(useMemo(() => [headingFont, bodyFont], [headingFont, bodyFont]));

  const [editOpened, setEditOpened] = useState(false);

  const previewWidth = PREVIEW_WIDTHS[template] ?? 1200;
  const spec = useMemo(
    () => (TEMPLATE_BUILDERS[template] || buildTopNav)(colors, headingFont, bodyFont, themeColors),
    [colors, headingFont, bodyFont, template, themeColors],
  );

  const handleEditInVizail = () => {
    saveDesignSpec(spec);
    setCurrentDesignName(`Kulrs Import — ${TEMPLATE_LABELS[template]}`);
    // Also save the Kulrs palette as a design theme so it's available in the editor
    const themeMode = theme === 'dark' ? 'dark' : 'light';
    const designTheme = generateThemeFromPalette(colors, themeMode as 'light' | 'dark', {
      name: `Kulrs ${themeMode === 'dark' ? 'Dark' : 'Light'}`,
      typography: { headingFont, bodyFont },
    });
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
          width: previewWidth,
          maxWidth: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          display: 'inline-block',
        }}>
          <CanvasPreview spec={spec} containerWidth={previewWidth} />
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
