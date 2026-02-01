import React, { useState } from 'react';
import type { TextSpan } from '../layout-schema';

export interface TextEditToolbarProps {
  /** Is the toolbar visible (editing mode active) */
  visible: boolean;
  /** Position relative to canvas wrapper */
  anchorPosition: { x: number; y: number };
  /** Current format at cursor/selection */
  currentFormat?: Partial<TextSpan>;
  /** Has text selected */
  hasSelection: boolean;
  /** Apply format to selection */
  onApplyFormat: (format: Partial<TextSpan>) => void;
}

const COLORS = [
  { color: '#000000', name: 'Black' },
  { color: '#374151', name: 'Gray 700' },
  { color: '#EF4444', name: 'Red' },
  { color: '#F97316', name: 'Orange' },
  { color: '#EAB308', name: 'Yellow' },
  { color: '#22C55E', name: 'Green' },
  { color: '#3B82F6', name: 'Blue' },
  { color: '#8B5CF6', name: 'Purple' },
  { color: '#EC4899', name: 'Pink' },
];

export const TextEditToolbar: React.FC<TextEditToolbarProps> = ({
  visible,
  anchorPosition,
  currentFormat,
  hasSelection,
  onApplyFormat,
}) => {
  const [showColors, setShowColors] = useState(false);
  
  if (!visible) return null;
  
  const isBold = currentFormat?.fontWeight === 'bold' || currentFormat?.fontWeight === '700' || Number(currentFormat?.fontWeight) >= 600;
  const isItalic = currentFormat?.fontStyle === 'italic';
  const currentColor = currentFormat?.color || '#000000';
  
  return (
    <div
      className="absolute bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1.5 flex items-center gap-1 z-[1001]"
      style={{
        left: anchorPosition.x,
        top: anchorPosition.y - 44,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
    >
      {/* Format hint */}
      <span className="text-[10px] text-gray-400 px-1 border-r border-gray-200 mr-1">
        {hasSelection ? 'Format:' : 'Select text'}
      </span>
      
      {/* Bold */}
      <button
        onClick={() => hasSelection && onApplyFormat({ fontWeight: isBold ? 'normal' : 'bold' })}
        disabled={!hasSelection}
        className={`w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-colors ${
          !hasSelection ? 'text-gray-300 cursor-not-allowed' :
          isBold ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
        }`}
        title="Bold (Ctrl+B)"
      >
        B
      </button>
      
      {/* Italic */}
      <button
        onClick={() => hasSelection && onApplyFormat({ fontStyle: isItalic ? 'normal' : 'italic' })}
        disabled={!hasSelection}
        className={`w-7 h-7 rounded flex items-center justify-center text-sm italic transition-colors ${
          !hasSelection ? 'text-gray-300 cursor-not-allowed' :
          isItalic ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
        }`}
        title="Italic (Ctrl+I)"
      >
        I
      </button>
      
      <div className="w-px h-5 bg-gray-200 mx-0.5" />
      
      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => hasSelection && setShowColors(!showColors)}
          disabled={!hasSelection}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
            !hasSelection ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'
          }`}
          title="Text Color"
        >
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium" style={{ color: currentColor }}>A</span>
            <div 
              className="w-4 h-1 rounded-sm -mt-0.5"
              style={{ backgroundColor: currentColor }}
            />
          </div>
        </button>
        
        {showColors && hasSelection && (
          <div 
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 24px)', gap: '8px', marginBottom: '8px' }}>
              {COLORS.map(({ color, name }) => (
                <button
                  key={color}
                  onClick={() => {
                    onApplyFormat({ color });
                    setShowColors(false);
                  }}
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    backgroundColor: color,
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title={name}
                />
              ))}
            </div>
            {/* Custom color picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
              <input
                type="color"
                defaultValue={currentColor}
                onChange={(e) => {
                  onApplyFormat({ color: e.target.value });
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  padding: 0,
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title="Custom color"
              />
              <span style={{ fontSize: '10px', color: '#6b7280' }}>Custom</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Keyboard hints */}
      <div className="border-l border-gray-200 pl-2 ml-1">
        <span className="text-[9px] text-gray-400">
          ⌘B ⌘I
        </span>
      </div>
    </div>
  );
};
