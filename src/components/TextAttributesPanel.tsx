import React from 'react';
import { parseColor } from '../utils/color';
import { GoogleFontPicker } from './GoogleFontPicker';

export interface TextNode {
  id: string;
  type: 'text';
  text: string;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  color?: string;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  opacity?: number;
}

export interface TextAttributesPanelProps {
  textNode: TextNode;
  updateNode: (patch: Partial<TextNode>) => void;
  beginRecentSession: (c?: string) => void;
  previewRecent: (c: string) => void;
  commitRecent: (c?: string) => void;
  pushRecent: (c: string) => void;
  recentColors: string[];
}

const FONT_WEIGHTS = [
  { label: 'Thin (100)', value: '100' },
  { label: 'Extra Light (200)', value: '200' },
  { label: 'Light (300)', value: '300' },
  { label: 'Normal (400)', value: '400' },
  { label: 'Medium (500)', value: '500' },
  { label: 'Semi Bold (600)', value: '600' },
  { label: 'Bold (700)', value: '700' },
  { label: 'Extra Bold (800)', value: '800' },
  { label: 'Black (900)', value: '900' },
];

export const TextAttributesPanel: React.FC<TextAttributesPanelProps> = ({
  textNode,
  updateNode,
  beginRecentSession,
  previewRecent,
  commitRecent,
  pushRecent,
  recentColors,
}) => {
  const { text, color, fontFamily, fontSize, fontWeight, fontStyle, align, variant, opacity } = textNode;

  // Determine default font size based on variant
  const getDefaultFontSize = () => {
    switch (variant) {
      case 'h1': return 28;
      case 'h2': return 22;
      case 'h3': return 18;
      case 'caption': return 12;
      default: return 14;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-pink-100 flex items-center justify-center">
          <i className="fa-solid fa-font text-pink-600 text-xs" />
        </div>
        <span className="text-xs font-semibold text-gray-700">Text</span>
      </div>

      {/* Text Content */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
          <i className="fa-solid fa-align-left text-gray-400 text-[9px]" />
          Content
        </span>
        <textarea
          value={text}
          onChange={e => updateNode({ text: e.target.value })}
          rows={3}
          className="border border-gray-200 rounded-md px-2.5 py-2 text-[11px] resize-none bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          placeholder="Enter text..."
        />
      </label>

      {/* Color */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-gray-500">Color</span>
        <label className="relative" title="Text color">
          <input
            type="color"
            value={color || '#111827'}
            onPointerDown={() => beginRecentSession(color || '#111827')}
            onInput={e => { const val = (e.target as HTMLInputElement).value; updateNode({ color: val }); previewRecent(val); }}
            onChange={e => { const val = e.target.value; previewRecent(val); }}
            onBlur={e => { const val = e.target.value; if (parseColor(val)) commitRecent(val); }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="w-9 h-9 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors">
            <div className="w-7 h-7 rounded" style={{ background: color || '#111827' }} />
          </div>
        </label>
        <input
          type="text"
          value={color || '#111827'}
          onChange={e => updateNode({ color: e.target.value })}
          onBlur={e => { if (parseColor(e.target.value)) pushRecent(e.target.value); }}
          className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-[11px] font-mono bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
      </div>

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
            <i className="fa-solid fa-clock-rotate-left text-gray-400 text-[9px]" />
            Recent
          </div>
          <div className="flex flex-wrap gap-1">
            {recentColors.map(col => {
              const hasAlpha = /#[0-9a-fA-F]{8}$/.test(col);
              return (
                <button
                  key={col}
                  type="button"
                  title={col}
                  onClick={() => { updateNode({ color: col }); pushRecent(col); }}
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
      )}

      {/* Font Family - Google Fonts Picker */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
          <i className="fa-solid fa-text-height text-gray-400 text-[9px]" />
          Font Family
        </span>
        <GoogleFontPicker
          value={fontFamily || ''}
          onChange={(val) => updateNode({ fontFamily: val || undefined })}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {/* Font Size */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-text-width text-gray-400 text-[9px]" />
            Size
          </span>
          <input
            type="number"
            min={8}
            max={200}
            value={fontSize ?? getDefaultFontSize()}
            onChange={e => updateNode({ fontSize: Math.max(8, Number(e.target.value) || 14) })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
        </label>

        {/* Variant */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-heading text-gray-400 text-[9px]" />
            Variant
          </span>
          <select
            value={variant || 'body'}
            onChange={e => updateNode({ variant: e.target.value as TextNode['variant'] })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          >
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="body">Body</option>
            <option value="caption">Caption</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Font Weight */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-bold text-gray-400 text-[9px]" />
            Weight
          </span>
          <select
            value={fontWeight || '400'}
            onChange={e => updateNode({ fontWeight: e.target.value as TextNode['fontWeight'] })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          >
            {FONT_WEIGHTS.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </label>

        {/* Font Style */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-italic text-gray-400 text-[9px]" />
            Style
          </span>
          <select
            value={fontStyle || 'normal'}
            onChange={e => updateNode({ fontStyle: e.target.value as TextNode['fontStyle'] })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          >
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </label>
      </div>

      {/* Alignment */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
          <i className="fa-solid fa-align-justify text-gray-400 text-[9px]" />
          Alignment
        </span>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(a => (
            <button
              key={a}
              type="button"
              onClick={() => updateNode({ align: a })}
              className={`flex-1 px-2 py-1.5 text-[11px] border rounded-md transition-colors flex items-center justify-center ${align === a ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
            >
              <i className={`fa-solid ${a === 'left' ? 'fa-align-left' : a === 'right' ? 'fa-align-right' : 'fa-align-center'}`} />
            </button>
          ))}
        </div>
      </label>

      {/* Opacity */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
          <i className="fa-solid fa-eye text-gray-400 text-[9px]" />
          Opacity ({(opacity ?? 1).toFixed(2)})
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={opacity ?? 1}
          onChange={e => updateNode({ opacity: Number(e.target.value) })}
          className="accent-blue-500"
        />
      </label>
    </div>
  );
};

export default TextAttributesPanel;
