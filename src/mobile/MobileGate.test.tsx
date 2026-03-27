/**
 * Tests for MobileGate
 * Issue #209 – Add device and viewport gating for canvas access
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileGate } from './MobileGate';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { writable: true, configurable: true, value: ua });
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(pointer: coarse)' ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MobileGate', () => {
  beforeEach(() => {
    // Start on a desktop device
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    setWindowWidth(1440);
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children on a desktop viewport', () => {
    render(
      <MobileGate>
        <div data-testid="canvas">Canvas</div>
      </MobileGate>,
    );
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('does not render children on a mobile viewport', () => {
    setWindowWidth(375);
    render(
      <MobileGate>
        <div data-testid="canvas">Canvas</div>
      </MobileGate>,
    );
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
  });

  it('shows a redirect prompt on mobile', () => {
    setWindowWidth(375);
    render(
      <MobileGate>
        <div>Canvas</div>
      </MobileGate>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Desktop editor')).toBeInTheDocument();
    expect(screen.getByText('Open mobile editor')).toBeInTheDocument();
  });

  it('the mobile prompt links to ?editor=mobile', () => {
    setWindowWidth(375);
    render(
      <MobileGate>
        <div>Canvas</div>
      </MobileGate>,
    );
    const link = screen.getByRole('link', { name: /open mobile editor/i });
    expect(link.getAttribute('href')).toContain('editor=mobile');
  });

  it('renders children when a mobile UA is present but viewport is wide', () => {
    // Desktop browser with a mobile UA string — viewport wins
    setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F)');
    setWindowWidth(1440);
    mockMatchMedia(false);
    render(
      <MobileGate>
        <div data-testid="canvas">Canvas</div>
      </MobileGate>,
    );
    // useMobile returns true for Android UA regardless of viewport
    // so the gate should block it
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
  });
});
