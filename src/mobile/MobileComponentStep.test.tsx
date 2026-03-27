/**
 * Tests for MobileComponentStep
 * Issue #221 – End-to-end test coverage for main guided journeys
 * Issue #214 – Component selection and configuration steps
 * Issue #222 – Accessible button labels
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileComponentStep } from './MobileComponentStep';

describe('MobileComponentStep', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the step header', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Choose components')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
  });

  it('renders all three section headings', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Button style')).toBeInTheDocument();
    expect(screen.getByText('Card style')).toBeInTheDocument();
    expect(screen.getByText('Navigation pattern')).toBeInTheDocument();
  });

  // ── Button style options ───────────────────────────────────────────────────

  it('renders all 4 button style options', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /filled/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /outlined/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ghost/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pill/i })).toBeInTheDocument();
  });

  it('defaults to "filled" button style as pressed', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /filled/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('selects a new button style when clicked', async () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /pill/i }));
    expect(screen.getByRole('button', { name: /pill/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /filled/i })).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Card style options ────────────────────────────────────────────────────

  it('renders all 4 card style options', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /flat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /elevated/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bordered/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gradient/i })).toBeInTheDocument();
  });

  it('defaults to "elevated" card style as pressed', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /elevated/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('selects a new card style when clicked', async () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /bordered/i }));
    expect(screen.getByRole('button', { name: /bordered/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /elevated/i })).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Navigation style options ──────────────────────────────────────────────

  it('renders all 3 navigation style options', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /bottom bar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /top bar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /side nav/i })).toBeInTheDocument();
  });

  it('defaults to "bottom-bar" navigation as pressed', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /bottom bar/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('selects a new navigation style when clicked', async () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /top bar/i }));
    expect(screen.getByRole('button', { name: /top bar/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /bottom bar/i })).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Initial selections override ───────────────────────────────────────────

  it('respects initialSelections prop', () => {
    render(
      <MobileComponentStep
        initialSelections={{ buttonStyle: 'ghost', cardStyle: 'flat', navStyle: 'side-nav' }}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /ghost/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /flat/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /side nav/i })).toHaveAttribute('aria-pressed', 'true');
  });

  // ── Confirmation ──────────────────────────────────────────────────────────

  it('calls onConfirm with default selections when CTA is clicked', async () => {
    const onConfirm = vi.fn();
    render(<MobileComponentStep onConfirm={onConfirm} onBack={vi.fn()} />);
    await userEvent.click(screen.getByText('Preview my design'));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm.mock.calls[0][0]).toEqual({
      buttonStyle: 'filled',
      cardStyle: 'elevated',
      navStyle: 'bottom-bar',
    });
  });

  it('calls onConfirm with custom selections', async () => {
    const onConfirm = vi.fn();
    render(<MobileComponentStep onConfirm={onConfirm} onBack={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /outlined/i }));
    await userEvent.click(screen.getByRole('button', { name: /gradient/i }));
    await userEvent.click(screen.getByRole('button', { name: /side nav/i }));
    await userEvent.click(screen.getByText('Preview my design'));

    expect(onConfirm.mock.calls[0][0]).toEqual({
      buttonStyle: 'outlined',
      cardStyle: 'gradient',
      navStyle: 'side-nav',
    });
  });

  // ── Back navigation ───────────────────────────────────────────────────────

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={onBack} />);
    await userEvent.click(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
