import React, { useState, useEffect } from 'react';

export interface GradientFill {
  type: 'linear' | 'radial';
  colors: string[];
  angle?: number;
}

export interface GradientPickerProps {
  gradient: GradientFill | undefined;
  onGradientChange: (gradient: GradientFill | undefined) => void;
  solidColor: string | undefined;
  onSolidColorChange: (color: string | undefined) => void;
}

const PRESET_GRADIENTS: GradientFill[] = [
  { type: 'linear', colors: ['#667eea', '#764ba2'], angle: 135 },
  { type: 'linear', colors: ['#f093fb', '#f5576c'], angle: 135 },
  { type: 'linear', colors: ['#4facfe', '#00f2fe'], angle: 135 },
  { type: 'linear', colors: ['#43e97b', '#38f9d7'], angle: 135 },
  { type: 'linear', colors: ['#fa709a', '#fee140'], angle: 135 },
  { type: 'linear', colors: ['#a8edea', '#fed6e3'], angle: 135 },
  { type: 'linear', colors: ['#ff9a9e', '#fecfef'], angle: 135 },
  { type: 'linear', colors: ['#667eea', '#f5576c'], angle: 90 },
  { type: 'radial', colors: ['#667eea', '#764ba2'] },
  { type: 'radial', colors: ['#4facfe', '#00f2fe'] },
];

export function gradientToCSS(gradient: GradientFill): string {
  const { type, colors, angle } = gradient;
  if (type === 'linear') {
    return `linear-gradient(${angle ?? 0}deg, ${colors.join(', ')})`;
  }
  return `radial-gradient(circle, ${colors.join(', ')})`;
}

export const GradientPicker: React.FC<GradientPickerProps> = ({
  gradient,
  onGradientChange,
  solidColor,
  onSolidColorChange,
}) => {
  const [mode, setMode] = useState<'solid' | 'gradient'>(gradient ? 'gradient' : 'solid');
  const [localGradient, setLocalGradient] = useState<GradientFill>(
    gradient || { type: 'linear', colors: ['#667eea', '#764ba2'], angle: 135 }
  );

  useEffect(() => {
    if (gradient) {
      setMode('gradient');
      setLocalGradient(gradient);
    } else {
      setMode('solid');
    }
  }, [gradient]);

  const handleModeChange = (newMode: 'solid' | 'gradient') => {
    setMode(newMode);
    if (newMode === 'solid') {
      onGradientChange(undefined);
    } else {
      onGradientChange(localGradient);
    }
  };

  const updateGradient = (updates: Partial<GradientFill>) => {
    const newGradient = { ...localGradient, ...updates };
    setLocalGradient(newGradient);
    onGradientChange(newGradient);
  };

  const updateColor = (index: number, color: string) => {
    const newColors = [...localGradient.colors];
    newColors[index] = color;
    updateGradient({ colors: newColors });
  };

  return (
    <div className="space-y-2">
      {/* Mode Toggle */}
      <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => handleModeChange('solid')}
          className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors ${
            mode === 'solid' 
              ? 'bg-white shadow-sm text-gray-800' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fa-solid fa-fill mr-1" />
          Solid
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('gradient')}
          className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors ${
            mode === 'gradient' 
              ? 'bg-white shadow-sm text-gray-800' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fa-solid fa-paint-roller mr-1" />
          Gradient
        </button>
      </div>

      {mode === 'solid' && (
        <div className="flex items-center gap-2">
          <label className="relative" title="Fill color">
            <input
              type="color"
              value={solidColor || '#ffffff'}
              onChange={e => onSolidColorChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-9 h-9 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors">
              <div className="w-7 h-7 rounded checkerboard overflow-hidden">
                {solidColor !== undefined && (
                  <div className="w-full h-full" style={{ background: solidColor }} />
                )}
                {solidColor === undefined && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-[160%] h-[2px] bg-red-500 rotate-45" />
                  </div>
                )}
              </div>
            </div>
          </label>
          <input
            type="text"
            value={solidColor || ''}
            onChange={e => onSolidColorChange(e.target.value || undefined)}
            placeholder="#ffffff"
            className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-[11px] font-mono bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
        </div>
      )}

      {mode === 'gradient' && (
        <>
          {/* Gradient Preview */}
          <div 
            className="h-10 rounded-lg border border-gray-200 shadow-inner"
            style={{ background: gradientToCSS(localGradient) }}
          />

          {/* Gradient Type */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => updateGradient({ type: 'linear' })}
              className={`flex-1 px-2 py-1.5 text-[10px] border rounded-md transition-colors ${
                localGradient.type === 'linear' 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <i className="fa-solid fa-arrow-right-long mr-1" />
              Linear
            </button>
            <button
              type="button"
              onClick={() => updateGradient({ type: 'radial' })}
              className={`flex-1 px-2 py-1.5 text-[10px] border rounded-md transition-colors ${
                localGradient.type === 'radial' 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <i className="fa-regular fa-circle mr-1" />
              Radial
            </button>
          </div>

          {/* Color Stops */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-500">Start Color</span>
              <div className="flex items-center gap-1">
                <label className="relative">
                  <input
                    type="color"
                    value={localGradient.colors[0] || '#667eea'}
                    onChange={e => updateColor(0, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-7 h-7 rounded border border-gray-200 cursor-pointer" style={{ background: localGradient.colors[0] }} />
                </label>
                <input
                  type="text"
                  value={localGradient.colors[0]}
                  onChange={e => updateColor(0, e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-1.5 py-1 text-[10px] font-mono w-16"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-500">End Color</span>
              <div className="flex items-center gap-1">
                <label className="relative">
                  <input
                    type="color"
                    value={localGradient.colors[1] || '#764ba2'}
                    onChange={e => updateColor(1, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-7 h-7 rounded border border-gray-200 cursor-pointer" style={{ background: localGradient.colors[1] }} />
                </label>
                <input
                  type="text"
                  value={localGradient.colors[1]}
                  onChange={e => updateColor(1, e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-1.5 py-1 text-[10px] font-mono w-16"
                />
              </div>
            </label>
          </div>

          {/* Angle (for linear only) */}
          {localGradient.type === 'linear' && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-500 flex items-center justify-between">
                Angle
                <span className="font-mono">{localGradient.angle ?? 0}°</span>
              </span>
              <input
                type="range"
                min={0}
                max={360}
                step={15}
                value={localGradient.angle ?? 0}
                onChange={e => updateGradient({ angle: Number(e.target.value) })}
                className="accent-blue-500"
              />
            </label>
          )}

          {/* Preset Gradients */}
          <div>
            <span className="text-[10px] text-gray-500 mb-1 block">Presets</span>
            <div className="flex flex-wrap gap-1">
              {PRESET_GRADIENTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setLocalGradient(preset);
                    onGradientChange(preset);
                  }}
                  className="w-6 h-6 rounded-md border border-gray-200 hover:border-gray-400 transition-colors overflow-hidden"
                  style={{ background: gradientToCSS(preset) }}
                  title={`${preset.type} gradient`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GradientPicker;
