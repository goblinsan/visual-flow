/**
 * Tests for proposal helper utilities
 * Phase 4: Agent Collaboration
 */

import { describe, it, expect } from 'vitest';
import {
  calculateProposalDiff,
  findNodeById,
  getAllNodeIds,
  formatConfidence,
  getProposalStatusColor,
  getOperationIcon,
} from './proposalHelpers';
import type { ProposalOperation } from '../types/agent';
import type { LayoutSpec } from '../layout-schema';

describe('proposalHelpers', () => {
  describe('calculateProposalDiff', () => {
    it('should calculate diff summary from operations', () => {
      const operations: ProposalOperation[] = [
        { type: 'create', nodeId: '1' },
        { type: 'create', nodeId: '2' },
        { type: 'update', nodeId: '3' },
        { type: 'delete', nodeId: '4' },
        { type: 'move', nodeId: '5' },
      ];

      const diff = calculateProposalDiff(operations);

      expect(diff.created).toEqual(['1', '2']);
      expect(diff.updated).toEqual(['3']);
      expect(diff.deleted).toEqual(['4']);
      expect(diff.moved).toEqual(['5']);
      expect(diff.totalChanges).toBe(5);
    });

    it('should handle empty operations', () => {
      const diff = calculateProposalDiff([]);

      expect(diff.created).toEqual([]);
      expect(diff.updated).toEqual([]);
      expect(diff.deleted).toEqual([]);
      expect(diff.moved).toEqual([]);
      expect(diff.totalChanges).toBe(0);
    });
  });

  describe('findNodeById', () => {
    const spec: LayoutSpec = {
      version: 1,
      root: {
        id: 'root',
        type: 'frame',
        size: { width: 800, height: 600 },
        children: [
          {
            id: 'child1',
            type: 'rect',
            position: { x: 10, y: 10 },
            size: { width: 100, height: 100 },
          },
          {
            id: 'group1',
            type: 'group',
            children: [
              {
                id: 'nested1',
                type: 'rect',
                position: { x: 20, y: 20 },
                size: { width: 50, height: 50 },
              },
            ],
          },
        ],
      },
    };

    it('should find root node', () => {
      const node = findNodeById(spec, 'root');
      expect(node).toBeDefined();
      expect(node?.id).toBe('root');
    });

    it('should find child node', () => {
      const node = findNodeById(spec, 'child1');
      expect(node).toBeDefined();
      expect(node?.id).toBe('child1');
    });

    it('should find nested node', () => {
      const node = findNodeById(spec, 'nested1');
      expect(node).toBeDefined();
      expect(node?.id).toBe('nested1');
    });

    it('should return null for non-existent node', () => {
      const node = findNodeById(spec, 'nonexistent');
      expect(node).toBeNull();
    });
  });

  describe('getAllNodeIds', () => {
    it('should get all node IDs from spec', () => {
      const spec: LayoutSpec = {
        version: 1,
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [
            { id: 'child1', type: 'rect' },
            {
              id: 'group1',
              type: 'group',
              children: [{ id: 'nested1', type: 'rect' }],
            },
          ],
        },
      };

      const ids = getAllNodeIds(spec);
      expect(ids).toEqual(['root', 'child1', 'group1', 'nested1']);
    });

    it('should handle spec with no children', () => {
      const spec: LayoutSpec = {
        version: 1,
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
        },
      };

      const ids = getAllNodeIds(spec);
      expect(ids).toEqual(['root']);
    });
  });

  describe('formatConfidence', () => {
    it('should format confidence as percentage', () => {
      expect(formatConfidence(0.85)).toBe('85%');
      expect(formatConfidence(1.0)).toBe('100%');
      expect(formatConfidence(0.0)).toBe('0%');
      expect(formatConfidence(0.123)).toBe('12%');
    });
  });

  describe('getProposalStatusColor', () => {
    it('should return correct colors for statuses', () => {
      expect(getProposalStatusColor('pending')).toBe('#FFA500');
      expect(getProposalStatusColor('approved')).toBe('#22C55E');
      expect(getProposalStatusColor('rejected')).toBe('#EF4444');
      expect(getProposalStatusColor('superseded')).toBe('#6B7280');
      expect(getProposalStatusColor('unknown')).toBe('#6B7280');
    });
  });

  describe('getOperationIcon', () => {
    it('should return correct icons for operations', () => {
      expect(getOperationIcon('create')).toBe('+');
      expect(getOperationIcon('update')).toBe('~');
      expect(getOperationIcon('delete')).toBe('-');
      expect(getOperationIcon('move')).toBe('→');
      expect(getOperationIcon('unknown')).toBe('?');
    });
  });
});
