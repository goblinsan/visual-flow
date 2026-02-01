/**
 * Tests for API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from './client';

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('/api');
    global.fetch = vi.fn();
  });

  describe('listCanvases', () => {
    it('should fetch canvases successfully', async () => {
      const mockCanvases = [
        { id: '1', name: 'Canvas 1', spec: {}, created_at: 123, updated_at: 123, owner_id: 'user1' },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCanvases,
      });

      const result = await client.listCanvases();

      expect(result.data).toEqual(mockCanvases);
      expect(result.error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith('/api/canvases', expect.objectContaining({
        method: 'GET',
      }));
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.listCanvases();

      expect(result.data).toBeUndefined();
      expect(result.error).toBe('Network error');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Access denied' }),
      });

      const result = await client.listCanvases();

      expect(result.data).toBeUndefined();
      expect(result.error).toBe('Access denied');
    });
  });

  describe('createCanvas', () => {
    it('should create canvas successfully', async () => {
      const mockCanvas = {
        id: '1',
        name: 'New Canvas',
        spec: { version: '1.0.0' },
        created_at: 123,
        updated_at: 123,
        owner_id: 'user1',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCanvas,
      });

      const result = await client.createCanvas('New Canvas', { version: '1.0.0' } as any);

      expect(result.data).toEqual(mockCanvas);
      expect(result.error).toBeUndefined();
    });
  });

  describe('updateCanvas', () => {
    it('should update canvas successfully', async () => {
      const mockCanvas = {
        id: '1',
        name: 'Updated Canvas',
        spec: { version: '1.0.0' },
        created_at: 123,
        updated_at: 456,
        owner_id: 'user1',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCanvas,
      });

      const result = await client.updateCanvas('1', { name: 'Updated Canvas' });

      expect(result.data).toEqual(mockCanvas);
      expect(global.fetch).toHaveBeenCalledWith('/api/canvases/1', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Canvas' }),
      }));
    });
  });

  describe('membership operations', () => {
    it('should list members', async () => {
      const mockMembers = [
        { id: '1', canvas_id: '1', user_id: 'user1', role: 'owner', email: 'owner@example.com', created_at: 123 },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembers,
      });

      const result = await client.listMembers('1');

      expect(result.data).toEqual(mockMembers);
    });

    it('should add member', async () => {
      const mockMember = {
        id: '2',
        canvas_id: '1',
        user_id: 'user2',
        role: 'editor',
        email: 'editor@example.com',
        created_at: 456,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMember,
      });

      const result = await client.addMember('1', 'editor@example.com', 'editor');

      expect(result.data).toEqual(mockMember);
      expect(global.fetch).toHaveBeenCalledWith('/api/canvases/1/members', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'editor@example.com', role: 'editor' }),
      }));
    });

    it('should remove member', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await client.removeMember('1', 'user2');

      expect(result.data).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith('/api/canvases/1/members/user2', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });
});
