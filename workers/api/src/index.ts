/**
 * Vizail API Worker
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
import {
  generateAgentToken,
  revokeAgentToken,
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
import { agentDiscoveryResponse } from './routes/discovery';

const CANVAS_ID_ROUTE = new RegExp('^/api/canvases/([^/]+)$');
const CANVAS_MEMBERS_ROUTE = new RegExp('^/api/canvases/([^/]+)/members$');
const CANVAS_MEMBER_ROUTE = new RegExp('^/api/canvases/([^/]+)/members/([^/]+)$');
const CANVAS_AGENT_TOKEN_ROUTE = new RegExp('^/api/canvases/([^/]+)/agent-token$');
const CANVAS_AGENT_TOKEN_DELETE_ROUTE = new RegExp('^/api/canvases/([^/]+)/agent-token/([^/]+)$');
const CANVAS_BRANCHES_ROUTE = new RegExp('^/api/canvases/([^/]+)/branches$');
const BRANCH_ID_ROUTE = new RegExp('^/api/branches/([^/]+)$');
const CANVAS_PROPOSALS_ROUTE = new RegExp('^/api/canvases/([^/]+)/proposals$');
const BRANCH_PROPOSALS_ROUTE = new RegExp('^/api/branches/([^/]+)/proposals$');
const PROPOSAL_ID_ROUTE = new RegExp('^/api/proposals/([^/]+)$');
const PROPOSAL_APPROVE_ROUTE = new RegExp('^/api/proposals/([^/]+)/approve$');
const PROPOSAL_REJECT_ROUTE = new RegExp('^/api/proposals/([^/]+)/reject$');

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, CF-Access-Authenticated-User-Email, Authorization',
        },
      });
    }

    // Public routes (no auth required)
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', timestamp: Date.now() });
    }

    if ((url.pathname === '/api/agent/discover' || url.pathname === '/api/openapi.json') && request.method === 'GET') {
      return agentDiscoveryResponse();
    }

    // Authenticate user (supports both CF Access headers and agent tokens)
    const user = await authenticateUser(request, env);
    if (!user) {
      return errorResponse('Unauthorized - provide CF-Access-Authenticated-User-Email header or Authorization: Bearer vz_agent_... token', 401);
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

      const canvasMatch = path.match(CANVAS_ID_ROUTE);
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
      const membersMatch = path.match(CANVAS_MEMBERS_ROUTE);
      if (membersMatch) {
        const canvasId = membersMatch[1];
        
        if (method === 'GET') {
          return await listMembers(user, env, canvasId);
        }
        
        if (method === 'POST') {
          return await addMember(user, env, canvasId, request);
        }
      }

      const memberMatch = path.match(CANVAS_MEMBER_ROUTE);
      if (memberMatch) {
        const [, canvasId, userId] = memberMatch;
        
        if (method === 'DELETE') {
          return await removeMember(user, env, canvasId, userId);
        }
      }

      // Agent token routes
      const agentTokenMatch = path.match(CANVAS_AGENT_TOKEN_ROUTE);
      if (agentTokenMatch) {
        const canvasId = agentTokenMatch[1];
        
        if (method === 'POST') {
          return await generateAgentToken(user, env, canvasId, request);
        }
      }

      const agentTokenDeleteMatch = path.match(CANVAS_AGENT_TOKEN_DELETE_ROUTE);
      if (agentTokenDeleteMatch) {
        const [, canvasId, agentId] = agentTokenDeleteMatch;
        
        if (method === 'DELETE') {
          return await revokeAgentToken(user, env, canvasId, agentId);
        }
      }

      // Branch routes
      const branchesMatch = path.match(CANVAS_BRANCHES_ROUTE);
      if (branchesMatch) {
        const canvasId = branchesMatch[1];
        
        if (method === 'GET') {
          return await listBranches(user, env, canvasId);
        }
        
        if (method === 'POST') {
          return await createBranch(user, env, canvasId, request);
        }
      }

      const branchMatch = path.match(BRANCH_ID_ROUTE);
      if (branchMatch) {
        const branchId = branchMatch[1];
        
        if (method === 'GET') {
          return await getBranch(user, env, branchId);
        }
        
        if (method === 'DELETE') {
          return await deleteBranch(user, env, branchId);
        }
      }

      // Proposal routes
      const canvasProposalsMatch = path.match(CANVAS_PROPOSALS_ROUTE);
      if (canvasProposalsMatch) {
        const canvasId = canvasProposalsMatch[1];
        
        if (method === 'GET') {
          return await listProposals(user, env, canvasId);
        }
      }

      const branchProposalsMatch = path.match(BRANCH_PROPOSALS_ROUTE);
      if (branchProposalsMatch) {
        const branchId = branchProposalsMatch[1];
        
        if (method === 'POST') {
          return await createProposal(user, env, branchId, request);
        }
      }

      const proposalMatch = path.match(PROPOSAL_ID_ROUTE);
      if (proposalMatch) {
        const proposalId = proposalMatch[1];
        
        if (method === 'GET') {
          return await getProposal(user, env, proposalId);
        }
      }

      const approveMatch = path.match(PROPOSAL_APPROVE_ROUTE);
      if (approveMatch) {
        const proposalId = approveMatch[1];
        
        if (method === 'POST') {
          return await approveProposal(user, env, proposalId);
        }
      }

      const rejectMatch = path.match(PROPOSAL_REJECT_ROUTE);
      if (rejectMatch) {
        const proposalId = rejectMatch[1];
        
        if (method === 'POST') {
          return await rejectProposal(user, env, proposalId, request);
        }
      }

      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse('Internal server error', 500);
    }
  },
};
