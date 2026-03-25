/**
 * Style Flow persistence layer
 * Phase 1 (#175, #177): save/resume journey state via localStorage.
 */

import type { JourneyState } from './types';

// ── Storage interface ─────────────────────────────────────────────────────────

export interface StyleFlowStorage {
  /** Persist the current journey state */
  save(state: JourneyState): Promise<void>;
  /** Load a previously saved state by session ID, or null if not found */
  load(sessionId: string): Promise<JourneyState | null>;
  /** Delete a saved state */
  remove(sessionId: string): Promise<void>;
  /** List all saved session IDs */
  listSessions(): Promise<string[]>;
}

// ── localStorage implementation ───────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'vf_style_flow_';
const SESSION_INDEX_KEY = 'vf_style_flow_sessions';

export class LocalStorageStyleFlowStorage implements StyleFlowStorage {
  private key(sessionId: string): string {
    return `${STORAGE_KEY_PREFIX}${sessionId}`;
  }

  async save(state: JourneyState): Promise<void> {
    localStorage.setItem(this.key(state.id), JSON.stringify(state));
    // Update the session index
    const sessions = await this.listSessions();
    if (!sessions.includes(state.id)) {
      sessions.push(state.id);
      localStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(sessions));
    }
  }

  async load(sessionId: string): Promise<JourneyState | null> {
    try {
      const raw = localStorage.getItem(this.key(sessionId));
      if (!raw) return null;
      return JSON.parse(raw) as JourneyState;
    } catch {
      return null;
    }
  }

  async remove(sessionId: string): Promise<void> {
    localStorage.removeItem(this.key(sessionId));
    const sessions = await this.listSessions();
    const filtered = sessions.filter((id) => id !== sessionId);
    localStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(filtered));
  }

  async listSessions(): Promise<string[]> {
    try {
      const raw = localStorage.getItem(SESSION_INDEX_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}

// ── Default storage instance ──────────────────────────────────────────────────

export const defaultStyleFlowStorage = new LocalStorageStyleFlowStorage();
