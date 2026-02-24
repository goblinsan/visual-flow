/**
 * PricingModal – shows Free vs Pro plan comparison and an upgrade CTA.
 */

import { useState } from 'react';
import { Modal } from './Modal';
import { apiClient } from '../api/client';
import type { Plan } from '../monetization/featureFlags';
import { PLAN_LIMITS } from '../monetization/featureFlags';

export interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: Plan;
  /** Called after a successful checkout redirect is initiated */
  onUpgradeStarted?: () => void;
}

const PRO_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_PRICE_ID ?? 'price_pro_monthly';

interface FeatureRow {
  label: string;
  free: string;
  pro: string;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    label: 'Saved canvases',
    free: `Up to ${PLAN_LIMITS.free.maxCanvases}`,
    pro: 'Unlimited',
  },
  {
    label: 'Exports per day',
    free: `Up to ${PLAN_LIMITS.free.maxExportsPerDay}`,
    pro: 'Unlimited',
  },
  {
    label: 'Roblox Lua export',
    free: '✗',
    pro: '✓',
  },
  {
    label: 'AI agent connections',
    free: '✗',
    pro: '✓',
  },
  {
    label: 'Real-time collaboration',
    free: '✓',
    pro: '✓',
  },
  {
    label: 'Priority support',
    free: '✗',
    pro: '✓',
  },
];

export function PricingModal({ isOpen, onClose, currentPlan, onUpgradeStarted }: PricingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    const successUrl = `${window.location.origin}${window.location.pathname}?billing=success`;
    const cancelUrl = `${window.location.origin}${window.location.pathname}?billing=cancel`;
    const { data, error: apiError } = await apiClient.createCheckoutSession(
      PRO_PRICE_ID,
      successUrl,
      cancelUrl
    );
    setLoading(false);
    if (data?.checkout_url) {
      onUpgradeStarted?.();
      window.location.href = data.checkout_url;
    } else {
      setError(apiError ?? 'Failed to start checkout. Please try again.');
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Upgrade to Pro"
      size="lg"
      variant="light"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-xs font-medium transition-colors border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Maybe later
          </button>
          {currentPlan !== 'pro' && (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
            >
              {loading ? 'Redirecting…' : '⚡ Upgrade to Pro'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* Plan badges */}
        <div className="grid grid-cols-2 gap-4">
          {/* Free */}
          <div className={`rounded-xl border p-4 text-center ${currentPlan === 'free' ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
            <div className="text-sm font-semibold text-gray-700 mb-1">Free</div>
            <div className="text-2xl font-bold text-gray-900">$0</div>
            <div className="text-xs text-gray-500">forever</div>
            {currentPlan === 'free' && (
              <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                Current plan
              </span>
            )}
          </div>
          {/* Pro */}
          <div className={`rounded-xl border p-4 text-center ${currentPlan === 'pro' ? 'border-green-400 bg-green-50' : 'border-cyan-400 bg-gradient-to-br from-cyan-50 to-blue-50'}`}>
            <div className="text-sm font-semibold text-cyan-700 mb-1">Pro</div>
            <div className="text-2xl font-bold text-gray-900">$12</div>
            <div className="text-xs text-gray-500">per month</div>
            {currentPlan === 'pro' ? (
              <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                Current plan ✓
              </span>
            ) : (
              <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-medium">
                Recommended
              </span>
            )}
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Feature</th>
                <th className="text-center px-3 py-2 text-gray-600 font-medium">Free</th>
                <th className="text-center px-3 py-2 text-cyan-700 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 text-gray-700">{row.label}</td>
                  <td className={`px-3 py-2 text-center ${row.free === '✗' ? 'text-red-400' : 'text-gray-600'}`}>
                    {row.free}
                  </td>
                  <td className={`px-3 py-2 text-center font-medium ${row.pro === '✓' || row.pro === 'Unlimited' ? 'text-green-600' : 'text-gray-700'}`}>
                    {row.pro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
        )}
      </div>
    </Modal>
  );
}

export default PricingModal;
