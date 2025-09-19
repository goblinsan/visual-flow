import React from 'react';

export interface RecentColorsPanelProps {
  recentColors: string[];
  onPick: (color: string) => void;
  label?: string;
  className?: string;
}

export const RecentColorsPanel: React.FC<RecentColorsPanelProps> = ({ recentColors, onPick, label = 'Recent', className }) => {
  if (!recentColors.length) return null;
  return (
    <div className={"mt-3 " + (className || '')}>
      <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {recentColors.map(col => {
          const hasAlpha = /#[0-9a-fA-F]{8}$/.test(col);
          return (
            <button
              key={col}
              type="button"
              title={col}
              onClick={() => onPick(col)}
              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center relative group p-0"
            >
              <span className="w-5 h-5 rounded checkerboard overflow-hidden relative">
                <span className="absolute inset-0" style={{ background: col }} />
                {hasAlpha && <span className="absolute bottom-0 right-0 px-0.5 rounded-tl bg-black/40 text-[8px] text-white leading-none">α</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentColorsPanel;
