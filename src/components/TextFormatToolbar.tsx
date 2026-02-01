import React, { useState, useRef } from 'react';
import type { TextSpan } from '../layout-schema';

export interface TextFormatToolbarProps {
  /** Current selection exists */
  hasSelection: boolean;
  /** Position of the toolbar (screen coordinates) */
  position: { x: number; y: number };
  /** Current format at selection (for toggle states) */
  currentFormat?: Partial<TextSpan>;
  /** Apply format to selection */
  onApplyFormat: (format: Partial<TextSpan>) => void;
  /** Recent colors from the palette */
  recentColors?: string[];
}

const COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF',
];

const WEIGHTS: { label: string; value: TextSpan['fontWeight'] }[] = [
  { label: 'Light', value: '300' },
  { label: 'Normal', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi', value: '600' },
  { label: 'Bold', value: '700' },
];

export const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({
  hasSelection,
  position,
  currentFormat,
  onApplyFormat,
  recentColors = [],
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#000000');
  
  if (!hasSelection) return null;
  
  const isBold = currentFormat?.fontWeight === 'bold' || currentFormat?.fontWeight === '700' || Number(currentFormat?.fontWeight) >= 600;
  const isItalic = currentFormat?.fontStyle === 'italic';
  
  const handleBold = () => {
    onApplyFormat({ fontWeight: isBold ? 'normal' : 'bold' });
  };
  
  const handleItalic = () => {
    onApplyFormat({ fontStyle: isItalic ? 'normal' : 'italic' });
  };
  
  const handleColor = (color: string) => {
    onApplyFormat({ color });
    setShowColorPicker(false);
  };
  
  const handleWeight = (weight: TextSpan['fontWeight']) => {
    onApplyFormat({ fontWeight: weight });
  };
  
  // Position adjustments to keep toolbar in viewport
  const adjustedX = Math.max(10, Math.min(position.x - 100, window.innerWidth - 220));
  const adjustedY = Math.max(10, position.y - 50);
  
  return (
    <div
      ref={toolbarRef}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 p-1.5 flex items-center gap-1 z-[2000]"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      {/* Bold */}
      <button
        onClick={handleBold}
        className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-colors ${
          isBold ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
        }`}
        title="Bold"
      >
        B
      </button>
      
      {/* Italic */}
      <button
        onClick={handleItalic}
        className={`w-8 h-8 rounded flex items-center justify-center text-sm italic transition-colors ${
          isItalic ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
        }`}
        title="Italic"
      >
        I
      </button>
      
      <div className="w-px h-6 bg-gray-200 mx-1" />
      
      {/* Font Weight Dropdown */}
      <select
        value={currentFormat?.fontWeight || '400'}
        onChange={(e) => handleWeight(e.target.value)}
        className="h-8 px-1.5 rounded border border-gray-200 text-xs hover:border-gray-300 focus:outline-none focus:border-blue-400"
        title="Font Weight"
      >
        {WEIGHTS.map((w) => (
          <option key={w.value} value={w.value}>{w.label}</option>
        ))}
      </select>
      
      <div className="w-px h-6 bg-gray-200 mx-1" />
      
      {/* Color Picker */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Text Color"
        >
          <div 
            className="w-5 h-5 rounded border border-gray-300"
            style={{ backgroundColor: currentFormat?.color || '#000000' }}
          />
        </button>
        
        {showColorPicker && (
          <div 
            className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-1 mb-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColor(color)}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            
            {recentColors.length > 0 && (
              <>
                <div className="text-xs text-gray-500 mb-1">Recent</div>
                <div className="flex gap-1 mb-2">
                  {recentColors.slice(0, 4).map((color, idx) => (
                    <button
                      key={`recent-${idx}`}
                      onClick={() => handleColor(color)}
                      className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </>
            )}
            
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-6 h-6 rounded border-0 cursor-pointer"
              />
              <button
                onClick={() => handleColor(customColor)}
                className="flex-1 h-6 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
