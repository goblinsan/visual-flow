/**
 * Export Dialog Component
 * 
 * Provides UI for exporting designs in various formats
 */

import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import type { LayoutSpec } from '../layout-schema';
import { exportToJSON } from '../export/canonicalExport';
import { exportToReact } from '../export/reactExporter';
import { extractDesignTokens, exportToStyleDictionary, exportToCSS } from '../export/designTokens';

export type ExportFormat = 'json' | 'react' | 'tokens-json' | 'tokens-css';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  spec: LayoutSpec;
}

export function ExportDialog({ isOpen, onClose, spec }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [componentName, setComponentName] = useState('DesignComponent');
  const [includeComments, setIncludeComments] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate export code based on selected format
  const exportCode = useMemo(() => {
    if (!spec?.root) {
      return '// No design loaded';
    }

    try {
      switch (format) {
        case 'json':
          return exportToJSON(spec, { pretty: true, includeMetadata: true });
        
        case 'react':
          return exportToReact(spec, {
            componentName,
            typescript: true,
            functional: true,
            comments: includeComments,
          });
        
        case 'tokens-json': {
          const tokens = extractDesignTokens(spec, { semantic: true, deduplicate: true });
          return exportToStyleDictionary(tokens);
        }
        
        case 'tokens-css': {
          const tokens = extractDesignTokens(spec, { semantic: true, deduplicate: true });
          return exportToCSS(tokens);
        }
        
        default:
          return '';
      }
    } catch (error) {
      console.error('Export error:', error);
      return `// Error generating export: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }, [format, spec, componentName, includeComments]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const extension = format === 'react' ? 'tsx' : 
                     format === 'tokens-css' ? 'css' : 'json';
    const filename = format === 'react' ? `${componentName}.${extension}` :
                    format === 'tokens-css' ? 'design-tokens.css' :
                    format === 'tokens-json' ? 'design-tokens.json' : 'design.json';
    
    const blob = new Blob([exportCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFormatLabel = (fmt: ExportFormat): string => {
    switch (fmt) {
      case 'json':
        return 'JSON (Canonical)';
      case 'react':
        return 'React + Tailwind';
      case 'tokens-json':
        return 'Design Tokens (JSON)';
      case 'tokens-css':
        return 'Design Tokens (CSS)';
      default:
        return fmt;
    }
  };

  const getFormatDescription = (fmt: ExportFormat): string => {
    switch (fmt) {
      case 'json':
        return 'Lossless export for version control and round-trip import';
      case 'react':
        return 'Runnable React components with Tailwind CSS';
      case 'tokens-json':
        return 'Design tokens in style-dictionary format';
      case 'tokens-css':
        return 'Design tokens as CSS custom properties';
      default:
        return '';
    }
  };

  return (
    <Modal 
      open={isOpen} 
      onClose={onClose} 
      title="Export Design"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-xs font-medium transition-colors border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700"
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
          >
            Download File
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="space-y-2">
            {(['json', 'react', 'tokens-json', 'tokens-css'] as ExportFormat[]).map((fmt) => (
              <label
                key={fmt}
                className={`flex items-start p-3 border rounded cursor-pointer transition ${
                  format === fmt
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={fmt}
                  checked={format === fmt}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">{getFormatLabel(fmt)}</div>
                  <div className="text-sm text-gray-500">{getFormatDescription(fmt)}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* React-specific options */}
        {format === 'react' && (
          <div className="space-y-3 p-3 bg-gray-50 rounded">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Component Name
              </label>
              <input
                type="text"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="DesignComponent"
              />
            </div>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeComments}
                onChange={(e) => setIncludeComments(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Include comments</span>
            </label>
          </div>
        )}

        {/* Code Preview */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Preview
            </label>
            <div className="text-xs text-gray-500">
              {exportCode.split('\n').length} lines
            </div>
          </div>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-96 text-xs font-mono">
              {exportCode}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  );
}
