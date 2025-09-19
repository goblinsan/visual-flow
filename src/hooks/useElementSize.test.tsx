import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { useElementSize } from './useElementSize';

// Mock ResizeObserver
class MockRO {
  callback: ResizeObserverCallback;
  elements: Set<Element> = new Set();
  constructor(cb: ResizeObserverCallback) { this.callback = cb; }
  observe(el: Element) { this.elements.add(el); }
  unobserve(el: Element) { this.elements.delete(el); }
  disconnect() { this.elements.clear(); }
  trigger(width: number, height: number) {
    const entries: ResizeObserverEntry[] = Array.from(this.elements).map(el => ({
      target: el as Element,
      contentRect: { width, height, x:0, y:0, top:0, left:0, bottom:height, right:width, toJSON(){} }
    } as any));
    this.callback(entries, this as any);
  }
}

declare global { var __mockRO__: MockRO | undefined; }

beforeEach(() => {
  (global as any).ResizeObserver = class extends MockRO { constructor(cb: ResizeObserverCallback) { super(cb); globalThis.__mockRO__ = this; } } as any;
});

function TestComponent() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  return <div>
    <div data-testid="s" ref={ref} style={{ width: '100px', height: '50px' }}>x</div>
    <output data-testid="w">{size.width}</output>
    <output data-testid="h">{size.height}</output>
  </div>;
}

describe('useElementSize', () => {
  it('initially measures and updates with ResizeObserver events', () => {
    const { getByTestId } = render(<TestComponent />);
    let ro = globalThis.__mockRO__!;
    // Simulate observer firing with size 200x120 (initial observer)
    act(() => { ro.trigger(200, 120); });
    expect(getByTestId('w').textContent).toBe('200');
    expect(getByTestId('h').textContent).toBe('120');
    // Trigger again with same size should not change (still 200/120)
    act(() => { ro.trigger(200, 120); });
    expect(getByTestId('w').textContent).toBe('200');
    // After size update, effect re-runs creating a new ResizeObserver; capture it
    ro = globalThis.__mockRO__!;
    // Trigger different size on new observer instance
    act(() => { ro.trigger(320, 240); });
    expect(getByTestId('h').textContent).toBe('240');
  });
});
