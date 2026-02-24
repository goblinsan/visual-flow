/**
 * Tests for usePlan hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as apiClientModule from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    getSubscription: vi.fn(),
  },
}));

describe('usePlan', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the module-level cache between tests by re-importing the module
    vi.resetModules();
  });

  it('falls back to free when API returns error', async () => {
    vi.mocked(apiClientModule.apiClient.getSubscription).mockResolvedValue({
      error: 'Unauthorized',
    });

    const { usePlan } = await import('./usePlan');
    const { result } = renderHook(() => usePlan());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plan).toBe('free');
    expect(result.current.status).toBeNull();
  });

  it('returns pro plan when API indicates active pro subscription', async () => {
    vi.mocked(apiClientModule.apiClient.getSubscription).mockResolvedValue({
      data: { plan: 'pro', status: 'active', current_period_end: 1800000000, cancel_at_period_end: false },
    });

    const { usePlan } = await import('./usePlan');
    const { result } = renderHook(() => usePlan());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plan).toBe('pro');
    expect(result.current.status).toBe('active');
    expect(result.current.currentPeriodEnd).toBe(1800000000);
    expect(result.current.cancelAtPeriodEnd).toBe(false);
  });

  it('falls back to free when API throws', async () => {
    vi.mocked(apiClientModule.apiClient.getSubscription).mockRejectedValue(new Error('Network error'));

    const { usePlan } = await import('./usePlan');
    const { result } = renderHook(() => usePlan());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plan).toBe('free');
  });
});
