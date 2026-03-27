/**
 * MobileGate
 *
 * Belt-and-suspenders guard that prevents the full desktop canvas from
 * rendering on mobile / touch devices.  The top-level router in main.tsx
 * already redirects mobile users to MobileFlowShell; this component provides
 * an additional safety net for any code path that renders CanvasApp directly.
 *
 * Issue #209 – Add device and viewport gating for canvas access
 */

import { useMobile } from '../hooks/useMobile';

export interface MobileGateProps {
  children: React.ReactNode;
}

/**
 * Renders `children` only on non-mobile viewports.
 * On mobile / narrow viewports it shows a prompt encouraging the user to
 * switch to the mobile-optimised flow.
 */
export function MobileGate({ children }: MobileGateProps) {
  const isMobile = useMobile();

  if (!isMobile) {
    return <>{children}</>;
  }

  const mobileUrl = `${window.location.origin}${window.location.pathname}?editor=mobile`;

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-cyan-400/15 flex items-center justify-center mb-6">
        <i className="fa-solid fa-mobile-screen text-cyan-400 text-3xl" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold mb-2">Desktop editor</h1>
      <p className="text-white/60 text-sm max-w-xs mb-8">
        The canvas editor requires a larger screen. Switch to the guided mobile
        flow for the best experience on this device.
      </p>

      <a
        href={mobileUrl}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm
                   bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                   active:scale-[0.98] transition-transform duration-100"
      >
        <i className="fa-solid fa-wand-magic-sparkles text-sm" aria-hidden="true" />
        Open mobile editor
      </a>
    </div>
  );
}
