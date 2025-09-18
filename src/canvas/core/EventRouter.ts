/**
 * Event Router
 * 
 * Single entry point for all mouse and keyboard events. Routes events to
 * appropriate handlers based on current interaction state and event context.
 */

import type { Point } from './CoordinateSystem';
import type { InteractionMode } from './InteractionState';

export interface CanvasEvent {
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'click' | 'contextmenu' | 'wheel' | 'keydown' | 'keyup';
  screenPosition: Point;
  worldPosition: Point;
  targetNodeId?: string;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
  button?: number; // 0 = left, 1 = middle, 2 = right
  preventDefault?: () => void;
  stopPropagation?: () => void;
  originalEvent?: Event;
}

export interface EventHandler {
  canHandle(event: CanvasEvent, mode: InteractionMode): boolean;
  handle(event: CanvasEvent): boolean; // Returns true if event was consumed
  priority: number; // Higher priority handlers are checked first
}

export type EventInterceptor = (event: CanvasEvent) => boolean; // Returns true to consume event

export class EventRouter {
  private handlers: EventHandler[] = [];
  private interceptors: EventInterceptor[] = [];
  private isEnabled = true;

  /**
   * Register an event handler
   */
  registerHandler(handler: EventHandler): () => void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => b.priority - a.priority);
    
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index !== -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  /**
   * Register an event interceptor (runs before handlers)
   */
  registerInterceptor(interceptor: EventInterceptor): () => void {
    this.interceptors.push(interceptor);
    
    return () => {
      const index = this.interceptors.indexOf(interceptor);
      if (index !== -1) {
        this.interceptors.splice(index, 1);
      }
    };
  }

  /**
   * Route an event to appropriate handlers
   */
  routeEvent(event: CanvasEvent, currentMode: InteractionMode): boolean {
    if (!this.isEnabled) {
      return false;
    }

    // Check interceptors first
    for (const interceptor of this.interceptors) {
      if (interceptor(event)) {
        return true; // Event was consumed by interceptor
      }
    }

    // Check handlers in priority order
    for (const handler of this.handlers) {
      if (handler.canHandle(event, currentMode)) {
        if (handler.handle(event)) {
          return true; // Event was consumed by handler
        }
      }
    }

    return false; // Event was not consumed
  }

  /**
   * Enable/disable event routing
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear all handlers and interceptors
   */
  clear(): void {
    this.handlers = [];
    this.interceptors = [];
  }
}

/**
 * Utility function to create CanvasEvent from DOM events
 */
export function createCanvasEvent(
  domEvent: MouseEvent | KeyboardEvent | WheelEvent,
  screenToWorld: (point: Point) => Point,
  getTargetNodeId?: (screenPoint: Point) => string | undefined
): CanvasEvent {
  const screenPosition: Point = {
    x: (domEvent as MouseEvent).clientX || 0,
    y: (domEvent as MouseEvent).clientY || 0,
  };

  const worldPosition = screenToWorld(screenPosition);
  const targetNodeId = getTargetNodeId?.(screenPosition);

  return {
    type: domEvent.type as CanvasEvent['type'],
    screenPosition,
    worldPosition,
    targetNodeId,
    modifiers: {
      shift: domEvent.shiftKey,
      ctrl: domEvent.ctrlKey,
      alt: domEvent.altKey,
      meta: domEvent.metaKey,
    },
    button: (domEvent as MouseEvent).button,
    preventDefault: () => domEvent.preventDefault(),
    stopPropagation: () => domEvent.stopPropagation(),
    originalEvent: domEvent,
  };
}

/**
 * Base class for event handlers with common functionality
 */
export abstract class BaseEventHandler implements EventHandler {
  public priority: number;

  constructor(priority: number = 0) {
    this.priority = priority;
  }

  abstract canHandle(event: CanvasEvent, mode: InteractionMode): boolean;
  abstract handle(event: CanvasEvent): boolean;

  /**
   * Helper to check if event is a specific type with optional modifiers
   */
  protected isEvent(
    event: CanvasEvent, 
    type: CanvasEvent['type'], 
    options?: {
      button?: number;
      shift?: boolean;
      ctrl?: boolean;
      alt?: boolean;
      meta?: boolean;
    }
  ): boolean {
    if (event.type !== type) return false;
    
    if (options) {
      if (options.button !== undefined && event.button !== options.button) return false;
      if (options.shift !== undefined && event.modifiers.shift !== options.shift) return false;
      if (options.ctrl !== undefined && event.modifiers.ctrl !== options.ctrl) return false;
      if (options.alt !== undefined && event.modifiers.alt !== options.alt) return false;
      if (options.meta !== undefined && event.modifiers.meta !== options.meta) return false;
    }

    return true;
  }

  /**
   * Helper to check if event has target node
   */
  protected hasTarget(event: CanvasEvent): boolean {
    return !!event.targetNodeId;
  }

  /**
   * Helper to check if event is on empty canvas
   */
  protected isEmptyCanvasClick(event: CanvasEvent): boolean {
    return !event.targetNodeId;
  }
}