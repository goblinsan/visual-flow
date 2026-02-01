import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { TextSpan } from '../layout-schema';

export interface RichTextEditorProps {
  /** Plain text value (used if spans is empty or not provided) */
  value: string;
  /** Rich text spans */
  spans?: TextSpan[];
  /** Base styles inherited by all spans */
  baseStyles: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    color: string;
  };
  /** Called when text or spans change */
  onChange: (text: string, spans: TextSpan[]) => void;
  /** Called when editing is committed (Enter or blur) */
  onCommit: () => void;
  /** Called when editing is cancelled (Escape) */
  onCancel: () => void;
  /** Called when selection changes */
  onSelectionChange?: (selection: { start: number; end: number } | null) => void;
  /** Called when format shortcut is pressed (Ctrl+B, Ctrl+I) */
  onFormatShortcut?: (format: 'bold' | 'italic') => void;
  /** CSS styles for positioning */
  style?: React.CSSProperties;
  /** Class name */
  className?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Commit on blur */
  commitOnBlur?: boolean;
}

export interface RichTextEditorHandle {
  focus: () => void;
  selectAll: () => void;
  applyFormatToSelection: (format: Partial<TextSpan>) => void;
  getSelection: () => { start: number; end: number } | null;
}

// Convert spans to HTML with data attributes for tracking
function spansToHtml(spans: TextSpan[], baseStyles: RichTextEditorProps['baseStyles']): string {
  if (!spans || spans.length === 0) return '';
  
  return spans.map((span, idx) => {
    const color = span.color || baseStyles.color;
    const fontWeight = span.fontWeight || baseStyles.fontWeight;
    const fontStyle = span.fontStyle || baseStyles.fontStyle;
    const fontFamily = span.fontFamily || baseStyles.fontFamily;
    const fontSize = span.fontSize || baseStyles.fontSize;
    
    // Escape HTML entities
    const text = span.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/ /g, '&nbsp;');
    
    return `<span data-span-idx="${idx}" style="color:${color};font-weight:${fontWeight};font-style:${fontStyle};font-family:${fontFamily};font-size:${fontSize}px">${text}</span>`;
  }).join('');
}

// Parse contenteditable HTML back to spans
function htmlToSpans(html: string, baseStyles: RichTextEditorProps['baseStyles']): { text: string; spans: TextSpan[] } {
  const container = document.createElement('div');
  container.innerHTML = html;
  
  const spans: TextSpan[] = [];
  let fullText = '';
  
  // Walk through all text nodes and their parent styling
  function extractSpans(node: Node, inheritedStyle: Partial<TextSpan> = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.replace(/\u00A0/g, ' ') || '';
      if (text) {
        // Check if we can merge with the previous span
        if (spans.length > 0) {
          const prev = spans[spans.length - 1];
          const sameColor = (inheritedStyle.color || baseStyles.color) === (prev.color || baseStyles.color);
          const sameWeight = (inheritedStyle.fontWeight || baseStyles.fontWeight) === (prev.fontWeight || baseStyles.fontWeight);
          const sameStyle = (inheritedStyle.fontStyle || baseStyles.fontStyle) === (prev.fontStyle || baseStyles.fontStyle);
          const sameFamily = (inheritedStyle.fontFamily || baseStyles.fontFamily) === (prev.fontFamily || baseStyles.fontFamily);
          const sameSize = (inheritedStyle.fontSize || baseStyles.fontSize) === (prev.fontSize || baseStyles.fontSize);
          
          if (sameColor && sameWeight && sameStyle && sameFamily && sameSize) {
            prev.text += text;
            fullText += text;
            return;
          }
        }
        
        const span: TextSpan = { text };
        if (inheritedStyle.color && inheritedStyle.color !== baseStyles.color) span.color = inheritedStyle.color;
        if (inheritedStyle.fontWeight && inheritedStyle.fontWeight !== baseStyles.fontWeight) span.fontWeight = inheritedStyle.fontWeight as any;
        if (inheritedStyle.fontStyle && inheritedStyle.fontStyle !== baseStyles.fontStyle) span.fontStyle = inheritedStyle.fontStyle as any;
        if (inheritedStyle.fontFamily && inheritedStyle.fontFamily !== baseStyles.fontFamily) span.fontFamily = inheritedStyle.fontFamily;
        if (inheritedStyle.fontSize && inheritedStyle.fontSize !== baseStyles.fontSize) span.fontSize = inheritedStyle.fontSize;
        
        spans.push(span);
        fullText += text;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      // Handle block elements and line breaks
      const isBlock = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tagName);
      if (isBlock && fullText.length > 0 && !fullText.endsWith('\n')) {
         if (spans.length > 0) spans[spans.length-1].text += '\n';
         else spans.push({ text: '\n' });
         fullText += '\n';
      }
      
      if (tagName === 'br') {
         if (spans.length > 0) spans[spans.length-1].text += '\n';
         else spans.push({ text: '\n' });
         fullText += '\n';
         return;
      }

      const style = el.style;
      const newStyle: Partial<TextSpan> = { ...inheritedStyle };
      
      // Extract inline styles
      if (style.color) newStyle.color = style.color;
      if (style.fontWeight) {
        const w = style.fontWeight;
        if (w === 'bold' || w === '700') newStyle.fontWeight = 'bold';
        else if (w === 'normal' || w === '400') newStyle.fontWeight = 'normal';
        else newStyle.fontWeight = w as any;
      }
      if (style.fontStyle) newStyle.fontStyle = style.fontStyle as any;
      if (style.fontFamily) newStyle.fontFamily = style.fontFamily.replace(/['"]/g, '');
      if (style.fontSize) newStyle.fontSize = parseFloat(style.fontSize);
      
      // Handle semantic tags
      if (tagName === 'b' || tagName === 'strong') newStyle.fontWeight = 'bold';
      if (tagName === 'i' || tagName === 'em') newStyle.fontStyle = 'italic';
      
      // Handle <font> tag from execCommand('foreColor')
      if (tagName === 'font') {
        const fontColor = el.getAttribute('color');
        if (fontColor) newStyle.color = fontColor;
      }
      
      // Process children
      el.childNodes.forEach(child => extractSpans(child, newStyle));
    }
  }
  
  container.childNodes.forEach(node => extractSpans(node));
  
  // If no spans were created, create one with the full text
  if (spans.length === 0 && fullText.length === 0) {
    const text = container.textContent?.replace(/\u00A0/g, ' ') || '';
    return { text, spans: text ? [{ text }] : [] };
  }
  
  return { text: fullText, spans };
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
  value,
  spans,
  baseStyles,
  onChange,
  onCommit,
  onCancel,
  onSelectionChange,
  onFormatShortcut,
  style,
  className,
  autoFocus,
  commitOnBlur = true,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  
  // Initialize content
  useEffect(() => {
    if (!editorRef.current) return;
    
    if (spans && spans.length > 0) {
      editorRef.current.innerHTML = spansToHtml(spans, baseStyles);
    } else {
      editorRef.current.textContent = value;
    }

    if (autoFocus) {
      // Small timeout to ensure DOM is ready and layout is computed
      setTimeout(() => {
        editorRef.current?.focus();
        // Place caret at end
        const range = document.createRange();
        range.selectNodeContents(editorRef.current!);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }, 0);
    }
  }, []); // Only on mount
  
  const handleInput = useCallback(() => {
    if (!editorRef.current || isComposing) return;
    
    const html = editorRef.current.innerHTML;
    const result = htmlToSpans(html, baseStyles);
    onChange(result.text, result.spans);
  }, [onChange, baseStyles, isComposing]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.ctrlKey || e.metaKey) {
        // Insert a newline
        e.preventDefault();
        document.execCommand('insertLineBreak');
        // Ensure spans update after DOM change
        setTimeout(() => handleInput(), 0);
        return;
      }

      // Commit on Enter
      e.preventDefault();
      onCommit();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      onFormatShortcut?.('bold');
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      onFormatShortcut?.('italic');
    }
  }, [onCommit, onCancel, onFormatShortcut, handleInput]);
  
  const handleBlur = useCallback(() => {
    if (!commitOnBlur) return;
    onCommit();
  }, [onCommit, commitOnBlur]);
  
  // Get current selection range in terms of text offset
  const getSelection = useCallback((): { start: number; end: number } | null => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return null;
    
    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return null;
    
    // Calculate start offset
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;
    
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const end = preCaretRange.toString().length;
    
    return { start, end };
  }, []);
  
  // Apply formatting to the current selection using execCommand for reliability
  const applyFormatToSelection = useCallback((format: Partial<TextSpan>) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;
    
    const range = sel.getRangeAt(0);
    if (range.collapsed) return; // No selection
    
    // Focus the editor to ensure execCommand works
    editorRef.current.focus();
    
    // Restore selection (focus might have changed it)
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Use execCommand for reliable formatting in contenteditable
    // Bold toggle - execCommand('bold') toggles the bold state
    if (format.fontWeight !== undefined) {
      document.execCommand('bold', false);
    }
    // Italic toggle - execCommand('italic') toggles the italic state
    if (format.fontStyle !== undefined) {
      document.execCommand('italic', false);
    }
    // Color - always apply the specified color
    if (format.color) {
      document.execCommand('foreColor', false, format.color);
    }
    if (format.fontSize) {
      // fontSize command uses 1-7 scale, so we use a span instead
      document.execCommand('fontSize', false, '7');
      // Find the font element and replace with styled span
      const fontElements = editorRef.current.querySelectorAll('font[size="7"]');
      fontElements.forEach(font => {
        const span = document.createElement('span');
        span.style.fontSize = `${format.fontSize}px`;
        span.innerHTML = font.innerHTML;
        font.parentNode?.replaceChild(span, font);
      });
    }
    
    // Trigger onChange to update the spans data
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const result = htmlToSpans(html, baseStyles);
      onChange(result.text, result.spans);
    }
  }, [baseStyles, onChange]);
  
  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus();
    },
    selectAll: () => {
      if (editorRef.current) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    },
    applyFormatToSelection,
    getSelection,
  }), [applyFormatToSelection, getSelection]);
  
  // Handle selection change
  const handleSelectionChangeInternal = useCallback(() => {
    const sel = getSelection();
    onSelectionChange?.(sel);
  }, [getSelection, onSelectionChange]);
  
  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={{
        // Apply base styles for proper font sizing
        fontFamily: baseStyles.fontFamily,
        fontSize: `${baseStyles.fontSize}px`,
        fontWeight: baseStyles.fontWeight,
        fontStyle: baseStyles.fontStyle,
        color: baseStyles.color,
        outline: 'none',
        whiteSpace: 'pre',
        minWidth: '20px',
        minHeight: '1em',
        ...style,
      }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onMouseUp={handleSelectionChangeInternal}
      onKeyUp={handleSelectionChangeInternal}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => {
        setIsComposing(false);
        handleInput();
      }}
    />
  );
});

RichTextEditor.displayName = 'RichTextEditor';
