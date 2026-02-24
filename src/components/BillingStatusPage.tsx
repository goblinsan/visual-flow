/**
 * BillingStatusPage – shows the current subscription plan and allows
 * the user to manage their billing via Stripe Customer Portal.
 */

import { useState } from 'react';
import { Modal } from './Modal';
import { apiClient } from '../api/client';
import { usePlan } from '../hooks/usePlan';
import { PLAN_LIMITS } from '../monetization/featureFlags';

export interface BillingStatusPageProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeClick: () => void;
}

export function BillingStatusPage({ isOpen, onClose, onUpgradeClick }: BillingStatusPageProps) {
  const { plan, loading, status, currentPeriodEnd, cancelAtPeriodEnd } = usePlan();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    setPortalError(null);
    const returnUrl = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await apiClient.createPortalSession(returnUrl);
    setPortalLoading(false);
    if (data?.portal_url) {
      window.location.href = data.portal_url;
    } else {
      setPortalError(error ?? 'Failed to open billing portal. Please try again.');
    }
  };

  const isPro = plan === 'pro';
  const limits = PLAN_LIMITS[plan];

  const periodEndFormatted = currentPeriodEnd
    ? new Date(
        // Stripe returns period_end as Unix timestamp in seconds; convert to ms
        currentPeriodEnd * 1000
      ).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Billing & Subscription"
      size="md"
      variant="light"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-xs font-medium transition-colors border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Close
          </button>
          {isPro ? (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-60"
            >
              {portalLoading ? 'Opening…' : 'Manage Billing'}
            </button>
          ) : (
            <button
              onClick={onUpgradeClick}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500"
            >
              ⚡ Upgrade to Pro
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-gray-500 text-sm">Loading subscription…</div>
      ) : (
        <div className="space-y-4">
          {/* Plan badge */}
          <div className={`flex items-center justify-between rounded-xl border p-4 ${isPro ? 'border-cyan-300 bg-gradient-to-r from-cyan-50 to-blue-50' : 'border-gray-200 bg-gray-50'}`}>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Current plan</div>
              <div className={`text-xl font-bold mt-0.5 ${isPro ? 'text-cyan-700' : 'text-gray-800'}`}>
                {isPro ? '⚡ Pro' : 'Free'}
              </div>
              {status && (
                <div className={`text-xs mt-1 ${status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
              )}
            </div>
            {isPro && (
              <div className="text-right text-xs text-gray-500">
                {cancelAtPeriodEnd ? (
                  <span className="text-orange-600">Cancels on {periodEndFormatted}</span>
                ) : periodEndFormatted ? (
                  <>Renews on<br />{periodEndFormatted}</>
                ) : null}
              </div>
            )}
          </div>

          {/* Plan limits */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Your plan includes
            </h3>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-check text-green-500 w-3.5" />
                {limits.maxCanvases === null ? 'Unlimited saved canvases' : `Up to ${limits.maxCanvases} saved canvases`}
              </li>
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-check text-green-500 w-3.5" />
                {limits.maxExportsPerDay === null ? 'Unlimited exports per day' : `Up to ${limits.maxExportsPerDay} exports per day`}
              </li>
              <li className="flex items-center gap-2">
                <i className={`fa-solid ${limits.robloxExport ? 'fa-check text-green-500' : 'fa-xmark text-red-400'} w-3.5`} />
                Roblox Lua export
              </li>
              <li className="flex items-center gap-2">
                <i className={`fa-solid ${limits.aiAgents ? 'fa-check text-green-500' : 'fa-xmark text-red-400'} w-3.5`} />
                AI agent connections
              </li>
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-check text-green-500 w-3.5" />
                Real-time collaboration
              </li>
            </ul>
          </div>

          {!isPro && (
            <div className="rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 p-3 text-xs text-cyan-800">
              <strong>Upgrade to Pro</strong> to unlock Roblox exports, AI agents, unlimited canvases and more for just $12/month.
            </div>
          )}

          {portalError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{portalError}</p>
          )}
        </div>
      )}
    </Modal>
  );
}

export default BillingStatusPage;


