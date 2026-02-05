/**
 * Utilities for working with agent proposals
 * Phase 4: Agent Collaboration
 */

import type { LayoutSpec, LayoutNode } from '../layout-schema';
import type { ProposalOperation, ProposalDiff } from '../types/agent';

/**
 * Calculate diff summary from proposal operations
 */
export function calculateProposalDiff(operations: ProposalOperation[]): ProposalDiff {
  const created: string[] = [];
  const updated: string[] = [];
  const deleted: string[] = [];
  const moved: string[] = [];

  for (const op of operations) {
    switch (op.type) {
      case 'create':
        created.push(op.nodeId);
        break;
      case 'update':
        updated.push(op.nodeId);
        break;
      case 'delete':
        deleted.push(op.nodeId);
        break;
      case 'move':
        moved.push(op.nodeId);
        break;
    }
  }

  return {
    created,
    updated,
    deleted,
    moved,
    totalChanges: operations.length,
  };
}

/**
 * Find a node in spec by ID (recursive)
 */
export function findNodeById(spec: LayoutSpec, nodeId: string): LayoutNode | null {
  if (spec.root.id === nodeId) {
    return spec.root;
  }

  function searchChildren(nodes: LayoutNode[]): LayoutNode | null {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      if (node.children) {
        const found = searchChildren(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  if (spec.root.children) {
    return searchChildren(spec.root.children);
  }

  return null;
}

/**
 * Get all node IDs from spec (recursive)
 */
export function getAllNodeIds(spec: LayoutSpec): string[] {
  const ids: string[] = [spec.root.id];

  function collectIds(nodes: LayoutNode[]): void {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children) {
        collectIds(node.children);
      }
    }
  }

  if (spec.root.children) {
    collectIds(spec.root.children);
  }

  return ids;
}

/**
 * Compare two specs and generate operations
 * Simplified diff algorithm for basic change detection
 */
export function diffSpecs(before: LayoutSpec, after: LayoutSpec): ProposalOperation[] {
  const operations: ProposalOperation[] = [];
  const beforeIds = new Set(getAllNodeIds(before));
  const afterIds = new Set(getAllNodeIds(after));

  // Find created nodes
  for (const id of afterIds) {
    if (!beforeIds.has(id)) {
      const node = findNodeById(after, id);
      if (node) {
        operations.push({
          type: 'create',
          nodeId: id,
          after: node,
        });
      }
    }
  }

  // Find deleted nodes
  for (const id of beforeIds) {
    if (!afterIds.has(id)) {
      const node = findNodeById(before, id);
      if (node) {
        operations.push({
          type: 'delete',
          nodeId: id,
          before: node,
        });
      }
    }
  }

  // Find updated nodes (simple equality check)
  for (const id of beforeIds) {
    if (afterIds.has(id)) {
      const beforeNode = findNodeById(before, id);
      const afterNode = findNodeById(after, id);

      if (beforeNode && afterNode) {
        // Check if position changed (move)
        if (
          beforeNode.position?.x !== afterNode.position?.x ||
          beforeNode.position?.y !== afterNode.position?.y
        ) {
          operations.push({
            type: 'move',
            nodeId: id,
            before: { position: beforeNode.position },
            after: { position: afterNode.position },
          });
        }

        // Check if other properties changed (update)
        // Exclude position changes since those are already handled as 'move'
        const hasPositionChange =
          beforeNode.position?.x !== afterNode.position?.x ||
          beforeNode.position?.y !== afterNode.position?.y;

        const hasOtherChanges =
          JSON.stringify(beforeNode) !== JSON.stringify(afterNode) &&
          !hasPositionChange;

        if (hasOtherChanges) {
          operations.push({
            type: 'update',
            nodeId: id,
            before: beforeNode,
            after: afterNode,
          });
        }
      }
    }
  }

  return operations;
}

/**
 * Apply proposal operations to a spec (merge)
 * NOTE: This is a stub implementation for Phase 4.
 * In production, this would need to handle complete node tree manipulation.
 */
export function applyProposalOperations(
  spec: LayoutSpec,
  operations: ProposalOperation[]
): LayoutSpec {
  // TODO: Implement full node tree manipulation
  // This stub is included for API completeness but should not be used in production
  console.warn('applyProposalOperations is a stub - implement node tree manipulation before use');
  
  const newSpec = JSON.parse(JSON.stringify(spec)) as LayoutSpec;

  for (const op of operations) {
    switch (op.type) {
      case 'create':
        // TODO: Insert node at correct location in tree
        break;
      case 'update':
        // TODO: Update node properties while preserving tree structure
        break;
      case 'delete':
        // TODO: Remove node and clean up references
        break;
      case 'move':
        // TODO: Update position or parent relationship
        break;
    }
  }

  return newSpec;
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Get status color for proposal
 */
export function getProposalStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#FFA500'; // orange
    case 'approved':
      return '#22C55E'; // green
    case 'rejected':
      return '#EF4444'; // red
    case 'superseded':
      return '#6B7280'; // gray
    default:
      return '#6B7280';
  }
}

/**
 * Get operation type icon
 */
export function getOperationIcon(type: string): string {
  switch (type) {
    case 'create':
      return '+';
    case 'update':
      return '~';
    case 'delete':
      return '-';
    case 'move':
      return '→';
    default:
      return '?';
  }
}
