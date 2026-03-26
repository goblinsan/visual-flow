/**
 * Tests for FontFirstFlow
 * Phase 6 (#196)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FontFirstFlow, FONT_CATALOGUE } from './FontFirstFlow';

describe('FontFirstFlow', () => {
  it('renders font cards for all entries by default', () => {
    render(<FontFirstFlow onApplyFont={vi.fn()} />);
    for (const entry of FONT_CATALOGUE) {
      expect(screen.getByText(entry.family)).toBeInTheDocument();
    }
  });

  it('renders personality filter tabs', () => {
    render(<FontFirstFlow onApplyFont={vi.fn()} />);
    expect(screen.getByRole('button', { name: /filter by sans-serif/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter by serif/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter by monospace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter by display/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
  });

  it('filters by personality when a tab is clicked', async () => {
    render(<FontFirstFlow onApplyFont={vi.fn()} />);

    // Click the Monospace filter tab
    await userEvent.click(screen.getByRole('button', { name: /filter by monospace/i }));

    const monoFonts = FONT_CATALOGUE.filter((f) => f.personality === 'monospace');
    const otherFonts = FONT_CATALOGUE.filter((f) => f.personality !== 'monospace');

    for (const f of monoFonts) {
      expect(screen.getByText(f.family)).toBeInTheDocument();
    }
    for (const f of otherFonts) {
      expect(screen.queryByText(f.family)).not.toBeInTheDocument();
    }
  });

  it('clears the filter when the same tab is clicked twice', async () => {
    render(<FontFirstFlow onApplyFont={vi.fn()} />);

    const monoTab = screen.getByRole('button', { name: /filter by monospace/i });
    await userEvent.click(monoTab);
    await userEvent.click(monoTab);

    // All fonts should be visible again
    for (const entry of FONT_CATALOGUE) {
      expect(screen.getByText(entry.family)).toBeInTheDocument();
    }
  });

  it('shows a "Use <font>" button when a card is selected', async () => {
    render(<FontFirstFlow onApplyFont={vi.fn()} />);

    expect(screen.queryByText(/^Use /)).not.toBeInTheDocument();

    const card = screen.getByText('Inter').closest('[role="button"]')!;
    await userEvent.click(card);
    expect(screen.getByText('Use Inter')).toBeInTheDocument();
  });

  it('marks the selected card as pressed', async () => {
    render(<FontFirstFlow onApplyFont={vi.fn()} />);
    const card = screen.getByText('Inter').closest('[role="button"]')!;
    await userEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelectFont when a card is clicked', async () => {
    const onSelectFont = vi.fn();
    render(<FontFirstFlow onApplyFont={vi.fn()} onSelectFont={onSelectFont} />);
    const card = screen.getByText('Lora').closest('[role="button"]')!;
    await userEvent.click(card);
    expect(onSelectFont).toHaveBeenCalledOnce();
    expect(onSelectFont.mock.calls[0][0].id).toBe('lora');
  });

  it('calls onApplyFont with correct arguments when the Use button is clicked', async () => {
    const onApplyFont = vi.fn();
    render(<FontFirstFlow onApplyFont={onApplyFont} />);

    const card = screen.getByText('Lora').closest('[role="button"]')!;
    await userEvent.click(card);
    await userEvent.click(screen.getByText('Use Lora'));

    expect(onApplyFont).toHaveBeenCalledOnce();
    const [fontFamily, bodyFont, moods, colors] = onApplyFont.mock.calls[0];
    expect(fontFamily).toBe('Lora');
    expect(typeof bodyFont).toBe('string');
    expect(Array.isArray(moods)).toBe(true);
    expect(moods.length).toBeGreaterThan(0);
    expect(Array.isArray(colors)).toBe(true);
    expect(colors.length).toBeGreaterThan(0);
  });

  it('respects the personalities prop to restrict visible entries', () => {
    render(<FontFirstFlow onApplyFont={vi.fn()} personalities={['serif']} />);
    const serifFonts = FONT_CATALOGUE.filter((f) => f.personality === 'serif');
    const nonSerifFonts = FONT_CATALOGUE.filter((f) => f.personality !== 'serif');

    for (const f of serifFonts) {
      expect(screen.getByText(f.family)).toBeInTheDocument();
    }
    for (const f of nonSerifFonts) {
      expect(screen.queryByText(f.family)).not.toBeInTheDocument();
    }
  });
});
