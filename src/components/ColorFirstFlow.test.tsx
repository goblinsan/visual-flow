import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorFirstFlow } from './ColorFirstFlow';
import * as kulrsClient from '../api/kulrsClient';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePalette(id: string, hexValues: string[]) {
  return {
    id,
    name: `Palette ${id}`,
    description: null,
    likesCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    colors: hexValues.map((h, i) => ({
      id: `${id}-c${i}`,
      hexValue: h,
      name: null,
      position: i,
    })),
  } satisfies kulrsClient.KulrsPalette;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ColorFirstFlow', () => {
  beforeEach(() => {
    vi.spyOn(kulrsClient, 'fetchKulrsPalettesByColor').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the seed color', () => {
    render(
      <ColorFirstFlow
        seedColor="#6366f1"
        onPickColor={vi.fn()}
      />,
    );
    expect(screen.getByText('#6366f1')).toBeInTheDocument();
  });

  it('shows loading then results', async () => {
    const palette = makePalette('p1', ['#ff6b6b', '#feca57', '#48dbfb']);
    vi.spyOn(kulrsClient, 'fetchKulrsPalettesByColor').mockResolvedValue([palette]);

    render(
      <ColorFirstFlow
        seedColor="#ff6b6b"
        onPickColor={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Palette p1')).toBeInTheDocument();
    });
  });

  it('calls onPickColor when a swatch is clicked', async () => {
    const palette = makePalette('p1', ['#ff6b6b']);
    vi.spyOn(kulrsClient, 'fetchKulrsPalettesByColor').mockResolvedValue([palette]);

    const onPickColor = vi.fn();
    render(<ColorFirstFlow seedColor="#ff6b6b" onPickColor={onPickColor} />);

    await waitFor(() => screen.getByLabelText('#ff6b6b'));
    await userEvent.click(screen.getByLabelText('#ff6b6b'));
    expect(onPickColor).toHaveBeenCalledWith('#ff6b6b');
  });

  it('calls onApplyPalette when Use as Theme is clicked', async () => {
    const palette = makePalette('p1', ['#ff6b6b', '#feca57']);
    vi.spyOn(kulrsClient, 'fetchKulrsPalettesByColor').mockResolvedValue([palette]);

    const onApplyPalette = vi.fn();
    render(
      <ColorFirstFlow
        seedColor="#ff6b6b"
        onPickColor={vi.fn()}
        onApplyPalette={onApplyPalette}
      />,
    );

    await waitFor(() => screen.getByText('Palette p1'));

    // The "Use as Theme" button is opacity-0 but still in the DOM
    const btn = screen.getByTitle('Use this palette as your design theme');
    await userEvent.click(btn);
    expect(onApplyPalette).toHaveBeenCalledWith(['#ff6b6b', '#feca57'], 'p1');
  });

  it('shows empty state message when no palettes match', async () => {
    vi.spyOn(kulrsClient, 'fetchKulrsPalettesByColor').mockResolvedValue([]);

    render(<ColorFirstFlow seedColor="#123456" onPickColor={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/No palettes found/i)).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    vi.spyOn(kulrsClient, 'fetchKulrsPalettesByColor').mockRejectedValue(
      new Error('Network error'),
    );

    render(<ColorFirstFlow seedColor="#123456" onPickColor={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load palettes/i)).toBeInTheDocument();
    });
  });

  it('re-fetches when the Find palettes button is clicked', async () => {
    const spy = vi
      .spyOn(kulrsClient, 'fetchKulrsPalettesByColor')
      .mockResolvedValue([]);

    render(<ColorFirstFlow seedColor="#abcdef" onPickColor={vi.fn()} />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByTitle('Search for matching palettes'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });
});
