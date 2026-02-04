/**
 * Tests for Phase 3 helper utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isNodeLocked,
  getNodeLocker,
  getLockedNodes,
  hasLockedNodes,
  filterLockedNodes,
  formatRelativeTime,
  formatCheckpointSize,
} from './phase3Helpers';
import type { UserAwareness } from '../collaboration/types';

describe('phase3Helpers', () => {
  const mockUser1: UserAwareness = {
    clientId: 123,
    userId: 'user-1',
    displayName: 'Alice',
    color: '#3b82f6',
    selection: [],
    dragging: {
      nodeIds: ['node-1', 'node-2'],
      ghostPosition: { x: 100, y: 100 },
    },
  };

  const mockUser2: UserAwareness = {
    clientId: 456,
    userId: 'user-2',
    displayName: 'Bob',
    color: '#10b981',
    selection: [],
  };

  const collaborators = new Map<number, UserAwareness>([
    [123, mockUser1],
    [456, mockUser2],
  ]);

  describe('isNodeLocked', () => {
    it('should return true for locked nodes', () => {
      expect(isNodeLocked('node-1', collaborators, 789)).toBe(true);
      expect(isNodeLocked('node-2', collaborators, 789)).toBe(true);
    });

    it('should return false for unlocked nodes', () => {
      expect(isNodeLocked('node-3', collaborators, 789)).toBe(false);
    });

    it('should return false for own locked nodes', () => {
      // When we are the one dragging, it shouldn't be "locked" to us
      expect(isNodeLocked('node-1', collaborators, 123)).toBe(false);
    });

    it('should return false when no collaborators', () => {
      expect(isNodeLocked('node-1', new Map(), 789)).toBe(false);
    });
  });

  describe('getNodeLocker', () => {
    it('should return the user locking a node', () => {
      const locker = getNodeLocker('node-1', collaborators, 789);
      expect(locker).toBe(mockUser1);
    });

    it('should return null for unlocked nodes', () => {
      const locker = getNodeLocker('node-3', collaborators, 789);
      expect(locker).toBeNull();
    });

    it('should return null for own locked nodes', () => {
      const locker = getNodeLocker('node-1', collaborators, 123);
      expect(locker).toBeNull();
    });
  });

  describe('getLockedNodes', () => {
    it('should return all locked nodes', () => {
      const locked = getLockedNodes(collaborators, 789);
      expect(locked).toEqual(new Set(['node-1', 'node-2']));
    });

    it('should exclude own locked nodes', () => {
      const locked = getLockedNodes(collaborators, 123);
      expect(locked).toEqual(new Set());
    });

    it('should return empty set when no collaborators', () => {
      const locked = getLockedNodes(new Map(), 789);
      expect(locked.size).toBe(0);
    });
  });

  describe('hasLockedNodes', () => {
    it('should return true when selection contains locked nodes', () => {
      expect(hasLockedNodes(['node-1', 'node-3'], collaborators, 789)).toBe(true);
    });

    it('should return false when selection has no locked nodes', () => {
      expect(hasLockedNodes(['node-3', 'node-4'], collaborators, 789)).toBe(false);
    });

    it('should return false for empty selection', () => {
      expect(hasLockedNodes([], collaborators, 789)).toBe(false);
    });
  });

  describe('filterLockedNodes', () => {
    it('should filter out locked nodes', () => {
      const filtered = filterLockedNodes(
        ['node-1', 'node-2', 'node-3', 'node-4'],
        collaborators,
        789
      );
      expect(filtered).toEqual(['node-3', 'node-4']);
    });

    it('should return all nodes when none are locked', () => {
      const filtered = filterLockedNodes(['node-3', 'node-4'], collaborators, 789);
      expect(filtered).toEqual(['node-3', 'node-4']);
    });

    it('should return empty array when all nodes are locked', () => {
      const filtered = filterLockedNodes(['node-1', 'node-2'], collaborators, 789);
      expect(filtered).toEqual([]);
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent time as "Just now"', () => {
      const now = Date.now();
      expect(formatRelativeTime(now)).toBe('Just now');
      expect(formatRelativeTime(now - 3000)).toBe('Just now');
    });

    it('should format seconds', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 30000)).toBe('30s ago');
    });

    it('should format minutes', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5m ago');
    });

    it('should format hours', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 3 * 60 * 60 * 1000)).toBe('3h ago');
    });

    it('should format days', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 2 * 24 * 60 * 60 * 1000)).toBe('2d ago');
    });

    it('should format weeks', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 14 * 24 * 60 * 60 * 1000)).toBe('2w ago');
    });
  });

  describe('formatCheckpointSize', () => {
    it('should format bytes', () => {
      expect(formatCheckpointSize(500)).toBe('500B');
    });

    it('should format kilobytes', () => {
      expect(formatCheckpointSize(1024)).toBe('1KB');
      expect(formatCheckpointSize(5 * 1024)).toBe('5KB');
    });

    it('should format megabytes', () => {
      expect(formatCheckpointSize(1024 * 1024)).toBe('1.0MB');
      expect(formatCheckpointSize(2.5 * 1024 * 1024)).toBe('2.5MB');
    });
  });
});
