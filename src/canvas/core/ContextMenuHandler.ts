/**
 * Context Menu Handler
 * 
 * Manages right-click context menus with proper positioning and selection-aware
 * menu options. Integrates with the interaction state system.
 */

import type { Point } from './CoordinateSystem';
import type { InteractionStateManager } from './InteractionState';
import type { CanvasEvent } from './EventRouter';
import { BaseEventHandler } from './EventRouter';
import type { InteractionMode } from './InteractionState';
import type { SelectionManager } from './SelectionManager';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  visible?: boolean;
  action: () => void;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuOptions {
  autoHide: boolean;
  hideDelay: number; // ms
  maxWidth: number;
  maxHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface ContextMenuEvent {
  type: 'show' | 'hide' | 'itemClick';
  screenPosition: Point;
  targetNodeId?: string;
  selectedNodeIds: string[];
  menuItems: ContextMenuItem[];
  clickedItem?: ContextMenuItem;
}

export type ContextMenuEventListener = (event: ContextMenuEvent) => void;
export type MenuItemProvider = (targetNodeId: string | undefined, selectedNodeIds: string[]) => ContextMenuItem[];

export class ContextMenuHandler extends BaseEventHandler {
  private stateManager: InteractionStateManager;
  private selectionManager: SelectionManager;
  private options: ContextMenuOptions;
  private listeners: Set<ContextMenuEventListener> = new Set();
  private menuItemProviders: MenuItemProvider[] = [];
  private hideTimeout?: NodeJS.Timeout;

  constructor(
    stateManager: InteractionStateManager,
    selectionManager: SelectionManager,
    options: Partial<ContextMenuOptions> = {}
  ) {
    super(70); // Lower priority than drag and marquee
    this.stateManager = stateManager;
    this.selectionManager = selectionManager;
    this.options = {
      autoHide: true,
      hideDelay: 100,
      maxWidth: 250,
      maxHeight: 400,
      offsetX: 0,
      offsetY: 0,
      ...options,
    };

    // Auto-hide when other interactions start
    this.stateManager.subscribe((state) => {
      if (state.mode !== 'idle' && state.mode !== 'contextMenu') {
        this.hideContextMenu();
      }
    });
  }

  /**
   * Register a menu item provider
   */
  addMenuItemProvider(provider: MenuItemProvider): () => void {
    this.menuItemProviders.push(provider);
    return () => {
      const index = this.menuItemProviders.indexOf(provider);
      if (index !== -1) {
        this.menuItemProviders.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to context menu events
   */
  subscribe(listener: ContextMenuEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Show context menu programmatically
   */
  showContextMenu(screenPosition: Point, targetNodeId?: string): boolean {
    this.clearHideTimeout();

    const selectedNodeIds = this.selectionManager.getSelectedNodes().map(node => node.id);
    const menuItems = this.buildMenuItems(targetNodeId, selectedNodeIds);

    if (menuItems.length === 0) {
      return false; // No menu items available
    }

    // Adjust position to keep menu on screen
    const adjustedPosition = this.adjustMenuPosition(screenPosition, menuItems);

    // Update state
    const success = this.stateManager.showContextMenu(adjustedPosition, targetNodeId);
    if (!success) return false;

    // Notify listeners
    this.notifyListeners({
      type: 'show',
      screenPosition: adjustedPosition,
      targetNodeId,
      selectedNodeIds,
      menuItems,
    });

    // Set auto-hide timer
    if (this.options.autoHide) {
      this.setHideTimeout();
    }

    return true;
  }

  /**
   * Hide context menu
   */
  hideContextMenu(): boolean {
    this.clearHideTimeout();

    const state = this.stateManager.getState();
    if (state.mode !== 'contextMenu') {
      return false;
    }

    const success = this.stateManager.hideContextMenu();
    if (!success) return false;

    // Notify listeners
    this.notifyListeners({
      type: 'hide',
      screenPosition: state.contextMenu?.screenPosition || { x: 0, y: 0 },
      targetNodeId: state.contextMenu?.targetNodeId,
      selectedNodeIds: this.selectionManager.getSelectedNodes().map(node => node.id),
      menuItems: [],
    });

    return true;
  }

  /**
   * Execute menu item action
   */
  executeMenuItem(itemId: string): boolean {
    const state = this.stateManager.getState();
    if (state.mode !== 'contextMenu') {
      return false;
    }

    const selectedNodeIds = this.selectionManager.getSelectedNodes().map(node => node.id);
    const menuItems = this.buildMenuItems(state.contextMenu?.targetNodeId, selectedNodeIds);
    const item = this.findMenuItem(menuItems, itemId);

    if (!item || item.disabled) {
      return false;
    }

    // Execute action
    item.action();

    // Notify listeners
    this.notifyListeners({
      type: 'itemClick',
      screenPosition: state.contextMenu?.screenPosition || { x: 0, y: 0 },
      targetNodeId: state.contextMenu?.targetNodeId,
      selectedNodeIds,
      menuItems,
      clickedItem: item,
    });

    // Hide menu after action
    this.hideContextMenu();

    return true;
  }

  /**
   * EventHandler implementation
   */
  canHandle(event: CanvasEvent, mode: InteractionMode): boolean {
    if (mode === 'idle' && this.isEvent(event, 'contextmenu', { button: 2 })) {
      return true;
    }

    if (mode === 'contextMenu') {
      return this.isEvent(event, 'click') || this.isEvent(event, 'mousedown');
    }

    return false;
  }

  handle(event: CanvasEvent): boolean {
    if (event.type === 'contextmenu') {
      event.preventDefault?.();
      return this.showContextMenu(event.screenPosition, event.targetNodeId);
    }

    const state = this.stateManager.getState();
    if (state.mode === 'contextMenu') {
      // Hide menu on any click outside
      this.hideContextMenu();
      return true;
    }

    return false;
  }

  private buildMenuItems(targetNodeId: string | undefined, selectedNodeIds: string[]): ContextMenuItem[] {
    const allItems: ContextMenuItem[] = [];

    // Collect items from all providers
    for (const provider of this.menuItemProviders) {
      const items = provider(targetNodeId, selectedNodeIds);
      allItems.push(...items);
    }

    // Filter and sort items
    return allItems
      .filter(item => item.visible !== false)
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private findMenuItem(items: ContextMenuItem[], itemId: string): ContextMenuItem | undefined {
    for (const item of items) {
      if (item.id === itemId) {
        return item;
      }
      if (item.submenu) {
        const found = this.findMenuItem(item.submenu, itemId);
        if (found) return found;
      }
    }
    return undefined;
  }

  private adjustMenuPosition(screenPosition: Point, menuItems: ContextMenuItem[]): Point {
    // Estimate menu size (this could be more sophisticated)
    const estimatedWidth = this.options.maxWidth;
    const estimatedHeight = Math.min(menuItems.length * 30, this.options.maxHeight);

    // Get viewport size (this would need to be provided by the canvas)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = screenPosition.x + this.options.offsetX;
    let adjustedY = screenPosition.y + this.options.offsetY;

    // Adjust X position to keep menu on screen
    if (adjustedX + estimatedWidth > viewportWidth) {
      adjustedX = screenPosition.x - estimatedWidth - this.options.offsetX;
    }

    // Adjust Y position to keep menu on screen
    if (adjustedY + estimatedHeight > viewportHeight) {
      adjustedY = screenPosition.y - estimatedHeight - this.options.offsetY;
    }

    // Ensure menu doesn't go off the left or top edge
    adjustedX = Math.max(0, adjustedX);
    adjustedY = Math.max(0, adjustedY);

    return { x: adjustedX, y: adjustedY };
  }

  private setHideTimeout(): void {
    this.clearHideTimeout();
    this.hideTimeout = setTimeout(() => {
      this.hideContextMenu();
    }, this.options.hideDelay);
  }

  private clearHideTimeout(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }
  }

  private notifyListeners(event: ContextMenuEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}

/**
 * Default menu item providers for common operations
 */
export class DefaultMenuItems {
  /**
   * Standard selection-based menu items
   */
  static selection(
    onCopy?: () => void,
    onCut?: () => void,
    onPaste?: () => void,
    onDelete?: () => void
  ): MenuItemProvider {
    return (_targetNodeId, selectedNodeIds) => {
      const items: ContextMenuItem[] = [];
      const hasSelection = selectedNodeIds.length > 0;

      if (onCopy) {
        items.push({
          id: 'copy',
          label: 'Copy',
          disabled: !hasSelection,
          action: onCopy,
        });
      }

      if (onCut) {
        items.push({
          id: 'cut',
          label: 'Cut',
          disabled: !hasSelection,
          action: onCut,
        });
      }

      if (onPaste) {
        items.push({
          id: 'paste',
          label: 'Paste',
          action: onPaste,
        });
      }

      if (onDelete) {
        items.push({
          id: 'delete',
          label: 'Delete',
          disabled: !hasSelection,
          action: onDelete,
        });
      }

      return items;
    };
  }

  /**
   * Node-specific menu items
   */
  static node(
    onDuplicate?: (nodeId: string) => void,
    onGroup?: (nodeIds: string[]) => void,
    onUngroup?: (nodeId: string) => void
  ): MenuItemProvider {
    return (targetNodeId, selectedNodeIds) => {
      const items: ContextMenuItem[] = [];
      const multipleSelected = selectedNodeIds.length > 1;

      if (onDuplicate && targetNodeId) {
        items.push({
          id: 'duplicate',
          label: 'Duplicate',
          action: () => onDuplicate(targetNodeId),
        });
      }

      if (onGroup && multipleSelected) {
        items.push({
          id: 'group',
          label: 'Group',
          action: () => onGroup(selectedNodeIds),
        });
      }

      if (onUngroup && targetNodeId) {
        items.push({
          id: 'ungroup',
          label: 'Ungroup',
          action: () => onUngroup(targetNodeId),
        });
      }

      return items;
    };
  }
}