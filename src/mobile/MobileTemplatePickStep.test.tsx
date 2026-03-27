/**
 * Tests for MobileTemplatePickStep
 * Issue #221 – End-to-end test coverage for main guided journeys
 * Issue #213 – Template and preset selection screens
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTemplatePickStep } from './MobileTemplatePickStep';

describe('MobileTemplatePickStep', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the step header and title', () => {
    render(<MobileTemplatePickStep onPick={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Choose a template')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('renders all 6 template presets', () => {
    render(<MobileTemplatePickStep onPick={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('SaaS Dashboard')).toBeInTheDocument();
    expect(screen.getByText('E-Commerce')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Creative Agency')).toBeInTheDocument();
    expect(screen.getByText('Developer Tool')).toBeInTheDocument();
    expect(screen.getByText('Food & Lifestyle')).toBeInTheDocument();
  });

  it('renders each template with a description', () => {
    render(<MobileTemplatePickStep onPick={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Clean metrics UI for B2B products')).toBeInTheDocument();
    expect(screen.getByText('Vibrant storefront ready to convert')).toBeInTheDocument();
    expect(screen.getByText('Elegant showcase for creatives')).toBeInTheDocument();
  });

  it('renders the CTA button as disabled when no template is selected', () => {
    render(<MobileTemplatePickStep onPick={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Use this template')).toBeDisabled();
  });

  // ── Selection ─────────────────────────────────────────────────────────────

  it('marks a template button as pressed after clicking', async () => {
    render(<MobileTemplatePickStep onPick={vi.fn()} onBack={vi.fn()} />);
    const btn = screen.getByText('SaaS Dashboard').closest('button')!;
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('enables the CTA after a template is selected', async () => {
    render(<MobileTemplatePickStep onPick={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByText('SaaS Dashboard').closest('button')!);
    expect(screen.getByText('Use this template')).not.toBeDisabled();
  });

  it('deselects the previous template when a new one is picked', async () => {
    render(<MobileTemplatePickStep onPick={vi.fn()} onBack={vi.fn()} />);
    const first = screen.getByText('SaaS Dashboard').closest('button')!;
    const second = screen.getByText('Portfolio').closest('button')!;

    await userEvent.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(second);
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(first).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Confirmation ──────────────────────────────────────────────────────────

  it('calls onPick with the SaaS Dashboard preset when that template is selected', async () => {
    const onPick = vi.fn();
    render(<MobileTemplatePickStep onPick={onPick} onBack={vi.fn()} />);

    await userEvent.click(screen.getByText('SaaS Dashboard').closest('button')!);
    await userEvent.click(screen.getByText('Use this template'));

    expect(onPick).toHaveBeenCalledOnce();
    const preset = onPick.mock.calls[0][0];
    expect(preset.id).toBe('saas-dashboard');
    expect(preset.mood).toBe('minimal');
    expect(preset.industry).toBe('technology');
    expect(preset.colors).toHaveLength(4);
    expect(preset.headingFont).toBe('Inter');
  });

  it('calls onPick with the E-Commerce preset', async () => {
    const onPick = vi.fn();
    render(<MobileTemplatePickStep onPick={onPick} onBack={vi.fn()} />);

    await userEvent.click(screen.getByText('E-Commerce').closest('button')!);
    await userEvent.click(screen.getByText('Use this template'));

    expect(onPick.mock.calls[0][0].id).toBe('ecommerce');
    expect(onPick.mock.calls[0][0].mood).toBe('bold');
  });

  it('does not call onPick when CTA is clicked while disabled', async () => {
    const onPick = vi.fn();
    render(<MobileTemplatePickStep onPick={onPick} onBack={vi.fn()} />);
    await userEvent.click(screen.getByText('Use this template'));
    expect(onPick).not.toHaveBeenCalled();
  });

  // ── Back navigation ───────────────────────────────────────────────────────

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    render(<MobileTemplatePickStep onPick={vi.fn()} onBack={onBack} />);
    await userEvent.click(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
