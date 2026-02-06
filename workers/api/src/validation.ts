/**
 * Request validation schemas using Zod
 * Ensures all incoming data is properly validated before processing
 */

import { z } from 'zod';

// Canvas validation schemas
export const createCanvasSchema = z.object({
  name: z.string().min(1).max(255),
  spec: z.record(z.unknown()), // LayoutSpec - validated by application logic
});

export const updateCanvasSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  spec: z.record(z.unknown()).optional(),
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
    const body = await request.json();
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
