import { describe, expect, it } from 'vitest';

import type { AuthResult } from '../auth';
import type { Env, User } from '../types';
import { generateAgentToken, revokeAgentToken, connectAgent, createLinkCode, listAgentTokens } from './agents';

const baseUser: User = {
  id: 'user-1',
  email: 'user@example.com',
  created_at: 0,
  updated_at: 0,
};

const agentAuth: AuthResult = {
  user: baseUser,
  agentToken: {
    id: 'token-1',
    canvas_id: 'canvas-1',
    agent_id: 'agent-1',
    scope: 'trusted-propose',
  },
};

const dummyEnv = {} as Env;

describe('agent token restrictions', () => {
  it('blocks agent tokens from generating other tokens', async () => {
    const request = new Request('http://localhost/api/canvases/canvas-1/agent-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'new-agent', scope: 'read' }),
    });

    const response = await generateAgentToken(baseUser, dummyEnv, 'canvas-1', request, agentAuth);
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/Agent tokens cannot manage other tokens/i);
  });

  it('blocks agent tokens from revoking other tokens', async () => {
    const response = await revokeAgentToken(baseUser, dummyEnv, 'canvas-1', 'agent-2', agentAuth);
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/Agent tokens cannot manage other tokens/i);
  });

  it('blocks agent tokens from connecting new agents', async () => {
    const request = new Request('http://localhost/api/agent/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvasId: 'canvas-1', agentId: 'new-agent', scope: 'read' }),
    });

    const response = await connectAgent(baseUser, dummyEnv, request, agentAuth);
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/Agent tokens cannot manage other tokens/i);
  });

  it('blocks agent tokens from creating link codes', async () => {
    const request = new Request('http://localhost/api/agent/link-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvasId: 'canvas-1' }),
    });

    const response = await createLinkCode(baseUser, dummyEnv, request, agentAuth);
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/Agent tokens cannot manage other tokens/i);
  });

  it('blocks agent tokens from listing tokens', async () => {
    const response = await listAgentTokens(baseUser, dummyEnv, 'canvas-1', agentAuth);
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/Agent tokens cannot manage other tokens/i);
  });
});
