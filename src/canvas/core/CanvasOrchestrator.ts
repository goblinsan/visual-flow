/**
 * Canvas Orchestrator
 * 
 * Main coordinator that integrates all interaction subsystems and manages
 * the overall canvas interaction flow. This is the primary interface for
 * setting up and managing canvas interactions.
 */

import type { Point, Bounds, Transform } from './CoordinateSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { InteractionStateManager } from './InteractionState';
import { EventRouter, createCanvasEvent } from './EventRouter';
import { SelectionManager } from './SelectionManager';
import { DragHandler } from './DragHandler';
import { MarqueeHandler } from './MarqueeHandler';
import { ContextMenuHandler, DefaultMenuItems } from './ContextMenuHandler';
import type { SelectableNode, SelectionOptions } from './SelectionManager';
import type { DragConstraints } from './DragHandler';
import type { MarqueeOptions } from './MarqueeHandler';
import type { ContextMenuOptions, MenuItemProvider } from './ContextMenuHandler';

export interface CanvasNode<TData = unknown> {
  id: string;
  type: string;
  position: Point; // World coordinates
  size: { width: number; height: number };
  visible: boolean;
  selectable: boolean;
  draggable: boolean;
  data?: TData;
}

export interface CanvasOrchestratorOptions {
  // Coordinate system
  initialTransform?: Transform;
  bounds?: Bounds;

  // Selection
  selectionOptions?: SelectionOptions;

  // Drag handling
  dragConstraints?: DragConstraints;

  // Marquee selection
  marqueeOptions?: MarqueeOptions;

  // Context menu
  contextMenuOptions?: ContextMenuOptions;
  enableDefaultMenuItems?: boolean;

  // Event handling
  enableKeyboardShortcuts?: boolean;
}

export interface CanvasCallbacks {
  // Node operations
  onNodeUpdate?: (nodeId: string, position: Point) => void;
  onNodesDelete?: (nodeIds: string[]) => void;
  onNodesDuplicate?: (nodeIds: string[]) => void;
  onNodesGroup?: (nodeIds: string[]) => void;
  onNodeUngroup?: (nodeId: string) => void;

  // Clipboard operations
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;

  // Canvas operations
  onCanvasClick?: (worldPosition: Point) => void;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (offset: Point) => void;
}

export class CanvasOrchestrator {
  // Core systems
  private coordinateSystem: CoordinateSystem;
  private stateManager: InteractionStateManager;
  private eventRouter: EventRouter;
  
  // Interaction handlers
  private selectionManager: SelectionManager;
  private dragHandler: DragHandler;
  private marqueeHandler: MarqueeHandler;
  private contextMenuHandler: ContextMenuHandler;

  // State
  private nodes: Map<string, CanvasNode> = new Map();
  private callbacks: CanvasCallbacks;
  private isEnabled = true;

  constructor(
    canvasElement: HTMLElement,
    options: CanvasOrchestratorOptions = {},
    callbacks: CanvasCallbacks = {}
  ) {
    this.callbacks = callbacks;

    // Initialize core systems
    this.coordinateSystem = new CoordinateSystem(options.initialTransform);
    
    this.stateManager = new InteractionStateManager();
    this.eventRouter = new EventRouter();

    // Initialize interaction handlers
    this.selectionManager = new SelectionManager(
      this.stateManager,
      options.selectionOptions
    );

    this.dragHandler = new DragHandler(
      this.stateManager,
      (nodeId) => this.getNodeBounds(nodeId),
      (nodeId, position) => this.updateNodePosition(nodeId, position),
      () => this.getAllNodeBounds(),
      options.dragConstraints
    );

    this.marqueeHandler = new MarqueeHandler(
      this.stateManager,
      this.selectionManager,
      (point) => this.coordinateSystem.worldToScreen(point),
      options.marqueeOptions
    );

    this.contextMenuHandler = new ContextMenuHandler(
      this.stateManager,
      this.selectionManager,
      options.contextMenuOptions
    );

    // Register event handlers
    this.eventRouter.registerHandler(this.selectionManager);
    this.eventRouter.registerHandler(this.dragHandler);
    this.eventRouter.registerHandler(this.marqueeHandler);
    this.eventRouter.registerHandler(this.contextMenuHandler);

    // Set up default menu items if enabled
    if (options.enableDefaultMenuItems !== false) {
      this.setupDefaultMenuItems();
    }

    // Set up event listeners
    this.setupEventListeners(canvasElement);

    // Set up callbacks
    this.setupCallbacks();
  }

  /**
   * Update the list of canvas nodes
   */
  updateNodes(nodes: CanvasNode[]): void {
    this.nodes.clear();
    for (const node of nodes) {
      this.nodes.set(node.id, { ...node });
    }

    // Update selectable nodes
    const selectableNodes: SelectableNode[] = nodes
      .filter(node => node.selectable && node.visible)
      .map(node => ({
        id: node.id,
        bounds: this.getNodeBounds(node.id)!,
        type: node.type,
        visible: node.visible,
        selectable: node.selectable,
      }));

    this.selectionManager.updateNodes(selectableNodes);
  }

  /**
   * Get currently selected node IDs
   */
  getSelectedNodeIds(): string[] {
    return this.stateManager.getState().selection.selectedIds;
  }

  /**
   * Set selection programmatically
   */
  setSelection(nodeIds: string[]): void {
    this.selectionManager.selectNodes(nodeIds);
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectionManager.clearSelection();
  }

  /**
   * Get current interaction mode
   */
  getInteractionMode(): string {
    return this.stateManager.getState().mode;
  }

  /**
   * Get coordinate system for external access
   */
  getCoordinateSystem(): CoordinateSystem {
    return this.coordinateSystem;
  }

  /**
   * Convert screen point to world coordinates
   */
  screenToWorld(screenPoint: Point): Point {
    return this.coordinateSystem.screenToWorld(screenPoint);
  }

  /**
   * Convert world point to screen coordinates
   */
  worldToScreen(worldPoint: Point): Point {
    return this.coordinateSystem.worldToScreen(worldPoint);
  }

  /**
   * Zoom to fit all nodes
   */
  zoomToFit(padding = 50): void {
    const allBounds = this.getAllNodeBounds();
    if (allBounds.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const { bounds } of allBounds) {
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    const contentBounds: Bounds = {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
    };

    this.coordinateSystem.fitBounds(contentBounds);
    this.callbacks.onZoomChange?.(this.coordinateSystem.getTransform().scaleX);
  }

  /**
   * Add menu item provider
   */
  addMenuItemProvider(provider: MenuItemProvider): () => void {
    return this.contextMenuHandler.addMenuItemProvider(provider);
  }

  /**
   * Enable or disable all interactions
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.eventRouter.setEnabled(enabled);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.eventRouter.clear();
    this.setEnabled(false);
  }

  private setupEventListeners(canvasElement: HTMLElement): void {
    const handleEvent = (domEvent: Event) => {
      if (!this.isEnabled) return;

      const canvasEvent = createCanvasEvent(
        domEvent as MouseEvent | KeyboardEvent | WheelEvent,
        (point) => this.coordinateSystem.screenToWorld(point),
        (screenPoint) => this.getNodeAtScreenPoint(screenPoint)
      );

      const currentMode = this.stateManager.getState().mode;
      this.eventRouter.routeEvent(canvasEvent, currentMode);
    };

    // Mouse events
    canvasElement.addEventListener('mousedown', handleEvent);
    canvasElement.addEventListener('mousemove', handleEvent);
    canvasElement.addEventListener('mouseup', handleEvent);
    canvasElement.addEventListener('click', handleEvent);
    canvasElement.addEventListener('contextmenu', handleEvent);

    // Wheel events for zooming
    canvasElement.addEventListener('wheel', (event) => {
      if (!this.isEnabled) return;
      
      event.preventDefault();
      const screenPoint = { x: event.clientX, y: event.clientY };
      const worldPoint = this.coordinateSystem.screenToWorld(screenPoint);
      
      const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;
      this.coordinateSystem.zoomAt(worldPoint, zoomDelta);
      
      this.callbacks.onZoomChange?.(this.coordinateSystem.getTransform().scaleX);
    });

    // Keyboard events
    document.addEventListener('keydown', handleEvent);
    document.addEventListener('keyup', handleEvent);
  }

  private setupCallbacks(): void {
    // Listen for drag events
    this.dragHandler.subscribe((event) => {
      if (event.type === 'end' && this.callbacks.onNodeUpdate) {
        // Notify about position changes
        for (const nodeId of event.nodeIds) {
          const node = this.nodes.get(nodeId);
          if (node) {
            this.callbacks.onNodeUpdate(nodeId, node.position);
          }
        }
      }
    });
  }

  private setupDefaultMenuItems(): void {
    // Add standard selection menu items
    this.contextMenuHandler.addMenuItemProvider(
      DefaultMenuItems.selection(
        this.callbacks.onCopy,
        this.callbacks.onCut,
        this.callbacks.onPaste,
        () => {
          const selectedIds = this.getSelectedNodeIds();
          if (selectedIds.length > 0) {
            this.callbacks.onNodesDelete?.(selectedIds);
          }
        }
      )
    );

    // Add node-specific menu items
    this.contextMenuHandler.addMenuItemProvider(
      DefaultMenuItems.node(
        (nodeId) => this.callbacks.onNodesDuplicate?.([nodeId]),
        (nodeIds) => this.callbacks.onNodesGroup?.(nodeIds),
        (nodeId) => this.callbacks.onNodeUngroup?.(nodeId)
      )
    );
  }

  private getNodeBounds(nodeId: string): Bounds | undefined {
    const node = this.nodes.get(nodeId);
    if (!node) return undefined;

    return {
      x: node.position.x,
      y: node.position.y,
      width: node.size.width,
      height: node.size.height,
    };
  }

  private getAllNodeBounds(): { id: string; bounds: Bounds }[] {
    const result: { id: string; bounds: Bounds }[] = [];
    for (const [id, node] of this.nodes) {
      if (node.visible) {
        result.push({
          id,
          bounds: {
            x: node.position.x,
            y: node.position.y,
            width: node.size.width,
            height: node.size.height,
          },
        });
      }
    }
    return result;
  }

  private updateNodePosition(nodeId: string, position: Point): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.position = position;
    }
  }

  private getNodeAtScreenPoint(screenPoint: Point): string | undefined {
    const worldPoint = this.coordinateSystem.screenToWorld(screenPoint);
    
    // Check nodes in reverse order (top to bottom)
    const nodeEntries = Array.from(this.nodes.entries()).reverse();
    
    for (const [id, node] of nodeEntries) {
      if (!node.visible || !node.selectable) continue;
      
      const bounds = this.getNodeBounds(id);
      if (!bounds) continue;
      
      if (worldPoint.x >= bounds.x &&
          worldPoint.x <= bounds.x + bounds.width &&
          worldPoint.y >= bounds.y &&
          worldPoint.y <= bounds.y + bounds.height) {
        return id;
      }
    }
    
    return undefined;
  }
}