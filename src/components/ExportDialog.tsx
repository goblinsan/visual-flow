/**
 * Export Dialog Component
 * 
 * Provides UI for exporting designs in various formats.
 * Free users have export format restrictions and daily export limits.
 */

import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import type { LayoutSpec } from '../layout-schema';
import { exportToJSON } from '../export/canonicalExport';
import { exportToReact } from '../export/reactExporter';
import { extractDesignTokens, exportToStyleDictionary, exportToCSS } from '../export/designTokens';
import { exportLayoutToRobloxLua } from '../roblox/exportLayout';
import { usePlan } from '../hooks/usePlan';
import { canExportFormat, getMaxExportsPerDay } from '../monetization/featureFlags';

export type ExportFormat = 'json' | 'react' | 'tokens-json' | 'tokens-css' | 'roblox-lua';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  spec: LayoutSpec;
  /** Called when user clicks the upgrade CTA on a locked format */
  onUpgradeClick?: () => void;
}

/** localStorage key that tracks daily export count */
const EXPORT_COUNT_KEY = 'vizail_export_count';

interface ExportCountRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getExportCount(): ExportCountRecord {
  try {
    const raw = localStorage.getItem(EXPORT_COUNT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ExportCountRecord;
      if (parsed.date === getTodayKey()) return parsed;
    }
  } catch {
    // ignore
  }
  return { date: getTodayKey(), count: 0 };
}

function incrementExportCount(): void {
  const rec = getExportCount();
  localStorage.setItem(EXPORT_COUNT_KEY, JSON.stringify({ date: rec.date, count: rec.count + 1 }));
}

export function ExportDialog({ isOpen, onClose, spec, onUpgradeClick }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [componentName, setComponentName] = useState('DesignComponent');
  const [includeComments, setIncludeComments] = useState(true);
  const [copied, setCopied] = useState(false);
  const [exportLimitHit, setExportLimitHit] = useState(false);

  const { plan } = usePlan();
  const maxExports = getMaxExportsPerDay(plan);

  const isFormatLocked = (fmt: ExportFormat) => !canExportFormat(plan, fmt);

  const todayCount = getExportCount().count;
  const dailyLimitReached = maxExports !== null && todayCount >= maxExports;

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

        case 'roblox-lua':
          return exportLayoutToRobloxLua(spec);

        default:
          return '';
      }
    } catch (error) {
      console.error('Export error:', error);
      return `// Error generating export: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }, [format, spec, componentName, includeComments]);

  const handleCopy = async () => {
    if (dailyLimitReached) { setExportLimitHit(true); return; }
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopied(true);
      incrementExportCount();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    if (dailyLimitReached) { setExportLimitHit(true); return; }
    const extensionMap: Record<ExportFormat, string> = {
      'react': 'tsx',
      'tokens-css': 'css',
      'tokens-json': 'json',
      'json': 'json',
      'roblox-lua': 'lua',
    };
    const filenameMap: Record<ExportFormat, string> = {
      'react': `${componentName}.tsx`,
      'tokens-css': 'design-tokens.css',
      'tokens-json': 'design-tokens.json',
      'json': 'design.json',
      'roblox-lua': 'design.roblox.lua',
    };
    const extension = extensionMap[format];
    const filename = filenameMap[format];
    void extension; // suppress unused var warning
    
    const blob = new Blob([exportCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    incrementExportCount();
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
      case 'roblox-lua':
        return 'Roblox LocalScript (Lua)';
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
      case 'roblox-lua':
        return 'Ready-to-use LocalScript for Roblox Studio (StarterPlayerScripts)';
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
            disabled={isFormatLocked(format) || dailyLimitReached}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={handleDownload}
            disabled={isFormatLocked(format) || dailyLimitReached}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Download File
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Daily export limit banner */}
        {dailyLimitReached && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <i className="fa-solid fa-lock mt-0.5 text-amber-500" />
            <div>
              <strong>Daily export limit reached.</strong> Free users can export up to {maxExports} times per day.{' '}
              {onUpgradeClick && (
                <button onClick={onUpgradeClick} className="underline font-semibold text-amber-900 hover:text-amber-700">
                  Upgrade to Pro
                </button>
              )}{' '}
              for unlimited exports.
            </div>
          </div>
        )}
        {/* Limit was hit during this session but component hasn't re-rendered dailyLimitReached yet */}
        {exportLimitHit && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            Export limit reached for today. Please try again tomorrow or upgrade to Pro.
          </div>
        )}

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="space-y-2">
            {(['json', 'react', 'tokens-json', 'tokens-css', 'roblox-lua'] as ExportFormat[]).map((fmt) => {
              const locked = isFormatLocked(fmt);
              return (
                <label
                  key={fmt}
                  className={`flex items-start p-3 border rounded transition ${
                    locked
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70'
                      : format === fmt
                      ? 'border-blue-500 bg-blue-50 cursor-pointer'
                      : 'border-gray-300 hover:border-gray-400 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={fmt}
                  checked={format === fmt}
                  disabled={locked}
                  onChange={(e) => { if (!locked) setFormat(e.target.value as ExportFormat); }}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{getFormatLabel(fmt)}</span>
                    {locked && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        <i className="fa-solid fa-lock text-[8px]" /> Pro
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{getFormatDescription(fmt)}</div>
                  {locked && onUpgradeClick && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); onUpgradeClick(); }}
                      className="mt-1 text-xs text-cyan-700 underline hover:text-cyan-900"
                    >
                      Upgrade to unlock
                    </button>
                  )}
                </div>
              </label>
              );
            })}
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
