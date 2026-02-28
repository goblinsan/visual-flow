/**
 * Vizail API Worker
 * Phase 1: Cloud Persistence & Sharing
 * Security: CORS lockdown, rate limiting, token hashing, scope enforcement
 */

import { authenticateRequest, authenticateUser } from './auth';
import type { Env } from './types';
import { errorResponse, jsonResponse } from './utils';
import { getCorsHeaders } from './cors';
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
import {
  generateAgentToken,
  revokeAgentToken,
  connectAgent,
  createLinkCode,
  exchangeLinkCode,
  listAgentTokens,
} from './routes/agents';
import {
  listBranches,
  createBranch,
  getBranch,
  deleteBranch,
} from './routes/branches';
import {
  listProposals,
  createProposal,
  getProposal,
  approveProposal,
  rejectProposal,
} from './routes/proposals';
import { uploadImage, deleteImage } from './routes/images';
import { agentDiscoveryResponse } from './routes/discovery';

const CANVAS_ID_ROUTE = new RegExp('^/api/canvases/([^/]+)$');
const CANVAS_MEMBERS_ROUTE = new RegExp('^/api/canvases/([^/]+)/members$');
const CANVAS_MEMBER_ROUTE = new RegExp('^/api/canvases/([^/]+)/members/([^/]+)$');
const CANVAS_AGENT_TOKEN_ROUTE = new RegExp('^/api/canvases/([^/]+)/agent-token$');
const CANVAS_AGENT_TOKEN_DELETE_ROUTE = new RegExp('^/api/canvases/([^/]+)/agent-token/([^/]+)$');
const CANVAS_AGENT_TOKENS_ROUTE = new RegExp('^/api/canvases/([^/]+)/agent-tokens$');
const CANVAS_BRANCHES_ROUTE = new RegExp('^/api/canvases/([^/]+)/branches$');
const BRANCH_ID_ROUTE = new RegExp('^/api/branches/([^/]+)$');
const CANVAS_PROPOSALS_ROUTE = new RegExp('^/api/canvases/([^/]+)/proposals$');
const BRANCH_PROPOSALS_ROUTE = new RegExp('^/api/branches/([^/]+)/proposals$');
const PROPOSAL_ID_ROUTE = new RegExp('^/api/proposals/([^/]+)$');
const PROPOSAL_APPROVE_ROUTE = new RegExp('^/api/proposals/([^/]+)/approve$');
const PROPOSAL_REJECT_ROUTE = new RegExp('^/api/proposals/([^/]+)/reject$');
const IMAGE_DELETE_ROUTE = new RegExp('^/api/images/(.+)$');

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin, env);
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // C3: Reject oversized request bodies
    // Image uploads are allowed up to 5 MB; all other requests capped at 2 MB
    const isImageUpload = url.pathname === '/api/images' && request.method === 'POST';
    const contentLength = request.headers.get('Content-Length');
    const MAX_BODY_BYTES = isImageUpload ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      const limitLabel = isImageUpload ? '5 MB' : '2 MB';
      return errorResponse(`Request body too large (${limitLabel} limit)`, 413, env, origin);
    }

    // Public routes (no auth required)
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    if ((url.pathname === '/api/agent/discover' || url.pathname === '/api/openapi.json') && request.method === 'GET') {
      const response = agentDiscoveryResponse();
      return new Response(response.body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          ...corsHeaders,
        },
      });
    }

    if (url.pathname === '/api/agent/link-code/exchange' && request.method === 'POST') {
      return await exchangeLinkCode(env, request);
    }

    // Route handling
    const path = url.pathname;
    const method = request.method;

    // --- Auth signin redirect ---
    // This endpoint is protected by CF Access at infrastructure level.
    // When a user navigates here, CF Access intercepts with the GitHub login.
    // After authentication, CF forwards the request here and we redirect
    // back to the app. The CF_AppSession cookie is now set, so subsequent
    // /api calls include the authenticated user's email header.
    if (path === '/api/auth/signin' && method === 'GET') {
      const redirectParam = url.searchParams.get('redirect') || '/';
      // Validate redirect URL to prevent open-redirect attacks
      try {
        const target = new URL(redirectParam, url.origin);
        if (target.origin !== url.origin) {
          return errorResponse('Invalid redirect URL', 400, env, origin);
        }
        return new Response(null, {
          status: 302,
          headers: { Location: target.toString(), ...corsHeaders },
        });
      } catch {
        return new Response(null, {
          status: 302,
          headers: { Location: '/', ...corsHeaders },
        });
      }
    }

    // --- Auth signout redirect ---
    if (path === '/api/auth/signout' && method === 'GET') {
      const redirectParam = url.searchParams.get('redirect') || '/';
      try {
        const target = new URL(redirectParam, url.origin);
        if (target.origin !== url.origin) {
          return errorResponse('Invalid redirect URL', 400, env, origin);
        }
        // Clear the CF Access session by redirecting through the logout endpoint
        const logoutUrl = `${url.origin}/cdn-cgi/access/logout`;
        return new Response(null, {
          status: 302,
          headers: { Location: logoutUrl, ...corsHeaders },
        });
      } catch {
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/cdn-cgi/access/logout`, ...corsHeaders },
        });
      }
    }

    // Public endpoints - allow unauthenticated access
    // Whoami returns null for guests, user info for authenticated users
    if (path === '/api/whoami' && method === 'GET') {
      const user = await authenticateUser(request, env);
      if (!user) {
        return jsonResponse({ id: null, email: null, display_name: null, authenticated: false }, 200, env, origin);
      }
      return jsonResponse({ id: user.id, email: user.email, display_name: (user as any).display_name || null, authenticated: true }, 200, env, origin);
    }

    // All other endpoints require authentication
    const authResult = await authenticateRequest(request, env);
    if (!authResult) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - authenticate via Cloudflare Access or provide Authorization: Bearer vz_agent_... token'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
    const { user } = authResult;

    // Protected user endpoints (require auth)

    if (path === '/api/user/display-name' && (method === 'POST' || method === 'PUT')) {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const newName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
      if (!newName || newName.length > 100) {
        return errorResponse('display_name required (1-100 characters)', 400, env, origin);
      }
      // Strip control characters
      const sanitized = newName.replace(/[\x00-\x1F\x7F]/g, '');
      if (!sanitized) {
        return errorResponse('display_name contains invalid characters', 400, env, origin);
      }
      await env.DB.prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?')
        .bind(sanitized, Date.now(), user.id)
        .run();
      return jsonResponse({ ok: true, display_name: sanitized }, 200, env, origin);
    }

    // Rate limiting is handled by Cloudflare Rate Limiting rules at the edge
    // (see docs/MIGRATION_C1_C5.md § C5). No in-worker check needed.

    try {
      // Image upload / delete routes
      if (path === '/api/images' && method === 'POST') {
        return await uploadImage(user, env, request);
      }

      const imageDeleteMatch = path.match(IMAGE_DELETE_ROUTE);
      if (imageDeleteMatch && method === 'DELETE') {
        return await deleteImage(user, env, imageDeleteMatch[1]);
      }

      if (path === '/api/agent/connect' && method === 'POST') {
        return await connectAgent(user, env, request, authResult);
      }

      if (path === '/api/agent/link-code' && method === 'POST') {
        return await createLinkCode(user, env, request, authResult);
      }

      // Canvas routes
      if (path === '/api/canvases' && method === 'GET') {
        return await listCanvases(user, env, authResult);
      }
      
      if (path === '/api/canvases' && method === 'POST') {
        return await createCanvas(user, env, request, authResult);
      }

      const canvasMatch = path.match(CANVAS_ID_ROUTE);
      if (canvasMatch) {
        const canvasId = canvasMatch[1];
        
        if (method === 'GET') {
          return await getCanvas(user, env, canvasId, authResult);
        }
        
        if (method === 'PUT') {
          return await updateCanvas(user, env, canvasId, request, authResult);
        }
        
        if (method === 'DELETE') {
          return await deleteCanvas(user, env, canvasId, authResult);
        }
      }

      // Membership routes
      const membersMatch = path.match(CANVAS_MEMBERS_ROUTE);
      if (membersMatch) {
        const canvasId = membersMatch[1];
        
        if (method === 'GET') {
          return await listMembers(user, env, canvasId, authResult);
        }
        
        if (method === 'POST') {
          return await addMember(user, env, canvasId, request, authResult);
        }
      }

      const memberMatch = path.match(CANVAS_MEMBER_ROUTE);
      if (memberMatch) {
        const [, canvasId, userId] = memberMatch;
        
        if (method === 'DELETE') {
          return await removeMember(user, env, canvasId, userId, authResult);
        }
      }

      // Agent token routes
      const agentTokenMatch = path.match(CANVAS_AGENT_TOKEN_ROUTE);
      if (agentTokenMatch) {
        const canvasId = agentTokenMatch[1];
        
        if (method === 'POST') {
          return await generateAgentToken(user, env, canvasId, request, authResult);
        }
      }

      const agentTokensMatch = path.match(CANVAS_AGENT_TOKENS_ROUTE);
      if (agentTokensMatch) {
        const canvasId = agentTokensMatch[1];

        if (method === 'GET') {
          return await listAgentTokens(user, env, canvasId, authResult);
        }
      }

      const agentTokenDeleteMatch = path.match(CANVAS_AGENT_TOKEN_DELETE_ROUTE);
      if (agentTokenDeleteMatch) {
        const [, canvasId, agentId] = agentTokenDeleteMatch;
        
        if (method === 'DELETE') {
          return await revokeAgentToken(user, env, canvasId, agentId, authResult);
        }
      }

      // Branch routes
      const branchesMatch = path.match(CANVAS_BRANCHES_ROUTE);
      if (branchesMatch) {
        const canvasId = branchesMatch[1];
        
        if (method === 'GET') {
        return await listBranches(user, env, canvasId, authResult);
      }
      
      if (method === 'POST') {
        return await createBranch(user, env, canvasId, request, authResult);
      }
    }

    const branchMatch = path.match(BRANCH_ID_ROUTE);
    if (branchMatch) {
      const branchId = branchMatch[1];
      
      if (method === 'GET') {
        return await getBranch(user, env, branchId, authResult);
      }
      
      if (method === 'DELETE') {
        return await deleteBranch(user, env, branchId, authResult);
      }
    }

      // Proposal routes
      const canvasProposalsMatch = path.match(CANVAS_PROPOSALS_ROUTE);
    if (canvasProposalsMatch) {
      const canvasId = canvasProposalsMatch[1];
      
      if (method === 'GET') {
        return await listProposals(user, env, canvasId, authResult);
      }
    }

    const branchProposalsMatch = path.match(BRANCH_PROPOSALS_ROUTE);
    if (branchProposalsMatch) {
      const branchId = branchProposalsMatch[1];
      
      if (method === 'POST') {
        return await createProposal(user, env, branchId, request, authResult);
      }
    }

      const proposalMatch = path.match(PROPOSAL_ID_ROUTE);
    if (proposalMatch) {
      const proposalId = proposalMatch[1];
      
      if (method === 'GET') {
        return await getProposal(user, env, proposalId, authResult);
      }
    }

      const approveMatch = path.match(PROPOSAL_APPROVE_ROUTE);
    if (approveMatch) {
      const proposalId = approveMatch[1];
      
      if (method === 'POST') {
        return await approveProposal(user, env, proposalId, authResult);
      }
    }

    const rejectMatch = path.match(PROPOSAL_REJECT_ROUTE);
    if (rejectMatch) {
      const proposalId = rejectMatch[1];
      
      if (method === 'POST') {
        return await rejectProposal(user, env, proposalId, request, authResult);
      }
    }

      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse('Internal server error', 500);
    }
  },
};
