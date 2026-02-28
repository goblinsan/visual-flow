/**
 * Yjs-LayoutSpec conversion layer for Phase 2 real-time collaboration
 * Converts between Vizail LayoutSpec and Yjs CRDT data structures
 */

import * as Y from 'yjs';
import type { LayoutSpec, LayoutNode, Flow } from '../layout-schema';

/**
 * Yjs document structure for collaborative canvas editing
 */
export interface YjsCanvasDoc {
  /** Node data (excluding children) - id → node properties */
  nodes: Y.Map<Y.Map<any>>;
  /** Parent-child relationships - parentId → [childId1, childId2, ...] */
  children: Y.Map<Y.Array<string>>;
  /** Metadata (rootId, version, lastModified, etc.) */
  meta: Y.Map<any>;
  /** Flows for prototyping */
  flows: Y.Array<Y.Map<any>>;
}

/**
 * Convert LayoutSpec to Yjs document structure
 */
export function layoutSpecToYjs(spec: LayoutSpec, ydoc: Y.Doc): void {
  const yNodes = ydoc.getMap<Y.Map<any>>('nodes');
  const yChildren = ydoc.getMap<Y.Array<string>>('children');
  const yMeta = ydoc.getMap<any>('meta');
  const yFlows = ydoc.getArray<Y.Map<any>>('flows');

  // Clear existing data
  yNodes.clear();
  yChildren.clear();
  yMeta.clear();
  yFlows.delete(0, yFlows.length);

  // Set metadata
  yMeta.set('rootId', spec.root.id);
  yMeta.set('version', spec.version || '1.0.0');
  yMeta.set('lastModified', Date.now());

  // Recursively process all nodes
  function processNode(node: LayoutNode): void {
    // Create a Y.Map for this node's properties (excluding children)
    const yNodeProps = new Y.Map();
    
    // Copy all properties except children
    Object.entries(node).forEach(([key, value]) => {
      if (key !== 'children') {
        yNodeProps.set(key, value);
      }
    });

    yNodes.set(node.id, yNodeProps);

    // Handle children if they exist (even if empty array)
    if ('children' in node && Array.isArray(node.children)) {
      const childIds = node.children.map(child => child.id);
      const yChildArray = Y.Array.from(childIds);
      yChildren.set(node.id, yChildArray);

      // Recursively process children
      node.children.forEach(child => processNode(child));
    }
  }

  // Process the root node and its descendants
  processNode(spec.root);

  // Add flows if present
  if (spec.flows) {
    spec.flows.forEach(flow => {
      const yFlow = new Y.Map();
      Object.entries(flow).forEach(([key, value]) => {
        yFlow.set(key, value);
      });
      yFlows.push([yFlow]);
    });
  }
}

/**
 * Convert Yjs document structure back to LayoutSpec
 */
export function yjsToLayoutSpec(ydoc: Y.Doc): LayoutSpec {
  const yNodes = ydoc.getMap<Y.Map<any>>('nodes');
  const yChildren = ydoc.getMap<Y.Array<string>>('children');
  const yMeta = ydoc.getMap<any>('meta');
  const yFlows = ydoc.getArray<Y.Map<any>>('flows');

  const rootId = yMeta.get('rootId');
  const version = yMeta.get('version');

  if (!rootId) {
    throw new Error('Yjs document missing rootId in meta');
  }

  // Build a complete node from Yjs data
  function buildNode(nodeId: string): LayoutNode {
    const yNodeProps = yNodes.get(nodeId);
    if (!yNodeProps) {
      throw new Error(`Node ${nodeId} not found in Yjs document`);
    }

    // Convert Y.Map to plain object
    const nodeProps: Record<string, unknown> = {};
    yNodeProps.forEach((value, key) => {
      nodeProps[key] = value;
    });

    // Add children if they exist
    const yChildArray = yChildren.get(nodeId);
    if (yChildArray) {
      nodeProps.children = yChildArray.toArray().map(childId => buildNode(childId));
    }

    return nodeProps as unknown as LayoutNode;
  }

  // Build root node
  const root = buildNode(rootId);

  // Ensure root is a FrameNode
  if (root.type !== 'frame') {
    throw new Error('Root node must be a FrameNode');
  }

  // Convert flows
  const flows = yFlows.toArray().map(yFlow => {
    const flow: Record<string, unknown> = {};
    yFlow.forEach((value, key) => {
      flow[key] = value;
    });
    return flow;
  });

  return {
    version,
    root: root as any, // Type assertion since we checked type === 'frame'
    flows: flows.length > 0 ? (flows as unknown as Flow[]) : undefined,
  };
}

/**
 * Apply incremental changes from LayoutSpec to Yjs doc
 * More efficient than full replacement for small changes
 */
export function applySpecChangesToYjs(
  spec: LayoutSpec,
  ydoc: Y.Doc
): void {
  // For now, use full replacement
  // TODO: Optimize with diff-based updates
  layoutSpecToYjs(spec, ydoc);
}
