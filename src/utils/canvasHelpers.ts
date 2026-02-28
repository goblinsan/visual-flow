/**
 * Pure helper functions extracted from CanvasApp.tsx.
 */
import type { LayoutSpec } from '../layout-schema';

/** Get room ID from URL query param ?room=xxx */
export function getRoomIdFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}

/** Generate a random room ID */
export function generateRoomId(): string {
  return `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Get or generate a persistent user ID for this browser */
export function getUserId(): string {
  const key = 'vizail_user_id';
  let userId = localStorage.getItem(key);
  if (!userId) {
    userId = `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    localStorage.setItem(key, userId);
  }
  return userId;
}

/** Get display name (can be customized later) */
export function getDisplayName(): string {
  const key = 'vizail_display_name';
  let name = localStorage.getItem(key);
  if (!name) {
    name = `User ${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem(key, name);
  }
  return name;
}

/** Get WebSocket URL based on environment */
export function getWebSocketUrl(): string {
  // Check for environment variable first
  const envUrl = import.meta.env.VITE_WEBSOCKET_URL;
  if (envUrl) return envUrl;
  // Auto-detect production
  if (typeof window !== 'undefined' && window.location.hostname === 'vizail.com') {
    return 'wss://vizail-websocket.coghlanjames.workers.dev';
  }
  // Default to localhost for development
  return 'ws://localhost:8787';
}

/** Build an empty initial canvas spec */
export function buildInitialSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 1600, height: 1200 },
      background: undefined,
      children: [],
    },
  };
}
