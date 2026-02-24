/**
 * Agent Discovery & OpenAPI endpoint
 * Returns machine-readable API documentation for AI agents
 * 
 * GET /api/agent/discover — public, no auth required
 */
import { OPENAPI_SPEC } from '../openapiSpec';

export function agentDiscoveryResponse(): Response {
  return new Response(JSON.stringify(OPENAPI_SPEC, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
