/**
 * Interaction State Management
 * 
 * Central state manager for all canvas interactions. Uses a state machine pattern
 * to ensure clean transitions and prevent conflicting interaction modes.
 */

import type { Point, Bounds } from './CoordinateSystem';

export type InteractionMode = 
  | 'idle'
  | 'selecting'
  | 'dragging' 
  | 'marquee'
  | 'panning'
  | 'transforming'
  | 'contextMenu';

export interface SelectionState {
  selectedIds: string[];
  bounds: Map<string, Bounds>; // World-space bounds cache
  lastUpdate: number;
}

export interface DragState {
  nodeIds: string[];
  startPoint: Point; // World coordinates
  currentPoint: Point; // World coordinates
  initialPositions: Map<string, Point>; // World coordinates
  threshold: number;
  hasPassedThreshold: boolean;
}

export interface MarqueeState {
  startPoint: Point; // World coordinates
  currentPoint: Point; // World coordinates
  isShiftModifier: boolean;
  initialSelection: string[];
}

export interface PanState {
  startPoint: Point; // Screen coordinates
  lastPoint: Point; // Screen coordinates
}

export interface ContextMenuState {
  screenPosition: Point;
  targetNodeId?: string;
}

export interface InteractionState {
  mode: InteractionMode;
  selection: SelectionState;
  drag?: DragState;
  marquee?: MarqueeState;
  pan?: PanState;
  contextMenu?: ContextMenuState;
}

export type StateChangeListener = (state: InteractionState) => void;

export class InteractionStateManager {
  private state: InteractionState;
  private listeners: Set<StateChangeListener> = new Set();

  constructor() {
    this.state = {
      mode: 'idle',
      selection: {
        selectedIds: [],
        bounds: new Map(),
        lastUpdate: Date.now(),
      },
    };
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<InteractionState> {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update selection
   */
  setSelection(selectedIds: string[], bounds?: Map<string, Bounds>): void {
    this.state.selection = {
      selectedIds: [...selectedIds],
      bounds: bounds || new Map(),
      lastUpdate: Date.now(),
    };
    this.notifyListeners();
  }

  /**
   * Add to selection
   */
  addToSelection(nodeId: string, bounds?: Bounds): void {
    if (!this.state.selection.selectedIds.includes(nodeId)) {
      this.state.selection.selectedIds.push(nodeId);
      if (bounds) {
        this.state.selection.bounds.set(nodeId, bounds);
      }
      this.state.selection.lastUpdate = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * Remove from selection
   */
  removeFromSelection(nodeId: string): void {
    const index = this.state.selection.selectedIds.indexOf(nodeId);
    if (index !== -1) {
      this.state.selection.selectedIds.splice(index, 1);
      this.state.selection.bounds.delete(nodeId);
      this.state.selection.lastUpdate = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.state.selection = {
      selectedIds: [],
      bounds: new Map(),
      lastUpdate: Date.now(),
    };
    this.notifyListeners();
  }

  /**
   * Start drag operation
   */
  startDrag(nodeIds: string[], startPoint: Point, initialPositions: Map<string, Point>): boolean {
    if (this.state.mode !== 'idle' && this.state.mode !== 'selecting') {
      return false;
    }

    this.state.mode = 'dragging';
    this.state.drag = {
      nodeIds: [...nodeIds],
      startPoint,
      currentPoint: startPoint,
      initialPositions: new Map(initialPositions),
      threshold: 3,
      hasPassedThreshold: false,
    };
    this.notifyListeners();
    return true;
  }

  /**
   * Update drag position
   */
  updateDrag(currentPoint: Point): boolean {
    if (this.state.mode !== 'dragging' || !this.state.drag) {
      return false;
    }

    this.state.drag.currentPoint = currentPoint;

    // Check if we've passed the threshold
    if (!this.state.drag.hasPassedThreshold) {
      const dx = currentPoint.x - this.state.drag.startPoint.x;
      const dy = currentPoint.y - this.state.drag.startPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance >= this.state.drag.threshold) {
        this.state.drag.hasPassedThreshold = true;
      }
    }

    this.notifyListeners();
    return true;
  }

  /**
   * End drag operation
   */
  endDrag(): boolean {
    if (this.state.mode !== 'dragging') {
      return false;
    }

    this.state.mode = 'idle';
    this.state.drag = undefined;
    this.notifyListeners();
    return true;
  }

  /**
   * Start marquee selection
   */
  startMarquee(startPoint: Point, isShiftModifier: boolean): boolean {
    if (this.state.mode !== 'idle') {
      return false;
    }

    this.state.mode = 'marquee';
    this.state.marquee = {
      startPoint,
      currentPoint: startPoint,
      isShiftModifier,
      initialSelection: [...this.state.selection.selectedIds],
    };
    this.notifyListeners();
    return true;
  }

  /**
   * Update marquee selection
   */
  updateMarquee(currentPoint: Point): boolean {
    if (this.state.mode !== 'marquee' || !this.state.marquee) {
      return false;
    }

    this.state.marquee.currentPoint = currentPoint;
    this.notifyListeners();
    return true;
  }

  /**
   * End marquee selection
   */
  endMarquee(): boolean {
    if (this.state.mode !== 'marquee') {
      return false;
    }

    this.state.mode = 'idle';
    this.state.marquee = undefined;
    this.notifyListeners();
    return true;
  }

  /**
   * Start panning
   */
  startPan(startPoint: Point): boolean {
    if (this.state.mode !== 'idle') {
      return false;
    }

    this.state.mode = 'panning';
    this.state.pan = {
      startPoint,
      lastPoint: startPoint,
    };
    this.notifyListeners();
    return true;
  }

  /**
   * Update pan
   */
  updatePan(currentPoint: Point): boolean {
    if (this.state.mode !== 'panning' || !this.state.pan) {
      return false;
    }

    this.state.pan.lastPoint = currentPoint;
    this.notifyListeners();
    return true;
  }

  /**
   * End panning
   */
  endPan(): boolean {
    if (this.state.mode !== 'panning') {
      return false;
    }

    this.state.mode = 'idle';
    this.state.pan = undefined;
    this.notifyListeners();
    return true;
  }

  /**
   * Show context menu
   */
  showContextMenu(screenPosition: Point, targetNodeId?: string): boolean {
    this.state.mode = 'contextMenu';
    this.state.contextMenu = {
      screenPosition,
      targetNodeId,
    };
    this.notifyListeners();
    return true;
  }

  /**
   * Hide context menu
   */
  hideContextMenu(): boolean {
    if (this.state.mode !== 'contextMenu') {
      return false;
    }

    this.state.mode = 'idle';
    this.state.contextMenu = undefined;
    this.notifyListeners();
    return true;
  }

  /**
   * Force reset to idle state
   */
  reset(): void {
    this.state.mode = 'idle';
    this.state.drag = undefined;
    this.state.marquee = undefined;
    this.state.pan = undefined;
    this.state.contextMenu = undefined;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}