/**
 * Tests for MobileEntryScreen
 * Issue #207 – Specify mobile information architecture and navigation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileEntryScreen } from './MobileEntryScreen';

describe('MobileEntryScreen', () => {
  it('renders all five entry point cards', () => {
    render(<MobileEntryScreen onSelect={vi.fn()} />);
    expect(screen.getByText('By Theme')).toBeInTheDocument();
    expect(screen.getByText('By Color')).toBeInTheDocument();
    expect(screen.getByText('By Font')).toBeInTheDocument();
    expect(screen.getByText('By Image')).toBeInTheDocument();
    expect(screen.getByText('Start Blank')).toBeInTheDocument();
  });

  it('renders a description for each card', () => {
    render(<MobileEntryScreen onSelect={vi.fn()} />);
    expect(screen.getByText(/Pick a mood/i)).toBeInTheDocument();
    expect(screen.getByText(/Start with a colour/i)).toBeInTheDocument();
    expect(screen.getByText(/Let typography set the tone/i)).toBeInTheDocument();
    expect(screen.getByText(/Extract a palette from a photo/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose moods and industry yourself/i)).toBeInTheDocument();
  });

  it('calls onSelect with "theme" when the theme card is tapped', async () => {
    const onSelect = vi.fn();
    render(<MobileEntryScreen onSelect={onSelect} />);
    await userEvent.click(screen.getByLabelText('Start by By Theme'));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('theme');
  });

  it('calls onSelect with "color" when the color card is tapped', async () => {
    const onSelect = vi.fn();
    render(<MobileEntryScreen onSelect={onSelect} />);
    await userEvent.click(screen.getByLabelText('Start by By Color'));
    expect(onSelect).toHaveBeenCalledWith('color');
  });

  it('calls onSelect with "font" when the font card is tapped', async () => {
    const onSelect = vi.fn();
    render(<MobileEntryScreen onSelect={onSelect} />);
    await userEvent.click(screen.getByLabelText('Start by By Font'));
    expect(onSelect).toHaveBeenCalledWith('font');
  });

  it('calls onSelect with "image" when the image card is tapped', async () => {
    const onSelect = vi.fn();
    render(<MobileEntryScreen onSelect={onSelect} />);
    await userEvent.click(screen.getByLabelText('Start by By Image'));
    expect(onSelect).toHaveBeenCalledWith('image');
  });

  it('calls onSelect with "blank" when the blank card is tapped', async () => {
    const onSelect = vi.fn();
    render(<MobileEntryScreen onSelect={onSelect} />);
    await userEvent.click(screen.getByLabelText('Start by Start Blank'));
    expect(onSelect).toHaveBeenCalledWith('blank');
  });

  it('renders the hero headline', () => {
    render(<MobileEntryScreen onSelect={vi.fn()} />);
    expect(screen.getByText('Visual Flow')).toBeInTheDocument();
  });

  it('renders the hero subtitle', () => {
    render(<MobileEntryScreen onSelect={vi.fn()} />);
    expect(screen.getByText(/Build a beautiful design system/i)).toBeInTheDocument();
  });
});
