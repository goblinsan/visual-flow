import { useEffect, useMemo, useState } from 'react';
import type { LayoutSpec } from './layout-schema';
import { saveDesignSpec, setCurrentDesignName } from './utils/persistence';
import type { DesignTheme } from './theme/types';
import { lighten, darken } from './utils/color';
import { loadGoogleFont } from './utils/googleFonts';
import {
  safe, textOn, heroTint, cardTint, borderTint,
  resolveTheme, buildTopNav, buildLeftNav, buildMobile, buildDashboard, buildLanding,
} from './canvas/kulrsBuilders';
import type { ThemeColors, ThemeMode } from './canvas/kulrsBuilders';

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

/* ── Theme builder for Kulrs imports ───────────────────────────────── */

/**
 * Build a DesignTheme that matches the actual colors used in the Kulrs preview.
 * Instead of algorithmically deriving from palette (which causes drift),
 * we use the resolved ThemeColors that was used to render the preview,
 * guaranteeing preview and editor will look identical.
 */
function buildThemeFromResolvedColors(
  paletteColors: string[],
  headingFont: string,
  bodyFont: string,
  themeMode: ThemeMode,
  resolvedColors: ThemeColors,
): DesignTheme {
  const isPaletteDark = resolvedColors.isDark;
  
  // Map the resolved theme colors to semantic tokens
  // These are the ACTUAL colors that the preview rendered with
  return {
    id: `kulrs_${themeMode}_${Date.now().toString(36)}`,
    name: `Kulrs ${themeMode === 'dark' ? 'Dark' : 'Light'}`,
    paletteColors,
    mode: themeMode === 'dark' ? 'dark' : 'light',
    colors: {
      // Backgrounds — use resolved colors
      'color.background.primary': resolvedColors.pageBg,
      'color.background.secondary': resolvedColors.cardBg,
      'color.background.tertiary': resolvedColors.cardBg,
      'color.background.inverse': isPaletteDark ? resolvedColors.pageBg : resolvedColors.cardBg,
      
      // Text — use resolved colors
      'color.text.primary': resolvedColors.textPrimary,
      'color.text.secondary': resolvedColors.textSecondary,
      'color.text.inverse': isPaletteDark ? resolvedColors.textSecondary : resolvedColors.textPrimary,
      'color.text.link': safe(paletteColors, 2), // Use 3rd palette color as link
      
      // Borders — use resolved colors
      'color.border.primary': resolvedColors.border,
      'color.border.secondary': resolvedColors.border,
      'color.border.focus': safe(paletteColors, 0), // Primary palette color for focus
      
      // Actions — use palette colors for interactive elements
      'color.action.primary': safe(paletteColors, 0),
      'color.action.primaryHover': darken(safe(paletteColors, 0), 0.15),
      'color.action.secondary': safe(paletteColors, 1),
      'color.action.secondaryHover': darken(safe(paletteColors, 1), 0.15),
      
      // Status — derive from palette colors
      'color.status.success': safe(paletteColors, 2),
      'color.status.warning': safe(paletteColors, 3),
      'color.status.error': safe(paletteColors, 1),
      'color.status.info': safe(paletteColors, 4),
      
      // Surface — use resolved colors 
      'color.surface.card': resolvedColors.cardBg,
      'color.surface.overlay': resolvedColors.cardBg,
      
      // Accent — use palette colors
      'color.accent.primary': safe(paletteColors, 0),
      'color.accent.secondary': safe(paletteColors, 1),
    },
    typography: { headingFont, bodyFont, monoFont: 'Fira Code' },
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

/* ── HTML Preview Components ───────────────────────────────────────── */

function PreviewTopNav({ colors, hf, bf, t }: { colors: string[]; hf: string; bf: string; t: ThemeColors }) {
  const nav = safe(colors, 0);
  const hero = safe(colors, 1);
  const accent = safe(colors, 2);
  return (
    <div style={{ fontFamily: bf, background: t.pageBg, minHeight: '100%' }}>
      <header style={{ background: nav, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 32 }}>
        <span style={{ fontFamily: hf, fontWeight: 700, fontSize: 20, color: textOn(nav) }}>Brand</span>
        {['Home', 'Features', 'Pricing', 'About'].map(l => (
          <span key={l} style={{ fontSize: 14, color: textOn(nav), opacity: 0.8 }}>{l}</span>
        ))}
      </header>
      <section style={{ background: heroTint(hero, t.isDark), padding: '64px 80px' }}>
        <h1 style={{ fontFamily: hf, fontSize: 40, fontWeight: 700, color: t.isDark ? lighten(hero, 0.3) : darken(hero, 0.3), margin: 0 }}>Welcome to Our Platform</h1>
        <p style={{ fontSize: 18, color: t.isDark ? lighten(hero, 0.5) : hero, marginTop: 12 }}>Build amazing things with our tools</p>
        <button style={{ marginTop: 24, padding: '12px 28px', background: accent, color: textOn(accent), border: 'none', borderRadius: 8, fontFamily: bf, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Get Started</button>
      </section>
      <section style={{ padding: '48px 80px' }}>
        <div style={{ background: t.cardBg, borderRadius: 12, border: `1px solid ${t.border}`, padding: 32 }}>
          <h2 style={{ fontFamily: hf, fontSize: 22, color: t.textPrimary, margin: 0 }}>Featured Content</h2>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {colors.map((c, i) => (
              <div key={i} style={{ height: 80, borderRadius: 8, background: cardTint(c, t.isDark), border: `1px solid ${borderTint(c, t.isDark)}` }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function PreviewLeftNav({ colors, hf, bf, t }: { colors: string[]; hf: string; bf: string; t: ThemeColors }) {
  const sidebar = safe(colors, 0);
  return (
    <div style={{ fontFamily: bf, display: 'flex', minHeight: '100%' }}>
      <aside style={{ width: 220, background: sidebar, padding: '24px 16px', flexShrink: 0 }}>
        <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 18, color: textOn(sidebar), marginBottom: 32 }}>Dashboard</div>
        {['Overview', 'Analytics', 'Settings'].map((item, i) => (
          <div key={item} style={{ padding: '10px 12px', borderRadius: 8, background: i === 0 ? lighten(sidebar, 0.15) : 'transparent', color: textOn(sidebar), opacity: i === 0 ? 1 : 0.7, fontSize: 14, marginBottom: 4 }}>{item}</div>
        ))}
      </aside>
      <main style={{ flex: 1, background: t.pageBg }}>
        <header style={{ background: t.cardBg, borderBottom: `1px solid ${t.border}`, padding: '16px 24px' }}>
          <span style={{ fontFamily: hf, fontWeight: 600, fontSize: 18, color: t.textPrimary }}>Overview</span>
        </header>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {colors.slice(0, 3).map((c, i) => (
            <div key={i} style={{ background: t.cardBg, borderRadius: 12, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <div style={{ height: 4, background: c }} />
              <div style={{ padding: 20 }}>
                <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 28, color: c }}>{(i + 1) * 2847}</div>
                <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>{['Users', 'Revenue', 'Orders'][i]}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ margin: '0 24px', background: t.cardBg, borderRadius: 12, border: `1px solid ${t.border}`, height: 260, padding: 20 }}>
          <span style={{ fontFamily: hf, fontWeight: 600, color: t.textPrimary }}>Main Content</span>
        </div>
      </main>
    </div>
  );
}

function PreviewMobile({ colors, hf, bf, t }: { colors: string[]; hf: string; bf: string; t: ThemeColors }) {
  const primary = safe(colors, 0);
  return (
    <div style={{ fontFamily: bf, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%', background: t.pageBg, padding: 32 }}>
      <div style={{ width: 375, height: 760, background: t.cardBg, borderRadius: 44, border: `2px solid ${t.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: primary, padding: '12px 20px 0' }}>
          <div style={{ fontSize: 13, color: textOn(primary), fontWeight: 600 }}>9:41</div>
          <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 20, color: textOn(primary), padding: '12px 0 16px' }}>Home</div>
        </div>
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {colors.map((c, i) => (
            <div key={i} style={{ borderRadius: 16, background: cardTint(c, t.isDark), border: `1px solid ${borderTint(c, t.isDark)}`, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 6, height: 48, borderRadius: 3, background: c, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: hf, fontWeight: 600, fontSize: 15, color: t.textPrimary }}>Card {i + 1}</div>
                <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>Description text here</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'center', padding: '12px 0 24px', gap: 32 }}>
          {['Home', 'Search', 'Profile'].map((label, i) => (
            <span key={label} style={{ fontSize: 12, color: i === 0 ? primary : t.textSecondary, fontWeight: i === 0 ? 600 : 400 }}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewDashboard({ colors, hf, bf, t }: { colors: string[]; hf: string; bf: string; t: ThemeColors }) {
  const primary = safe(colors, 0);
  return (
    <div style={{ fontFamily: bf, background: t.pageBg, minHeight: '100%' }}>
      <header style={{ background: primary, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: hf, fontWeight: 700, fontSize: 18, color: textOn(primary) }}>Dashboard</span>
      </header>
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
        {colors.slice(0, 4).map((c, i) => (
          <div key={i} style={{ background: t.cardBg, borderRadius: 12, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
            <div style={{ height: 4, background: c }} />
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 32, color: c }}>{(i + 1) * 1234}</div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>{['Users', 'Revenue', 'Orders', 'Growth'][i]}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ background: t.cardBg, borderRadius: 12, border: `1px solid ${t.border}`, padding: 24 }}>
          <span style={{ fontFamily: hf, fontWeight: 600, fontSize: 16, color: t.textPrimary }}>Performance Overview</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 24, height: 160 }}>
            {[0.6, 0.9, 0.4, 0.75, 0.55, 0.85, 0.7].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h * 100}%`, background: safe(colors, i % colors.length), borderRadius: 4, opacity: 0.85 }} />
            ))}
          </div>
        </div>
        <div style={{ background: t.cardBg, borderRadius: 12, border: `1px solid ${t.border}`, padding: 24 }}>
          <span style={{ fontFamily: hf, fontWeight: 600, fontSize: 16, color: t.textPrimary }}>Recent Activity</span>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ padding: 12, borderRadius: 8, background: i === 0 ? (t.isDark ? darken(safe(colors, 1), 0.7) : lighten(safe(colors, 1), 0.92)) : (t.isDark ? lighten(t.pageBg, 0.05) : '#f8fafc'), border: `1px solid ${t.border}`, fontSize: 13, color: t.textSecondary }}>
                Activity item {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewLanding({ colors, hf, bf, t }: { colors: string[]; hf: string; bf: string; t: ThemeColors }) {
  const primary = safe(colors, 0);
  return (
    <div style={{ fontFamily: bf, background: t.pageBg, minHeight: '100%' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', height: 64, borderBottom: `1px solid ${t.border}` }}>
        <span style={{ fontFamily: hf, fontWeight: 700, fontSize: 22, color: primary }}>Brand</span>
        <button style={{ padding: '8px 20px', background: primary, color: textOn(primary), border: 'none', borderRadius: 8, fontFamily: bf, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Sign Up</button>
      </nav>
      <section style={{ background: heroTint(primary, t.isDark), padding: '80px 120px' }}>
        <h1 style={{ fontFamily: hf, fontSize: 48, fontWeight: 700, color: t.isDark ? lighten(primary, 0.3) : darken(primary, 0.2), margin: 0, lineHeight: 1.2 }}>Build Something Amazing</h1>
        <p style={{ fontSize: 18, color: t.textSecondary, marginTop: 16, maxWidth: 500 }}>The all-in-one platform for creators, designers, and developers to bring their ideas to life.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button style={{ padding: '14px 28px', background: primary, color: textOn(primary), border: 'none', borderRadius: 10, fontFamily: bf, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Get Started</button>
          <button style={{ padding: '14px 28px', background: 'transparent', color: t.isDark ? lighten(primary, 0.4) : primary, border: `2px solid ${primary}`, borderRadius: 10, fontFamily: bf, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Learn More</button>
        </div>
      </section>
      <section style={{ padding: '64px 120px' }}>
        <h2 style={{ fontFamily: hf, textAlign: 'center', fontSize: 28, color: t.textPrimary }}>Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 40 }}>
          {['Fast', 'Secure', 'Scalable'].map((f, i) => (
            <div key={f} style={{ padding: 28, borderRadius: 16, border: `1px solid ${t.border}`, background: t.cardBg }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: t.isDark ? darken(safe(colors, i), 0.5) : lighten(safe(colors, i), 0.85), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: safe(colors, i) }} />
              </div>
              <h3 style={{ fontFamily: hf, fontSize: 18, color: t.textPrimary, marginTop: 16 }}>{f}</h3>
              <p style={{ fontSize: 14, color: t.textSecondary, marginTop: 8, lineHeight: 1.6 }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
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

const PREVIEW_MAP: Record<KulrsTemplate, React.FC<{ colors: string[]; hf: string; bf: string; t: ThemeColors }>> = {
  'top-nav': PreviewTopNav,
  'left-nav': PreviewLeftNav,
  'mobile': PreviewMobile,
  'dashboard': PreviewDashboard,
  'landing': PreviewLanding,
};

/* ── Main page component ───────────────────────────────────────────── */

export default function FromKulrsPage() {
  const params = useMemo(() => parseKulrsParams(), []);
  const { colors, headingFont, bodyFont, template, theme, customBg } = params;
  const themeColors = useMemo(() => resolveTheme(theme, customBg), [theme, customBg]);

  useGoogleFonts(useMemo(() => [headingFont, bodyFont], [headingFont, bodyFont]));

  const [editOpened, setEditOpened] = useState(false);

  const Preview = PREVIEW_MAP[template] || PreviewTopNav;
  const spec = useMemo(
    () => (TEMPLATE_BUILDERS[template] || buildTopNav)(colors, headingFont, bodyFont, themeColors),
    [colors, headingFont, bodyFont, template, themeColors],
  );

  const handleEditInVizail = () => {
    saveDesignSpec(spec);
    setCurrentDesignName(`Kulrs Import — ${TEMPLATE_LABELS[template]}`);
    // Build a theme that matches the exact colors used in this preview
    // This guarantees preview and editor will render identically
    const designTheme = buildThemeFromResolvedColors(
      colors,
      headingFont,
      bodyFont,
      theme,
      themeColors,
    );
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
          width: template === 'mobile' ? 500 : 1200,
          maxWidth: '100%',
          background: themeColors.pageBg,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          minHeight: template === 'mobile' ? 860 : 600,
        }}>
          <Preview colors={colors} hf={headingFont} bf={bodyFont} t={themeColors} />
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
