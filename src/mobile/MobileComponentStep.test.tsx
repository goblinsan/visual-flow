/**
 * Tests for MobileComponentStep
 * Issue #221 – End-to-end test coverage for main guided journeys
 * Issue #214 – Component selection and configuration steps
 * Issue #222 – Accessible button labels
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileComponentStep } from './MobileComponentStep';

describe('MobileComponentStep', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the step header', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Choose components')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
  });

  it('renders all section headings', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Button style')).toBeInTheDocument();
    expect(screen.getByText('Card style')).toBeInTheDocument();
    expect(screen.getByText('Container style')).toBeInTheDocument();
    expect(screen.getByText('Navigation pattern')).toBeInTheDocument();
    expect(screen.getByText('Typography style')).toBeInTheDocument();
    expect(screen.getByText('Output target')).toBeInTheDocument();
  });

  // ── Button style options ───────────────────────────────────────────────────

  it('renders all 4 button style options', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Button style options' });
    expect(within(group).getByRole('button', { name: /filled/i })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /outlined/i })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /ghost/i })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /pill/i })).toBeInTheDocument();
  });

  it('defaults to "filled" button style as pressed', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Button style options' });
    expect(within(group).getByRole('button', { name: /filled/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('selects a new button style when clicked', async () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Button style options' });
    await userEvent.click(within(group).getByRole('button', { name: /pill/i }));
    expect(within(group).getByRole('button', { name: /pill/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: /filled/i })).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Card style options ────────────────────────────────────────────────────

  it('renders all 4 card style options', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Card style options' });
    expect(within(group).getByRole('button', { name: /flat/i })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /elevated/i })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /bordered/i })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /gradient/i })).toBeInTheDocument();
  });

  it('defaults to "elevated" card style as pressed', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Card style options' });
    expect(within(group).getByRole('button', { name: /elevated/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('selects a new card style when clicked', async () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Card style options' });
    await userEvent.click(within(group).getByRole('button', { name: /bordered/i }));
    expect(within(group).getByRole('button', { name: /bordered/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: /elevated/i })).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Navigation style options ──────────────────────────────────────────────

  it('renders all 3 navigation style options', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Navigation style options' });
    expect(within(group).getByRole('button', { name: /bottom bar/i })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /top bar/i })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /side nav/i })).toBeInTheDocument();
  });

  it('defaults to "bottom-bar" navigation as pressed', () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Navigation style options' });
    expect(within(group).getByRole('button', { name: /bottom bar/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('selects a new navigation style when clicked', async () => {
    render(<MobileComponentStep onConfirm={vi.fn()} onBack={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Navigation style options' });
    await userEvent.click(within(group).getByRole('button', { name: /top bar/i }));
    expect(within(group).getByRole('button', { name: /top bar/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: /bottom bar/i })).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Initial selections override ───────────────────────────────────────────

  it('respects initialSelections prop', () => {
    render(
      <MobileComponentStep
        initialSelections={{
          buttonStyle: 'ghost',
          cardStyle: 'flat',
          containerStyle: 'glass',
          navStyle: 'side-nav',
          typographyStyle: 'editorial',
          outputType: 'dashboard',
        }}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(within(screen.getByRole('group', { name: 'Button style options' })).getByRole('button', { name: /ghost/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Card style options' })).getByRole('button', { name: /flat/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Container style options' })).getByRole('button', { name: /glass/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Navigation style options' })).getByRole('button', { name: /side nav/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Typography style options' })).getByRole('button', { name: /editorial/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Output target options' })).getByRole('button', { name: /dashboard/i })).toHaveAttribute('aria-pressed', 'true');
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
      containerStyle: 'soft',
      navStyle: 'bottom-bar',
      typographyStyle: 'balanced',
      outputType: 'mobile-app',
    });
  });

  it('calls onConfirm with custom selections', async () => {
    const onConfirm = vi.fn();
    render(<MobileComponentStep onConfirm={onConfirm} onBack={vi.fn()} />);

    await userEvent.click(within(screen.getByRole('group', { name: 'Button style options' })).getByRole('button', { name: /outlined/i }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Card style options' })).getByRole('button', { name: /gradient/i }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Container style options' })).getByRole('button', { name: /outlined/i }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Navigation style options' })).getByRole('button', { name: /side nav/i }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Typography style options' })).getByRole('button', { name: /expressive/i }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Output target options' })).getByRole('button', { name: /landing page/i }));
    await userEvent.click(screen.getByText('Preview my design'));

    expect(onConfirm.mock.calls[0][0]).toEqual({
      buttonStyle: 'outlined',
      cardStyle: 'gradient',
      containerStyle: 'outlined',
      navStyle: 'side-nav',
      typographyStyle: 'expressive',
      outputType: 'landing-page',
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
