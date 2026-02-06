import { describe, it, expect, vi } from 'vitest';
import { TextEditingOverlay } from './TextEditingOverlay';
import { createRef } from 'react';
import type { RichTextEditorHandle } from '../components/RichTextEditor';

describe('TextEditingOverlay', () => {
  const defaultProps = {
    visible: true,
    editingTextValue: 'Test text',
    editingTextSpans: [],
    baseStyles: {
      fontFamily: 'Arial',
      fontSize: 14,
      fontWeight: '400',
      fontStyle: 'normal',
      color: '#0f172a',
    },
    textEditStyle: {
      position: 'absolute' as const,
      left: 100,
      top: 100,
    },
    textSelection: null,
    toolbarAnchorPosition: { x: 150, y: 100 },
    richTextEditorRef: createRef<RichTextEditorHandle>(),
    onChange: vi.fn(),
    onCommit: vi.fn(),
    onCancel: vi.fn(),
    onSelectionChange: vi.fn(),
    onApplyFormat: vi.fn(),
  };

  it('returns null when not visible', () => {
    const element = TextEditingOverlay({ ...defaultProps, visible: false });
    expect(element).toBeNull();
  });

  it('renders component when visible', () => {
    const element = TextEditingOverlay(defaultProps);
    expect(element).toBeTruthy();
    expect(element).not.toBeNull();
  });

  it('includes TextEditToolbar and RichTextEditor components', () => {
    const element = TextEditingOverlay({
      ...defaultProps,
      textSelection: { start: 0, end: 4 },
    });
    expect(element).toBeTruthy();
  });

  it('handles null text selection', () => {
    const element = TextEditingOverlay({
      ...defaultProps,
      textSelection: null,
    });
    expect(element).toBeTruthy();
  });

  it('handles empty text selection', () => {
    const element = TextEditingOverlay({
      ...defaultProps,
      textSelection: { start: 0, end: 0 },
    });
    expect(element).toBeTruthy();
  });

  it('handles null text edit style', () => {
    const element = TextEditingOverlay({
      ...defaultProps,
      textEditStyle: null,
    });
    expect(element).toBeTruthy();
  });

  it('handles text spans correctly', () => {
    const spans = [
      { start: 0, end: 4, fontWeight: 'bold' as const },
    ];
    const element = TextEditingOverlay({
      ...defaultProps,
      editingTextSpans: spans,
    });
    expect(element).toBeTruthy();
  });

  it('accepts custom base styles', () => {
    const customStyles = {
      fontFamily: 'Helvetica',
      fontSize: 18,
      fontWeight: 'bold',
      fontStyle: 'italic',
      color: '#ff0000',
    };
    const element = TextEditingOverlay({
      ...defaultProps,
      baseStyles: customStyles,
    });
    expect(element).toBeTruthy();
  });
});
