import { useCallback, useState, useRef, useEffect, type MutableRefObject } from 'react';
import type Konva from 'konva';
import type { LayoutSpec, TextNode, TextSpan, FrameNode } from '../../layout-schema';
import { mapNode } from '../../commands/types';
import type { RichTextEditorHandle } from '../../components/RichTextEditor';

export interface UseTextEditingProps {
  spec: LayoutSpec;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  onToolChange?: (tool: string) => void;
  setSelection: (ids: string[]) => void;
  findNode: (root: any, id: string) => any;
  getNodeWorldPosition: (id: string) => { x: number; y: number } | null;
  stageRef: React.RefObject<Konva.Stage | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  pos: { x: number; y: number };
}

export interface UseTextEditingReturn {
  editingTextId: string | null;
  editingTextValue: string;
  editingTextSpans: TextSpan[];
  textSelection: { start: number; end: number } | null;
  richTextEditorRef: React.MutableRefObject<RichTextEditorHandle | null>;
  textEditContainerRef: MutableRefObject<HTMLDivElement | null>;
  startTextEdit: (nodeId: string, textNode: TextNode) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
  handleTextChange: (text: string, spans: TextSpan[]) => void;
  applyFormat: (format: Partial<TextSpan>) => void;
  setTextSelection: (sel: { start: number; end: number } | null) => void;
  getTextEditStyle: () => React.CSSProperties | null;
}

export function useTextEditing({
  spec,
  setSpec,
  onToolChange,
  setSelection,
  findNode,
  getNodeWorldPosition,
  stageRef,
  wrapperRef,
  scale,
  pos,
}: UseTextEditingProps): UseTextEditingReturn {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');
  const [editingTextSpans, setEditingTextSpans] = useState<TextSpan[]>([]);
  const [textSelection, setTextSelection] = useState<{ start: number; end: number } | null>(null);
  const richTextEditorRef = useRef<RichTextEditorHandle>(null);
  const textEditContainerRef = useRef<HTMLDivElement | null>(null);

  // Commit text edit when clicking outside the text editing overlay
  const commitTextEditRef = useRef<() => void>(() => {});
  useEffect(() => { commitTextEditRef.current = commitTextEdit; });
  
  useEffect(() => {
    if (!editingTextId) return;
    
    const handlePointerDown = (e: PointerEvent) => {
      const container = textEditContainerRef.current;
      if (!container) return;
      const target = e.target as Node;
      // If click is inside the text editing container (editor + toolbar), ignore
      if (container.contains(target)) return;
      // Commit the text edit
      commitTextEditRef.current();
    };
    
    // Use a small delay so the initial click that starts editing doesn't immediately commit
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown, true);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [editingTextId]);

  // Start editing a text node
  const startTextEdit = useCallback((nodeId: string, textNode: TextNode) => {
    setEditingTextId(nodeId);
    setEditingTextValue(textNode.text || '');
    
    // Initialize spans - either from existing spans or create one from plain text
    if (textNode.spans && textNode.spans.length > 0) {
      setEditingTextSpans(textNode.spans);
    } else {
      setEditingTextSpans([{ text: textNode.text || '' }]);
    }
    
    // Focus the editor on next tick
    setTimeout(() => {
      richTextEditorRef.current?.focus();
      richTextEditorRef.current?.selectAll();
    }, 0);
  }, []);

  // Sync formatting from spec when attribute panel changes during editing.
  // This watches the spec's text node and merges formatting changes into the
  // editing spans WITHOUT overwriting the user's typed text content.
  const prevSpecFormattingRef = useRef<{ fontSize?: number; fontFamily?: string; fontWeight?: string; fontStyle?: string; color?: string } | null>(null);
  useEffect(() => {
    if (!editingTextId) {
      prevSpecFormattingRef.current = null;
      return;
    }
    const textNode = findNode(spec.root, editingTextId) as TextNode | null;
    if (!textNode) return;
    
    const currentFormatting = {
      fontSize: textNode.fontSize,
      fontFamily: textNode.fontFamily,
      fontWeight: textNode.fontWeight,
      fontStyle: textNode.fontStyle,
      color: textNode.color,
    };
    
    // On first render when editing starts, just record the formatting
    if (!prevSpecFormattingRef.current) {
      prevSpecFormattingRef.current = currentFormatting;
      return;
    }
    
    // Check if any formatting changed in the spec (from attribute panel)
    const prev = prevSpecFormattingRef.current;
    const changed = 
      prev.fontSize !== currentFormatting.fontSize ||
      prev.fontFamily !== currentFormatting.fontFamily ||
      prev.fontWeight !== currentFormatting.fontWeight ||
      prev.fontStyle !== currentFormatting.fontStyle ||
      prev.color !== currentFormatting.color;
    
    if (changed) {
      prevSpecFormattingRef.current = currentFormatting;
      // Update editing spans with new formatting from spec
      setEditingTextSpans(spans => {
        const newSpans = spans.map(span => {
          const updated = { ...span };
          if (currentFormatting.fontSize !== undefined) updated.fontSize = currentFormatting.fontSize;
          if (currentFormatting.fontFamily !== undefined) updated.fontFamily = currentFormatting.fontFamily;
          if (currentFormatting.fontWeight !== undefined) updated.fontWeight = currentFormatting.fontWeight as TextSpan['fontWeight'];
          if (currentFormatting.fontStyle !== undefined) updated.fontStyle = currentFormatting.fontStyle as TextSpan['fontStyle'];
          if (currentFormatting.color !== undefined) updated.color = currentFormatting.color;
          return updated;
        });
        // Also re-render the editor content with new formatting
        setTimeout(() => {
          if (richTextEditorRef.current) {
            richTextEditorRef.current.reinitializeContent(newSpans, {
              fontFamily: currentFormatting.fontFamily || 'Arial',
              fontSize: currentFormatting.fontSize ?? 14,
              fontWeight: currentFormatting.fontWeight || '400',
              fontStyle: currentFormatting.fontStyle || 'normal',
              color: currentFormatting.color ?? '#0f172a',
            });
          }
        }, 0);
        return newSpans;
      });
    }
  }, [editingTextId, spec.root, findNode]);

  // Commit text edit and close editor
  const commitTextEdit = useCallback(() => {
    if (!editingTextId) return;
    
    const newRoot = mapNode<FrameNode>(spec.root, editingTextId, (n) => ({
      ...n,
      text: editingTextValue,
      spans: editingTextSpans.length > 0 ? editingTextSpans : undefined,
    }));
    
    setSpec({ ...spec, root: newRoot });
    onToolChange?.('select');
    setSelection([editingTextId]);
    setEditingTextId(null);
    setEditingTextValue('');
    setEditingTextSpans([]);
    setTextSelection(null);
  }, [editingTextId, editingTextValue, editingTextSpans, spec, setSpec, onToolChange, setSelection]);

  // Cancel text edit without saving
  const cancelTextEdit = useCallback(() => {
    setEditingTextId(null);
    setEditingTextValue('');
    setEditingTextSpans([]);
    setTextSelection(null);
    onToolChange?.('select');
  }, [onToolChange]);

  // Handle text/spans change from rich text editor
  const handleTextChange = useCallback((text: string, spans: TextSpan[]) => {
    setEditingTextValue(text);
    setEditingTextSpans(spans);
  }, []);

  // Apply formatting to selected text
  const applyFormat = useCallback((format: Partial<TextSpan>) => {
    if (!richTextEditorRef.current) return;
    richTextEditorRef.current.applyFormatToSelection(format);
  }, []);

  // Hide Konva text node while editing (so textarea appears to replace it)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !editingTextId) return;
    
    const konvaNode = stage.findOne(`#${CSS.escape(editingTextId)}`);
    if (konvaNode) {
      konvaNode.visible(false);
      stage.batchDraw();
    }
    
    return () => {
      if (konvaNode) {
        konvaNode.visible(true);
        stage.batchDraw();
      }
    };
  }, [editingTextId, stageRef]);

  // Calculate textarea position and style based on the text node's position on canvas
  const getTextEditStyle = useCallback((): React.CSSProperties | null => {
    if (!editingTextId || !stageRef.current) return null;
    
    const textNode = findNode(spec.root, editingTextId) as TextNode | null;
    if (!textNode) return null;
    
    const worldPos = getNodeWorldPosition(editingTextId) ?? { x: 0, y: 0 };
    const x = worldPos.x;
    const y = worldPos.y;
    
    // Convert world coordinates to screen coordinates
    const stageX = x * scale + pos.x;
    const stageY = y * scale + pos.y;
    
    // Get the wrapper's position
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;
    
    // Get font properties
    const fontSize = textNode.fontSize ?? 14;
    const fontFamily = textNode.fontFamily || 'Arial';
    const fontWeight = textNode.fontWeight || '400';
    
    // Calculate text alignment offset if needed
    const align = textNode.align ?? 'left';

    const PADDING = 6;
    const MIN_WIDTH = 15;
    const MIN_HEIGHT = 30;
    
    return {
      position: 'absolute',
      left: stageX - PADDING,
      top: stageY - PADDING,
      fontSize: fontSize * scale,
      fontFamily,
      fontWeight: fontWeight === 'bold' ? 700 : (fontWeight === 'normal' ? 400 : Number(fontWeight)),
      fontStyle: textNode.fontStyle === 'italic' ? 'italic' : 'normal',
      color: textNode.color ?? '#0f172a',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      padding: `${PADDING}px`,
      margin: 0,
      display: 'inline-block',
      width: 'auto',
      minWidth: `${MIN_WIDTH}px`,
      minHeight: `${MIN_HEIGHT}px`,
      resize: 'none',
      overflow: 'visible',
      transformOrigin: 'top left',
      transform: `rotate(${textNode.rotation ?? 0}deg) scale(${textNode.textScaleX ?? 1}, ${textNode.textScaleY ?? 1})`,
      zIndex: 1000,
      lineHeight: 1.2,
      textAlign: align,
      caretColor: '#3b82f6',
      whiteSpace: 'pre',
    };
  }, [editingTextId, spec.root, scale, pos, getNodeWorldPosition, findNode, stageRef, wrapperRef]);

  return {
    editingTextId,
    editingTextValue,
    editingTextSpans,
    textSelection,
    richTextEditorRef,
    textEditContainerRef,
    startTextEdit,
    commitTextEdit,
    cancelTextEdit,
    handleTextChange,
    applyFormat,
    setTextSelection,
    getTextEditStyle,
  };
}
