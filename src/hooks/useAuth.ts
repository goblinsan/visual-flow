/**
 * Shared auth state hook.
 *
 * Fetches /api/whoami once on mount and caches the result.
 * Used by both the SignIn header component and CanvasApp to
 * decide whether to save to cloud vs. localStorage.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface AuthUser {
  id: string;
  email: string;
  display_name?: string | null;
  authenticated: boolean;
}

export interface UseAuthResult {
  /** The current user, or null if not yet loaded */
  user: AuthUser | null;
  /** True while the initial whoami call is in flight */
  loading: boolean;
  /** Whether the user is authenticated (false while loading) */
  isAuthenticated: boolean;
  /** Re-fetch auth state (e.g., after sign-in redirect) */
  refresh: () => Promise<void>;
  /** Update local display name after save */
  setDisplayName: (name: string) => void;
}

// Module-level cache so every hook instance shares the same data
// without needing a full React Context provider.
let cachedUser: AuthUser | null = null;
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function doFetch() {
  try {
    const { data } = await apiClient.whoami();
    if (data && (data as Record<string, unknown>).authenticated) {
      cachedUser = {
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        authenticated: true,
      };
    } else {
      cachedUser = null;
    }
  } catch {
    cachedUser = null;
  }
  notifyListeners();
}

export function useAuth(): UseAuthResult {
  const [, forceRender] = useState(0);
  const [loading, setLoading] = useState(cachedUser === null && fetchPromise === null);

  useEffect(() => {
    // Subscribe to shared cache updates
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);

    // Kick off initial fetch if not already done
    if (!fetchPromise) {
      setLoading(true);
      fetchPromise = doFetch().finally(() => setLoading(false));
    } else if (cachedUser !== null) {
      setLoading(false);
    } else {
      // Fetch is in flight from another instance
      fetchPromise.finally(() => setLoading(false));
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    fetchPromise = doFetch().finally(() => setLoading(false));
    await fetchPromise;
  }, []);

  const setDisplayName = useCallback((name: string) => {
    if (cachedUser) {
      cachedUser = { ...cachedUser, display_name: name };
      notifyListeners();
    }
  }, []);

  return {
    user: cachedUser,
    loading,
    isAuthenticated: !!cachedUser?.authenticated,
    refresh,
    setDisplayName,
  };
}
