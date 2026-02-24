/**
 * Monetization: Free vs Pro feature flags
 *
 * Defines what features are available on each plan and provides
 * helpers for checking access.
 */

export type Plan = 'free' | 'pro';

export interface PlanLimits {
  /** Maximum number of saved canvases (null = unlimited) */
  maxCanvases: number | null;
  /** Maximum exports per day across all formats (null = unlimited) */
  maxExportsPerDay: number | null;
  /** Export formats available on this plan */
  allowedExportFormats: string[];
  /** Whether the Roblox Lua export is available */
  robloxExport: boolean;
  /** Whether real-time collaboration is available */
  collaboration: boolean;
  /** Whether AI agent connections are available */
  aiAgents: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxCanvases: 3,
    maxExportsPerDay: 5,
    allowedExportFormats: ['json', 'react', 'tokens-json', 'tokens-css'],
    robloxExport: false,
    collaboration: true,
    aiAgents: false,
  },
  pro: {
    maxCanvases: null,
    maxExportsPerDay: null,
    allowedExportFormats: ['json', 'react', 'tokens-json', 'tokens-css', 'roblox-lua'],
    robloxExport: true,
    collaboration: true,
    aiAgents: true,
  },
};

/** Returns true if the given plan can use the specified export format */
export function canExportFormat(plan: Plan, format: string): boolean {
  return PLAN_LIMITS[plan].allowedExportFormats.includes(format);
}

/** Returns true if the given plan has access to Roblox export */
export function canUseRobloxExport(plan: Plan): boolean {
  return PLAN_LIMITS[plan].robloxExport;
}

/** Returns true if the given plan has access to AI agents */
export function canUseAiAgents(plan: Plan): boolean {
  return PLAN_LIMITS[plan].aiAgents;
}

/** Returns the max exports per day, or null for unlimited */
export function getMaxExportsPerDay(plan: Plan): number | null {
  return PLAN_LIMITS[plan].maxExportsPerDay;
}

/** Returns the max canvases, or null for unlimited */
export function getMaxCanvases(plan: Plan): number | null {
  return PLAN_LIMITS[plan].maxCanvases;
}
