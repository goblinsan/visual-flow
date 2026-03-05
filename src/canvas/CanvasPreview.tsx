/**
 * CanvasPreview — a read-only Konva-based render of a LayoutSpec.
 *
 * Used by FromKulrsPage so that the preview is byte-identical to what the
 * user will see when they open the design in the Vizail canvas editor.
 */
import { Stage, Layer } from 'react-konva';
import type { LayoutSpec } from '../layout-schema';
import { renderNode, useFontLoading } from './CanvasRenderer';

interface CanvasPreviewProps {
  spec: LayoutSpec;
  /** Width the preview should occupy in CSS pixels. The height is derived
   *  by preserving the aspect ratio of spec.root.size. */
  containerWidth: number;
}

export function CanvasPreview({ spec, containerWidth }: CanvasPreviewProps) {
  // Re-render when Google Fonts finish loading
  useFontLoading();

  const { width: canvasW, height: canvasH } = spec.root.size;
  const scale = containerWidth / canvasW;
  const displayH = Math.round(canvasH * scale);

  return (
    <Stage
      width={containerWidth}
      height={displayH}
      scaleX={scale}
      scaleY={scale}
      listening={false}
    >
      <Layer listening={false}>
        {renderNode(spec.root)}
      </Layer>
    </Stage>
  );
}
