/**
 * PreviewScaffold – renders a live color/typography preview for the
 * currently selected style recommendation.
 * Phase 3 (#184, #185, #186): accepts optional typography pairing,
 * button style, and navigation style overrides.
 */

import type { StyleRecommendation, TypographyPairing, ButtonStyle, NavigationStyle } from '../types';

interface PreviewScaffoldProps {
  recommendation: StyleRecommendation | null;
  /** Optional typography pairing override (Phase 3, step 3) */
  typographyPairing?: TypographyPairing | null;
  /** Optional button style override (Phase 3, step 4) */
  buttonStyle?: ButtonStyle | null;
  /** Optional navigation style override (Phase 3, step 5) */
  navigationStyle?: NavigationStyle | null;
}

export function PreviewScaffold({
  recommendation,
  typographyPairing,
  buttonStyle,
  navigationStyle,
}: PreviewScaffoldProps) {
  if (!recommendation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
        <i className="fa-regular fa-eye text-2xl" />
        <p className="text-xs">Select a style to see a preview</p>
      </div>
    );
  }

  const { swatches, typography, name } = recommendation;

  const primary = swatches.find((s) => s.role === 'primary')?.hex ?? '#1A73E8';
  const surface = swatches.find((s) => s.role === 'surface')?.hex ?? '#ffffff';
  const text = swatches.find((s) => s.role === 'text')?.hex ?? '#111111';
  const accent = swatches.find((s) => s.role === 'accent')?.hex ?? primary;

  // Apply Phase 3 overrides when available
  const headingFont = typographyPairing?.headingFont ?? typography.headingFont;
  const bodyFont = typographyPairing?.bodyFont ?? typography.bodyFont;

  const btnRadius = buttonStyle?.borderRadius ?? '0.25rem';
  const btnWeight = buttonStyle?.fontWeight ?? '600';
  const btnPaddingX = buttonStyle?.paddingX ?? '0.75rem';
  const btnOutlined = buttonStyle?.outlined ?? false;

  // Navigation variant used in the header
  const navVariant = navigationStyle?.variant ?? 'top-bar';
  const showSidebar = navVariant === 'sidebar';
  const showBottomBar = navVariant === 'bottom-bar';
  const showFloating = navVariant === 'floating';
  const showTabBar = navVariant === 'tab-bar';

  const navItems = ['Home', 'About', 'Work'];

  return (
    <div
      aria-label={`Preview of ${name}`}
      className="rounded-xl overflow-hidden shadow-xl border border-white/10 relative"
      style={{ backgroundColor: surface, color: text, fontFamily: bodyFont }}
    >
      {/* Top-bar navigation */}
      {!showSidebar && !showBottomBar && !showFloating && !showTabBar && (
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ backgroundColor: primary }}
        >
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/30" />
          </div>
          <span
            className="text-white text-xs font-semibold flex-1 text-center"
            style={{ fontFamily: headingFont }}
          >
            {name}
          </span>
          <div className="flex gap-2">
            {navItems.map((item) => (
              <span key={item} className="text-[9px] text-white/70 font-medium">{item}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tab-bar navigation */}
      {showTabBar && (
        <>
          <div className="px-4 py-2 flex items-center" style={{ backgroundColor: primary }}>
            <span className="text-white text-xs font-semibold" style={{ fontFamily: headingFont }}>
              {name}
            </span>
          </div>
          <div className="flex border-b" style={{ borderColor: text + '22' }}>
            {navItems.map((item, i) => (
              <span
                key={item}
                className="flex-1 text-center text-[9px] py-1.5 font-medium"
                style={{
                  borderBottom: i === 0 ? `2px solid ${accent}` : '2px solid transparent',
                  color: i === 0 ? accent : text + '66',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Sidebar + content */}
      {showSidebar ? (
        <div className="flex">
          <div
            className="flex flex-col gap-2 px-2 py-3 w-16"
            style={{ backgroundColor: primary }}
          >
            <span className="text-white text-[8px] font-bold mb-1" style={{ fontFamily: headingFont }}>
              {name.slice(0, 4)}
            </span>
            {navItems.map((item) => (
              <span key={item} className="text-[8px] text-white/70 font-medium">{item}</span>
            ))}
          </div>
          <div className="flex-1 p-3 space-y-2">
            <h3 className="text-xs font-bold" style={{ fontFamily: headingFont, color: text }}>
              Heading preview
            </h3>
            <p className="text-[9px] leading-relaxed opacity-70">
              Body copy — {typography.baseSizePx}px / {typography.lineHeight} line-height.
            </p>
            <span
              className="inline-block text-[9px] text-white"
              style={{
                borderRadius: btnRadius,
                fontWeight: btnWeight,
                paddingLeft: btnPaddingX,
                paddingRight: btnPaddingX,
                paddingTop: '0.25rem',
                paddingBottom: '0.25rem',
                backgroundColor: btnOutlined ? 'transparent' : accent,
                border: btnOutlined ? `1.5px solid ${accent}` : 'none',
                color: btnOutlined ? accent : '#fff',
              }}
            >
              CTA
            </span>
          </div>
        </div>
      ) : (
        /* Standard content block */
        <div className="p-4 space-y-3">
          <h3
            className="text-sm font-bold"
            style={{ fontFamily: headingFont, color: text }}
          >
            Heading preview
          </h3>
          <p className="text-[11px] leading-relaxed opacity-70">
            Body copy at {typography.baseSizePx}px / {typography.lineHeight} line-height.
            This text demonstrates how content reads with your chosen style.
          </p>

          {/* Color chips */}
          <div className="flex gap-1.5 flex-wrap">
            {swatches.map((swatch) => (
              <div key={swatch.role} className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: swatch.hex }}
                />
                <span className="text-[9px] opacity-50">{swatch.role}</span>
              </div>
            ))}
          </div>

          {/* CTA button */}
          <div>
            <span
              className="inline-block text-xs text-white"
              style={{
                borderRadius: btnRadius,
                fontWeight: btnWeight,
                paddingLeft: btnPaddingX,
                paddingRight: btnPaddingX,
                paddingTop: '0.375rem',
                paddingBottom: '0.375rem',
                backgroundColor: btnOutlined ? 'transparent' : accent,
                border: btnOutlined ? `1.5px solid ${accent}` : 'none',
                color: btnOutlined ? accent : '#fff',
              }}
            >
              Call to action
            </span>
          </div>
        </div>
      )}

      {/* Floating navigation overlay */}
      {showFloating && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 px-3 py-1.5 rounded-full shadow-lg"
          style={{ backgroundColor: primary }}
        >
          {navItems.map((item) => (
            <span key={item} className="text-[9px] text-white font-medium whitespace-nowrap">
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Bottom bar navigation */}
      {showBottomBar && (
        <div
          className="flex items-center justify-around py-2 border-t border-white/10"
          style={{ backgroundColor: primary }}
        >
          {navItems.map((item) => (
            <span key={item} className="text-[9px] text-white font-medium">{item}</span>
          ))}
        </div>
      )}
    </div>
  );
}
