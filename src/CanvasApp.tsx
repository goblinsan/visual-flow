import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { usePersistentRectDefaults } from './hooks/usePersistentRectDefaults';
import { useRecentColors } from './hooks/useRecentColors';
import { useDesignPersistence } from './hooks/useDesignPersistence';
import { useSelection } from './hooks/useSelection';
import { useToolState } from './hooks/canvas/useToolState';
import { useDialogState } from './hooks/canvas/useDialogState';
import { useAttributeState } from './hooks/canvas/useAttributeState';
import { useLibraryState } from './hooks/canvas/useLibraryState';
import { useProposalState } from './hooks/canvas/useProposalState';
import { useUndoRedo } from './hooks/canvas/useUndoRedo';
import { useToolDefaults } from './hooks/canvas/useToolDefaults';
import { useSnapSettings } from './hooks/canvas/useSnapSettings';
import { useFlowState } from './hooks/canvas/useFlowState';
import { useKeyboardShortcuts } from './hooks/canvas/useKeyboardShortcuts';
import { useThemeActions } from './hooks/canvas/useThemeActions';
import { logger } from "./utils/logger";
import { DialogManager } from "./components/dialogs/DialogManager";
import { findNode, updateNode } from './utils/specUtils';
import { dashArrayToInput } from './utils/paint';
import { applyProposalOperations } from './utils/proposalHelpers';
import CanvasStage from "./canvas/CanvasStage.tsx";
import type {
  LayoutSpec,
  LayoutNode,
  FrameNode,
} from "./layout-schema.ts";
import { saveNamedDesign, getCurrentDesignName, setCurrentDesignName, type SavedDesign } from './utils/persistence';
import useElementSize from './hooks/useElementSize';
// Collaboration imports
import { useRealtimeCanvas } from './collaboration';
import { CursorOverlay } from './components/CursorOverlay';
import { SelectionOverlay } from './components/SelectionOverlay';
import { useProposals } from './hooks/useProposals';
import { useAuth } from './hooks/useAuth';
import { HeaderToolbar } from './components/canvas/HeaderToolbar';
import { LeftToolbar } from './components/canvas/LeftToolbar';
import { AttributesSidebar } from './components/canvas/AttributesSidebar';
import { AgentPanel } from './components/canvas/AgentPanel';
import { ThemePanel } from './components/ThemePanel';
import { KulrsPalettePanel } from './components/KulrsPalettePanel';
import { ToolSettingsBar } from './components/canvas/ToolSettingsBar';
import { ChooseModeModal } from './roblox/ChooseModeModal';
import type { WelcomeAction } from './roblox/ChooseModeModal';
import { useDesignTheme } from './theme';
import { bindAndApplyTheme } from './theme';
import { TEMPLATES } from './templates';
import { getRoomIdFromURL, generateRoomId, getUserId, getDisplayName, getWebSocketUrl, buildInitialSpec } from './utils/canvasHelpers';

export default function CanvasApp() {
  // Design mode (#142): null = not chosen yet, shown as modal on first load
  // Auto-select 'general' when arriving from the Kulrs import flow
  const [designChosen, setDesignChosen] = useState<boolean>(() => {
    const name = getCurrentDesignName();
    if (name && name.startsWith('Kulrs Import')) return true;
    return false;
  });

  // Collaboration state
  const [roomId, setRoomId] = useState<string | null>(getRoomIdFromURL);
  const userId = useMemo(() => getUserId(), []);
  const displayName = useMemo(() => getDisplayName(), []);
  const wsUrl = useMemo(() => getWebSocketUrl(), []);
  const isCollaborative = roomId !== null;

  // Viewport state for collaboration overlays
  const [viewport, setViewport] = useState<{ scale: number; x: number; y: number }>({ scale: 1, x: 0, y: 0 });

  // Local persistence (used when NOT in collaborative mode)
  const localPersistence = useDesignPersistence({ buildInitial: buildInitialSpec });

  // Real-time collaboration (used when in collaborative mode)
  const realtimeCanvas = useRealtimeCanvas({
    canvasId: roomId || 'unused',
    userId,
    displayName,
    buildInitial: buildInitialSpec,
    wsUrl,
    enabled: isCollaborative,
  });

  // Use the appropriate spec/setSpec based on mode
  const { spec, setSpec: setSpecRaw } = isCollaborative
    ? { spec: realtimeCanvas.spec, setSpec: realtimeCanvas.setSpec }
    : { spec: localPersistence.spec, setSpec: localPersistence.setSpec };

  // Collaboration helpers
  const { status, collaborators, isSyncing, lastError, updateCursor, updateSelection, reconnect, clientId } = realtimeCanvas;

  // Undo/redo (extracted hook)
  const { setSpec, undo, redo } = useUndoRedo(setSpecRaw, isCollaborative);
  
  // Custom hooks for domain-specific state management
  const {
    tool,
    setTool,
    editingCurveId,
    setEditingCurveId,
    selectedCurvePointIndex,
    setSelectedCurvePointIndex,
  } = useToolState();
  
  const {
    helpOpen,
    setHelpOpen,
    fileOpen,
    setFileOpen,
    aboutOpen,
    setAboutOpen,
    cheatOpen,
    setCheatOpen,
    gettingStartedOpen,
    setGettingStartedOpen,
    canvasGuideOpen,
    setCanvasGuideOpen,
    iconLibraryOpen,
    setIconLibraryOpen,
    componentLibraryOpen,
    setComponentLibraryOpen,
    newDialogOpen,
    setNewDialogOpen,
    openDialogOpen,
    setOpenDialogOpen,
    shareDialogOpen,
    setShareDialogOpen,
    templateBrowserOpen,
    setTemplateBrowserOpen,
    exportDialogOpen,
    setExportDialogOpen,
  } = useDialogState();
  
  const {
    attributeTab,
    setAttributeTab,
    panelMode,
    setPanelMode,
    rawDashInput,
    setRawDashInput,
    lastFillById,
    setLastFillById,
    lastStrokeById,
    setLastStrokeById,
  } = useAttributeState();
  
  const {
    selectedIconId,
    setSelectedIconId,
    selectedComponentId,
    setSelectedComponentId,
    iconSearch,
    setIconSearch,
  } = useLibraryState();
  
  const {
    selectedProposalId,
    setSelectedProposalId,
    viewingProposedSpec,
    setViewingProposedSpec,
  } = useProposalState();
  
  const { selection: selectedIds, setSelection } = useSelection();
  
  // Rectangle default attributes (persisted)
  const { defaults: rectDefaults, update: updateRectDefaults } = usePersistentRectDefaults({ fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 0, opacity: 1, strokeDash: undefined });

  // Tool defaults (extracted hook)
  const {
    lineDefaults, updateLineDefaults,
    curveDefaults, updateCurveDefaults,
    drawDefaults, updateDrawDefaults,
    textDefaults, updateTextDefaults, setTextDefaults,
    polygonSides, setPolygonSides,
  } = useToolDefaults(activeTheme);

  // Snap/grid settings (extracted hook)
  const {
    snapToGrid, setSnapToGrid,
    snapToObjects, setSnapToObjects,
    snapToSpacing, setSnapToSpacing,
    gridSize, setGridSize,
    snapAnchor, setSnapAnchor,
  } = useSnapSettings();

  // Recent colors via hook
  const { recentColors, beginSession: beginRecentSession, previewColor: previewRecent, commitColor: commitRecent } = useRecentColors();
  const [canvasRef, canvasSize] = useElementSize<HTMLDivElement>();

  // Flow/prototype navigation (extracted hook)
  const {
    activeFlowId, setActiveFlowId,
    focusNodeId,
    viewportTransition,
    updateFlows,
    focusScreen,
    playTransitionPreview,
  } = useFlowState(setSpec, setSelection);

  const [draggingGroupIndex, setDraggingGroupIndex] = useState<number | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);
  const [currentDesignName, setCurrentDesignNameState] = useState<string | null>(getCurrentDesignName);
  const [fitToContentKey, setFitToContentKey] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const blockCanvasClicksRef = useRef(false);
  const skipNormalizationRef = useRef(false);
  const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0';

  // Design theme (Kulrs integration)
  const {
    theme: activeTheme,
    setTheme,
    applyPalette,
    toggleMode: toggleThemeMode,
    updateTokenColor,
    updateTypography,
    updatePaletteOrder,
  } = useDesignTheme();

  // Theme propagation + action handlers (extracted hook)
  const { handleApplyPaletteAsTheme, handleClearTheme, handlePickThemeColor } = useThemeActions(
    activeTheme, setSpec, updateRectDefaults, setTextDefaults, applyPalette, setTheme, pushRecent,
  );

  const { isAuthenticated } = useAuth();

  // Toast notification for save feedback
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Phase 4: Agent Proposals
  // Persist canvas ID per design name so it survives re-renders / remounts
  const canvasIdStorageKey = `vizail_canvas_id_${currentDesignName ?? '__default__'}`;
  const [currentCanvasId, setCurrentCanvasIdRaw] = useState<string | null>(() => {
    try { return localStorage.getItem(canvasIdStorageKey); } catch { return null; }
  });
  const setCurrentCanvasId = useCallback((id: string | null) => {
    setCurrentCanvasIdRaw(id);
    try {
      if (id) localStorage.setItem(canvasIdStorageKey, id);
      else localStorage.removeItem(canvasIdStorageKey);
    } catch { /* ignore */ }
  }, [canvasIdStorageKey]);
  // Re-read from storage when the design name changes
  useEffect(() => {
    try {
      setCurrentCanvasIdRaw(localStorage.getItem(canvasIdStorageKey));
    } catch { setCurrentCanvasIdRaw(null); }
  }, [canvasIdStorageKey]);
  const [creatingCanvasId, setCreatingCanvasId] = useState(false);
  
  const proposals = useProposals({
    canvasId: currentCanvasId ?? '',
    enabled: !!currentCanvasId, // Auto-load when canvas ID exists
    refreshInterval: currentCanvasId ? 30000 : 0, // Poll every 30s when shared
  });

  const pushRecent = useCallback((col?: string) => { if (col) commitRecent(col); }, [commitRecent]);
  const wrappedPreviewRecent = useCallback((col?: string) => { if (col) previewRecent(col); }, [previewRecent]);

  const handleViewportChange = useCallback((newViewport: { scale: number; x: number; y: number }) => {
    setViewport(newViewport);
  }, []);

  // Clear curve point selection when selection changes
  useEffect(() => {
    setSelectedCurvePointIndex(null);
  }, [selectedIds]);

  useEffect(() => {
    if (selectedIds.length !== 1) {
      setAttributeTab('element');
    }
  }, [selectedIds]);

  // Debug: log spec on mount
  useEffect(() => {
    logger.debug('CanvasApp mount');
  }, []);

  useEffect(() => {
    logger.debug('CanvasApp size', canvasSize.width, canvasSize.height);
  }, [canvasSize.width, canvasSize.height, setSpec]);

  // Load persisted defaults once
  // (Removed legacy load of rect defaults – handled in hook)

  // (Removed duplicate localStorage persistence effects – hooks handle persistence internally)

  // Keep root frame sized to at least viewport to avoid gray background gaps
  useEffect(() => {
    setSpec(prev => {
      const root = prev.root;
      const need = root.size?.width !== canvasSize.width || root.size?.height !== canvasSize.height;
      if (!need) return prev;
      return { ...prev, root: { ...root, size: { width: canvasSize.width, height: canvasSize.height } } };
    });
  }, [canvasSize.width, canvasSize.height, setSpec]);

  // Sync raw dash input based on selection / tool changes
  useEffect(() => {
    if (selectedIds.length === 1) {
      const node = findNode(spec.root, selectedIds[0]) as LayoutNode | null;
      if (node && node.type === 'rect') {
        const dashStr = dashArrayToInput(node.strokeDash);
        setRawDashInput(prev => prev === dashStr ? prev : dashStr);
        return;
      }
    }
    // If no selection and rect tool active, show defaults value
    if (selectedIds.length === 0 && tool === 'rect') {
      const dashStr = dashArrayToInput(rectDefaults.strokeDash as number[] | undefined);
      setRawDashInput(prev => prev === dashStr ? prev : dashStr);
      return;
    }
    // Otherwise don't overwrite user input (e.g., multi-select or other tool)
  }, [selectedIds, tool, rectDefaults.strokeDash, spec.root]);

  // File menu handlers
  const fileAction = useCallback((action: string) => {
    if (action === "new") {
      setNewDialogOpen(true);
      logger.info('File action new: opening template dialog');
    }
    if (action === 'open') {
      setOpenDialogOpen(true);
      logger.info('File action open: opening saved designs dialog');
    }
    if (action === 'templates') {
      setTemplateBrowserOpen(true);
      logger.info('File action templates: opening template browser');
    }
    if (action === 'save') {
      const designName = currentDesignName || (() => {
        const name = window.prompt("Save: Enter a name for this design", "Untitled Design");
        if (name && name.trim()) {
          setCurrentDesignNameState(name.trim());
          setCurrentDesignName(name.trim());
          return name.trim();
        }
        return null;
      })();
      if (!designName) return;

      // Always save to localStorage as a backup
      saveNamedDesign(designName, spec);

      if (isAuthenticated) {
        // Cloud save for authenticated users
        (async () => {
          try {
            const { apiClient } = await import('./api/client');
            if (currentCanvasId) {
              const result = await apiClient.updateCanvas(currentCanvasId, { name: designName, spec });
              if (result.error) {
                showToast(`Cloud save failed: ${result.error}. Saved locally.`, 'warning');
              } else {
                showToast('Saved to cloud', 'success');
              }
            } else {
              // Create a new canvas in the cloud
              const result = await apiClient.createCanvas(designName, spec);
              if (result.data) {
                setCurrentCanvasId(result.data.id);
                showToast('Saved to cloud', 'success');
              } else {
                showToast(`Cloud save failed: ${result.error}. Saved locally.`, 'warning');
              }
            }
          } catch {
            showToast('Cloud save failed. Saved locally.', 'warning');
          }
        })();
      } else {
        showToast('Saved locally. Sign in to save to the cloud.', 'warning');
      }
      logger.info(`Saved design: ${designName}`);
    }
    if (action === 'saveAs') {
      const defaultName = currentDesignName ? `${currentDesignName} (copy)` : "Untitled Design";
      const name = window.prompt("Save As: Enter a name for this design", defaultName);
      if (name && name.trim()) {
        const designName = name.trim();
        saveNamedDesign(designName, spec);
        setCurrentDesignNameState(designName);
        setCurrentDesignName(designName);

        if (isAuthenticated) {
          (async () => {
            try {
              const { apiClient } = await import('./api/client');
              const result = await apiClient.createCanvas(designName, spec);
              if (result.data) {
                setCurrentCanvasId(result.data.id);
                showToast('Saved to cloud', 'success');
              } else {
                showToast(`Cloud save failed: ${result.error}. Saved locally.`, 'warning');
              }
            } catch {
              showToast('Cloud save failed. Saved locally.', 'warning');
            }
          })();
        } else {
          showToast('Saved locally. Sign in to save to the cloud.', 'warning');
        }
        logger.info(`Saved design as: ${designName}`);
      }
    }
  }, [spec, currentDesignName, currentCanvasId, isAuthenticated, showToast, setCurrentCanvasId]);

  // Load a saved design
  const loadDesign = useCallback((design: SavedDesign) => {
    setSpec(design.spec);
    setCurrentDesignNameState(design.name);
    setCurrentDesignName(design.name);
    setSelection([]);
    // Clear cloud canvas ID — loaded design may have a different one stored per name
    // (the canvasIdStorageKey will be re-read via the useEffect above)
    setSelectedProposalId(null);
    setViewingProposedSpec(false);
    setOpenDialogOpen(false);
    // Only fit to content in local mode (not collaborative)
    if (!isCollaborative) {
      setTimeout(() => setFitToContentKey(k => k + 1), 50);
    }
    logger.info(`Loaded design: ${design.name}`);
  }, [setSpec, setSelection, isCollaborative]);

  // Apply a template from the New dialog
  const applyTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      let newSpec = template.build();
      // Apply the active theme (colors + fonts) to the new template
      if (activeTheme) {
        newSpec = bindAndApplyTheme(newSpec, activeTheme);
      }
      setSpec(newSpec);
      setSelection([]);
      // Clear canvas ID — this is a brand new design, not yet saved to cloud
      setCurrentCanvasId(null);
      setCurrentDesignNameState(null);
      setCurrentDesignName(null);
      // Reset proposal state
      setSelectedProposalId(null);
      setViewingProposedSpec(false);
      // Only fit to content in local mode (not collaborative)
      if (!isCollaborative) {
        setTimeout(() => setFitToContentKey(k => k + 1), 50);
      }
      logger.info(`Applied template: ${template.name}`);
    }
    setNewDialogOpen(false);
  }, [setSpec, setSelection, isCollaborative, setCurrentCanvasId, activeTheme]);

  // Handle Welcome modal selection (#142)
  const onWelcomeSelect = useCallback((action: WelcomeAction) => {
    setDesignChosen(true);
    switch (action.type) {
      case 'blank':
        applyTemplate('blank');
        break;
      case 'explore':
        applyTemplate('blank');
        // Open the Getting Started guide after a short delay so the canvas loads first
        setTimeout(() => setGettingStartedOpen(true), 100);
        break;
      case 'template': {
        // Apply the chosen template
        applyTemplate(action.templateId);

        // Apply palette if one was selected
        if (action.palette && action.palette.length > 0) {
          const newTheme = applyPalette(action.palette, 'light', { name: 'Quick Start' });
          // Apply optional font pair on top of the palette theme
          if (action.fonts) {
            updateTypography({ headingFont: action.fonts.heading, bodyFont: action.fonts.body });
          }
          // Re-apply theme to the newly loaded spec after a tick
          setTimeout(() => {
            setSpec(prev => bindAndApplyTheme(prev, {
              ...newTheme,
              typography: {
                ...newTheme.typography,
                ...(action.fonts ?? {}),
              },
            }));
          }, 0);
        } else if (action.fonts) {
          // Fonts only, no palette — just update typography if a theme is active
          updateTypography({ headingFont: action.fonts.heading, bodyFont: action.fonts.body });
        }
        break;
      }
    }
    logger.info(`Welcome action: ${action.type}${action.type === 'template' ? ` (${action.category}/${action.templateId})` : ''}`);
  }, [applyTemplate, applyPalette, updateTypography, setSpec, setGettingStartedOpen]);

  // Dialog action callbacks
  const handleStartCollaborativeSession = useCallback(() => {
    const newRoomId = generateRoomId();
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoomId);
    window.history.pushState({}, '', url.toString());
    setRoomId(newRoomId);
  }, []);

  const handleLeaveCollaborativeSession = useCallback(() => {
    // Leave collaborative mode
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.toString());
    setRoomId(null);
    setShareDialogOpen(false);
  }, []);

  const handleCopyShareLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${roomId}`);
  }, [roomId]);

  // Derive stage width/height from container size (padding adjustments if needed)
  const stageWidth = Math.max(0, canvasSize.width);
  const stageHeight = Math.max(0, canvasSize.height);

  // Keyboard shortcuts + outside-click handler (extracted hook)
  const headerRef = useKeyboardShortcuts(tool, setTool, setHelpOpen, setFileOpen);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100 text-gray-900 flex flex-col">
      {/* Choose Design Mode modal (#142) — shown until user picks a mode */}
      {!designChosen && <ChooseModeModal onSelect={onWelcomeSelect} templates={TEMPLATES.map(t => ({ id: t.id, name: t.name, icon: t.icon, description: t.description, category: t.category }))} />}
      {/* Header */}
      <HeaderToolbar
        headerRef={headerRef}
        fileOpen={fileOpen}
        setFileOpen={setFileOpen}
        fileAction={fileAction}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
        setAboutOpen={setAboutOpen}
        setCheatOpen={setCheatOpen}
        setGettingStartedOpen={setGettingStartedOpen}
        setCanvasGuideOpen={setCanvasGuideOpen}
        isCollaborative={isCollaborative}
        status={status}
        collaborators={collaborators}
        isSyncing={isSyncing}
        lastError={lastError}
        reconnect={reconnect}
        setShareDialogOpen={setShareDialogOpen}
        setExportDialogOpen={setExportDialogOpen}
        tool={tool}
      />
      {/* Dialogs */}
      <DialogManager
        shareDialogOpen={shareDialogOpen}
        setShareDialogOpen={setShareDialogOpen}
        aboutOpen={aboutOpen}
        setAboutOpen={setAboutOpen}
        cheatOpen={cheatOpen}
        setCheatOpen={setCheatOpen}
        gettingStartedOpen={gettingStartedOpen}
        setGettingStartedOpen={setGettingStartedOpen}
        canvasGuideOpen={canvasGuideOpen}
        setCanvasGuideOpen={setCanvasGuideOpen}
        iconLibraryOpen={iconLibraryOpen}
        setIconLibraryOpen={setIconLibraryOpen}
        componentLibraryOpen={componentLibraryOpen}
        setComponentLibraryOpen={setComponentLibraryOpen}
        newDialogOpen={newDialogOpen}
        setNewDialogOpen={setNewDialogOpen}
        openDialogOpen={openDialogOpen}
        setOpenDialogOpen={setOpenDialogOpen}
        templateBrowserOpen={templateBrowserOpen}
        setTemplateBrowserOpen={setTemplateBrowserOpen}
        isCollaborative={isCollaborative}
        roomId={roomId}
        selectedIconId={selectedIconId}
        setSelectedIconId={setSelectedIconId}
        iconSearch={iconSearch}
        setIconSearch={setIconSearch}
        selectedComponentId={selectedComponentId}
        setSelectedComponentId={setSelectedComponentId}
        appVersion={appVersion}
        onApplyTemplate={applyTemplate}
        onLoadDesign={loadDesign}
        onStartCollaborativeSession={handleStartCollaborativeSession}
        onLeaveCollaborativeSession={handleLeaveCollaborativeSession}
        onCopyShareLink={handleCopyShareLink}
        templates={TEMPLATES}
        exportDialogOpen={exportDialogOpen}
        setExportDialogOpen={setExportDialogOpen}
        currentSpec={spec}
        activeTheme={activeTheme}
      />
      {/* Body layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left toolbar */}
        <LeftToolbar
          tool={tool}
          setTool={setTool}
          setIconLibraryOpen={setIconLibraryOpen}
          setComponentLibraryOpen={setComponentLibraryOpen}
        />
        {/* Canvas center */}
        <main 
          className="flex-1 relative min-w-0"
        >
          {/* Tool settings bar overlays the top of the canvas */}
          <ToolSettingsBar
            tool={tool}
            polygonSides={polygonSides}
            setPolygonSides={setPolygonSides}
            rectDefaults={{
              fill: rectDefaults.fill,
              stroke: rectDefaults.stroke,
              strokeWidth: rectDefaults.strokeWidth ?? 1,
              radius: rectDefaults.radius ?? 0,
              opacity: rectDefaults.opacity ?? 1,
            }}
            updateRectDefaults={updateRectDefaults}
            lineDefaults={lineDefaults}
            updateLineDefaults={updateLineDefaults}
            curveDefaults={curveDefaults}
            updateCurveDefaults={updateCurveDefaults}
            drawDefaults={drawDefaults}
            updateDrawDefaults={updateDrawDefaults}
            textDefaults={textDefaults}
            updateTextDefaults={updateTextDefaults}
            snapToGrid={snapToGrid}
            setSnapToGrid={setSnapToGrid}
            snapToObjects={snapToObjects}
            setSnapToObjects={setSnapToObjects}
            snapToSpacing={snapToSpacing}
            setSnapToSpacing={setSnapToSpacing}
            gridSize={gridSize}
            setGridSize={setGridSize}
            snapAnchor={snapAnchor}
            setSnapAnchor={setSnapAnchor}
            selectedCount={selectedIds.length}
          />
          <div 
            ref={canvasRef} 
            className="absolute inset-0 overflow-hidden"
            onMouseMove={isCollaborative ? (e) => {
              // Update cursor position for collaborators
              // Convert screen coordinates to canvas space (inverse of viewport transform)
              const rect = e.currentTarget.getBoundingClientRect();
              const screenX = e.clientX - rect.left;
              const screenY = e.clientY - rect.top;
              const canvasX = (screenX - viewport.x) / viewport.scale;
              const canvasY = (screenY - viewport.y) / viewport.scale;
              updateCursor(canvasX, canvasY);
            } : undefined}
          >
            {stageWidth > 0 && stageHeight > 0 && (() => {
              // Compute the spec to display (current or proposed)
              const selectedProposal = proposals.proposals.find(p => p.id === selectedProposalId);
              const displaySpec = viewingProposedSpec && selectedProposal
                ? applyProposalOperations(spec, selectedProposal.operations)
                : spec;
              
              return (
                <CanvasStage
                  tool={tool}
                  spec={displaySpec}
                  setSpec={viewingProposedSpec ? () => {} : setSpec} // Read-only when viewing proposal
                  width={stageWidth}
                  height={stageHeight}
                  onToolChange={setTool}
                  onUndo={undo}
                  onRedo={redo}
                  focusNodeId={focusNodeId}
                  onUngroup={(ids) => {
                  if (!spec.flows || ids.length === 0) return;
                  const nextFlows = spec.flows
                    .map(f => ({
                      ...f,
                      screenIds: f.screenIds.filter(id => !ids.includes(id)),
                      transitions: f.transitions.filter(t => !ids.includes(t.from) && !ids.includes(t.to)),
                    }))
                    .filter(f => f.screenIds.length > 0);
                  setSpec(prev => ({ ...prev, flows: nextFlows }));
                }}
                selectedIconId={selectedIconId}
                selectedComponentId={selectedComponentId}
                selection={selectedIds}
                setSelection={(ids) => {
                  setSelection(ids);
                  // Sync selection to collaborators
                  if (isCollaborative) {
                    updateSelection(ids);
                  }
                }}
                selectedCurvePointIndex={selectedCurvePointIndex}
                setSelectedCurvePointIndex={setSelectedCurvePointIndex}
                editingCurveId={editingCurveId}
                onEditingCurveIdChange={setEditingCurveId}
                blockCanvasClicksRef={blockCanvasClicksRef}
                skipNormalizationRef={skipNormalizationRef}
                fitToContentKey={fitToContentKey}
                polygonSides={polygonSides}
                setPolygonSides={setPolygonSides}
                rectDefaults={{
                  fill: rectDefaults.fill,
                  stroke: rectDefaults.stroke,
                  strokeWidth: rectDefaults.strokeWidth ?? 1,
                  radius: rectDefaults.radius ?? 0,
                  opacity: rectDefaults.opacity ?? 1,
                  strokeDash: rectDefaults.strokeDash,
                }}
                lineDefaults={lineDefaults}
                curveDefaults={curveDefaults}
                drawDefaults={drawDefaults}
                textDefaults={textDefaults}
                viewportTransition={viewportTransition}
                onViewportChange={handleViewportChange}
                snapToGrid={snapToGrid}
                snapToObjects={snapToObjects}
                snapToSpacing={snapToSpacing}
                gridSize={gridSize}
                snapAnchor={snapAnchor}
                activeTheme={activeTheme}
                />
              );
            })()}
            {/* Proposal preview indicator */}
            {viewingProposedSpec && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg font-semibold text-sm z-50">
                👁️ Viewing Proposed Changes
              </div>
            )}
            {/* Collaboration presence overlays */}
            {isCollaborative && (
              <>
                <CursorOverlay collaborators={collaborators} localClientId={clientId} zoom={viewport.scale} pan={{ x: viewport.x, y: viewport.y }} />
                <SelectionOverlay
                  collaborators={collaborators}
                  localClientId={clientId}
                  getNodeBounds={(nodeId) => {
                    // Find node and return its bounds
                    const node = findNode(spec.root, nodeId);
                    if (!node || !('position' in node) || !('size' in node)) return null;
                    const pos = node.position as { x: number; y: number } | undefined;
                    const size = node.size as { width: number; height: number } | undefined;
                    if (!pos || !size) return null;
                    return { x: pos.x, y: pos.y, width: size.width, height: size.height };
                  }}
                  zoom={viewport.scale}
                  pan={{ x: viewport.x, y: viewport.y }}
                />
              </>
            )}
          </div>
        </main>
        {/* Right attributes panel */}
        {!sidebarVisible && (
          <>
            <button
              onClick={() => {
                setSidebarVisible(true);
              }}
              className="fixed right-0 z-10 h-12 bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 shadow-md transition-colors flex items-center justify-center"
              title="Show Panel"
              style={{ 
                padding: 0,
                width: '20px',
                top: '116px',
                borderRadius: '8px 0 0 8px',
                borderLeft: '1px solid #9ca3af',
                borderTop: '1px solid #9ca3af',
                borderBottom: '1px solid #9ca3af'
              }}
            >
              <span className="text-xs text-gray-600">◀</span>
            </button>
            <button
              onClick={() => {
                setSidebarVisible(true);
                setPanelMode('attributes');
              }}
              className={`fixed right-0 z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'attributes'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Show Attributes"
              style={{ 
                padding: 0,
                width: '20px',
                top: '168px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'attributes' ? 'text-white' : 'text-gray-700'}`}
                style={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                ATTRIBUTES
              </span>
            </button>
            <button
              onClick={() => {
                setSidebarVisible(true);
                setPanelMode('theme');
              }}
              className={`fixed right-0 z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'theme'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Show Theme"
              style={{
                padding: 0,
                width: '20px',
                top: '300px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'theme' ? 'text-white' : 'text-gray-700'}`}
                style={{
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                THEME
              </span>
            </button>
            <button
              onClick={() => {
                setSidebarVisible(true);
                setPanelMode('agent');
              }}
              className={`fixed right-0 z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'agent'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Show Agent Control"
              style={{ 
                padding: 0,
                width: '20px',
                top: '432px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'agent' ? 'text-white' : 'text-gray-700'}`}
                style={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                AGENT
              </span>
            </button>
          </>
        )}
        {sidebarVisible && (
          <aside className="w-72 border-l border-gray-200 bg-gradient-to-b from-white to-gray-50 flex flex-col shadow-sm relative">
            {/* Vertical tab buttons on left edge — collapse first, then panel tabs */}
            <button
              onClick={() => setSidebarVisible(false)}
              className="fixed z-10 h-12 bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 shadow-md transition-colors flex items-center justify-center"
              title="Hide Panel"
              style={{ 
                padding: 0,
                width: '20px',
                top: '116px',
                right: '288px',
                borderRadius: '8px 0 0 8px',
                borderLeft: '1px solid #9ca3af',
                borderTop: '1px solid #9ca3af',
                borderBottom: '1px solid #9ca3af'
              }}
            >
              <span className="text-xs text-gray-600">▶</span>
            </button>
            <button
              onClick={() => setPanelMode('attributes')}
              className={`fixed z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'attributes'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Attributes"
              style={{ 
                padding: 0,
                width: '20px',
                top: '168px',
                right: '288px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'attributes' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'attributes' ? 'text-white' : 'text-gray-700'}`}
                style={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                ATTRIBUTES
              </span>
            </button>
            <button
              onClick={() => setPanelMode('theme')}
              className={`fixed z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'theme'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Theme"
              style={{
                padding: 0,
                width: '20px',
                top: '300px',
                right: '288px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'theme' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'theme' ? 'text-white' : 'text-gray-700'}`}
                style={{
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                THEME
              </span>
            </button>
            <button
              onClick={() => setPanelMode('agent')}
              className={`fixed z-10 h-32 shadow-md transition-colors flex items-center justify-center ${
                panelMode === 'agent'
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600'
                  : 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500'
              }`}
              title="Agent Control"
              style={{ 
                padding: 0,
                width: '20px',
                top: '432px',
                right: '288px',
                borderRadius: '8px 0 0 8px',
                borderLeft: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`,
                borderTop: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`,
                borderBottom: `1px solid ${panelMode === 'agent' ? '#0d9488' : '#9ca3af'}`
              }}
            >
              <span
                className={`text-[10px] font-semibold ${panelMode === 'agent' ? 'text-white' : 'text-gray-700'}`}
                style={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px'
                }}
              >
                AGENT
              </span>
            </button>
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              {panelMode === 'attributes' ? (
                <>
                  <i className="fa-solid fa-sliders text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Attributes</span>
                </>
              ) : panelMode === 'theme' ? (
                <>
                  <i className="fa-solid fa-palette text-teal-500" />
                  <span className="text-sm font-semibold text-gray-700">Theme</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles text-teal-500" />
                  <span className="text-sm font-semibold text-gray-700">Agent Control</span>
                </>
              )}
            </div>
            <div className="p-4 text-xs text-gray-600 space-y-4 overflow-auto flex-1">
              {panelMode === 'attributes' && (
                <AttributesSidebar
                  spec={spec}
                  setSpec={setSpec}
                  selectedIds={selectedIds}
                  tool={tool}
                  editingCurveId={editingCurveId}
                  setEditingCurveId={setEditingCurveId}
                  selectedCurvePointIndex={selectedCurvePointIndex}
                  setSelectedCurvePointIndex={setSelectedCurvePointIndex}
                  attributeTab={attributeTab}
                  setAttributeTab={setAttributeTab}
                  draggingGroupIndex={draggingGroupIndex}
                  setDraggingGroupIndex={setDraggingGroupIndex}
                  dragOverGroupIndex={dragOverGroupIndex}
                  setDragOverGroupIndex={setDragOverGroupIndex}
                  lastFillById={lastFillById}
                  setLastFillById={setLastFillById}
                  lastStrokeById={lastStrokeById}
                  setLastStrokeById={setLastStrokeById}
                  rawDashInput={rawDashInput}
                  setRawDashInput={setRawDashInput}
                  beginRecentSession={beginRecentSession}
                  previewRecent={wrappedPreviewRecent}
                  commitRecent={commitRecent}
                  pushRecent={pushRecent}
                  recentColors={recentColors}
                  rectDefaults={rectDefaults}
                  updateRectDefaults={updateRectDefaults}
                  activeFlowId={activeFlowId}
                  setActiveFlowId={setActiveFlowId}
                  updateFlows={updateFlows}
                  focusScreen={focusScreen}
                  playTransitionPreview={playTransitionPreview}
                  setSelection={setSelection}
                  isCollaborative={isCollaborative}
                  updateSelection={updateSelection}
                  blockCanvasClicksRef={blockCanvasClicksRef}
                  skipNormalizationRef={skipNormalizationRef}
                  activeTheme={activeTheme}
                />
              )}

              {/* Theme Panel Content */}
              {panelMode === 'theme' && (
                <>
                <KulrsPalettePanel
                  onPickColor={(hex) => pushRecent(hex)}
                  onApplyFill={selectedIds.length === 1 ? (hex) => {
                    setSpec(prev => ({
                      ...prev,
                      root: updateNode(prev.root, selectedIds[0], { fill: hex, fillGradient: undefined })
                    }));
                    pushRecent(hex);
                  } : undefined}
                  onApplyStroke={selectedIds.length === 1 ? (hex) => {
                    setSpec(prev => ({
                      ...prev,
                      root: updateNode(prev.root, selectedIds[0], { stroke: hex })
                    }));
                    pushRecent(hex);
                  } : undefined}
                  spec={spec}
                  setSpec={setSpec}
                  onApplyAsTheme={handleApplyPaletteAsTheme}
                />
                <ThemePanel
                  theme={activeTheme}
                  onUpdateTokenColor={updateTokenColor}
                  onUpdateTypography={updateTypography}
                  onUpdatePaletteOrder={updatePaletteOrder}
                  onToggleMode={toggleThemeMode}
                  onClearTheme={handleClearTheme}
                  onPickThemeColor={(hex, token) => {
                    // Apply to selection fill if something is selected
                    if (selectedIds.length === 1) {
                      setSpec(prev => ({
                        ...prev,
                        root: {
                          ...prev.root,
                          children: prev.root.children.map(function updateNode(n: LayoutNode): LayoutNode {
                            if (n.id === selectedIds[0]) {
                              return {
                                ...n,
                                fill: hex,
                                fillGradient: undefined,
                                themeBindings: {
                                  ...((n as unknown as Record<string, unknown>)?.themeBindings as Record<string, unknown> ?? {}),
                                  fill: token,
                                },
                              } as LayoutNode;
                            }
                            if ('children' in n && Array.isArray((n as { children?: LayoutNode[] }).children)) {
                              return { ...n, children: (n as { children: LayoutNode[] }).children.map(updateNode) } as LayoutNode;
                            }
                            return n;
                          }),
                        } as FrameNode,
                      }));
                    }
                    pushRecent(hex);
                    handlePickThemeColor(hex, token);
                  }}
                />
                </>
              )}

              {/* Agent Panel Content */}
              {panelMode === 'agent' && (
                <AgentPanel
                  currentCanvasId={currentCanvasId}
                  setCurrentCanvasId={setCurrentCanvasId}
                  creatingCanvasId={creatingCanvasId}
                  setCreatingCanvasId={setCreatingCanvasId}
                  currentDesignName={currentDesignName}
                  spec={spec}
                  proposals={proposals}
                  selectedProposalId={selectedProposalId}
                  setSelectedProposalId={setSelectedProposalId}
                  viewingProposedSpec={viewingProposedSpec}
                  setViewingProposedSpec={setViewingProposedSpec}
                  setSpec={setSpec}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'success' ? 'bg-green-600 text-white' :
          toast.type === 'warning' ? 'bg-amber-500 text-white' :
          'bg-gray-800 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
