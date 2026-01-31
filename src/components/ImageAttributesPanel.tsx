import React, { useRef, useState } from 'react';

export interface ImageNode {
  id: string;
  type: 'image';
  src: string;
  alt?: string;
  radius?: number;
  objectFit?: 'cover' | 'contain';
  preserveAspect?: boolean;
  opacity?: number;
}

export interface ImageAttributesPanelProps {
  imageNode: ImageNode;
  updateNode: (patch: Partial<ImageNode>) => void;
}

export const ImageAttributesPanel: React.FC<ImageAttributesPanelProps> = ({
  imageNode,
  updateNode,
}) => {
  const { src, alt, radius, objectFit, preserveAspect, opacity } = imageNode;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState(src);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Create object URL for the selected file
    const url = URL.createObjectURL(file);
    updateNode({ src: url, alt: file.name });
    setUrlInput(url);
  };

  // Handle URL input
  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      updateNode({ src: urlInput.trim() });
      setShowUrlInput(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-cyan-100 flex items-center justify-center">
          <i className="fa-regular fa-image text-cyan-600 text-xs" />
        </div>
        <span className="text-xs font-semibold text-gray-700">Image</span>
      </div>

      {/* Image Preview */}
      <div className="border border-gray-200 rounded-lg p-2.5 bg-gray-50">
        <div className="w-full h-24 flex items-center justify-center bg-white rounded-md border border-gray-100 overflow-hidden">
          {src ? (
            <img
              src={src}
              alt={alt || 'Preview'}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-gray-400 text-xs flex flex-col items-center gap-1">
              <i className="fa-regular fa-image text-lg" />
              No image
            </span>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Source Options */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-2 py-2 text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
        >
          <i className="fa-solid fa-folder-open" />
          Choose File
        </button>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className={`flex-1 px-2 py-2 text-[11px] font-medium border rounded-md transition-colors flex items-center justify-center gap-1.5 ${showUrlInput ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <i className="fa-solid fa-link" />
          From URL
        </button>
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleUrlSubmit(); }}
            placeholder="https://example.com/image.jpg"
            className="flex-1 border border-gray-200 rounded-md px-2.5 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-3 py-1.5 text-[11px] font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Set
          </button>
        </div>
      )}

      {/* Current Source */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
          <i className="fa-solid fa-link text-gray-400 text-[9px]" />
          Source
        </span>
        <input
          type="text"
          value={src}
          onChange={e => { updateNode({ src: e.target.value }); setUrlInput(e.target.value); }}
          className="border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono truncate bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
      </label>

      {/* Alt Text */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
          <i className="fa-solid fa-comment-dots text-gray-400 text-[9px]" />
          Alt Text
        </span>
        <input
          type="text"
          value={alt || ''}
          onChange={e => updateNode({ alt: e.target.value })}
          placeholder="Describe the image..."
          className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {/* Object Fit */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-up-right-and-down-left-from-center text-gray-400 text-[9px]" />
            Fit
          </span>
          <select
            value={objectFit || 'contain'}
            onChange={e => updateNode({ objectFit: e.target.value as ImageNode['objectFit'] })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
          </select>
        </label>

        {/* Corner Radius */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
            <i className="fa-solid fa-vector-square text-gray-400 text-[9px]" />
            Radius
          </span>
          <input
            type="number"
            min={0}
            value={radius ?? 0}
            onChange={e => updateNode({ radius: Math.max(0, Number(e.target.value) || 0) })}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
        </label>
      </div>

      {/* Preserve Aspect */}
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={preserveAspect !== false}
          onChange={e => updateNode({ preserveAspect: e.target.checked })}
          className="h-4 w-4 rounded accent-blue-500"
        />
        <span className="text-gray-600 text-[11px] group-hover:text-gray-800 transition-colors">
          <i className="fa-solid fa-lock text-gray-400 text-[9px] mr-1" />
          Preserve Aspect Ratio
        </span>
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

export default ImageAttributesPanel;
