/**
 * Request validation schemas using Zod
 * Ensures all incoming data is properly validated before processing
 */

import { z } from 'zod';

// Canvas validation schemas
export const createCanvasSchema = z.object({
  name: z.string().min(1).max(255),
  spec: z.record(z.unknown()).refine(
    (val) => JSON.stringify(val).length <= 2_000_000,
    { message: 'Spec JSON must be under 2 MB' },
  ),
});

export const updateCanvasSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  spec: z.record(z.unknown()).refine(
    (val) => JSON.stringify(val).length <= 2_000_000,
    { message: 'Spec JSON must be under 2 MB' },
  ).optional(),
}).refine(data => data.name !== undefined || data.spec !== undefined, {
  message: 'At least one field (name or spec) must be provided',
});

// Membership validation schemas
export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']),
});

// Agent token validation schemas
export const generateAgentTokenSchema = z.object({
  agentId: z.string().min(1).max(255),
  scope: z.enum(['read', 'propose', 'trusted-propose']),
});

export const connectAgentSchema = z.object({
  canvasId: z.string().min(1).max(255),
  agentId: z.string().min(1).max(255).optional(),
  scope: z.enum(['read', 'propose', 'trusted-propose']).optional(),
  client: z.string().min(1).max(64).optional(),
});

export const createLinkCodeSchema = z.object({
  canvasId: z.string().min(1).max(255),
  agentId: z.string().min(1).max(255).optional(),
  scope: z.enum(['read', 'propose', 'trusted-propose']).optional(),
  client: z.string().min(1).max(64).optional(),
});

export const exchangeLinkCodeSchema = z.object({
  code: z.string().min(4).max(32),
});

// Branch validation schemas
export const createBranchSchema = z.object({
  agentId: z.string().min(1).max(255),
  baseVersion: z.number().int().positive(),
});

// Proposal validation schemas
export const createProposalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000),
  operations: z.array(z.record(z.unknown())), // ProposalOperation[] - validated by application logic
  rationale: z.string().max(5000),
  assumptions: z.array(z.string().max(500)),
  confidence: z.number().min(0).max(1),
});

export const rejectProposalSchema = z.object({
  reason: z.string().max(1000).optional(),
});

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const raw = await request.text();
    const body = raw.trim().length === 0 ? {} : JSON.parse(raw);
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: `Validation failed: ${errors}` };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: 'Invalid JSON body' };
  }
}
