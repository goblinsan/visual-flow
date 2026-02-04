/**
 * Utility functions for Phase 3 collaboration features
 */

import type { UserAwareness } from '../collaboration/types';

/**
 * Check if a node is currently locked (being dragged) by another user
 */
export function isNodeLocked(
  nodeId: string,
  collaborators: Map<number, UserAwareness>,
  currentClientId: number | null
): boolean {
  for (const user of collaborators.values()) {
    // Skip ourselves
    if (user.clientId === currentClientId) continue;

    // Check if user is dragging this node
    if (user.dragging?.nodeIds.includes(nodeId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get the user who is currently locking a node (if any)
 */
export function getNodeLocker(
  nodeId: string,
  collaborators: Map<number, UserAwareness>,
  currentClientId: number | null
): UserAwareness | null {
  for (const user of collaborators.values()) {
    // Skip ourselves
    if (user.clientId === currentClientId) continue;

    // Check if user is dragging this node
    if (user.dragging?.nodeIds.includes(nodeId)) {
      return user;
    }
  }

  return null;
}

/**
 * Get all nodes that are currently locked
 */
export function getLockedNodes(
  collaborators: Map<number, UserAwareness>,
  currentClientId: number | null
): Set<string> {
  const lockedNodes = new Set<string>();

  for (const user of collaborators.values()) {
    // Skip ourselves
    if (user.clientId === currentClientId) continue;

    // Add all nodes being dragged by this user
    if (user.dragging?.nodeIds) {
      user.dragging.nodeIds.forEach((nodeId) => lockedNodes.add(nodeId));
    }
  }

  return lockedNodes;
}

/**
 * Check if any of the selected nodes are locked
 */
export function hasLockedNodes(
  selectedNodeIds: string[],
  collaborators: Map<number, UserAwareness>,
  currentClientId: number | null
): boolean {
  const lockedNodes = getLockedNodes(collaborators, currentClientId);
  return selectedNodeIds.some((nodeId) => lockedNodes.has(nodeId));
}

/**
 * Filter out locked nodes from a selection
 */
export function filterLockedNodes(
  nodeIds: string[],
  collaborators: Map<number, UserAwareness>,
  currentClientId: number | null
): string[] {
  const lockedNodes = getLockedNodes(collaborators, currentClientId);
  return nodeIds.filter((nodeId) => !lockedNodes.has(nodeId));
}

/**
 * Format relative timestamp for checkpoint display
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 5) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Estimate checkpoint size in a human-readable format
 */
export function formatCheckpointSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes}B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)}KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Check if localStorage has enough space for a checkpoint
 */
export function hasStorageSpace(estimatedSizeBytes: number): boolean {
  try {
    // Try to store a test item
    const testKey = '__storage_test__';
    const testData = 'x'.repeat(Math.min(estimatedSizeBytes, 100000)); // Test up to 100KB
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get current localStorage usage percentage (approximate)
 */
export function getStorageUsage(): number {
  try {
    let totalSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    // Typical localStorage quota is 5-10MB
    const quota = 5 * 1024 * 1024; // 5MB
    return (totalSize / quota) * 100;
  } catch (e) {
    return 0;
  }
}
