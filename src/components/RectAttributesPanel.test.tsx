import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import RectAttributesPanel, { RectNode, RectPatch } from './RectAttributesPanel';
import { describe, it, expect } from 'vitest';

function setup(overrides: Partial<Record<string, unknown>> = {}) {
  const rect: RectNode = { id: 'r1', type: 'rect', fill: '#ffffff', stroke: '#222222', strokeWidth: 2, radius: 4, opacity: 1, strokeDash: [4,2] };
  const updateRectCalls: RectPatch[] = [];
  const props = {
    rect,
    lastFillById: {} as Record<string,string>,
    lastStrokeById: {} as Record<string,string>,
    setLastFillById: () => {},
    setLastStrokeById: () => {},
    updateRect: (p: RectPatch) => { updateRectCalls.push(p); Object.assign(rect, p); },
    rawDashInput: rect.strokeDash?.join(' ') || '',
    setRawDashInput: () => {},
    beginRecentSession: () => {},
    previewRecent: () => {},
    commitRecent: () => {},
    pushRecent: () => {},
    recentColors: ['#ffffff', '#000000'],
    ...overrides,
  };
  const utils = render(<RectAttributesPanel {...(props as any)} />);
  return { ...utils, rect, updateRectCalls };
}

describe('RectAttributesPanel', () => {
  it('applies dash pattern on Enter key', () => {
    const { getByPlaceholderText, rect, updateRectCalls } = setup();
    const input = getByPlaceholderText('e.g. 4 4') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '5 3 2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // rect object should be mutated by updateRect implementation in setup
    expect(rect.strokeDash).toEqual([5,3,2]);
    // sanity: ensure at least one updateRect call carried strokeDash
    expect(updateRectCalls.some(c => Array.isArray(c.strokeDash))).toBe(true);
  });

  it('clears dash pattern on empty blur', () => {
    const { getByPlaceholderText, rect } = setup({ rawDashInput: '' });
    const input = getByPlaceholderText('e.g. 4 4') as HTMLInputElement;
    fireEvent.blur(input);
    expect(rect.strokeDash).toBeUndefined();
  });

  it('renders recent colors section (delegated to ColorControls)', () => {
    const { getByTitle } = setup();
    // Title from recent color swatch (first swatch #ffffff)
    expect(getByTitle('#ffffff')).toBeTruthy();
  });
});
