import type { TextSpan } from "../layout-schema";
import { RichTextEditor, type RichTextEditorHandle } from "../components/RichTextEditor";
import { TextEditToolbar } from "../components/TextEditToolbar";

interface TextEditingOverlayProps {
  visible: boolean;
  editingTextValue: string;
  editingTextSpans: TextSpan[];
  baseStyles: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    color: string;
  };
  textEditStyle: React.CSSProperties | null;
  textSelection: { start: number; end: number } | null;
  toolbarAnchorPosition: { x: number; y: number };
  richTextEditorRef: React.RefObject<RichTextEditorHandle> | React.MutableRefObject<RichTextEditorHandle | null>;
  onChange: (text: string, spans: TextSpan[]) => void;
  onCommit: () => void;
  onCancel: () => void;
  onSelectionChange: (sel: { start: number; end: number } | null) => void;
  onApplyFormat: (format: Partial<TextSpan>) => void;
}

export function TextEditingOverlay({
  visible,
  editingTextValue,
  editingTextSpans,
  baseStyles,
  textEditStyle,
  textSelection,
  toolbarAnchorPosition,
  richTextEditorRef,
  onChange,
  onCommit,
  onCancel,
  onSelectionChange,
  onApplyFormat,
}: TextEditingOverlayProps) {
  if (!visible) return null;

  const handleFormatShortcut = (format: 'bold' | 'italic') => {
    if (!richTextEditorRef.current) return;
    const sel = richTextEditorRef.current.getSelection();
    if (!sel || sel.start === sel.end) return;
    
    if (format === 'bold') {
      richTextEditorRef.current.applyFormatToSelection({ fontWeight: 'bold' });
    } else if (format === 'italic') {
      richTextEditorRef.current.applyFormatToSelection({ fontStyle: 'italic' });
    }
  };

  return (
    <>
      {/* Fixed toolbar above text */}
      <TextEditToolbar
        visible={!!(textSelection && textSelection.start !== textSelection.end)}
        anchorPosition={toolbarAnchorPosition}
        hasSelection={!!(textSelection && textSelection.start !== textSelection.end)}
        currentFormat={undefined}
        onApplyFormat={onApplyFormat}
      />
      <RichTextEditor
        ref={richTextEditorRef}
        autoFocus
        commitOnBlur={false}
        value={editingTextValue}
        spans={editingTextSpans}
        baseStyles={baseStyles}
        onChange={onChange}
        onCommit={onCommit}
        onCancel={onCancel}
        onSelectionChange={onSelectionChange}
        onFormatShortcut={handleFormatShortcut}
        style={textEditStyle || undefined}
        className="focus:outline-none selection:bg-blue-200"
      />
    </>
  );
}
