type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: AnalyticsProps }) => void;
    gtag?: (...args: unknown[]) => void;
    posthog?: { capture?: (eventName: string, props?: AnalyticsProps) => void };
  }
}

export function trackEvent(eventName: string, props: AnalyticsProps = {}): void {
  if (typeof window === 'undefined') return;

  try {
    if (typeof window.plausible === 'function') {
      window.plausible(eventName, { props });
      return;
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, props);
      return;
    }

    if (window.posthog?.capture) {
      window.posthog.capture(eventName, props);
      return;
    }

    window.dispatchEvent(new CustomEvent('vizail:analytics', { detail: { eventName, props } }));
  } catch {
    // Swallow analytics failures to avoid impacting UX.
  }
}

export default trackEvent;
