/**
 * Marquee Selection Handler
 * 
 * Handles marquee (drag-to-select) operations with zoom-aware rectangle drawing
 * and intersection detection. Works in world coordinates for accurate selection.
 */

import type { Point, Bounds } from './CoordinateSystem';
import type { InteractionStateManager } from './InteractionState';
import type { CanvasEvent } from './EventRouter';
import { BaseEventHandler } from './EventRouter';
import type { InteractionMode } from './InteractionState';
import type { SelectionManager } from './SelectionManager';

export interface MarqueeOptions {
  minSize: number; // Minimum marquee size in screen pixels
  visualStyle: {
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
    fillOpacity: number;
    dashArray?: number[];
  };
}

export interface MarqueeEvent {
  type: 'start' | 'update' | 'end' | 'cancel';
  bounds: Bounds; // World coordinates
  screenBounds: Bounds; // Screen coordinates
  addToSelection: boolean;
}

export type MarqueeEventListener = (event: MarqueeEvent) => void;

export class MarqueeHandler extends BaseEventHandler {
  private stateManager: InteractionStateManager;
  private selectionManager: SelectionManager;
  private options: MarqueeOptions;
  private listeners: Set<MarqueeEventListener> = new Set();
  private worldToScreen: (point: Point) => Point;

  constructor(
    stateManager: InteractionStateManager,
    selectionManager: SelectionManager,
    worldToScreen: (point: Point) => Point,
    options: Partial<MarqueeOptions> = {}
  ) {
    super(80); // Lower priority than selection and drag
    this.stateManager = stateManager;
    this.selectionManager = selectionManager;
    this.worldToScreen = worldToScreen;
    this.options = {
      minSize: 5,
      visualStyle: {
        strokeColor: '#0066ff',
        strokeWidth: 1,
        fillColor: '#0066ff',
        fillOpacity: 0.1,
        dashArray: [4, 4],
      },
      ...options,
    };
  }

  /**
   * Subscribe to marquee events
   */
  subscribe(listener: MarqueeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update marquee options
   */
  setOptions(options: Partial<MarqueeOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * EventHandler implementation
   */
  canHandle(event: CanvasEvent, mode: InteractionMode): boolean {
    if (mode === 'idle' && this.isEvent(event, 'mousedown', { button: 0 })) {
      // Can start marquee on empty canvas
      return !event.targetNodeId;
    }
    
    if (mode === 'marquee') {
      return this.isEvent(event, 'mousemove') || this.isEvent(event, 'mouseup');
    }

    return false;
  }

  handle(event: CanvasEvent): boolean {
    if (event.type === 'mousedown' && !event.targetNodeId) {
      return this.handleMouseDown(event);
    }

    const state = this.stateManager.getState();
    if (state.mode === 'marquee') {
      if (event.type === 'mousemove') {
        return this.handleMouseMove(event);
      } else if (event.type === 'mouseup') {
        return this.handleMouseUp(event);
      }
    }

    return false;
  }

  /**
   * Get current marquee bounds in world coordinates
   */
  getCurrentMarqueeBounds(): Bounds | null {
    const state = this.stateManager.getState();
    if (state.mode !== 'marquee' || !state.marquee) {
      return null;
    }

    return this.calculateWorldBounds(
      state.marquee.startPoint,
      state.marquee.currentPoint
    );
  }

  /**
   * Get current marquee bounds in screen coordinates
   */
  getCurrentMarqueeScreenBounds(): Bounds | null {
    const state = this.stateManager.getState();
    if (state.mode !== 'marquee' || !state.marquee) {
      return null;
    }

    const startScreen = this.worldToScreen(state.marquee.startPoint);
    const currentScreen = this.worldToScreen(state.marquee.currentPoint);

    return this.calculateScreenBounds(startScreen, currentScreen);
  }

  private handleMouseDown(event: CanvasEvent): boolean {
    // Start marquee selection
    const success = this.stateManager.startMarquee(
      event.worldPosition,
      event.modifiers.shift || event.modifiers.ctrl
    );

    if (success) {
      const bounds = this.calculateWorldBounds(event.worldPosition, event.worldPosition);
      const screenBounds = this.calculateScreenBounds(
        this.worldToScreen(event.worldPosition),
        this.worldToScreen(event.worldPosition)
      );

      this.notifyListeners({
        type: 'start',
        bounds,
        screenBounds,
        addToSelection: event.modifiers.shift || event.modifiers.ctrl,
      });
    }

    return success;
  }

  private handleMouseMove(event: CanvasEvent): boolean {
    const state = this.stateManager.getState();
    if (!state.marquee) return false;

    // Update marquee state
    const success = this.stateManager.updateMarquee(event.worldPosition);
    if (!success) return false;

    // Check if marquee is large enough to be visible
    const startScreen = this.worldToScreen(state.marquee.startPoint);
    const currentScreen = this.worldToScreen(event.worldPosition);
    const screenBounds = this.calculateScreenBounds(startScreen, currentScreen);

    if (screenBounds.width < this.options.minSize && screenBounds.height < this.options.minSize) {
      return true; // Consume event but don't update selection yet
    }

    // Calculate world bounds and update selection preview
    const worldBounds = this.calculateWorldBounds(
      state.marquee.startPoint,
      event.worldPosition
    );

    // Update selection based on marquee
    this.updateSelectionFromMarquee(worldBounds, state.marquee.isShiftModifier);

    // Notify listeners
    this.notifyListeners({
      type: 'update',
      bounds: worldBounds,
      screenBounds,
      addToSelection: state.marquee.isShiftModifier,
    });

    return true;
  }

  private handleMouseUp(event: CanvasEvent): boolean {
    const state = this.stateManager.getState();
    if (!state.marquee) return false;

    // Calculate final bounds
    const worldBounds = this.calculateWorldBounds(
      state.marquee.startPoint,
      event.worldPosition
    );
    
    const screenBounds = this.calculateScreenBounds(
      this.worldToScreen(state.marquee.startPoint),
      this.worldToScreen(event.worldPosition)
    );

    // Only apply selection if marquee is large enough
    const isValidMarquee = screenBounds.width >= this.options.minSize || 
                          screenBounds.height >= this.options.minSize;

    if (isValidMarquee) {
      // Finalize selection
      this.selectionManager.selectInBounds(worldBounds, state.marquee.isShiftModifier);
    }

    // End marquee operation
    this.stateManager.endMarquee();

    // Notify listeners
    this.notifyListeners({
      type: 'end',
      bounds: worldBounds,
      screenBounds,
      addToSelection: state.marquee.isShiftModifier,
    });

    return true;
  }

  private calculateWorldBounds(start: Point, end: Point): Bounds {
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private calculateScreenBounds(start: Point, end: Point): Bounds {
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private updateSelectionFromMarquee(bounds: Bounds, addToSelection: boolean): void {
    // Get nodes intersecting with marquee
    const intersectingNodes = this.selectionManager.getNodesInBounds(bounds);
    const nodeIds = intersectingNodes.map(node => node.id);

    // Update selection
    if (nodeIds.length > 0) {
      this.selectionManager.selectNodes(nodeIds, addToSelection);
    }
  }

  private notifyListeners(event: MarqueeEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}