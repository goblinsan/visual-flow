/**
 * MobilePreviewScreen
 *
 * Shows a phone-frame mock-up of the assembled design system together with
 * the chosen color palette and typography so the user can see their choices
 * before exporting.  A compact summary review panel at the bottom lists
 * every selection the user made throughout the guided flow.
 *
 * Issue #206 – Design the simplified selection-based workflow
 * Issue #215 – Lightweight live preview and summary review
 */

import { useEffect } from 'react';
import type { MobileDesignSnapshot } from './types';
import { loadGoogleFont } from '../utils/googleFonts';

export interface MobilePreviewScreenProps {
  snapshot: MobileDesignSnapshot;
  /** Called when the user taps the back button. */
  onBack: () => void;
  /** Called when the user taps "Use this design". */
  onConfirm: () => void;
}

export function MobilePreviewScreen({
  snapshot,
  onBack,
  onConfirm,
}: MobilePreviewScreenProps) {
  const { primaryColor, accentColor, headingFont, bodyFont, mood, industry, outputType = 'mobile-app' } = snapshot;

  useEffect(() => {
    [headingFont, bodyFont].filter(Boolean).forEach((font) => {
      loadGoogleFont(font, [400, 500, 600, 700]);
    });
  }, [headingFont, bodyFont]);

  const outputLabel = outputType.replace('-', ' ');

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white px-5 pt-6 pb-8">
      {/* Top nav */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/10 text-white/60"
        >
          <i className="fa-solid fa-chevron-left text-sm" />
        </button>
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            Step 4 of 4
          </p>
          <h2 className="text-lg font-bold leading-tight">Preview</h2>
        </div>
      </div>

      {/* Device/Output mock-up */}
      {outputType === 'mobile-app' ? (
        <div
          aria-label="Design preview"
          className="relative mx-auto w-[220px] rounded-[32px] border-4 border-white/20 bg-white overflow-hidden shadow-xl shrink-0"
          style={{ height: 390 }}
        >
          <div className="w-full h-7 flex items-center px-4 justify-between" style={{ backgroundColor: primaryColor }}>
            <span className="text-[8px] font-bold text-white/80">9:41</span>
            <i className="fa-solid fa-wifi text-[8px] text-white/80" />
          </div>
          <div className="w-full px-4 py-3" style={{ backgroundColor: primaryColor }}>
            <p className="font-bold text-white text-[13px] truncate" style={{ fontFamily: headingFont }}>
              {mood.charAt(0).toUpperCase() + mood.slice(1)} {industry}
            </p>
          </div>
          <div className="p-3 space-y-2" style={{ backgroundColor: '#f8f8f8', fontFamily: bodyFont }}>
            {[accentColor, primaryColor, accentColor].map((color, i) => (
              <div key={i} className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: '#fff', borderLeft: `4px solid ${color}` }}>
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <div className="h-2 rounded mb-1" style={{ backgroundColor: '#e0e0e0', width: `${60 + i * 10}%` }} />
                  <div className="h-1.5 rounded" style={{ backgroundColor: '#e0e0e0', width: `${40 + i * 8}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 w-full h-10 flex items-center justify-around px-4 border-t border-white/10" style={{ backgroundColor: primaryColor }}>
            {['fa-house', 'fa-magnifying-glass', 'fa-bell', 'fa-user'].map((icon) => (
              <i key={icon} className={`fa-solid ${icon} text-white/70 text-[11px]`} />
            ))}
          </div>
        </div>
      ) : (
        <div aria-label="Design preview" className="mx-auto w-full max-w-[320px] rounded-2xl border border-white/15 overflow-hidden shadow-xl shrink-0 bg-white">
          <div className="h-9 px-3 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
            <span className="text-[11px] text-white/85 font-semibold" style={{ fontFamily: headingFont }}>
              {outputType === 'dashboard' ? 'Analytics Workspace' : outputType === 'landing-page' ? 'Launch Campaign' : 'Responsive Site'}
            </span>
            <span className="text-[10px] text-white/70 uppercase">{outputLabel}</span>
          </div>
          <div className="p-3 grid gap-2" style={{ backgroundColor: '#f8fafc', fontFamily: bodyFont }}>
            <div className="rounded-lg p-3" style={{ backgroundColor: '#ffffff', borderTop: `3px solid ${accentColor}` }}>
              <div className="h-2 rounded mb-2" style={{ width: '72%', backgroundColor: '#dbe2ea' }} />
              <div className="h-1.5 rounded" style={{ width: '48%', backgroundColor: '#e2e8f0' }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2.5" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                <div className="h-1.5 rounded mb-1.5" style={{ width: '65%', backgroundColor: '#dbe2ea' }} />
                <div className="h-5 rounded" style={{ backgroundColor: `${primaryColor}22` }} />
              </div>
              <div className="rounded-lg p-2.5" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                <div className="h-1.5 rounded mb-1.5" style={{ width: '58%', backgroundColor: '#dbe2ea' }} />
                <div className="h-5 rounded" style={{ backgroundColor: `${accentColor}22` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Palette row */}
      <div className="mt-6 mb-2">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
          Color palette
        </p>
        <div className="flex gap-2">
          {[primaryColor, accentColor, '#ffffff', '#111111'].map((hex) => (
            <div
              key={hex}
              title={hex}
              className="w-10 h-10 rounded-xl border border-white/10 shrink-0"
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1">
          Typography
        </p>
        <p className="text-sm text-white/70">
          <span className="font-semibold text-white" style={{ fontFamily: headingFont }}>
            {headingFont}
          </span>{' '}
          / <span style={{ fontFamily: bodyFont }}>{bodyFont}</span>
        </p>
      </div>

      {/* ── Summary review (Issue #215) ─────────────────────────────────────── */}
      <div
        aria-label="Design summary"
        className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] divide-y divide-white/10"
      >
        <p className="px-4 pt-3 pb-2 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
          Your choices
        </p>

        {/* Mood */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-white/50 flex items-center gap-2">
            <i className="fa-solid fa-face-smile w-3" />
            Mood
          </span>
          <span className="text-xs font-medium text-white/80 capitalize">{mood}</span>
        </div>

        {/* Industry */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-white/50 flex items-center gap-2">
            <i className="fa-solid fa-building w-3" />
            Industry
          </span>
          <span className="text-xs font-medium text-white/80 capitalize">{industry}</span>
        </div>

        {/* Component styles (if present) */}
        {snapshot.components && (
          <>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-white/50 flex items-center gap-2">
                <i className="fa-solid fa-rectangle-list w-3" />
                Button
              </span>
              <span className="text-xs font-medium text-white/80 capitalize">
                {snapshot.components.buttonStyle}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-white/50 flex items-center gap-2">
                <i className="fa-solid fa-layer-group w-3" />
                Card
              </span>
              <span className="text-xs font-medium text-white/80 capitalize">
                {snapshot.components.cardStyle}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-white/50 flex items-center gap-2">
                <i className="fa-solid fa-bars w-3" />
                Navigation
              </span>
              <span className="text-xs font-medium text-white/80 capitalize">
                {snapshot.components.navStyle.replace('-', ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-white/50 flex items-center gap-2">
                <i className="fa-solid fa-box w-3" />
                Container
              </span>
              <span className="text-xs font-medium text-white/80 capitalize">
                {snapshot.components.containerStyle}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-white/50 flex items-center gap-2">
                <i className="fa-solid fa-font w-3" />
                Typography
              </span>
              <span className="text-xs font-medium text-white/80 capitalize">
                {snapshot.components.typographyStyle}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-white/50 flex items-center gap-2">
                <i className="fa-solid fa-layer-group w-3" />
                Output
              </span>
              <span className="text-xs font-medium text-white/80 capitalize">
                {outputLabel}
              </span>
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onConfirm}
        aria-label="Use this design"
        className="mt-auto w-full py-4 rounded-2xl font-semibold text-base
                   bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                   active:scale-[0.98] transition-transform duration-100"
      >
        Use this design
      </button>
    </div>
  );
}
