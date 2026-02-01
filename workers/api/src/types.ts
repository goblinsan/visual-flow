import type { LayoutSpec } from '../../src/layout-schema';

/**
 * Type definitions for Vizail API Worker
 */

export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

export interface User {
  id: string;
  email: string;
  display_name?: string;
  created_at: number;
  updated_at: number;
}

export interface Canvas {
  id: string;
  owner_id: string;
  name: string;
  spec: LayoutSpec;
  created_at: number;
  updated_at: number;
}

export interface Membership {
  id: string;
  canvas_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by?: string;
  created_at: number;
}

export interface RequestContext {
  user: User;
  env: Env;
}
