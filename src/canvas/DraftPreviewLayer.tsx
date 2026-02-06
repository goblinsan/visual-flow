import { Rect, Ellipse, Line } from "react-konva";

interface DraftState {
  start: { x: number; y: number };
  current: { x: number; y: number };
}

interface CurveDraftState {
  points: { x: number; y: number }[];
  current: { x: number; y: number };
}

interface DraftPreviewLayerProps {
  isRectMode: boolean;
  isEllipseMode: boolean;
  isLineMode: boolean;
  isCurveMode: boolean;
  rectDraft: DraftState | null;
  ellipseDraft: DraftState | null;
  lineDraft: DraftState | null;
  curveDraft: CurveDraftState | null;
  altPressed: boolean;
  shiftPressed: boolean;
}

export function DraftPreviewLayer({
  isRectMode,
  isEllipseMode,
  isLineMode,
  isCurveMode,
  rectDraft,
  ellipseDraft,
  lineDraft,
  curveDraft,
  altPressed,
  shiftPressed,
}: DraftPreviewLayerProps) {
  return (
    <>
      {/* Rectangle draft preview */}
      {isRectMode && rectDraft && (() => {
        const { start, current } = rectDraft;
        let x = start.x; let y = start.y; let w = current.x - start.x; let h = current.y - start.y;
        const alt = altPressed; const shift = shiftPressed;
        if (alt) {
          w = (current.x - start.x) * 2;
          h = (current.y - start.y) * 2;
        }
        if (shift) {
          const m = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w || 1) * m;
          h = Math.sign(h || 1) * m;
        }
        if (alt) {
          x = start.x - Math.abs(w)/2;
          y = start.y - Math.abs(h)/2;
          w = Math.abs(w); h = Math.abs(h);
        } else {
          if (w < 0) { x = x + w; w = Math.abs(w);} 
          if (h < 0) { y = y + h; h = Math.abs(h);} 
        }
        return (
          <Rect
            x={x}
            y={y}
            width={Math.max(1, w)}
            height={Math.max(1, h)}
            fill={'rgba(255,255,255,0.35)'}
            stroke={'#334155'}
            strokeWidth={1}
            dash={[6,4]}
            listening={false}
          />
        );
      })()}
      
      {/* Ellipse draft preview */}
      {isEllipseMode && ellipseDraft && (() => {
        const { start, current } = ellipseDraft;
        let x = start.x; let y = start.y; let w = current.x - start.x; let h = current.y - start.y;
        const alt = altPressed; const shift = shiftPressed;
        if (alt) {
          w = (current.x - start.x) * 2;
          h = (current.y - start.y) * 2;
        }
        if (shift) {
          const m = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w || 1) * m;
          h = Math.sign(h || 1) * m;
        }
        if (alt) {
          x = start.x - Math.abs(w)/2;
          y = start.y - Math.abs(h)/2;
          w = Math.abs(w); h = Math.abs(h);
        } else {
          if (w < 0) { x = x + w; w = Math.abs(w);} 
          if (h < 0) { y = y + h; h = Math.abs(h);} 
        }
        const radiusX = Math.max(1, w) / 2;
        const radiusY = Math.max(1, h) / 2;
        return (
          <Ellipse
            x={x + radiusX}
            y={y + radiusY}
            radiusX={radiusX}
            radiusY={radiusY}
            fill={'rgba(255,255,255,0.35)'}
            stroke={'#334155'}
            strokeWidth={1}
            dash={[6,4]}
            listening={false}
          />
        );
      })()}
      
      {/* Line draft preview */}
      {isLineMode && lineDraft && (() => {
        const { start, current } = lineDraft;
        return (
          <Line
            points={[start.x, start.y, current.x, current.y]}
            stroke={'#334155'}
            strokeWidth={2}
            dash={[6,4]}
            lineCap="round"
            listening={false}
          />
        );
      })()}
      
      {/* Curve draft preview */}
      {isCurveMode && curveDraft && curveDraft.points.length >= 1 && (() => {
        const pts: number[] = [];
        for (const p of curveDraft.points) {
          pts.push(p.x, p.y);
        }
        pts.push(curveDraft.current.x, curveDraft.current.y);
        return (
          <Line
            points={pts}
            stroke={'#334155'}
            strokeWidth={2}
            dash={[6,4]}
            lineCap="round"
            tension={0.5}
            listening={false}
          />
        );
      })()}
    </>
  );
}
