import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  value,
  options,
  onChange,
  placeholder,
  className = '',
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedMenuHeight = Math.min(240, options.length * 32);
      setOpenUp(spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow);
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, options.length]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-gray-200 rounded-md px-2.5 py-1.5 text-[11px] bg-white hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
      >
        <span className="truncate">{selectedOption?.label || placeholder || value}</span>
        <i className={`fa-solid fa-chevron-down text-gray-400 text-[9px] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-[100] left-0 right-0 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 transition-colors flex items-center justify-between group ${
                value === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              {renderOption ? renderOption(option) : <span>{option.label}</span>}
              {value === option.value && <i className="fa-solid fa-check text-blue-500 text-[9px]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
