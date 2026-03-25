/**
 * PreviewScaffold – renders a live colour/typography preview for the
 * currently selected style recommendation.
 */

import type { StyleRecommendation } from '../types';

interface PreviewScaffoldProps {
  recommendation: StyleRecommendation | null;
}

export function PreviewScaffold({ recommendation }: PreviewScaffoldProps) {
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

  return (
    <div
      aria-label={`Preview of ${name}`}
      className="rounded-xl overflow-hidden shadow-xl border border-white/10"
      style={{ backgroundColor: surface, color: text, fontFamily: typography.bodyFont }}
    >
      {/* Mock header bar */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ backgroundColor: primary }}
      >
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
        </div>
        <span
          className="text-white text-xs font-semibold flex-1 text-center"
          style={{ fontFamily: typography.headingFont }}
        >
          {name}
        </span>
      </div>

      {/* Mock content */}
      <div className="p-4 space-y-3">
        <h3
          className="text-sm font-bold"
          style={{ fontFamily: typography.headingFont, color: text }}
        >
          Heading preview
        </h3>
        <p className="text-[11px] leading-relaxed opacity-70">
          Body copy at {typography.baseSizePx}px / {typography.lineHeight} line-height.
          This text demonstrates how content reads with your chosen style.
        </p>

        {/* Colour chips */}
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

        {/* Mock CTA button */}
        <div>
          <span
            className="inline-block px-3 py-1.5 rounded text-xs font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Call to action
          </span>
        </div>
      </div>
    </div>
  );
}
