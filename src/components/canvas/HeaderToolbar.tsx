import type { RefObject } from "react";
import type { ConnectionStatus, UserAwareness } from '../../collaboration/types';
import { ConnectionStatusIndicator } from '../ConnectionStatusIndicator';
import { ActiveUsersList } from '../ActiveUsersList';
import SignIn from '../SignIn';

export interface HeaderToolbarProps {
  headerRef: RefObject<HTMLDivElement | null>;
  fileOpen: boolean;
  setFileOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  fileAction: (action: string) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setAboutOpen: (open: boolean) => void;
  setCheatOpen: (open: boolean) => void;
  setGettingStartedOpen: (open: boolean) => void;
  setCanvasGuideOpen: (open: boolean) => void;
  isCollaborative: boolean;
  status: ConnectionStatus;
  collaborators: Map<number, UserAwareness>;
  isSyncing: boolean;
  lastError: string | null;
  reconnect: () => void;
  setShareDialogOpen: (open: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  tool: string;
}

export function HeaderToolbar({
  headerRef,
  fileOpen,
  setFileOpen,
  fileAction,
  helpOpen,
  setHelpOpen,
  setAboutOpen,
  setCheatOpen,
  setGettingStartedOpen,
  setCanvasGuideOpen,
  isCollaborative,
  status,
  collaborators,
  isSyncing,
  lastError,
  reconnect,
  setShareDialogOpen,
  setExportDialogOpen,
  tool,
}: HeaderToolbarProps) {
  return (
    <header ref={headerRef} className="flex items-center justify-between border-b border-blue-900/30 bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-700 shadow-lg select-none px-5 py-2.5">
      {/* Left: Logo + menus */}
      <div className="flex items-center gap-1">
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center shadow-sm overflow-hidden">
              <img src="/vizail-mark.svg" alt="Vizail" className="w-5 h-5" />
            </div>
            <h1 className="tracking-wide text-white" style={{ fontFamily: '"Cal Sans", "Cal Sans Semibold", sans-serif', fontWeight: 600, fontSize: '1.35em' }}>Viz<span className="text-cyan-300">ai</span>l</h1>
          </div>
          <div className="w-px h-5 bg-white/15 mx-1" />
          {/* File menu */}
          <div className="relative">
            <button
              onClick={() => setFileOpen(o => !o)}
              className={`text-[13px] px-2.5 py-1.5 rounded-md transition-colors duration-150 text-white/80 hover:text-white hover:bg-white/10 font-medium ${fileOpen ? 'bg-white/10 text-white' : ''}`}
              aria-haspopup="true"
              aria-expanded={fileOpen}
            >
              File
            </button>
            {fileOpen && (
              <div className="absolute left-0 mt-1 w-52 rounded-lg border border-gray-200/90 bg-white shadow-2xl z-50 py-1 flex flex-col overflow-hidden">
                {[
                  ["fa-regular fa-file", "New Design", "new", "⌘N"],
                  ["fa-regular fa-folder-open", "Open…", "open", "⌘O"],
                  ["fa-solid fa-grid-2", "Templates…", "templates", ""],
                ].map(([icon, label, act, shortcut]) => (
                  <button
                    key={act}
                    onClick={() => { fileAction(act); setFileOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] hover:bg-blue-50 transition-colors duration-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <i className={`${icon} text-gray-400 w-4 text-xs`} />
                      <span className="text-gray-700">{label}</span>
                    </span>
                    {shortcut && <span className="text-[10px] text-gray-400 font-mono">{shortcut}</span>}
                  </button>
                ))}
                <div className="border-t border-gray-100 my-1" />
                {[
                  ["fa-regular fa-floppy-disk", "Save", "save", "⌘S"],
                  ["fa-solid fa-file-export", "Save As…", "saveAs", "⇧⌘S"],
                ].map(([icon, label, act, shortcut]) => (
                  <button
                    key={act}
                    onClick={() => { fileAction(act); setFileOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] hover:bg-blue-50 transition-colors duration-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <i className={`${icon} text-gray-400 w-4 text-xs`} />
                      <span className="text-gray-700">{label}</span>
                    </span>
                    {shortcut && <span className="text-[10px] text-gray-400 font-mono">{shortcut}</span>}
                  </button>
                ))}
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { setExportDialogOpen(true); setFileOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] hover:bg-blue-50 transition-colors duration-100"
                >
                  <span className="flex items-center gap-2.5">
                    <i className="fa-solid fa-download text-gray-400 w-4 text-xs" />
                    <span className="text-gray-700">Export…</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">⇧⌘E</span>
                </button>
              </div>
            )}
          </div>
          {/* Help menu */}
          <div className="relative">
            <button
              onClick={() => setHelpOpen(o => !o)}
              className={`text-[13px] px-2.5 py-1.5 rounded-md transition-colors duration-150 text-white/80 hover:text-white hover:bg-white/10 font-medium ${helpOpen ? 'bg-white/10 text-white' : ''}`}
              aria-haspopup="true"
              aria-expanded={helpOpen}
            >
              Help
            </button>
            {helpOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-lg border border-gray-200/90 bg-white shadow-2xl z-50 py-1 flex flex-col overflow-hidden">
                <button
                  onClick={() => { setGettingStartedOpen(true); setHelpOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-blue-50 transition-colors duration-100"
                >
                  <i className="fa-solid fa-rocket text-blue-400 w-4 text-xs" />
                  <span className="text-gray-700">Getting Started</span>
                </button>
                <button
                  onClick={() => { setCanvasGuideOpen(true); setHelpOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-blue-50 transition-colors duration-100"
                >
                  <i className="fa-solid fa-paintbrush text-purple-400 w-4 text-xs" />
                  <span className="text-gray-700">Canvas Tools Guide</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { setCheatOpen(true); setHelpOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-blue-50 transition-colors duration-100"
                >
                  <i className="fa-regular fa-keyboard text-gray-400 w-4 text-xs" />
                  <span className="text-gray-700">Keyboard Shortcuts</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { setAboutOpen(true); setHelpOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-blue-50 transition-colors duration-100"
                >
                  <i className="fa-solid fa-info-circle text-gray-400 w-4 text-xs" />
                  <span className="text-gray-700">About Vizail</span>
                </button>
              </div>
            )}
          </div>
      </div>
      {/* Right: Collab + SignIn + Share + Tool */}
      <div className="flex items-center gap-3">
        {/* Collaboration status (when in collaborative mode) */}
        {isCollaborative && (
          <div className="flex items-center gap-3">
            <ConnectionStatusIndicator
              status={status}
              collaboratorCount={collaborators.size}
              isSyncing={isSyncing}
              lastError={lastError}
              onReconnect={reconnect}
            />
            <ActiveUsersList collaborators={collaborators} maxVisible={4} />
          </div>
        )}
        {/* Sign-in (Cloudflare Access) */}
        <SignIn />
        <div className="w-px h-5 bg-white/15" />
        {/* Share button */}
        <button
          onClick={() => setShareDialogOpen(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 px-3.5 py-1.5 rounded-lg shadow-md transition-all duration-150"
        >
          <i className="fa-solid fa-share-nodes text-xs" />
          Share
        </button>
        
        {/* Tool indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/80 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
          <i className="fa-solid fa-wand-magic-sparkles text-cyan-300 text-[10px]" />
          <span className="capitalize">{tool}</span>
        </div>
      </div>
    </header>
  );
}
