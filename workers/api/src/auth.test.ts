import { describe, expect, it } from 'vitest';

import type { AuthResult } from './auth';
import { checkAgentScope } from './auth';

const baseUser = {
  id: 'user-1',
  email: 'user@example.com',
  created_at: 0,
  updated_at: 0,
};

describe('checkAgentScope', () => {
  it('allows human users without agent tokens', () => {
    expect(checkAgentScope(null, 'read').allowed).toBe(true);

    const authResult: AuthResult = { user: baseUser };
    expect(checkAgentScope(authResult, 'trusted-propose').allowed).toBe(true);
  });

  it('enforces scope hierarchy', () => {
    const authResult: AuthResult = {
      user: baseUser,
      agentToken: {
        id: 'token-1',
        canvas_id: 'canvas-1',
        agent_id: 'agent-1',
        scope: 'read',
      },
    };

    expect(checkAgentScope(authResult, 'read').allowed).toBe(true);
    expect(checkAgentScope(authResult, 'propose').allowed).toBe(false);
    expect(checkAgentScope(authResult, 'trusted-propose').allowed).toBe(false);
  });

  it('rejects canvas mismatches', () => {
    const authResult: AuthResult = {
      user: baseUser,
      agentToken: {
        id: 'token-2',
        canvas_id: 'canvas-1',
        agent_id: 'agent-2',
        scope: 'trusted-propose',
      },
    };

    expect(checkAgentScope(authResult, 'read', 'canvas-2').allowed).toBe(false);
  });
});
