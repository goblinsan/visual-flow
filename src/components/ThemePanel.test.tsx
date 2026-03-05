/**
 * ThemePanel — save palette & Kulrs.com navigation tests.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemePanel } from './ThemePanel';
import type { DesignTheme } from '../theme/types';

const baseTheme: DesignTheme = {
  id: 'theme-test',
  name: 'Test Theme',
  kulrsPaletteId: 'kulrs-abc',
  paletteColors: ['#ff0000', '#00ff00', '#0000ff'],
  mode: 'light',
  typography: { headingFont: 'Inter', bodyFont: 'Roboto' },
  colors: {
    'color.background.primary': '#ffffff',
    'color.background.secondary': '#f1f5f9',
    'color.background.tertiary': '#e2e8f0',
    'color.background.inverse': '#0f172a',
    'color.text.primary': '#0f172a',
    'color.text.secondary': '#64748b',
    'color.text.inverse': '#ffffff',
    'color.text.link': '#0ea5e9',
    'color.border.primary': '#e2e8f0',
    'color.border.secondary': '#cbd5e1',
    'color.border.focus': '#0ea5e9',
    'color.action.primary': '#ff0000',
    'color.action.primaryHover': '#cc0000',
    'color.action.secondary': '#00ff00',
    'color.action.secondaryHover': '#00cc00',
    'color.status.success': '#22c55e',
    'color.status.warning': '#f59e0b',
    'color.status.error': '#ef4444',
    'color.status.info': '#0ea5e9',
    'color.surface.card': '#ffffff',
    'color.surface.overlay': 'rgba(0,0,0,0.5)',
    'color.accent.primary': '#0000ff',
    'color.accent.secondary': '#0000cc',
  },
};

const defaultProps = {
  theme: baseTheme,
  onUpdateTokenColor: vi.fn(),
  onUpdateTypography: vi.fn(),
  onUpdatePaletteOrder: vi.fn(),
  onToggleMode: vi.fn(),
};

describe('ThemePanel — save palette (unauthenticated)', () => {
  it('shows sign-in prompt when onSavePalette is provided but user is not authenticated', () => {
    render(
      <ThemePanel
        {...defaultProps}
        onSavePalette={vi.fn()}
        isAuthenticated={false}
      />,
    );
    expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
    expect(screen.getByText(/to save this palette/i)).toBeInTheDocument();
  });

  it('sign-in link points to /api/auth/login', () => {
    render(
      <ThemePanel
        {...defaultProps}
        onSavePalette={vi.fn()}
        isAuthenticated={false}
      />,
    );
    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link).toHaveAttribute('href', '/api/auth/login');
  });
});

describe('ThemePanel — save palette (authenticated)', () => {
  it('shows "Save as New" button when authenticated', () => {
    render(
      <ThemePanel
        {...defaultProps}
        onSavePalette={vi.fn()}
        isAuthenticated={true}
        userOwnsPalette={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Save as New/i })).toBeInTheDocument();
  });

  it('shows "Overwrite" button only when userOwnsPalette is true', () => {
    render(
      <ThemePanel
        {...defaultProps}
        onSavePalette={vi.fn()}
        isAuthenticated={true}
        userOwnsPalette={true}
      />,
    );
    expect(screen.getByRole('button', { name: /Overwrite/i })).toBeInTheDocument();
  });

  it('does not show "Overwrite" button when userOwnsPalette is false', () => {
    render(
      <ThemePanel
        {...defaultProps}
        onSavePalette={vi.fn()}
        isAuthenticated={true}
        userOwnsPalette={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /Overwrite/i })).not.toBeInTheDocument();
  });

  it('calls onSavePalette("new") when "Save as New" is clicked', () => {
    const onSavePalette = vi.fn();
    render(
      <ThemePanel
        {...defaultProps}
        onSavePalette={onSavePalette}
        isAuthenticated={true}
        userOwnsPalette={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Save as New/i }));
    expect(onSavePalette).toHaveBeenCalledWith('new');
  });

  it('calls onSavePalette("overwrite") when "Overwrite" is clicked', () => {
    const onSavePalette = vi.fn();
    render(
      <ThemePanel
        {...defaultProps}
        onSavePalette={onSavePalette}
        isAuthenticated={true}
        userOwnsPalette={true}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Overwrite/i }));
    expect(onSavePalette).toHaveBeenCalledWith('overwrite');
  });

  it('does not show save buttons when onSavePalette is not provided', () => {
    render(<ThemePanel {...defaultProps} isAuthenticated={true} />);
    expect(screen.queryByRole('button', { name: /Save as New/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Overwrite/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sign in/i)).not.toBeInTheDocument();
  });
});

describe('ThemePanel — Kulrs.com palette details link', () => {
  it('shows palette details link when kulrsPaletteId is set on the theme', () => {
    render(<ThemePanel {...defaultProps} />);
    const link = screen.getByRole('link', { name: /View Palette Details on Kulrs\.com/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://kulrs.com/palette/kulrs-abc');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not show palette details link when kulrsPaletteId is absent', () => {
    const themeWithoutKulrsId: DesignTheme = { ...baseTheme, kulrsPaletteId: undefined };
    render(<ThemePanel {...defaultProps} theme={themeWithoutKulrsId} />);
    expect(screen.queryByRole('link', { name: /View Palette Details on Kulrs\.com/i })).not.toBeInTheDocument();
  });

  it('does not show save UI when theme is null', () => {
    render(<ThemePanel {...defaultProps} theme={null} onSavePalette={vi.fn()} isAuthenticated={true} />);
    expect(screen.queryByRole('button', { name: /Save as New/i })).not.toBeInTheDocument();
  });
});
