import type { LayoutSpec } from '../../src/layout-schema';

/**
 * Type definitions for Vizail API Worker
 */

export interface Env {
  DB: D1Database;
  /** R2 bucket for uploaded images */
  IMAGES: R2Bucket;
  ENVIRONMENT?: string;
  /** Public base URL for the R2 bucket (e.g. https://assets.vizail.io) */
  R2_PUBLIC_URL?: string;
  /** Cloudflare Access team domain, e.g. "myteam.cloudflareaccess.com" */
  CF_ACCESS_TEAM_DOMAIN?: string;
  /** Cloudflare Access Application Audience (AUD) tag */
  CF_ACCESS_AUD?: string;
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
