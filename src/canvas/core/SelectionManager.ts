/**
 * Selection Manager
 * 
 * Handles single and multi-selection, bounds calculation, and visual feedback.
 * Maintains selection state and provides utilities for selection operations.
 */

import type { Bounds } from './CoordinateSystem';
import type { InteractionStateManager } from './InteractionState';
import type { CanvasEvent } from './EventRouter';
import { BaseEventHandler } from './EventRouter';
import type { InteractionMode } from './InteractionState';

export interface SelectableNode {
  id: string;
  bounds: Bounds; // World coordinates
  type: string;
  visible: boolean;
  selectable: boolean;
}

export interface SelectionOptions {
  multiSelect: boolean;
  selectableTypes?: string[];
  selectionBounds?: Bounds; // Limit selection to specific area
}

export interface SelectionChangeEvent {
  selectedIds: string[];
  addedIds: string[];
  removedIds: string[];
  bounds: Map<string, Bounds>;
}

export type SelectionChangeListener = (event: SelectionChangeEvent) => void;

export class SelectionManager extends BaseEventHandler {
  private stateManager: InteractionStateManager;
  private nodes: Map<string, SelectableNode> = new Map();
  private options: SelectionOptions;
  private listeners: Set<SelectionChangeListener> = new Set();

  constructor(
    stateManager: InteractionStateManager,
    options: SelectionOptions = { multiSelect: true }
  ) {
    super(100); // High priority for selection events
    this.stateManager = stateManager;
    this.options = options;
  }

  /**
   * Update the list of selectable nodes
   */
  updateNodes(nodes: SelectableNode[]): void {
    this.nodes.clear();
    for (const node of nodes) {
      if (node.selectable && node.visible) {
        this.nodes.set(node.id, node);
      }
    }
  }

  /**
   * Get node by ID
   */
  getNode(id: string): SelectableNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all selectable nodes
   */
  getAllNodes(): SelectableNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get nodes within bounds (for marquee selection)
   */
  getNodesInBounds(bounds: Bounds): SelectableNode[] {
    const result: SelectableNode[] = [];
    
    for (const node of this.nodes.values()) {
      if (this.boundsIntersect(node.bounds, bounds)) {
        result.push(node);
      }
    }

    return result;
  }

  /**
   * Get currently selected nodes
   */
  getSelectedNodes(): SelectableNode[] {
    const state = this.stateManager.getState();
    return state.selection.selectedIds
      .map(id => this.nodes.get(id))
      .filter((node): node is SelectableNode => !!node);
  }

  /**
   * Get combined bounds of selected nodes
   */
  getSelectionBounds(): Bounds | null {
    const selectedNodes = this.getSelectedNodes();
    if (selectedNodes.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of selectedNodes) {
      minX = Math.min(minX, node.bounds.x);
      minY = Math.min(minY, node.bounds.y);
      maxX = Math.max(maxX, node.bounds.x + node.bounds.width);
      maxY = Math.max(maxY, node.bounds.y + node.bounds.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Select single node
   */
  selectNode(nodeId: string, addToSelection: boolean = false): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || !this.isSelectable(node)) return false;

    const currentState = this.stateManager.getState();
    const currentIds = currentState.selection.selectedIds;
    
    let newSelectedIds: string[];
    
    if (addToSelection && this.options.multiSelect) {
      // Add to existing selection or remove if already selected
      if (currentIds.includes(nodeId)) {
        newSelectedIds = currentIds.filter(id => id !== nodeId);
      } else {
        newSelectedIds = [...currentIds, nodeId];
      }
    } else {
      // Replace selection
      newSelectedIds = [nodeId];
    }

    this.updateSelection(newSelectedIds);
    return true;
  }

  /**
   * Select multiple nodes
   */
  selectNodes(nodeIds: string[], addToSelection: boolean = false): boolean {
    const validNodes = nodeIds.filter(id => {
      const node = this.nodes.get(id);
      return node && this.isSelectable(node);
    });

    if (validNodes.length === 0) return false;

    const currentState = this.stateManager.getState();
    const currentIds = currentState.selection.selectedIds;
    
    let newSelectedIds: string[];
    
    if (addToSelection && this.options.multiSelect) {
      newSelectedIds = [...new Set([...currentIds, ...validNodes])];
    } else {
      newSelectedIds = validNodes;
    }

    this.updateSelection(newSelectedIds);
    return true;
  }

  /**
   * Select nodes within bounds (marquee selection)
   */
  selectInBounds(bounds: Bounds, addToSelection: boolean = false): boolean {
    const nodesInBounds = this.getNodesInBounds(bounds);
    const nodeIds = nodesInBounds.map(node => node.id);
    return this.selectNodes(nodeIds, addToSelection);
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.updateSelection([]);
  }

  /**
   * Subscribe to selection changes
   */
  subscribe(listener: SelectionChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * EventHandler implementation
   */
  canHandle(event: CanvasEvent, mode: InteractionMode): boolean {
    return mode === 'idle' && this.isEvent(event, 'click', { button: 0 });
  }

  handle(event: CanvasEvent): boolean {
    if (event.targetNodeId) {
      // Click on node
      return this.selectNode(
        event.targetNodeId, 
        event.modifiers.shift || event.modifiers.ctrl
      );
    } else {
      // Click on empty canvas
      if (!event.modifiers.shift && !event.modifiers.ctrl) {
        this.clearSelection();
        return true;
      }
    }
    
    return false;
  }

  private updateSelection(newSelectedIds: string[]): void {
    const currentState = this.stateManager.getState();
    const currentIds = currentState.selection.selectedIds;
    
    // Calculate changes
    const addedIds = newSelectedIds.filter(id => !currentIds.includes(id));
    const removedIds = currentIds.filter(id => !newSelectedIds.includes(id));
    
    // Update bounds cache
    const bounds = new Map<string, Bounds>();
    for (const id of newSelectedIds) {
      const node = this.nodes.get(id);
      if (node) {
        bounds.set(id, node.bounds);
      }
    }

    // Update state
    this.stateManager.setSelection(newSelectedIds, bounds);

    // Notify listeners
    const changeEvent: SelectionChangeEvent = {
      selectedIds: newSelectedIds,
      addedIds,
      removedIds,
      bounds,
    };

    this.listeners.forEach(listener => listener(changeEvent));
  }

  private isSelectable(node: SelectableNode): boolean {
    if (!node.selectable || !node.visible) return false;
    
    if (this.options.selectableTypes && 
        !this.options.selectableTypes.includes(node.type)) {
      return false;
    }

    if (this.options.selectionBounds && 
        !this.boundsIntersect(node.bounds, this.options.selectionBounds)) {
      return false;
    }

    return true;
  }

  private boundsIntersect(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }
}