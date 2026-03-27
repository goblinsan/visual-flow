/**
 * Tests for MobileFlowShell
 * Issues #205, #206, #207, #213, #214, #215
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileFlowShell } from './MobileFlowShell';

// Mock canvas API used by ImageFirstFlow's color extraction
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

describe('MobileFlowShell', () => {
  // Clear persisted session so each test starts from a clean state (#217)
  beforeEach(() => {
    localStorage.clear();
  });
  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts at the entry screen', () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    expect(screen.getByText('Visual Flow')).toBeInTheDocument();
    expect(screen.getByText('By Theme')).toBeInTheDocument();
  });

  it('shows the "By Template" entry card on the landing screen (#213)', () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    expect(screen.getByLabelText('Start by By Template')).toBeInTheDocument();
  });

  // ── Entry → Pick navigation ─────────────────────────────────────────────────

  it('navigates to the template pick step when "By Template" is tapped (#213)', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by By Template'));
    expect(screen.getByText('Choose a template')).toBeInTheDocument();
  });

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

  it('goes back to the template pick step from the entry screen (#213)', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by By Template'));
    expect(screen.getByText('Choose a template')).toBeInTheDocument();

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

  // ── Template entry flow (#213) ─────────────────────────────────────────────

  it('advances from template pick to refine when a template is selected and confirmed (#213)', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Start by By Template'));

    // Select the first template
    const templateBtn = screen.getAllByRole('button', { pressed: false })[0]!;
    await userEvent.click(templateBtn);

    await userEvent.click(screen.getByText('Use this template'));
    expect(screen.getByText('Refine your style')).toBeInTheDocument();
  });

  // ── Component step (#214) ─────────────────────────────────────────────────

  it('shows the component selection step after refine (#214)', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    await userEvent.click(screen.getByText('Preview my design'));

    expect(screen.getByText('Choose components')).toBeInTheDocument();
  });

  it('shows button, card and navigation selectors in the component step (#214)', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    await userEvent.click(screen.getByText('Preview my design'));

    expect(screen.getByText('Button style')).toBeInTheDocument();
    expect(screen.getByText('Card style')).toBeInTheDocument();
    expect(screen.getByText('Navigation pattern')).toBeInTheDocument();
  });

  it('goes back to refine from the component step (#214)', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    await userEvent.click(screen.getByText('Preview my design'));
    expect(screen.getByText('Choose components')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Go back'));
    expect(screen.getByText('Refine your style')).toBeInTheDocument();
  });

  // ── Blank → Refine → Components → Preview full flow ────────────────────────

  it('navigates blank → refine → components → preview and calls onComplete', async () => {
    const onComplete = vi.fn();
    render(<MobileFlowShell onComplete={onComplete} />);

    // Step 1: pick blank
    await userEvent.click(screen.getByLabelText('Start by Start Blank'));

    // Step 2: select a mood then confirm
    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    await userEvent.click(screen.getByText('Preview my design'));

    // Step 3: confirm component selections
    expect(screen.getByText('Choose components')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Preview my design'));

    // Step 4: confirm preview
    expect(screen.getByText('Preview')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Use this design'));

    // Should reach the done screen
    expect(screen.getByText('Design ready!')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      mood: 'minimal',
      primaryColor: expect.any(String),
      tokens: expect.objectContaining({ 'color-primary': expect.any(String) }),
      components: expect.objectContaining({
        buttonStyle: expect.any(String),
        cardStyle: expect.any(String),
        navStyle: expect.any(String),
      }),
    });
  });

  // ── Summary review in preview (#215) ───────────────────────────────────────

  it('shows the design summary panel on the preview screen (#215)', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    await userEvent.click(screen.getByRole('checkbox', { name: /bold/i }));
    await userEvent.click(screen.getByText('Preview my design'));
    await userEvent.click(screen.getByText('Preview my design'));

    // Summary panel should be visible
    expect(screen.getByLabelText('Design summary')).toBeInTheDocument();
    expect(screen.getByText('Your choices')).toBeInTheDocument();
    expect(screen.getByText('Mood')).toBeInTheDocument();
    expect(screen.getByText('Industry')).toBeInTheDocument();
  });

  it('shows component selections in the summary panel (#215)', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    await userEvent.click(screen.getByText('Preview my design'));

    // Select a specific button style
    await userEvent.click(screen.getByRole('button', { pressed: false, name: /pill/i }));
    await userEvent.click(screen.getByText('Preview my design'));

    // Summary should list the chosen styles
    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('shows component token in snapshot when component step is completed (#214)', async () => {
    const onComplete = vi.fn();
    render(<MobileFlowShell onComplete={onComplete} />);

    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    await userEvent.click(screen.getByText('Preview my design'));
    await userEvent.click(screen.getByText('Preview my design'));
    await userEvent.click(screen.getByText('Use this design'));

    expect(onComplete.mock.calls[0][0].tokens).toMatchObject({
      'component-button-style': expect.any(String),
      'component-card-style':   expect.any(String),
      'component-nav-style':    expect.any(String),
    });
  });

  // ── Done screen ────────────────────────────────────────────────────────────

  it('shows a "Start over" button on the done screen that resets to entry', async () => {
    render(<MobileFlowShell onComplete={vi.fn()} />);

    // Run through the full blank flow
    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    await userEvent.click(screen.getByRole('checkbox', { name: /bold/i }));
    await userEvent.click(screen.getByText('Preview my design'));
    await userEvent.click(screen.getByText('Preview my design'));
    await userEvent.click(screen.getByText('Use this design'));

    expect(screen.getByText('Start over')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Start over'));

    // Should be back at the entry screen
    expect(screen.getByText('Visual Flow')).toBeInTheDocument();
  });
});
