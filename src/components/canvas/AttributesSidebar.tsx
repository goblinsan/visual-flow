import type { JSX } from "react";
import { findNode, findParentNode, updateNode, type SpecPatch } from '../../utils/specUtils';
import RectAttributesPanel from '../RectAttributesPanel';
import EllipseAttributesPanel from '../EllipseAttributesPanel';
import LineAttributesPanel from '../LineAttributesPanel';
import CurveAttributesPanel from '../CurveAttributesPanel';
import PolygonAttributesPanel from '../PolygonAttributesPanel';
import TextAttributesPanel from '../TextAttributesPanel';
import ImageAttributesPanel from '../ImageAttributesPanel';
import DefaultsPanel from '../DefaultsPanel';
import { FlowAttributesPanel } from '../FlowAttributesPanel';
import type { RectDefaults } from '../../hooks/usePersistentRectDefaults';
import type {
  LayoutSpec,
  LayoutNode,
  RectNode,
  EllipseNode,
  LineNode,
  CurveNode,
  PolygonNode,
  TextNode,
  ImageNode,
  FlowTransition,
  Flow,
} from "../../layout-schema";

interface AttributesSidebarProps {
  spec: LayoutSpec;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  selectedIds: string[];
  tool: string;
  editingCurveId: string | null;
  setEditingCurveId: (id: string | null) => void;
  selectedCurvePointIndex: number | null;
  setSelectedCurvePointIndex: (index: number | null) => void;
  attributeTab: 'element' | 'flow';
  setAttributeTab: (tab: 'element' | 'flow') => void;
  draggingGroupIndex: number | null;
  setDraggingGroupIndex: (index: number | null) => void;
  dragOverGroupIndex: number | null;
  setDragOverGroupIndex: (index: number | null) => void;
  lastFillById: Record<string, string>;
  setLastFillById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lastStrokeById: Record<string, string>;
  setLastStrokeById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  rawDashInput: string;
  setRawDashInput: (value: string) => void;
  beginRecentSession: () => void;
  previewRecent: (c?: string) => void;
  commitRecent: (c?: string) => void;
  pushRecent: (c?: string) => void;
  recentColors: string[];
  rectDefaults: RectDefaults;
  updateRectDefaults: (updates: Partial<RectDefaults>) => void;
  activeFlowId: string | null;
  setActiveFlowId: (id: string | null) => void;
  updateFlows: (flows: Flow[]) => void;
  focusScreen: (screenId: string) => void;
  playTransitionPreview: (toId: string, transition?: FlowTransition) => void;
  setSelection: (ids: string[]) => void;
  isCollaborative: boolean;
  updateSelection: (ids: string[]) => void;
  blockCanvasClicksRef: React.RefObject<boolean>;
  skipNormalizationRef: React.RefObject<boolean>;
}

export function AttributesSidebar({
  spec,
  setSpec,
  selectedIds,
  tool,
  editingCurveId,
  setEditingCurveId,
  selectedCurvePointIndex,
  setSelectedCurvePointIndex,
  attributeTab,
  setAttributeTab,
  draggingGroupIndex,
  setDraggingGroupIndex,
  dragOverGroupIndex,
  setDragOverGroupIndex,
  lastFillById,
  setLastFillById,
  lastStrokeById,
  setLastStrokeById,
  rawDashInput,
  setRawDashInput,
  beginRecentSession,
  previewRecent,
  commitRecent,
  pushRecent,
  recentColors,
  rectDefaults,
  updateRectDefaults,
  activeFlowId,
  setActiveFlowId,
  updateFlows,
  focusScreen,
  playTransitionPreview,
  setSelection,
  isCollaborative,
  updateSelection,
  blockCanvasClicksRef,
  skipNormalizationRef,
}: AttributesSidebarProps): JSX.Element {
  return (
    <>
      {/* Show CV panel when editing a curve */}
      {editingCurveId && (() => {
        const curveNode = findNode(spec.root, editingCurveId) as CurveNode | null;
        if (!curveNode || curveNode.type !== 'curve') return null;
        
        const points = curveNode.points as number[];
        const cvPoints: Array<{x: number, y: number, index: number}> = [];
        for (let i = 0; i < points.length; i += 2) {
          cvPoints.push({ x: points[i], y: points[i + 1], index: i / 2 });
        }
        
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-blue-900">Curve Editing Mode</h3>
                <button
                  onClick={() => setEditingCurveId(null)}
                  className="text-xs px-2 py-1 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                >
                  Exit
                </button>
              </div>
              <p className="text-[11px] text-blue-700">Press Enter or Escape to exit</p>
            </div>
            
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Control Points ({cvPoints.length})</h4>
              <div className="space-y-2">
                {cvPoints.map((cv) => (
                  <div
                    key={cv.index}
                    className={`p-2 rounded border ${
                      selectedCurvePointIndex === cv.index
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    } transition-colors cursor-pointer`}
                    onClick={() => setSelectedCurvePointIndex(cv.index)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium">Point {cv.index + 1}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Delete this CV point
                          const newPoints = [...points];
                          newPoints.splice(cv.index * 2, 2);
                          setSpec(prev => ({
                            ...prev,
                            root: updateNode(prev.root, editingCurveId, { points: newPoints })
                          }));
                          if (selectedCurvePointIndex === cv.index) {
                            setSelectedCurvePointIndex(null);
                          }
                        }}
                        className="text-[10px] px-2 py-0.5 text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      x: {Math.round(cv.x)}, y: {Math.round(cv.y)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Curve Properties</h4>
              <CurveAttributesPanel
                curve={curveNode}
                updateNode={(patch) => {
                  setSpec(prev => ({
                    ...prev,
                    root: updateNode(prev.root, editingCurveId, patch)
                  }));
                }}
                selectedPointIndex={selectedCurvePointIndex}
                setSelectedPointIndex={setSelectedCurvePointIndex}
                beginRecentSession={beginRecentSession}
                previewRecent={previewRecent}
                commitRecent={commitRecent}
                pushRecent={pushRecent}
                recentColors={recentColors}
              />
            </div>
          </div>
        );
      })()}
      
      {/* Regular attribute panels when not editing curve */}
      {!editingCurveId && (
        <>
          <div className="bg-gray-100/70 rounded-lg p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 flex items-center gap-1.5">
              <i className="fa-solid fa-circle-info text-blue-400" />
              Context
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <span className="text-gray-400">Tool</span><span className="font-medium capitalize">{tool}</span>
              <span className="text-gray-400">Nodes</span><span className="font-medium">{spec.root.children.length}</span>
              <span className="text-gray-400">Selected</span><span className="font-medium">{selectedIds.length}</span>
            </div>
          </div>
          {selectedIds.length === 1 && (() => {
            // Find node
            const node = findNode(spec.root, selectedIds[0]) as LayoutNode | null;
            if (!node) return <div className="text-[11px] text-gray-400">Node not found.</div>;
            
            const createUpdateFn = (nodeId: string) => (patch: SpecPatch) => {
              setSpec(prev => ({
                ...prev,
                root: updateNode(prev.root, nodeId, patch)
              }));
            };

            // All nodes can be marked as screens for flow
            const isScreenEligible = true;
            const screenMeta = node.screen;
            const flows = spec.flows ?? [];

            const removeScreenFromFlows = (screenId: string) => {
              const nextFlows = flows
                .map(f => ({
                  ...f,
                  screenIds: f.screenIds.filter(id => id !== screenId),
                  transitions: f.transitions.filter(t => t.from !== screenId && t.to !== screenId),
                }))
                .filter(f => f.screenIds.length > 0);
              updateFlows(nextFlows);
            };

            const screenPanel = isScreenEligible ? (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-gray-600 flex items-center gap-2">
                  <i className="fa-solid fa-rectangle-list text-gray-400 text-[10px]" />
                  Screen
                </div>
                <label className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={!!screenMeta}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const name = (node.name || `Screen ${selectedIds[0].slice(0, 4)}`) as string;
                        createUpdateFn(node.id)({ screen: { id: node.id, name } });
                        if (!flows.some(f => f.screenIds.includes(node.id))) {
                          const id = `flow_${Date.now().toString(36)}`;
                          updateFlows([...flows, { id, name: `Flow ${flows.length + 1}`, screenIds: [node.id], transitions: [] }]);
                          setActiveFlowId(id);
                        }
                      } else {
                        createUpdateFn(node.id)({ screen: undefined });
                        removeScreenFromFlows(node.id);
                      }
                    }}
                  />
                  Mark as Screen
                </label>
                {screenMeta && (
                  <input
                    value={screenMeta.name}
                    onChange={(e) => createUpdateFn(node.id)({ screen: { id: node.id, name: e.target.value } })}
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-[11px]"
                    placeholder="Screen name"
                  />
                )}
              </div>
            ) : null;

            const flowPanel = screenMeta ? (
              <FlowAttributesPanel
                flows={flows}
                activeFlowId={activeFlowId}
                setActiveFlowId={setActiveFlowId}
                screenId={screenMeta.id}
                screenName={screenMeta.name}
                onUpdateFlows={updateFlows}
                onFocusScreen={focusScreen}
                onSelectScreen={focusScreen}
                onTriggerTransition={(toId, transition) => {
                  focusScreen(toId);
                  playTransitionPreview(toId, transition);
                }}
              />
            ) : null;

            const screenFlowPanel = isScreenEligible ? (
              <>
                {screenPanel}
                {flowPanel}
              </>
            ) : (
              <div className="text-[11px] text-gray-400">Screen/flow attributes are available for groups, frames, stacks, grids, and boxes.</div>
            );

            const renderElementPanelFor = (targetNode: LayoutNode): JSX.Element => {
              if (targetNode.type === 'rect') {
                const rect = targetNode as RectNode;
                const updateRect = createUpdateFn(rect.id);
                return (
                  <RectAttributesPanel
                    rect={rect}
                    lastFillById={lastFillById}
                    lastStrokeById={lastStrokeById}
                    setLastFillById={setLastFillById}
                    setLastStrokeById={setLastStrokeById}
                    updateRect={updateRect}
                    rawDashInput={rawDashInput}
                    setRawDashInput={setRawDashInput}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }

              if (targetNode.type === 'ellipse') {
                const ellipse = targetNode as EllipseNode;
                const updateEllipse = createUpdateFn(ellipse.id);
                return (
                  <EllipseAttributesPanel
                    ellipse={ellipse}
                    lastFillById={lastFillById}
                    lastStrokeById={lastStrokeById}
                    setLastFillById={setLastFillById}
                    setLastStrokeById={setLastStrokeById}
                    updateNode={updateEllipse}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }

              if (targetNode.type === 'line') {
                const line = targetNode as LineNode;
                const updateLine = createUpdateFn(line.id);
                return (
                  <LineAttributesPanel
                    line={line}
                    updateNode={updateLine}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }

              if (targetNode.type === 'curve') {
                const curve = targetNode as CurveNode;
                const updateCurve = createUpdateFn(curve.id);
                return (
                  <CurveAttributesPanel
                    curve={curve}
                    updateNode={updateCurve}
                    selectedPointIndex={selectedCurvePointIndex}
                    setSelectedPointIndex={setSelectedCurvePointIndex}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }

              if (targetNode.type === 'polygon') {
                const polygon = targetNode as PolygonNode;
                const updatePolygon = createUpdateFn(polygon.id);
                return (
                  <PolygonAttributesPanel
                    polygon={polygon}
                    lastFillById={lastFillById}
                    lastStrokeById={lastStrokeById}
                    setLastFillById={setLastFillById}
                    setLastStrokeById={setLastStrokeById}
                    updateNode={updatePolygon}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }

              if (targetNode.type === 'text') {
                const textNode = targetNode as TextNode;
                const updateText = createUpdateFn(textNode.id);
                return (
                  <TextAttributesPanel
                    textNode={textNode}
                    updateNode={updateText}
                    beginRecentSession={beginRecentSession}
                    previewRecent={previewRecent}
                    commitRecent={commitRecent}
                    pushRecent={pushRecent}
                    recentColors={recentColors}
                  />
                );
              }

              if (targetNode.type === 'image') {
                const imageNode = targetNode as ImageNode;
                const updateImage = createUpdateFn(imageNode.id);
                return (
                  <ImageAttributesPanel
                    imageNode={imageNode}
                    updateNode={updateImage}
                  />
                );
              }

              return <div className="text-[11px] text-gray-400">No editable attributes for type: {targetNode.type}</div>;
            };

            const elementPanel = renderElementPanelFor(node);
            const groupChildren = node.children;
            const hasChildren = Array.isArray(groupChildren) && groupChildren.length > 0;
            
            // Always show Screen/Flow option for all elements
            const showScreenFlowTab = isScreenEligible;
            
            const moveChild = (fromIndex: number, toIndex: number) => {
              if (!groupChildren) return;
              if (toIndex < 0 || toIndex >= groupChildren.length) return;
              const nextChildren = [...groupChildren];
              const [moved] = nextChildren.splice(fromIndex, 1);
              nextChildren.splice(toIndex, 0, moved);
              createUpdateFn(node.id)({ children: nextChildren });
            };

            const orderedChildren = groupChildren
              ? groupChildren.map((child, index) => ({ child, index })).reverse()
              : [];

            const moveChildByDisplayIndex = (fromDisplayIndex: number, toDisplayIndex: number) => {
              if (!groupChildren) return;
              if (toDisplayIndex < 0 || toDisplayIndex >= orderedChildren.length) return;
              const fromOriginal = orderedChildren[fromDisplayIndex].index;
              const toOriginal = orderedChildren[toDisplayIndex].index;
              if (fromOriginal === toOriginal) return;
              moveChild(fromOriginal, toOriginal);
            };

            const groupPanel = hasChildren ? (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-gray-600 flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-gray-400 text-[10px]" />
                  Elements
                </div>
                <div className="space-y-2">
                  {orderedChildren.map(({ child }, displayIndex) => (
                    <details
                      key={child.id}
                      className={`rounded-md border ${dragOverGroupIndex === displayIndex ? 'border-blue-400' : 'border-gray-200'} bg-white/70`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverGroupIndex(displayIndex);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragOverGroupIndex(displayIndex);
                      }}
                      onDragLeave={() => {
                        if (dragOverGroupIndex === displayIndex) setDragOverGroupIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggingGroupIndex === null) return;
                        moveChildByDisplayIndex(draggingGroupIndex, displayIndex);
                        setDraggingGroupIndex(null);
                        setDragOverGroupIndex(null);
                      }}
                    >
                      <summary
                        className="cursor-pointer select-none px-2 py-1.5 text-[11px] text-gray-600 flex items-center justify-between gap-2"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', child.id);
                          setDraggingGroupIndex(displayIndex);
                          setDragOverGroupIndex(displayIndex);
                        }}
                        onDragEnd={() => {
                          setDraggingGroupIndex(null);
                          setDragOverGroupIndex(null);
                        }}
                      >
                        <span
                          className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-gray-600 cursor-grab"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          aria-label="Reorder layer"
                        >
                          <i className="fa-solid fa-grip-vertical text-[10px]" />
                        </span>
                        <span className="font-medium truncate">
                          {child.name ?? (child.type === 'text' ? child.text : undefined) ?? `Untitled ${child.type}`}
                        </span>
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">{child.type}</span>
                      </summary>
                      <div className="px-2 py-2 space-y-2">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-gray-400">Name</div>
                          <input
                            value={(child.name as string) ?? ''}
                            onChange={(e) => createUpdateFn(child.id)({ name: e.target.value })}
                            className="w-full border border-gray-200 rounded-md px-2 py-1 text-[11px]"
                            placeholder="Layer name"
                          />
                        </div>
                        {/* Navigate into nested groups */}
                        {(['group', 'frame', 'stack', 'grid'].includes(child.type) && 'children' in child && (child.children as any[]).length > 0) && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Set flags IMMEDIATELY on mousedown, before canvas events
                              blockCanvasClicksRef.current = true;
                              skipNormalizationRef.current = true;
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              
                              const targetId = child.id;
                              // Skip normalization for nested group selection
                              skipNormalizationRef.current = true;
                              setSelection([targetId]);
                              // Also sync to collaboration if enabled
                              if (isCollaborative) {
                                updateSelection([targetId]);
                              }
                              // Reset flags after a short delay
                              setTimeout(() => {
                                blockCanvasClicksRef.current = false;
                                skipNormalizationRef.current = false;
                              }, 100);
                            }}
                            onMouseUp={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="w-full px-2 py-1.5 text-[11px] bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <i className="fa-solid fa-arrow-right-to-bracket" />
                            Edit Nested Group ({(child.children as any[]).length} children)
                          </button>
                        )}
                        {renderElementPanelFor(child)}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-gray-400">No child elements to edit.</div>
            );

            // Check if this node has a parent that's a group/frame/stack/grid (but not the root)
            const parentNode = findParentNode(spec.root, node.id);
            const hasGroupParent = parentNode && parentNode.id !== spec.root.id && ['group', 'frame', 'stack', 'grid'].includes(parentNode.type);

            // Show element panel alone if no children and no Screen/Flow support
            if (!hasChildren && !showScreenFlowTab) {
              return (
                <>
                  {hasGroupParent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Skip normalization for parent group selection
                        skipNormalizationRef.current = true;
                        setSelection([parentNode.id]);
                        if (isCollaborative) {
                          updateSelection([parentNode.id]);
                        }
                        // Reset flag after a short delay
                        setTimeout(() => {
                          skipNormalizationRef.current = false;
                        }, 100);
                      }}
                      className="w-full px-2 py-1.5 mb-2 text-[11px] bg-gray-50 text-gray-600 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-arrow-left" />
                      Back to Parent Group
                    </button>
                  )}
                  {elementPanel}
                </>
              );
            }
            
            // Show tabs if has children OR supports Screen/Flow
            if (hasChildren || showScreenFlowTab) {
              return (
                <>
                  {hasGroupParent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Skip normalization for parent group selection
                        skipNormalizationRef.current = true;
                        setSelection([parentNode.id]);
                        if (isCollaborative) {
                          updateSelection([parentNode.id]);
                        }
                        // Reset flag after a short delay
                        setTimeout(() => {
                          skipNormalizationRef.current = false;
                        }, 100);
                      }}
                      className="w-full px-2 py-1.5 mb-2 text-[11px] bg-gray-50 text-gray-600 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-arrow-left" />
                      Back to Parent Group
                    </button>
                  )}
                  <div className="flex items-center gap-1 rounded-md bg-gray-100 p-1 text-[11px]">
                    <button
                      className={`flex-1 rounded-md px-2 py-1 transition ${attributeTab === 'element' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setAttributeTab('element')}
                    >
                      {hasChildren ? 'Group' : 'Element'}
                    </button>
                    {showScreenFlowTab && (
                      <button
                        className={`flex-1 rounded-md px-2 py-1 transition ${attributeTab === 'flow' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setAttributeTab('flow')}
                      >
                        Screen/Flow
                      </button>
                    )}
                  </div>
                  {attributeTab === 'element' && hasChildren ? groupPanel : (attributeTab === 'flow' ? screenFlowPanel : elementPanel)}
                </>
              );
            }

            return elementPanel;
          })()}
          {selectedIds.length !== 1 && tool==='rect' && selectedIds.length===0 && (
            <DefaultsPanel
              defaults={rectDefaults}
              updateDefaults={updateRectDefaults}
              beginRecentSession={beginRecentSession}
              previewRecent={previewRecent}
              commitRecent={commitRecent}
              recentColors={recentColors}
            />
          )}
          {selectedIds.length !== 1 && !(tool==='rect' && selectedIds.length===0) && (
            <div className="text-[11px] text-gray-400">{selectedIds.length === 0 ? 'No selection' : 'Multiple selection (attributes coming soon).'}</div>
          )}
        </>
      )}
    </>
  );
}
