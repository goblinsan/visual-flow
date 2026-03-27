/**
 * Tests for MobileHandoffBanner
 * Issue #211 – Preserve seamless transitions between mobile and desktop editing
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileHandoffBanner } from './MobileHandoffBanner';
import type { MobileDesignSnapshot } from '../../mobile/types';

const SNAPSHOT: MobileDesignSnapshot = {
  primaryColor: '#1A1A2E',
  accentColor: '#E94560',
  headingFont: 'Playfair Display',
  bodyFont: 'Inter',
  mood: 'elegant',
  industry: 'fashion',
  tokens: { 'color-primary': '#1A1A2E', 'color-accent': '#E94560', 'font-heading': 'Playfair Display', 'font-body': 'Inter', 'font-size-base': '16px', 'line-height-base': '1.6' },
};

describe('MobileHandoffBanner', () => {
  it('renders the "Mobile design ready" label', () => {
    render(<MobileHandoffBanner snapshot={SNAPSHOT} onApply={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Mobile design ready')).toBeInTheDocument();
  });

  it('displays the mood from the snapshot', () => {
    render(<MobileHandoffBanner snapshot={SNAPSHOT} onApply={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('elegant')).toBeInTheDocument();
  });

  it('displays the heading font from the snapshot', () => {
    render(<MobileHandoffBanner snapshot={SNAPSHOT} onApply={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Playfair Display')).toBeInTheDocument();
  });

  it('calls onApply with the snapshot when "Apply design" is clicked', async () => {
    const onApply = vi.fn();
    render(<MobileHandoffBanner snapshot={SNAPSHOT} onApply={onApply} onDismiss={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /apply design/i }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith(SNAPSHOT);
  });

  it('calls onDismiss when the dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    render(<MobileHandoffBanner snapshot={SNAPSHOT} onApply={vi.fn()} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: /dismiss mobile design/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
