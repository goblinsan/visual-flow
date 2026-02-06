import { describe, it, expect } from 'vitest';
import { DraftPreviewLayer } from './DraftPreviewLayer';

describe('DraftPreviewLayer', () => {
  const defaultProps = {
    isRectMode: false,
    isEllipseMode: false,
    isLineMode: false,
    isCurveMode: false,
    rectDraft: null,
    ellipseDraft: null,
    lineDraft: null,
    curveDraft: null,
    altPressed: false,
    shiftPressed: false,
  };

  it('renders with default props', () => {
    const element = DraftPreviewLayer(defaultProps);
    expect(element).toBeTruthy();
  });

  it('renders rectangle draft when in rect mode with draft', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isRectMode: true,
      rectDraft: { start: { x: 10, y: 10 }, current: { x: 100, y: 100 } },
    });
    expect(element).toBeTruthy();
  });

  it('renders ellipse draft when in ellipse mode with draft', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isEllipseMode: true,
      ellipseDraft: { start: { x: 10, y: 10 }, current: { x: 100, y: 100 } },
    });
    expect(element).toBeTruthy();
  });

  it('renders line draft when in line mode with draft', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isLineMode: true,
      lineDraft: { start: { x: 10, y: 10 }, current: { x: 100, y: 100 } },
    });
    expect(element).toBeTruthy();
  });

  it('renders curve draft when in curve mode with draft', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isCurveMode: true,
      curveDraft: {
        points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
        current: { x: 100, y: 100 }
      },
    });
    expect(element).toBeTruthy();
  });

  it('handles alt key modifier for rectangle draft', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isRectMode: true,
      rectDraft: { start: { x: 50, y: 50 }, current: { x: 100, y: 100 } },
      altPressed: true,
    });
    expect(element).toBeTruthy();
  });

  it('handles shift key modifier for rectangle draft', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isRectMode: true,
      rectDraft: { start: { x: 10, y: 10 }, current: { x: 100, y: 80 } },
      shiftPressed: true,
    });
    expect(element).toBeTruthy();
  });

  it('handles both alt and shift modifiers for ellipse draft', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isEllipseMode: true,
      ellipseDraft: { start: { x: 50, y: 50 }, current: { x: 100, y: 80 } },
      altPressed: true,
      shiftPressed: true,
    });
    expect(element).toBeTruthy();
  });

  it('does not render rect when not in rect mode', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isRectMode: false,
      rectDraft: { start: { x: 10, y: 10 }, current: { x: 100, y: 100 } },
    });
    expect(element).toBeTruthy();
  });

  it('does not render ellipse when draft is null', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isEllipseMode: true,
      ellipseDraft: null,
    });
    expect(element).toBeTruthy();
  });

  it('does not render curve when points array is empty', () => {
    const element = DraftPreviewLayer({
      ...defaultProps,
      isCurveMode: true,
      curveDraft: { points: [], current: { x: 100, y: 100 } },
    });
    expect(element).toBeTruthy();
  });
});
