import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LeftToolbar, type LeftToolbarProps } from './LeftToolbar';

function setup(overrides: Partial<LeftToolbarProps> = {}) {
  const mockSetTool = vi.fn();
  const mockSetIconLibraryOpen = vi.fn();
  const mockSetComponentLibraryOpen = vi.fn();

  const props: LeftToolbarProps = {
    tool: 'select',
    setTool: mockSetTool,
    setIconLibraryOpen: mockSetIconLibraryOpen,
    setComponentLibraryOpen: mockSetComponentLibraryOpen,
    ...overrides,
  };

  const utils = render(<LeftToolbar {...props} />);
  return { 
    ...utils, 
    mockSetTool, 
    mockSetIconLibraryOpen, 
    mockSetComponentLibraryOpen,
  };
}

describe('LeftToolbar', () => {
  it('renders all tool buttons', () => {
    const { getByTitle } = setup();
    expect(getByTitle('Select (V)')).toBeTruthy();
    expect(getByTitle('Rectangle (R)')).toBeTruthy();
    expect(getByTitle('Ellipse (O)')).toBeTruthy();
    expect(getByTitle('Line (L)')).toBeTruthy();
    expect(getByTitle('Curve (P)')).toBeTruthy();
    expect(getByTitle('Text (T)')).toBeTruthy();
    expect(getByTitle('Image (I)')).toBeTruthy();
    expect(getByTitle('Icon Library')).toBeTruthy();
    expect(getByTitle('Components')).toBeTruthy();
  });

  it('calls setTool when a standard tool button is clicked', () => {
    const { getByTitle, mockSetTool } = setup();
    const rectButton = getByTitle('Rectangle (R)');
    fireEvent.click(rectButton);
    expect(mockSetTool).toHaveBeenCalledWith('rect');
  });

  it('opens icon library when icon button is clicked', () => {
    const { getByTitle, mockSetTool, mockSetIconLibraryOpen } = setup();
    const iconButton = getByTitle('Icon Library');
    fireEvent.click(iconButton);
    expect(mockSetTool).toHaveBeenCalledWith('icon');
    expect(mockSetIconLibraryOpen).toHaveBeenCalledWith(true);
  });

  it('opens component library when component button is clicked', () => {
    const { getByTitle, mockSetTool, mockSetComponentLibraryOpen } = setup();
    const componentButton = getByTitle('Components');
    fireEvent.click(componentButton);
    expect(mockSetTool).toHaveBeenCalledWith('component');
    expect(mockSetComponentLibraryOpen).toHaveBeenCalledWith(true);
  });

  it('highlights the active tool', () => {
    const { getByTitle } = setup({ tool: 'rect' });
    const rectButton = getByTitle('Rectangle (R)');
    expect(rectButton.classList.contains('text-white')).toBe(true);
  });

  it('renders zoom and pan tools at the bottom', () => {
    const { getByTitle } = setup();
    expect(getByTitle('Zoom tool (click to zoom in, Alt-click to zoom out)')).toBeTruthy();
    expect(getByTitle('Pan tool (drag to pan)')).toBeTruthy();
  });

  it('calls setTool when zoom button is clicked', () => {
    const { getByTitle, mockSetTool } = setup();
    const zoomButton = getByTitle('Zoom tool (click to zoom in, Alt-click to zoom out)');
    fireEvent.click(zoomButton);
    expect(mockSetTool).toHaveBeenCalledWith('zoom');
  });

  it('calls setTool when pan button is clicked', () => {
    const { getByTitle, mockSetTool } = setup();
    const panButton = getByTitle('Pan tool (drag to pan)');
    fireEvent.click(panButton);
    expect(mockSetTool).toHaveBeenCalledWith('pan');
  });

  it('highlights zoom tool when active', () => {
    const { getByTitle } = setup({ tool: 'zoom' });
    const zoomButton = getByTitle('Zoom tool (click to zoom in, Alt-click to zoom out)');
    expect(zoomButton.classList.contains('text-white')).toBe(true);
  });

  it('highlights pan tool when active', () => {
    const { getByTitle } = setup({ tool: 'pan' });
    const panButton = getByTitle('Pan tool (drag to pan)');
    expect(panButton.classList.contains('text-white')).toBe(true);
  });
});
