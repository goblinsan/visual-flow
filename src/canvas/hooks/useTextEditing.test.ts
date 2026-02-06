import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTextEditing } from './useTextEditing';
import type { LayoutSpec, TextNode, TextSpan } from '../../layout-schema';

function mkSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 800, height: 600 },
      children: [
        {
          id: "text1",
          type: "text",
          position: { x: 100, y: 100 },
          text: "Hello World",
          fontSize: 16,
          fontFamily: "Arial",
          fontWeight: "400",
          color: "#000000",
        },
        {
          id: "text2",
          type: "text",
          position: { x: 200, y: 200 },
          text: "Rich Text",
          fontSize: 18,
          fontFamily: "Helvetica",
          spans: [
            { text: "Rich ", fontWeight: "bold" },
            { text: "Text", fontStyle: "italic" }
          ],
        }
      ]
    }
  } as LayoutSpec;
}

describe('useTextEditing', () => {
  let mockSetSpec: ReturnType<typeof vi.fn>;
  let mockOnToolChange: ReturnType<typeof vi.fn>;
  let mockSetSelection: ReturnType<typeof vi.fn>;
  let mockFindNode: ReturnType<typeof vi.fn>;
  let mockGetNodeWorldPosition: ReturnType<typeof vi.fn>;
  let mockStageRef: any;
  let mockWrapperRef: any;

  beforeEach(() => {
    mockSetSpec = vi.fn();
    mockOnToolChange = vi.fn();
    mockSetSelection = vi.fn();
    mockFindNode = vi.fn((root, id) => {
      const spec = mkSpec();
      return spec.root.children.find((n: any) => n.id === id) || null;
    });
    mockGetNodeWorldPosition = vi.fn((id) => {
      if (id === 'text1') return { x: 100, y: 100 };
      if (id === 'text2') return { x: 200, y: 200 };
      return null;
    });
    mockStageRef = {
      current: {
        findOne: vi.fn(() => ({
          visible: vi.fn(),
        })),
        batchDraw: vi.fn(),
      }
    };
    mockWrapperRef = {
      current: document.createElement('div')
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with no active editing state', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    expect(result.current.editingTextId).toBeNull();
    expect(result.current.editingTextValue).toBe('');
    expect(result.current.editingTextSpans).toEqual([]);
    expect(result.current.textSelection).toBeNull();
    expect(result.current.richTextEditorRef.current).toBeNull();
  });

  it('starts text editing for plain text node', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const textNode = mkSpec().root.children[0] as TextNode;

    act(() => {
      result.current.startTextEdit('text1', textNode);
    });

    expect(result.current.editingTextId).toBe('text1');
    expect(result.current.editingTextValue).toBe('Hello World');
    expect(result.current.editingTextSpans).toEqual([{ text: 'Hello World' }]);
  });

  it('starts text editing for rich text node with spans', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const textNode = mkSpec().root.children[1] as TextNode;

    act(() => {
      result.current.startTextEdit('text2', textNode);
    });

    expect(result.current.editingTextId).toBe('text2');
    expect(result.current.editingTextValue).toBe('Rich Text');
    expect(result.current.editingTextSpans).toEqual([
      { text: "Rich ", fontWeight: "bold" },
      { text: "Text", fontStyle: "italic" }
    ]);
  });

  it('commits text edit and updates spec', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const textNode = mkSpec().root.children[0] as TextNode;

    // Start editing
    act(() => {
      result.current.startTextEdit('text1', textNode);
    });

    // Modify text
    act(() => {
      result.current.handleTextChange('Updated Text', [{ text: 'Updated Text' }]);
    });

    // Commit
    act(() => {
      result.current.commitTextEdit();
    });

    expect(mockSetSpec).toHaveBeenCalled();
    expect(mockOnToolChange).toHaveBeenCalledWith('select');
    expect(mockSetSelection).toHaveBeenCalledWith(['text1']);
    expect(result.current.editingTextId).toBeNull();
    expect(result.current.editingTextValue).toBe('');
    expect(result.current.editingTextSpans).toEqual([]);
    expect(result.current.textSelection).toBeNull();
  });

  it('cancels text edit without saving', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const textNode = mkSpec().root.children[0] as TextNode;

    // Start editing
    act(() => {
      result.current.startTextEdit('text1', textNode);
    });

    // Modify text
    act(() => {
      result.current.handleTextChange('Updated Text', [{ text: 'Updated Text' }]);
    });

    // Cancel
    act(() => {
      result.current.cancelTextEdit();
    });

    expect(mockSetSpec).not.toHaveBeenCalled();
    expect(mockOnToolChange).toHaveBeenCalledWith('select');
    expect(mockSetSelection).not.toHaveBeenCalled();
    expect(result.current.editingTextId).toBeNull();
    expect(result.current.editingTextValue).toBe('');
    expect(result.current.editingTextSpans).toEqual([]);
  });

  it('handles text change updates state', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const textNode = mkSpec().root.children[0] as TextNode;

    act(() => {
      result.current.startTextEdit('text1', textNode);
    });

    const newSpans: TextSpan[] = [
      { text: 'Hello ', fontWeight: 'bold' },
      { text: 'World', fontStyle: 'italic' }
    ];

    act(() => {
      result.current.handleTextChange('Hello World', newSpans);
    });

    expect(result.current.editingTextValue).toBe('Hello World');
    expect(result.current.editingTextSpans).toEqual(newSpans);
  });

  it('calculates text edit style correctly', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1.5,
        pos: { x: 10, y: 20 },
      })
    );

    const textNode = mkSpec().root.children[0] as TextNode;

    act(() => {
      result.current.startTextEdit('text1', textNode);
    });

    const style = result.current.getTextEditStyle();

    expect(style).toBeTruthy();
    expect(style?.position).toBe('absolute');
    expect(style?.fontSize).toBe(16 * 1.5); // fontSize * scale
    expect(style?.fontFamily).toBe('Arial');
    expect(style?.color).toBe('#000000');
    // stageX = worldX * scale + pos.x = 100 * 1.5 + 10 = 160
    // stageY = worldY * scale + pos.y = 100 * 1.5 + 20 = 170
    // left = stageX - PADDING = 160 - 6 = 154
    // top = stageY - PADDING = 170 - 6 = 164
    expect(style?.left).toBe(154);
    expect(style?.top).toBe(164);
  });

  it('returns null style when not editing', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const style = result.current.getTextEditStyle();
    expect(style).toBeNull();
  });

  it('hides Konva node when editing starts', () => {
    const mockKonvaNode = {
      visible: vi.fn(),
    };
    mockStageRef.current.findOne = vi.fn(() => mockKonvaNode);

    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const textNode = mkSpec().root.children[0] as TextNode;

    act(() => {
      result.current.startTextEdit('text1', textNode);
    });

    expect(mockStageRef.current.findOne).toHaveBeenCalled();
    expect(mockKonvaNode.visible).toHaveBeenCalledWith(false);
    expect(mockStageRef.current.batchDraw).toHaveBeenCalled();
  });

  it('restores Konva node visibility when editing ends', () => {
    const mockKonvaNode = {
      visible: vi.fn(),
    };
    mockStageRef.current.findOne = vi.fn(() => mockKonvaNode);

    const { result, unmount } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const textNode = mkSpec().root.children[0] as TextNode;

    act(() => {
      result.current.startTextEdit('text1', textNode);
    });

    // Clear the calls from starting edit
    vi.clearAllMocks();

    // Cancel editing (which should trigger cleanup)
    act(() => {
      result.current.cancelTextEdit();
    });

    // The cleanup should restore visibility
    // Note: The cleanup happens in useEffect, so we need to wait for next render
    act(() => {
      // Force a re-render by unmounting
      unmount();
    });

    expect(mockKonvaNode.visible).toHaveBeenCalledWith(true);
  });

  it('applies format via richTextEditorRef', () => {
    const mockEditor = {
      applyFormatToSelection: vi.fn(),
      focus: vi.fn(),
      selectAll: vi.fn(),
      getSelection: vi.fn(),
    };

    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    // Manually set the ref
    result.current.richTextEditorRef.current = mockEditor as any;

    const format = { fontWeight: 'bold' };

    act(() => {
      result.current.applyFormat(format);
    });

    expect(mockEditor.applyFormatToSelection).toHaveBeenCalledWith(format);
  });

  it('does not apply format when editor ref is null', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    // Should not throw when ref is null
    expect(() => {
      act(() => {
        result.current.applyFormat({ fontWeight: 'bold' });
      });
    }).not.toThrow();
  });

  it('handles text selection state updates', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const selection = { start: 0, end: 5 };

    act(() => {
      result.current.setTextSelection(selection);
    });

    expect(result.current.textSelection).toEqual(selection);
  });

  it('calculates style with rotation and scale', () => {
    const customFindNode = vi.fn((root, id) => {
      if (id === 'text1') {
        return {
          id: "text1",
          type: "text",
          position: { x: 100, y: 100 },
          text: "Hello World",
          fontSize: 16,
          fontFamily: "Arial",
          fontWeight: "bold",
          fontStyle: "italic",
          color: "#ff0000",
          rotation: 45,
          textScaleX: 1.2,
          textScaleY: 0.8,
          align: 'center',
        };
      }
      return null;
    });

    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: customFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const textNode = customFindNode(null, 'text1') as TextNode;

    act(() => {
      result.current.startTextEdit('text1', textNode);
    });

    const style = result.current.getTextEditStyle();

    expect(style).toBeTruthy();
    expect(style?.fontWeight).toBe(700); // bold -> 700
    expect(style?.fontStyle).toBe('italic');
    expect(style?.color).toBe('#ff0000');
    expect(style?.textAlign).toBe('center');
    expect(style?.transform).toBe('rotate(45deg) scale(1.2, 0.8)');
  });

  it('does not commit when editingTextId is null', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    act(() => {
      result.current.commitTextEdit();
    });

    expect(mockSetSpec).not.toHaveBeenCalled();
    expect(mockOnToolChange).not.toHaveBeenCalled();
    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('handles empty text node gracefully', () => {
    const { result } = renderHook(() =>
      useTextEditing({
        spec: mkSpec(),
        setSpec: mockSetSpec,
        onToolChange: mockOnToolChange,
        setSelection: mockSetSelection,
        findNode: mockFindNode,
        getNodeWorldPosition: mockGetNodeWorldPosition,
        stageRef: mockStageRef,
        wrapperRef: mockWrapperRef,
        scale: 1,
        pos: { x: 0, y: 0 },
      })
    );

    const emptyTextNode: TextNode = {
      id: 'text3',
      type: 'text',
      position: { x: 50, y: 50 },
      text: '',
    };

    act(() => {
      result.current.startTextEdit('text3', emptyTextNode);
    });

    expect(result.current.editingTextId).toBe('text3');
    expect(result.current.editingTextValue).toBe('');
    expect(result.current.editingTextSpans).toEqual([{ text: '' }]);
  });
});
