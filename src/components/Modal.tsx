import React from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'light' | 'dark';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl'
};

export function Modal({ open, onClose, title, size='md', children, footer, variant='light' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full ${sizeMap[size]} mx-4 rounded-lg shadow-xl p-5 space-y-4 border transition-colors
        ${variant === 'light' ? 'bg-white border-gray-200 text-gray-800' : 'bg-slate-900 border-slate-600 text-slate-100'}
      `}>
        <div className="flex items-center justify-between">
          <h2 className={`text-sm font-semibold tracking-wide uppercase ${variant==='light' ? 'text-gray-600' : 'opacity-80'}`}>{title}</h2>
          <button onClick={onClose} className={`text-xs rounded px-2 py-1 hover:bg-gray-100 ${variant==='dark' ? 'hover:bg-slate-800' : ''}`}>✕</button>
        </div>
        <div className="text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          {children}
        </div>
        <div className="flex justify-end pt-2 gap-2">
          {footer}
          <button
            onClick={onClose}
            className={`px-3 py-1 rounded border text-xs
              ${variant==='light' ? 'border-gray-300 bg-gray-100 hover:bg-gray-200' : 'border-slate-600 bg-slate-800 text-slate-100'}`}
          >Close</button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
