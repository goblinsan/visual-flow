/**
 * Tests for MobileColorPickStep
 * Issue #221 – End-to-end test coverage for main guided journeys
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileColorPickStep } from './MobileColorPickStep';

describe('MobileColorPickStep', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the step header and title', () => {
    render(<MobileColorPickStep onPick={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Pick a palette')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('renders all 6 palette options', () => {
    render(<MobileColorPickStep onPick={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Clean & Minimal')).toBeInTheDocument();
    expect(screen.getByText('Bold & Energetic')).toBeInTheDocument();
    expect(screen.getByText('Playful & Vibrant')).toBeInTheDocument();
    expect(screen.getByText('Elegant & Luxurious')).toBeInTheDocument();
    expect(screen.getByText('Technical & Precise')).toBeInTheDocument();
    expect(screen.getByText('Warm & Organic')).toBeInTheDocument();
  });

  it('renders all palette buttons as not pressed initially', () => {
    render(<MobileColorPickStep onPick={vi.fn()} onBack={vi.fn()} />);
    const buttons = screen.getAllByRole('button', { pressed: false });
    // Back button + 6 palette buttons + disabled CTA
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });

  it('renders the CTA button as disabled when no palette is selected', () => {
    render(<MobileColorPickStep onPick={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Use this palette')).toBeDisabled();
  });

  // ── Selection ─────────────────────────────────────────────────────────────

  it('marks a palette button as pressed after clicking', async () => {
    render(<MobileColorPickStep onPick={vi.fn()} onBack={vi.fn()} />);
    const unpressedBtns = screen.getAllByRole('button', { pressed: false });
    // First unpressed button (index 0) is the back-arrow; palette items start at 1
    const firstPalette = unpressedBtns.find((b) => b.textContent?.includes('Clean & Minimal'))!;
    await userEvent.click(firstPalette);
    expect(firstPalette).toHaveAttribute('aria-pressed', 'true');
  });

  it('enables the CTA after a palette is selected', async () => {
    render(<MobileColorPickStep onPick={vi.fn()} onBack={vi.fn()} />);
    const firstPalette = screen.getByText('Clean & Minimal').closest('button')!;
    await userEvent.click(firstPalette);
    expect(screen.getByText('Use this palette')).not.toBeDisabled();
  });

  it('changes the selection when a different palette is clicked', async () => {
    render(<MobileColorPickStep onPick={vi.fn()} onBack={vi.fn()} />);
    const first = screen.getByText('Clean & Minimal').closest('button')!;
    const second = screen.getByText('Bold & Energetic').closest('button')!;

    await userEvent.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(second);
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(first).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Confirmation ──────────────────────────────────────────────────────────

  it('calls onPick with 4 hex colours and the mood when CTA is clicked', async () => {
    const onPick = vi.fn();
    render(<MobileColorPickStep onPick={onPick} onBack={vi.fn()} />);

    await userEvent.click(screen.getByText('Clean & Minimal').closest('button')!);
    await userEvent.click(screen.getByText('Use this palette'));

    expect(onPick).toHaveBeenCalledOnce();
    const [colors, mood] = onPick.mock.calls[0]!;
    expect(colors).toHaveLength(4);
    colors.forEach((c: string) => expect(c).toMatch(/^#/));
    expect(mood).toBe('minimal');
  });

  it('does not call onPick if the CTA is clicked while disabled', async () => {
    const onPick = vi.fn();
    render(<MobileColorPickStep onPick={onPick} onBack={vi.fn()} />);
    // CTA is disabled by default; userEvent respects disabled state
    await userEvent.click(screen.getByText('Use this palette'));
    expect(onPick).not.toHaveBeenCalled();
  });

  // ── Back navigation ───────────────────────────────────────────────────────

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    render(<MobileColorPickStep onPick={vi.fn()} onBack={onBack} />);
    await userEvent.click(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
