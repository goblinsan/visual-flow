/**
 * Drag Handler
 * 
 * Manages click-to-drag operations with proper thresholds and coordinate transformations.
 * Handles both single node and multi-selection dragging with collision detection.
 */

import type { Point, Bounds } from './CoordinateSystem';
import type { InteractionStateManager } from './InteractionState';
import type { CanvasEvent } from './EventRouter';
import { BaseEventHandler } from './EventRouter';
import type { InteractionMode } from './InteractionState';

export interface DragConstraints {
  bounds?: Bounds; // World coordinates limiting drag area
  snapToGrid?: {
    enabled: boolean;
    size: number; // Grid size in world coordinates
  };
  collision?: {
    enabled: boolean;
    margin: number; // Collision margin in world coordinates
  };
}

export interface DragEvent {
  type: 'start' | 'move' | 'end' | 'cancel';
  nodeIds: string[];
  startPosition: Point; // World coordinates
  currentPosition: Point; // World coordinates
  delta: Point; // Movement delta in world coordinates
  totalDelta: Point; // Total movement from start
}

export type DragEventListener = (event: DragEvent) => void;

export interface DragOperation {
  nodeIds: string[];
  startPositions: Map<string, Point>; // Original positions in world coordinates
  currentPositions: Map<string, Point>; // Current positions in world coordinates
  constraints: DragConstraints;
  hasPassedThreshold: boolean;
}

export class DragHandler extends BaseEventHandler {
  private stateManager: InteractionStateManager;
  private constraints: DragConstraints;
  private listeners: Set<DragEventListener> = new Set();
  private getNodeBounds: (nodeId: string) => Bounds | undefined;
  private setNodePosition: (nodeId: string, position: Point) => void;
  private getAllNodes: () => { id: string; bounds: Bounds }[];

  constructor(
    stateManager: InteractionStateManager,
    getNodeBounds: (nodeId: string) => Bounds | undefined,
    setNodePosition: (nodeId: string, position: Point) => void,
    getAllNodes: () => { id: string; bounds: Bounds }[],
    constraints: DragConstraints = {}
  ) {
    super(90); // High priority, but lower than selection
    this.stateManager = stateManager;
    this.getNodeBounds = getNodeBounds;
    this.setNodePosition = setNodePosition;
    this.getAllNodes = getAllNodes;
    this.constraints = constraints;
  }

  /**
   * Update drag constraints
   */
  setConstraints(constraints: DragConstraints): void {
    this.constraints = { ...this.constraints, ...constraints };
  }

  /**
   * Subscribe to drag events
   */
  subscribe(listener: DragEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * EventHandler implementation
   */
  canHandle(event: CanvasEvent, mode: InteractionMode): boolean {
    if (mode === 'idle' && this.isEvent(event, 'mousedown', { button: 0 })) {
      // Can start drag on selected node or unselected node
      return !!event.targetNodeId;
    }
    
    if (mode === 'dragging') {
      return this.isEvent(event, 'mousemove') || this.isEvent(event, 'mouseup');
    }

    return false;
  }

  handle(event: CanvasEvent): boolean {
    const state = this.stateManager.getState();

    if (event.type === 'mousedown' && event.targetNodeId) {
      return this.handleMouseDown(event, event.targetNodeId);
    }

    if (state.mode === 'dragging') {
      if (event.type === 'mousemove') {
        return this.handleMouseMove(event);
      } else if (event.type === 'mouseup') {
        return this.handleMouseUp(event);
      }
    }

    return false;
  }

  private handleMouseDown(event: CanvasEvent, targetNodeId: string): boolean {
    const state = this.stateManager.getState();
    const selectedIds = state.selection.selectedIds;
    
    // Determine which nodes to drag
    let nodesToDrag: string[];
    if (selectedIds.includes(targetNodeId)) {
      // Drag all selected nodes
      nodesToDrag = [...selectedIds];
    } else {
      // Drag just the clicked node
      nodesToDrag = [targetNodeId];
    }

    // Get initial positions
    const initialPositions = new Map<string, Point>();
    for (const nodeId of nodesToDrag) {
      const bounds = this.getNodeBounds(nodeId);
      if (bounds) {
        initialPositions.set(nodeId, { x: bounds.x, y: bounds.y });
      }
    }

    // Start drag operation
    const success = this.stateManager.startDrag(
      nodesToDrag,
      event.worldPosition,
      initialPositions
    );

    if (success) {
      this.notifyListeners({
        type: 'start',
        nodeIds: nodesToDrag,
        startPosition: event.worldPosition,
        currentPosition: event.worldPosition,
        delta: { x: 0, y: 0 },
        totalDelta: { x: 0, y: 0 },
      });
    }

    return success;
  }

  private handleMouseMove(event: CanvasEvent): boolean {
    const state = this.stateManager.getState();
    if (!state.drag) return false;

    // Update drag state
    const success = this.stateManager.updateDrag(event.worldPosition);
    if (!success) return false;

    const dragState = state.drag;
    const delta = {
      x: event.worldPosition.x - dragState.startPoint.x,
      y: event.worldPosition.y - dragState.startPoint.y,
    };

    // Only proceed if we've passed the threshold
    if (!dragState.hasPassedThreshold) {
      return true; // Consume event but don't update positions yet
    }

    // Calculate new positions with constraints
    const newPositions = this.calculateNewPositions(dragState, delta);

    // Update node positions
    for (const [nodeId, position] of newPositions) {
      this.setNodePosition(nodeId, position);
    }

    // Notify listeners
    const moveDelta = {
      x: event.worldPosition.x - dragState.currentPoint.x,
      y: event.worldPosition.y - dragState.currentPoint.y,
    };

    this.notifyListeners({
      type: 'move',
      nodeIds: dragState.nodeIds,
      startPosition: dragState.startPoint,
      currentPosition: event.worldPosition,
      delta: moveDelta,
      totalDelta: delta,
    });

    return true;
  }

  private handleMouseUp(event: CanvasEvent): boolean {
    const state = this.stateManager.getState();
    if (!state.drag) return false;

    const dragState = state.drag;
    const totalDelta = {
      x: event.worldPosition.x - dragState.startPoint.x,
      y: event.worldPosition.y - dragState.startPoint.y,
    };

    // End drag operation
    this.stateManager.endDrag();

    // Notify listeners
    this.notifyListeners({
      type: 'end',
      nodeIds: dragState.nodeIds,
      startPosition: dragState.startPoint,
      currentPosition: event.worldPosition,
      delta: { x: 0, y: 0 },
      totalDelta,
    });

    return true;
  }

  private calculateNewPositions(
    dragState: { nodeIds: string[]; initialPositions: Map<string, Point> },
    delta: Point
  ): Map<string, Point> {
    const newPositions = new Map<string, Point>();

    for (const nodeId of dragState.nodeIds) {
      const initialPos = dragState.initialPositions.get(nodeId);
      if (!initialPos) continue;

      let newPosition = {
        x: initialPos.x + delta.x,
        y: initialPos.y + delta.y,
      };

      // Apply constraints
      newPosition = this.applyConstraints(nodeId, newPosition);

      newPositions.set(nodeId, newPosition);
    }

    return newPositions;
  }

  private applyConstraints(nodeId: string, position: Point): Point {
    let constrainedPos = { ...position };

    // Apply bounds constraints
    if (this.constraints.bounds) {
      const nodeBounds = this.getNodeBounds(nodeId);
      if (nodeBounds) {
        const bounds = this.constraints.bounds;
        
        constrainedPos.x = Math.max(
          bounds.x,
          Math.min(bounds.x + bounds.width - nodeBounds.width, constrainedPos.x)
        );
        
        constrainedPos.y = Math.max(
          bounds.y,
          Math.min(bounds.y + bounds.height - nodeBounds.height, constrainedPos.y)
        );
      }
    }

    // Apply grid snapping
    if (this.constraints.snapToGrid?.enabled) {
      const gridSize = this.constraints.snapToGrid.size;
      constrainedPos.x = Math.round(constrainedPos.x / gridSize) * gridSize;
      constrainedPos.y = Math.round(constrainedPos.y / gridSize) * gridSize;
    }

    // Apply collision detection
    if (this.constraints.collision?.enabled) {
      constrainedPos = this.applyCollisionConstraints(nodeId, constrainedPos);
    }

    return constrainedPos;
  }

  private applyCollisionConstraints(nodeId: string, position: Point): Point {
    const nodeBounds = this.getNodeBounds(nodeId);
    if (!nodeBounds) return position;

    const margin = this.constraints.collision?.margin || 0;
    const testBounds: Bounds = {
      x: position.x - margin,
      y: position.y - margin,
      width: nodeBounds.width + margin * 2,
      height: nodeBounds.height + margin * 2,
    };

    // Check collision with other nodes
    const allNodes = this.getAllNodes();
    for (const otherNode of allNodes) {
      if (otherNode.id === nodeId) continue;

      const otherBounds = {
        x: otherNode.bounds.x - margin,
        y: otherNode.bounds.y - margin,
        width: otherNode.bounds.width + margin * 2,
        height: otherNode.bounds.height + margin * 2,
      };

      if (this.boundsIntersect(testBounds, otherBounds)) {
        // Find the minimal movement to resolve collision
        const resolvedPosition = this.resolveCollision(
          testBounds,
          otherBounds,
          position,
          nodeBounds
        );
        return resolvedPosition;
      }
    }

    return position;
  }

  private resolveCollision(
    movingBounds: Bounds,
    staticBounds: Bounds,
    originalPosition: Point,
    nodeBounds: Bounds
  ): Point {
    // Calculate overlap on each axis
    const overlapX = Math.min(
      movingBounds.x + movingBounds.width - staticBounds.x,
      staticBounds.x + staticBounds.width - movingBounds.x
    );
    
    const overlapY = Math.min(
      movingBounds.y + movingBounds.height - staticBounds.y,
      staticBounds.y + staticBounds.height - movingBounds.y
    );

    // Move along the axis with smaller overlap
    if (overlapX < overlapY) {
      // Resolve horizontally
      if (movingBounds.x < staticBounds.x) {
        return { x: staticBounds.x - nodeBounds.width, y: originalPosition.y };
      } else {
        return { x: staticBounds.x + staticBounds.width, y: originalPosition.y };
      }
    } else {
      // Resolve vertically
      if (movingBounds.y < staticBounds.y) {
        return { x: originalPosition.x, y: staticBounds.y - nodeBounds.height };
      } else {
        return { x: originalPosition.x, y: staticBounds.y + staticBounds.height };
      }
    }
  }

  private boundsIntersect(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
  }

  private notifyListeners(event: DragEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}