import type { RefObject } from "react";
import type { ConnectionStatus, UserAwareness } from '../../collaboration/types';
import { ConnectionStatusIndicator } from '../ConnectionStatusIndicator';
import { ActiveUsersList } from '../ActiveUsersList';

export interface HeaderToolbarProps {
  headerRef: RefObject<HTMLDivElement | null>;
  fileOpen: boolean;
  setFileOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  fileAction: (action: string) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setAboutOpen: (open: boolean) => void;
  setCheatOpen: (open: boolean) => void;
  isCollaborative: boolean;
  status: ConnectionStatus;
  collaborators: Map<number, UserAwareness>;
  isSyncing: boolean;
  lastError: string | null;
  reconnect: () => void;
  setShareDialogOpen: (open: boolean) => void;
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
  isCollaborative,
  status,
  collaborators,
  isSyncing,
  lastError,
  reconnect,
  setShareDialogOpen,
  tool,
}: HeaderToolbarProps) {
  return (
    <header ref={headerRef} className="flex items-center justify-between border-b border-blue-900/30 bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-700 shadow-lg select-none" style={{ padding: '20px' }}>
      <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center shadow-sm overflow-hidden">
              <img src="/vizail-mark.svg" alt="Vizail" className="w-7 h-7" />
            </div>
            <h1 className="tracking-wide text-white" style={{ fontFamily: '"Cal Sans", "Cal Sans Semibold", sans-serif', fontWeight: 600, fontSize: '2em' }}>Viz<span className="text-cyan-300">ai</span>l</h1>
          </div>
          {/* File menu */}
          <div className="relative">
            <button
              onClick={() => setFileOpen(o => !o)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10 ${fileOpen ? 'bg-white/10' : ''}`}
              aria-haspopup="true"
              aria-expanded={fileOpen}
            >
              <i className="fa-regular fa-folder mr-1.5 text-cyan-300" />
              File
              <i className="fa-solid fa-chevron-down ml-1.5 text-[10px] text-white/50" />
            </button>
            {fileOpen && (
              <div className="absolute left-0 mt-1.5 w-48 rounded-lg border border-gray-200 bg-white shadow-xl z-50 p-1.5 flex flex-col overflow-hidden">
                {[
                  ["fa-regular fa-file", "New", "new", "⌘N"],
                  ["fa-regular fa-folder-open", "Open…", "open", "⌘O"],
                  ["fa-regular fa-floppy-disk", "Save", "save", "⌘S"],
                  ["fa-solid fa-file-export", "Save As…", "saveAs", "⇧⌘S"],
                ].map(([icon, label, act, shortcut]) => (
                  <button
                    key={act}
                    onClick={() => { fileAction(act); setFileOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors duration-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <i className={`${icon} text-gray-500 w-4`} />
                      {label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{shortcut}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Help menu */}
          <div className="relative">
            <button
              onClick={() => setHelpOpen(o => !o)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10 ${helpOpen ? 'bg-white/10' : ''}`}
              aria-haspopup="true"
              aria-expanded={helpOpen}
            >
              <i className="fa-regular fa-circle-question mr-1.5 text-cyan-300" />
              Help
              <i className="fa-solid fa-chevron-down ml-1.5 text-[10px] text-white/50" />
            </button>
            {helpOpen && (
              <div className="absolute left-0 mt-1.5 w-52 rounded-lg border border-gray-200 bg-white shadow-xl z-50 p-1.5 flex flex-col overflow-hidden">
                <button
                  onClick={() => { setAboutOpen(true); setHelpOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors duration-100"
                >
                  <i className="fa-solid fa-info-circle text-gray-500 w-4" />
                  About
                </button>
                <button
                  onClick={() => { setCheatOpen(true); setHelpOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors duration-100"
                >
                  <i className="fa-regular fa-keyboard text-gray-500 w-4" />
                  Keyboard Shortcuts
                </button>
              </div>
            )}
          </div>
      </div>
      <div className="flex items-center gap-4">
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
        {/* Share button */}
        <button
          onClick={() => setShareDialogOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 px-4 py-2 rounded-lg shadow-md transition-all duration-150"
        >
          <i className="fa-solid fa-share-nodes" />
          Share
        </button>
        
        {/* Tool indicator */}
        <div className="flex items-center gap-2 text-xs font-medium text-white/90 bg-white/15 backdrop-blur px-4 py-2 rounded-full border border-white/10">
          <i className="fa-solid fa-wand-magic-sparkles text-cyan-300" />
          <span className="capitalize">{tool}</span>
        </div>
      </div>
    </header>
  );
}
