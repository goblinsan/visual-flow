/**
 * usePlan hook – fetches and caches the current user's subscription plan.
 *
 * Falls back to 'free' when the user is unauthenticated or when the
 * billing endpoint is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { Plan } from '../monetization/featureFlags';

export interface UsePlanResult {
  plan: Plan;
  loading: boolean;
  /** ISO timestamp (ms) when the current billing period ends, or null */
  currentPeriodEnd: number | null;
  /** Whether the subscription will cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Billing status string from Stripe, e.g. "active" | "canceled" */
  status: string | null;
  /** Re-fetch plan (e.g. after successful checkout) */
  refresh: () => Promise<void>;
}

// Module-level cache shared across hook instances
let cachedPlan: Plan | null = null;
let cachedStatus: string | null = null;
let cachedPeriodEnd: number | null = null;
let cachedCancelAtPeriodEnd = false;
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function doFetch() {
  try {
    const { data, error } = await apiClient.getSubscription();
    if (data && !error) {
      cachedPlan = (data.plan === 'pro' ? 'pro' : 'free') as Plan;
      cachedStatus = data.status ?? null;
      cachedPeriodEnd = data.current_period_end ?? null;
      cachedCancelAtPeriodEnd = data.cancel_at_period_end ?? false;
    } else {
      cachedPlan = 'free';
      cachedStatus = null;
      cachedPeriodEnd = null;
      cachedCancelAtPeriodEnd = false;
    }
  } catch {
    cachedPlan = 'free';
    cachedStatus = null;
    cachedPeriodEnd = null;
    cachedCancelAtPeriodEnd = false;
  }
  notifyListeners();
}

export function usePlan(): UsePlanResult {
  const [, forceRender] = useState(0);
  const [loading, setLoading] = useState(cachedPlan === null && fetchPromise === null);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);

    if (!fetchPromise) {
      setLoading(true);
      fetchPromise = doFetch().finally(() => setLoading(false));
    } else if (cachedPlan !== null) {
      setLoading(false);
    } else {
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

  return {
    plan: cachedPlan ?? 'free',
    loading,
    currentPeriodEnd: cachedPeriodEnd,
    cancelAtPeriodEnd: cachedCancelAtPeriodEnd,
    status: cachedStatus,
    refresh,
  };
}
