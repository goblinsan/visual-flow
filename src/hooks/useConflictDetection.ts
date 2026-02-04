/**
 * useConflictDetection hook
 * Detects when remote changes affect locally selected nodes
 * Phase 3: Conflict Notifications
 */

import { useEffect, useRef, useState } from 'react';
import type { LayoutSpec } from '../layout-schema';
import type { UserAwareness } from '../collaboration/types';

interface ConflictEvent {
  id: string;
  userName: string;
  userColor: string;
  affectedNodeIds: string[];
  timestamp: number;
}

interface UseConflictDetectionOptions {
  /** Current canvas spec */
  spec: LayoutSpec;
  /** Currently selected node IDs */
  selectedNodeIds: string[];
  /** Current collaborators */
  collaborators: Map<number, UserAwareness>;
  /** Current user's client ID */
  clientId: number | null;
  /** Whether conflict detection is enabled */
  enabled?: boolean;
}

/**
 * Hook to detect conflicts when remote users modify selected nodes
 */
export function useConflictDetection({
  spec,
  selectedNodeIds,
  collaborators,
  clientId,
  enabled = true,
}: UseConflictDetectionOptions) {
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  
  // Track previous spec to detect changes
  const prevSpecRef = useRef<LayoutSpec>(spec);
  const prevSelectedRef = useRef<string[]>(selectedNodeIds);

  useEffect(() => {
    if (!enabled || selectedNodeIds.length === 0) {
      return;
    }

    // Check if any selected nodes were modified by comparing specs
    const changedNodeIds = detectChangedNodes(
      prevSpecRef.current,
      spec,
      selectedNodeIds
    );

    if (changedNodeIds.length > 0) {
      // Try to determine which user made the change
      // This is approximate - we look at who recently had these nodes selected
      const modifyingUser = findLikelyModifier(
        changedNodeIds,
        collaborators,
        clientId
      );

      if (modifyingUser) {
        // Create conflict event
        const conflict: ConflictEvent = {
          id: `conflict-${Date.now()}`,
          userName: modifyingUser.displayName,
          userColor: modifyingUser.color,
          affectedNodeIds: changedNodeIds,
          timestamp: Date.now(),
        };

        setConflicts((prev) => [...prev, conflict]);
      }
    }

    // Update refs
    prevSpecRef.current = spec;
    prevSelectedRef.current = selectedNodeIds;
  }, [spec, selectedNodeIds, collaborators, clientId, enabled]);

  const dismissConflict = (conflictId: string) => {
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
  };

  const clearAllConflicts = () => {
    setConflicts([]);
  };

  return {
    conflicts,
    dismissConflict,
    clearAllConflicts,
  };
}

/**
 * Detect which nodes changed between two specs
 */
function detectChangedNodes(
  prevSpec: LayoutSpec,
  currentSpec: LayoutSpec,
  selectedNodeIds: string[]
): string[] {
  const changedIds: string[] = [];

  // Build node maps for comparison
  const prevNodes = new Map<string, any>();
  const currentNodes = new Map<string, any>();

  // Collect all nodes from specs
  collectNodes(prevSpec.root, prevNodes);
  collectNodes(currentSpec.root, currentNodes);

  // Check each selected node
  for (const nodeId of selectedNodeIds) {
    const prevNode = prevNodes.get(nodeId);
    const currentNode = currentNodes.get(nodeId);

    // If node changed (different serialization), it was modified
    if (prevNode && currentNode) {
      const prevJson = JSON.stringify(prevNode);
      const currentJson = JSON.stringify(currentNode);
      
      if (prevJson !== currentJson) {
        changedIds.push(nodeId);
      }
    }
  }

  return changedIds;
}

/**
 * Recursively collect all nodes from a tree
 */
function collectNodes(node: any, nodeMap: Map<string, any>) {
  if (!node) return;

  nodeMap.set(node.id, node);

  if (node.children) {
    for (const child of node.children) {
      collectNodes(child, nodeMap);
    }
  }
}

/**
 * Find which collaborator likely modified the nodes
 * This is a heuristic - we can't know for certain without operation metadata
 */
function findLikelyModifier(
  changedNodeIds: string[],
  collaborators: Map<number, UserAwareness>,
  currentClientId: number | null
): UserAwareness | null {
  // Look for users who have these nodes selected or are dragging them
  for (const user of collaborators.values()) {
    // Skip ourselves
    if (user.clientId === currentClientId) continue;

    // Check if user has any of the changed nodes selected
    const hasSelectedNode = user.selection.some((id) =>
      changedNodeIds.includes(id)
    );

    // Check if user is dragging any of the changed nodes
    const isDraggingNode = user.dragging?.nodeIds.some((id) =>
      changedNodeIds.includes(id)
    );

    if (hasSelectedNode || isDraggingNode) {
      return user;
    }
  }

  // If we can't determine, return the first collaborator (fallback)
  const [firstUser] = Array.from(collaborators.values());
  return firstUser || null;
}
