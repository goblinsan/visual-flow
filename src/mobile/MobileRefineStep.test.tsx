/**
 * Tests for MobileRefineStep
 * Issue #221 – End-to-end test coverage for main guided journeys
 * Issue #222 – Mobile usability testing (validation hint)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileRefineStep } from './MobileRefineStep';

describe('MobileRefineStep', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the step header', () => {
    render(<MobileRefineStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Refine your style')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('renders all 5 mood option chips', () => {
    render(<MobileRefineStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /minimal/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /playful/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /elegant/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /technical/i })).toBeInTheDocument();
  });

  it('renders the industry dropdown', () => {
    render(<MobileRefineStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByLabelText('Industry')).toBeInTheDocument();
  });

  it('renders all 8 industry options', () => {
    render(<MobileRefineStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const select = screen.getByLabelText('Industry') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual([
      'technology',
      'fashion',
      'finance',
      'health',
      'education',
      'gaming',
      'food',
      'other',
    ]);
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it('pre-checks moods passed via initialMoods', () => {
    render(<MobileRefineStep initialMoods={['bold']} onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /bold/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: /minimal/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('pre-selects the industry from initialIndustry', () => {
    render(
      <MobileRefineStep initialIndustry="fashion" onConfirm={vi.fn()} onBack={vi.fn()} />,
    );
    const select = screen.getByLabelText('Industry') as HTMLSelectElement;
    expect(select.value).toBe('fashion');
  });

  it('defaults to technology when no initialIndustry is provided', () => {
    render(<MobileRefineStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const select = screen.getByLabelText('Industry') as HTMLSelectElement;
    expect(select.value).toBe('technology');
  });

  // ── CTA disabled state ────────────────────────────────────────────────────

  it('disables the CTA when no mood is selected', () => {
    render(<MobileRefineStep initialMoods={[]} onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Preview my design')).toBeDisabled();
  });

  it('shows a hint when no mood is selected (#222)', () => {
    render(<MobileRefineStep initialMoods={[]} onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/select at least one mood/i)).toBeInTheDocument();
  });

  it('hides the hint once a mood is selected (#222)', async () => {
    render(<MobileRefineStep initialMoods={[]} onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/select at least one mood/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    expect(screen.queryByText(/select at least one mood/i)).not.toBeInTheDocument();
  });

  // ── Mood toggling ─────────────────────────────────────────────────────────

  it('toggles a mood on when clicked', async () => {
    render(<MobileRefineStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox', { name: /minimal/i });
    await userEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles a mood off when clicked a second time', async () => {
    render(<MobileRefineStep initialMoods={['minimal']} onConfirm={vi.fn()} onBack={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox', { name: /minimal/i });
    await userEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('allows multiple moods to be selected simultaneously', async () => {
    render(<MobileRefineStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /bold/i }));
    expect(screen.getByRole('checkbox', { name: /minimal/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: /bold/i })).toHaveAttribute('aria-checked', 'true');
  });

  // ── Industry selection ────────────────────────────────────────────────────

  it('updates the selected industry when the user changes the dropdown', async () => {
    render(<MobileRefineStep initialMoods={['minimal']} onConfirm={vi.fn()} onBack={vi.fn()} />);
    const select = screen.getByLabelText('Industry') as HTMLSelectElement;
    await userEvent.selectOptions(select, 'education');
    expect(select.value).toBe('education');
  });

  // ── Confirmation ──────────────────────────────────────────────────────────

  it('calls onConfirm with selected moods and industry', async () => {
    const onConfirm = vi.fn();
    render(<MobileRefineStep onConfirm={onConfirm} onBack={vi.fn()} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /elegant/i }));
    await userEvent.selectOptions(screen.getByLabelText('Industry'), 'health');
    await userEvent.click(screen.getByText('Preview my design'));

    expect(onConfirm).toHaveBeenCalledOnce();
    const [moods, industry] = onConfirm.mock.calls[0]!;
    expect(moods).toContain('elegant');
    expect(industry).toBe('health');
  });

  it('calls onConfirm with all selected moods', async () => {
    const onConfirm = vi.fn();
    render(<MobileRefineStep onConfirm={onConfirm} onBack={vi.fn()} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /minimal/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /technical/i }));
    await userEvent.click(screen.getByText('Preview my design'));

    const [moods] = onConfirm.mock.calls[0]!;
    expect(moods).toContain('minimal');
    expect(moods).toContain('technical');
    expect(moods).toHaveLength(2);
  });

  // ── Back navigation ───────────────────────────────────────────────────────

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    render(<MobileRefineStep initialMoods={['bold']} onConfirm={vi.fn()} onBack={onBack} />);
    await userEvent.click(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
