/**
 * StyleCard – displays a single style recommendation as a selectable card.
 */

import type { StyleRecommendation } from '../types';

interface StyleCardProps {
  recommendation: StyleRecommendation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function StyleCard({ recommendation, isSelected, onSelect }: StyleCardProps) {
  const { id, name, description, swatches, typography, confidence } = recommendation;

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={isSelected}
      className={`group relative w-full text-left rounded-xl border transition-all duration-200 p-4
        focus:outline-none focus:ring-2 focus:ring-cyan-400/50
        ${
          isSelected
            ? 'bg-white/15 border-cyan-400/70 ring-1 ring-cyan-400/40 shadow-lg'
            : 'bg-white/[0.06] border-white/10 hover:bg-white/[0.1] hover:border-white/25'
        }`}
    >
      {/* Colour swatches preview */}
      <div className="flex gap-1 mb-3 h-6 rounded-md overflow-hidden">
        {swatches.map((swatch) => (
          <div
            key={swatch.role}
            title={swatch.role}
            style={{ backgroundColor: swatch.hex }}
            className="flex-1 h-full"
          />
        ))}
      </div>

      {/* Name + confidence */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span
          className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-white/80'}`}
        >
          {name}
        </span>
        <span className="text-[10px] text-white/40 flex-shrink-0">
          {Math.round(confidence * 100)}% match
        </span>
      </div>

      <p className="text-[11px] text-white/50 leading-relaxed mb-3">{description}</p>

      {/* Typography preview */}
      <div className="text-[10px] text-white/30 flex items-center gap-1.5">
        <i className="fa-solid fa-font text-[8px]" />
        <span>
          {typography.headingFont} / {typography.bodyFont}
        </span>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center">
            <i className="fa-solid fa-check text-slate-900 text-[9px]" />
          </div>
        </div>
      )}
    </button>
  );
}
