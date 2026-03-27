/**
 * Tests for MobilePreviewScreen
 * Issue #221 – End-to-end test coverage for main guided journeys
 * Issue #215 – Lightweight live preview and summary review
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobilePreviewScreen } from './MobilePreviewScreen';
import type { MobileDesignSnapshot } from './types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MINIMAL_SNAPSHOT: MobileDesignSnapshot = {
  primaryColor: '#1A1A2E',
  accentColor: '#E94560',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  mood: 'minimal',
  industry: 'technology',
  tokens: {
    'color-primary': '#1A1A2E',
    'color-accent': '#E94560',
    'font-heading': 'Inter',
    'font-body': 'Inter',
    'font-size-base': '16px',
    'line-height-base': '1.6',
  },
};

const SNAPSHOT_WITH_COMPONENTS: MobileDesignSnapshot = {
  ...MINIMAL_SNAPSHOT,
  components: {
    buttonStyle: 'pill',
    cardStyle: 'gradient',
    navStyle: 'side-nav',
  },
  tokens: {
    ...MINIMAL_SNAPSHOT.tokens,
    'component-button-style': 'pill',
    'component-card-style': 'gradient',
    'component-nav-style': 'side-nav',
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MobilePreviewScreen', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the step header', () => {
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
  });

  it('renders the phone mockup with aria-label', () => {
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByLabelText('Design preview')).toBeInTheDocument();
  });

  it('renders the color palette section', () => {
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText('Color palette')).toBeInTheDocument();
  });

  it('renders the typography section', () => {
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText('Typography')).toBeInTheDocument();
    // Heading font displayed prominently
    const headingFontEl = screen.getAllByText('Inter')[0]!;
    expect(headingFontEl).toBeInTheDocument();
  });

  // ── Summary panel (#215) ──────────────────────────────────────────────────

  it('renders the summary panel with aria-label', () => {
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByLabelText('Design summary')).toBeInTheDocument();
    expect(screen.getByText('Your choices')).toBeInTheDocument();
  });

  it('shows mood and industry in the summary panel', () => {
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText('Mood')).toBeInTheDocument();
    expect(screen.getByText('minimal')).toBeInTheDocument();
    expect(screen.getByText('Industry')).toBeInTheDocument();
    expect(screen.getByText('technology')).toBeInTheDocument();
  });

  it('shows component choices in the summary panel when present', () => {
    render(
      <MobilePreviewScreen
        snapshot={SNAPSHOT_WITH_COMPONENTS}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('pill')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText('gradient')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('side nav')).toBeInTheDocument();
  });

  it('omits component rows from the summary panel when components are absent', () => {
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText('Button')).not.toBeInTheDocument();
    expect(screen.queryByText('Card')).not.toBeInTheDocument();
    expect(screen.queryByText('Navigation')).not.toBeInTheDocument();
  });

  // ── CTA ───────────────────────────────────────────────────────────────────

  it('renders the "Use this design" CTA with an accessible label (#222)', () => {
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: /use this design/i })).toBeInTheDocument();
  });

  it('calls onConfirm when "Use this design" is clicked', async () => {
    const onConfirm = vi.fn();
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={vi.fn()} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: /use this design/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  // ── Back navigation ───────────────────────────────────────────────────────

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    render(<MobilePreviewScreen snapshot={MINIMAL_SNAPSHOT} onBack={onBack} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
