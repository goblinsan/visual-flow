/**
 * Tests for ThemeFirstFlow
 * Phase 6 (#195)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeFirstFlow, THEME_TAXONOMY } from './ThemeFirstFlow';

describe('ThemeFirstFlow', () => {
  it('renders all theme cards', () => {
    render(<ThemeFirstFlow onApplyTheme={vi.fn()} />);
    for (const entry of THEME_TAXONOMY) {
      expect(screen.getByText(entry.name)).toBeInTheDocument();
    }
  });

  it('shows the description for each theme', () => {
    render(<ThemeFirstFlow onApplyTheme={vi.fn()} />);
    // Spot-check a couple of descriptions
    expect(screen.getByText(/White space, neutral tones/i)).toBeInTheDocument();
    expect(screen.getByText(/Saturated colors, strong contrasts/i)).toBeInTheDocument();
  });

  it('shows an Apply button when a card is selected', async () => {
    render(<ThemeFirstFlow onApplyTheme={vi.fn()} />);
    // No Apply button before any selection
    expect(screen.queryByText('Apply theme')).not.toBeInTheDocument();

    const card = screen.getByText('Clean & Minimal').closest('[role="button"]')!;
    await userEvent.click(card);
    expect(screen.getByText('Apply theme')).toBeInTheDocument();
  });

  it('marks the selected card as pressed', async () => {
    render(<ThemeFirstFlow onApplyTheme={vi.fn()} />);
    const card = screen.getByText('Clean & Minimal').closest('[role="button"]')!;
    await userEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelectTheme when a card is clicked', async () => {
    const onSelectTheme = vi.fn();
    render(<ThemeFirstFlow onApplyTheme={vi.fn()} onSelectTheme={onSelectTheme} />);
    const card = screen.getByText('Bold & Energetic').closest('[role="button"]')!;
    await userEvent.click(card);
    expect(onSelectTheme).toHaveBeenCalledOnce();
    expect(onSelectTheme.mock.calls[0][0].id).toBe('bold-energetic');
  });

  it('calls onApplyTheme with a valid StyleSeed when Apply is clicked', async () => {
    const onApplyTheme = vi.fn();
    render(<ThemeFirstFlow onApplyTheme={onApplyTheme} />);

    const card = screen.getByText('Clean & Minimal').closest('[role="button"]')!;
    await userEvent.click(card);
    await userEvent.click(screen.getByText('Apply theme'));

    expect(onApplyTheme).toHaveBeenCalledOnce();
    const seed = onApplyTheme.mock.calls[0][0];
    expect(seed.moods).toContain('minimal');
    expect(Array.isArray(seed.baseColors)).toBe(true);
    expect(seed.baseColors.length).toBeGreaterThan(0);
    expect(Array.isArray(seed.fontPreferences)).toBe(true);
  });

  it('respects the industry prop when building the seed', async () => {
    const onApplyTheme = vi.fn();
    render(
      <ThemeFirstFlow
        onApplyTheme={onApplyTheme}
        // 'technology' is in the clean-minimal industries list
        industry="technology"
      />,
    );
    const card = screen.getByText('Clean & Minimal').closest('[role="button"]')!;
    await userEvent.click(card);
    await userEvent.click(screen.getByText('Apply theme'));

    const seed = onApplyTheme.mock.calls[0][0];
    expect(seed.industry).toBe('technology');
  });

  it('falls back to the first industry when the provided one is not in the theme list', async () => {
    const onApplyTheme = vi.fn();
    // 'gaming' is NOT in the clean-minimal industries list
    render(
      <ThemeFirstFlow
        onApplyTheme={onApplyTheme}
        industry="gaming"
      />,
    );
    const card = screen.getByText('Clean & Minimal').closest('[role="button"]')!;
    await userEvent.click(card);
    await userEvent.click(screen.getByText('Apply theme'));

    const seed = onApplyTheme.mock.calls[0][0];
    // Should fall back to the theme's first listed industry
    const entry = THEME_TAXONOMY.find((e) => e.id === 'clean-minimal')!;
    expect(seed.industry).toBe(entry.industries[0]);
  });
});
