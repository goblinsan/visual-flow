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
        const hasChanges =
          JSON.stringify(beforeNode) !== JSON.stringify(afterNode) &&
          (beforeNode.position?.x === afterNode.position?.x &&
            beforeNode.position?.y === afterNode.position?.y);

        if (hasChanges) {
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
 */
export function applyProposalOperations(
  spec: LayoutSpec,
  operations: ProposalOperation[]
): LayoutSpec {
  // This is a simplified implementation
  // In production, this would need to handle node tree manipulation
  const newSpec = JSON.parse(JSON.stringify(spec)) as LayoutSpec;

  for (const op of operations) {
    switch (op.type) {
      case 'create':
        // Would need to insert node at correct location
        break;
      case 'update':
        // Would need to update node properties
        break;
      case 'delete':
        // Would need to remove node
        break;
      case 'move':
        // Would need to update position
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
