/**
 * Visual Flow API Worker
 * Phase 1: Cloud Persistence & Sharing
 */

import { authenticateUser } from './auth';
import type { Env } from './types';
import { errorResponse, jsonResponse } from './utils';
import {
  listCanvases,
  createCanvas,
  getCanvas,
  updateCanvas,
  deleteCanvas,
} from './routes/canvases';
import {
  listMembers,
  addMember,
  removeMember,
} from './routes/memberships';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Authenticate user
    const user = await authenticateUser(request, env);
    if (!user) {
      return errorResponse('Unauthorized - Cloudflare Access required', 401);
    }

    // Route handling
    const path = url.pathname;
    const method = request.method;

    try {
      // Canvas routes
      if (path === '/api/canvases' && method === 'GET') {
        return await listCanvases(user, env);
      }
      
      if (path === '/api/canvases' && method === 'POST') {
        return await createCanvas(user, env, request);
      }

      const canvasMatch = path.match(/^\/api\/canvases\/([^\/]+)$/);
      if (canvasMatch) {
        const canvasId = canvasMatch[1];
        
        if (method === 'GET') {
          return await getCanvas(user, env, canvasId);
        }
        
        if (method === 'PUT') {
          return await updateCanvas(user, env, canvasId, request);
        }
        
        if (method === 'DELETE') {
          return await deleteCanvas(user, env, canvasId);
        }
      }

      // Membership routes
      const membersMatch = path.match(/^\/api\/canvases\/([^\/]+)\/members$/);
      if (membersMatch) {
        const canvasId = membersMatch[1];
        
        if (method === 'GET') {
          return await listMembers(user, env, canvasId);
        }
        
        if (method === 'POST') {
          return await addMember(user, env, canvasId, request);
        }
      }

      const memberMatch = path.match(/^\/api\/canvases\/([^\/]+)\/members\/([^\/]+)$/);
      if (memberMatch) {
        const [, canvasId, userId] = memberMatch;
        
        if (method === 'DELETE') {
          return await removeMember(user, env, canvasId, userId);
        }
      }

      // Health check
      if (path === '/health' || path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() });
      }

      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse('Internal server error', 500);
    }
  },
};
