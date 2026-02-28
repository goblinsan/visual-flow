import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Popular Google Fonts - curated list with categories
const GOOGLE_FONTS = [
  // Sans-serif
  { name: 'Inter', category: 'sans-serif', popular: true },
  { name: 'Roboto', category: 'sans-serif', popular: true },
  { name: 'Open Sans', category: 'sans-serif', popular: true },
  { name: 'Lato', category: 'sans-serif', popular: true },
  { name: 'Montserrat', category: 'sans-serif', popular: true },
  { name: 'Poppins', category: 'sans-serif', popular: true },
  { name: 'Nunito', category: 'sans-serif', popular: true },
  { name: 'Raleway', category: 'sans-serif', popular: true },
  { name: 'Work Sans', category: 'sans-serif', popular: true },
  { name: 'Ubuntu', category: 'sans-serif', popular: true },
  { name: 'Rubik', category: 'sans-serif', popular: true },
  { name: 'DM Sans', category: 'sans-serif', popular: true },
  { name: 'Manrope', category: 'sans-serif' },
  { name: 'Space Grotesk', category: 'sans-serif' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif' },
  { name: 'Outfit', category: 'sans-serif' },
  { name: 'Figtree', category: 'sans-serif' },
  { name: 'Sora', category: 'sans-serif' },
  { name: 'Be Vietnam Pro', category: 'sans-serif' },
  { name: 'Lexend', category: 'sans-serif' },
  
  // Serif
  { name: 'Playfair Display', category: 'serif', popular: true },
  { name: 'Merriweather', category: 'serif', popular: true },
  { name: 'Lora', category: 'serif', popular: true },
  { name: 'Libre Baskerville', category: 'serif' },
  { name: 'Source Serif Pro', category: 'serif' },
  { name: 'Crimson Text', category: 'serif' },
  { name: 'DM Serif Display', category: 'serif' },
  { name: 'Cormorant Garamond', category: 'serif' },
  { name: 'Bitter', category: 'serif' },
  { name: 'Fraunces', category: 'serif' },
  
  // Display
  { name: 'Oswald', category: 'display', popular: true },
  { name: 'Bebas Neue', category: 'display' },
  { name: 'Anton', category: 'display' },
  { name: 'Abril Fatface', category: 'display' },
  { name: 'Righteous', category: 'display' },
  { name: 'Passion One', category: 'display' },
  { name: 'Black Ops One', category: 'display' },
  { name: 'Bungee', category: 'display' },
  
  // Handwriting
  { name: 'Dancing Script', category: 'handwriting', popular: true },
  { name: 'Pacifico', category: 'handwriting' },
  { name: 'Caveat', category: 'handwriting' },
  { name: 'Great Vibes', category: 'handwriting' },
  { name: 'Sacramento', category: 'handwriting' },
  { name: 'Satisfy', category: 'handwriting' },
  { name: 'Kaushan Script', category: 'handwriting' },
  
  // Monospace
  { name: 'Fira Code', category: 'monospace', popular: true },
  { name: 'JetBrains Mono', category: 'monospace', popular: true },
  { name: 'Source Code Pro', category: 'monospace' },
  { name: 'Roboto Mono', category: 'monospace' },
  { name: 'IBM Plex Mono', category: 'monospace' },
  { name: 'Space Mono', category: 'monospace' },
  { name: 'Inconsolata', category: 'monospace' },
];

// System fonts (no loading required)
const SYSTEM_FONTS = [
  { name: 'System Default', value: '', category: 'system' },
  { name: 'Arial', value: 'Arial, sans-serif', category: 'system' },
  { name: 'Helvetica', value: 'Helvetica, sans-serif', category: 'system' },
  { name: 'Times New Roman', value: '"Times New Roman", serif', category: 'system' },
  { name: 'Georgia', value: 'Georgia, serif', category: 'system' },
  { name: 'Courier New', value: '"Courier New", monospace', category: 'system' },
  { name: 'Verdana', value: 'Verdana, sans-serif', category: 'system' },
];

import { loadGoogleFont } from '../utils/googleFonts';

export interface GoogleFontPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

export const GoogleFontPicker: React.FC<GoogleFontPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Load current font
  useEffect(() => {
    if (value && !value.includes(',')) {
      loadGoogleFont(value);
    }
  }, [value]);
  
  // Calculate if dropdown should open upward
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 350; // approximate height
      setOpenUpward(spaceBelow < dropdownHeight && rect.top > dropdownHeight);
    }
  }, [isOpen]);
  
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    
    // Use setTimeout to avoid immediate trigger from the open click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Filter fonts
  const filteredFonts = useMemo(() => {
    let fonts = GOOGLE_FONTS;
    
    if (category !== 'all') {
      fonts = fonts.filter(f => f.category === category);
    }
    
    if (search) {
      const lower = search.toLowerCase();
      fonts = fonts.filter(f => f.name.toLowerCase().includes(lower));
    }
    
    return fonts;
  }, [category, search]);
  
  // Get display name for current value
  const displayName = useMemo(() => {
    if (!value) return 'System Default';
    const system = SYSTEM_FONTS.find(f => f.value === value);
    if (system) return system.name;
    const google = GOOGLE_FONTS.find(f => f.name === value);
    if (google) return google.name;
    return value;
  }, [value]);
  
  const handleSelect = (fontName: string, fontValue?: string) => {
    const val = fontValue !== undefined ? fontValue : fontName;
    if (!fontValue && fontName) {
      loadGoogleFont(fontName);
    }
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };
  
  // Pre-load fonts as they appear in dropdown for preview
  const handleMouseEnter = useCallback((fontName: string) => {
    loadGoogleFont(fontName);
  }, []);
  
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'sans-serif', label: 'Sans Serif' },
    { id: 'serif', label: 'Serif' },
    { id: 'display', label: 'Display' },
    { id: 'handwriting', label: 'Handwriting' },
    { id: 'monospace', label: 'Monospace' },
  ];
  
  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-gray-200 rounded-md px-2.5 py-1.5 text-[11px] bg-white hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        style={{ fontFamily: value || 'inherit' }}
      >
        <span className="truncate">{displayName}</span>
        <i className={`fa-solid fa-chevron-down text-gray-400 text-[9px] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute z-[100] left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: '320px' }}
        >
          {/* Header with search and close button */}
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
              <input
                type="text"
                placeholder="Search fonts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-md text-[11px] focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setSearch(''); }}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
          
          {/* Category tabs */}
          <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                  category === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          {/* Font list */}
          <div className="max-h-64 overflow-y-auto">
            {/* System fonts */}
            {category === 'all' && !search && (
              <>
                <div className="px-2 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                  System Fonts
                </div>
                {SYSTEM_FONTS.map(font => (
                  <button
                    key={font.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(font.name, font.value);
                    }}
                    className={`w-full text-left px-3 py-2 text-[12px] hover:bg-blue-50 transition-colors ${
                      value === font.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                    style={{ fontFamily: font.value || 'inherit' }}
                  >
                    {font.name}
                  </button>
                ))}
              </>
            )}
            
            {/* Google fonts */}
            {category === 'all' && !search && (
              <div className="px-2 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                Google Fonts
              </div>
            )}
            {filteredFonts.map(font => (
              <button
                key={font.name}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(font.name);
                }}
                onMouseEnter={() => handleMouseEnter(font.name)}
                className={`w-full text-left px-3 py-2 text-[12px] hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                  value === font.name ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
                style={{ fontFamily: `"${font.name}", ${font.category}` }}
              >
                <span className="flex-1">{font.name}</span>
                {font.popular && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Popular</span>
                )}
              </button>
            ))}
            
            {filteredFonts.length === 0 && (
              <div className="px-3 py-4 text-[11px] text-gray-400 text-center">
                No fonts found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleFontPicker;
