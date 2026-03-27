/**
 * Tests for MobileFlowShell
 * Issues #205, #206, #207
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileFlowShell } from './MobileFlowShell';

// Mock canvas API used by ImageFirstFlow's colour extraction
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

describe('MobileFlowShell', () => {
  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts at the entry screen', () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    expect(screen.getByText('Visual Flow')).toBeInTheDocument();
    expect(screen.getByText('By Theme')).toBeInTheDocument();
  });

  // ── Entry → Pick navigation ─────────────────────────────────────────────────

  it('navigates to the theme pick step when "By Theme" is tapped', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by By Theme'));
    expect(screen.getByText('Choose a theme')).toBeInTheDocument();
  });

  it('navigates to the color pick step when "By Color" is tapped', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by By Color'));
    expect(screen.getByText('Pick a palette')).toBeInTheDocument();
  });

  it('navigates to the font pick step when "By Font" is tapped', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by By Font'));
    expect(screen.getByText('Choose a font')).toBeInTheDocument();
  });

  it('navigates to the image pick step when "By Image" is tapped', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by By Image'));
    expect(screen.getByText('Upload an image')).toBeInTheDocument();
  });

  // ── Blank entry skips the pick step ────────────────────────────────────────

  it('skips the pick step and goes straight to refine for the "blank" entry', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    expect(screen.getByText('Refine your style')).toBeInTheDocument();
  });

  // ── Back navigation ────────────────────────────────────────────────────────

  it('goes back to the entry screen from the color pick step', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by By Color'));
    expect(screen.getByText('Pick a palette')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Go back'));
    expect(screen.getByText('Visual Flow')).toBeInTheDocument();
  });

  it('goes back to the entry screen from the refine step (blank entry)', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    expect(screen.getByText('Refine your style')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Go back'));
    expect(screen.getByText('Visual Flow')).toBeInTheDocument();
  });

  // ── Color entry flow ───────────────────────────────────────────────────────

  it('advances from color pick to refine when a palette is selected and confirmed', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by By Color'));

    // Select the first palette
    const paletteBtn = screen.getAllByRole('button', { pressed: false })[0]!;
    await userEvent.click(paletteBtn);

    // Confirm selection
    await userEvent.click(screen.getByText('Use this palette'));
    expect(screen.getByText('Refine your style')).toBeInTheDocument();
  });

  // ── Blank → Refine → Preview full flow ─────────────────────────────────────

  it('navigates blank → refine → preview and calls onComplete', async () => {
    const onComplete = vi.fn();
    render(<MobileFlowShell onComplete={onComplete} />);

    // Step 1: pick blank
    await userEvent.click(screen.getByLabelText('Start by Start Blank'));

    // Step 2: select a mood then confirm
    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    await userEvent.click(screen.getByText('Preview my design'));

    // Step 3: confirm preview
    expect(screen.getByText('Preview')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Use this design'));

    // Should reach the done screen
    expect(screen.getByText('Design ready!')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      mood: 'minimal',
      primaryColor: expect.any(String),
      tokens: expect.objectContaining({ 'color-primary': expect.any(String) }),
    });
  });

  // ── Done screen ────────────────────────────────────────────────────────────

  it('shows a "Start over" button on the done screen that resets to entry', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);

    // Run through the minimal blank flow
    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    await userEvent.click(screen.getByRole('checkbox', { name: /bold/i }));
    await userEvent.click(screen.getByText('Preview my design'));
    await userEvent.click(screen.getByText('Use this design'));

    expect(screen.getByText('Start over')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Start over'));

    // Should be back at the entry screen
    expect(screen.getByText('Visual Flow')).toBeInTheDocument();
  });
});
