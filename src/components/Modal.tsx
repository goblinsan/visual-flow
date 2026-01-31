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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${sizeMap[size]} mx-4 rounded-xl shadow-2xl p-6 space-y-4 border transition-all animate-slide-up
        ${variant === 'light' ? 'bg-white border-gray-200 text-gray-800' : 'bg-slate-900 border-slate-600 text-slate-100'}
      `}>
        <div className="flex items-center justify-between">
          <h2 className={`text-base font-semibold flex items-center gap-2 ${variant==='light' ? 'text-gray-800' : 'text-slate-100'}`}>
            <i className={`fa-solid ${title.includes('About') ? 'fa-info-circle text-blue-500' : 'fa-keyboard text-purple-500'}`} />
            {title}
          </h2>
          <button onClick={onClose} className={`w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${variant==='dark' ? 'hover:bg-slate-800 hover:text-slate-300' : ''}`}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          {children}
        </div>
        <div className="flex justify-end pt-2 gap-2">
          {footer}
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5
              ${variant==='light' ? 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700' : 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'}`}
          >
            <i className="fa-solid fa-check" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
