import { Group, Line, Circle } from "react-konva";
import type { CurveNode, LayoutSpec, FrameNode } from "../../layout-schema";
import { mapNode } from "../../commands/types";
import { getAnchors, computeDefaultHandles, enforceSmooth } from "../utils/bezierUtils";

interface CurveControlPointsLayerProps {
  curveNode: CurveNode;
  scale: number;
  selectedCurvePointIndex?: number | null;
  setSelectedCurvePointIndex?: (index: number | null) => void;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
}

/**
 * Renders interactive Bezier control handles for a curve in edit mode.
 *
 * Shows:
 * - Anchor circles (blue) at each curve point
 * - Tangent handle lines extending from anchors to control points (purple)
 * - Handle circles (small, draggable) that adjust the curve profile
 * - Double-click an anchor to toggle smooth/sharp
 */
export function CurveControlPointsLayer({
  curveNode,
  scale,
  selectedCurvePointIndex,
  setSelectedCurvePointIndex,
  setSpec,
}: CurveControlPointsLayerProps) {
  const curveX = curveNode.position?.x ?? 0;
  const curveY = curveNode.position?.y ?? 0;
  const pts = curveNode.points as number[];
  const anchors = getAnchors(pts);
  const numAnchors = anchors.length;

  // Resolve handles: use stored handles or compute defaults from tension
  const handles = curveNode.handles && curveNode.handles.length === (numAnchors - 1) * 4
    ? curveNode.handles
    : computeDefaultHandles(anchors, curveNode.tension ?? 0.5);

  // Per-anchor types: smooth means dragging one handle mirrors the other
  const anchorTypes = curveNode.anchorTypes ?? anchors.map(() => "smooth" as const);

  // Helper to update the curve node in the spec
  const updateCurve = (patch: Partial<CurveNode>) => {
    setSpec(prev => ({
      ...prev,
      root: mapNode<FrameNode>(prev.root, curveNode.id, (n) => {
        if (n.type !== 'curve') return n;
        return { ...n, ...patch };
      })
    }));
  };

  // Build handle rendering info
  // Each segment i between anchors[i] and anchors[i+1] has:
  //   out-handle of anchor[i]:   anchor[i] + (handles[i*4], handles[i*4+1])
  //   in-handle of anchor[i+1]:  anchor[i+1] + (handles[i*4+2], handles[i*4+3])
  type HandleInfo = {
    anchorIdx: number;
    isOut: boolean;
    x: number;
    y: number;
    anchorX: number;
    anchorY: number;
    handleArrayOffset: number;
  };

  const handleInfos: HandleInfo[] = [];
  for (let seg = 0; seg < numAnchors - 1; seg++) {
    const a1 = anchors[seg];
    const a2 = anchors[seg + 1];

    handleInfos.push({
      anchorIdx: seg,
      isOut: true,
      x: curveX + a1.x + handles[seg * 4],
      y: curveY + a1.y + handles[seg * 4 + 1],
      anchorX: curveX + a1.x,
      anchorY: curveY + a1.y,
      handleArrayOffset: seg * 4,
    });

    handleInfos.push({
      anchorIdx: seg + 1,
      isOut: false,
      x: curveX + a2.x + handles[seg * 4 + 2],
      y: curveY + a2.y + handles[seg * 4 + 3],
      anchorX: curveX + a2.x,
      anchorY: curveY + a2.y,
      handleArrayOffset: seg * 4 + 2,
    });
  }

  return (
    <Group listening={!curveNode.locked}>
      {/* Tangent handle lines (anchor → control point) */}
      {handleInfos.map((h, idx) => (
        <Line
          key={`handle-line-${curveNode.id}-${idx}`}
          points={[h.anchorX, h.anchorY, h.x, h.y]}
          stroke="rgba(168, 85, 247, 0.6)"
          strokeWidth={1 / scale}
          listening={false}
        />
      ))}

      {/* Handle circles (draggable Bezier control points) */}
      {handleInfos.map((h, idx) => (
        <Circle
          key={`handle-cp-${curveNode.id}-${idx}`}
          x={h.x}
          y={h.y}
          radius={4 / scale}
          fill="white"
          stroke="rgba(168, 85, 247, 0.9)"
          strokeWidth={1.5 / scale}
          draggable={!curveNode.locked}
          onDragMove={(e) => {
            const newDx = e.target.x() - curveX - anchors[h.anchorIdx].x;
            const newDy = e.target.y() - curveY - anchors[h.anchorIdx].y;

            let newHandles = [...handles];
            newHandles[h.handleArrayOffset] = newDx;
            newHandles[h.handleArrayOffset + 1] = newDy;

            // Apply smooth constraint if this anchor is smooth
            const aType = anchorTypes[h.anchorIdx] ?? "smooth";
            if (aType === "smooth") {
              newHandles = enforceSmooth(newHandles, h.anchorIdx, h.isOut, numAnchors);
            }

            updateCurve({ handles: newHandles });
          }}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'crosshair';
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'default';
          }}
        />
      ))}

      {/* Anchor circles (main curve points) */}
      {anchors.map((cp, idx) => {
        const absX = cp.x + curveX;
        const absY = cp.y + curveY;
        const isEndpoint = idx === 0 || idx === numAnchors - 1;
        const isSelected = selectedCurvePointIndex === idx;
        const aType = anchorTypes[idx] ?? "smooth";

        return (
          <Circle
            key={`curve-anchor-${curveNode.id}-${idx}`}
            x={absX}
            y={absY}
            radius={isSelected ? 7 / scale : (isEndpoint ? 6 / scale : 5 / scale)}
            fill={isSelected ? '#10b981' : (isEndpoint ? '#3b82f6' : 'white')}
            stroke={isSelected ? '#10b981' : '#3b82f6'}
            strokeWidth={isSelected ? 3 / scale : 2 / scale}
            draggable={!curveNode.locked}
            onClick={(e) => {
              e.cancelBubble = true;
              setSelectedCurvePointIndex?.(idx);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              setSelectedCurvePointIndex?.(idx);
            }}
            onDblClick={(e) => {
              e.cancelBubble = true;
              // Toggle smooth/sharp for this anchor
              const newTypes = [...anchorTypes];
              newTypes[idx] = aType === "smooth" ? "sharp" : "smooth";
              updateCurve({ anchorTypes: newTypes });
            }}
            onDragMove={(e) => {
              const newAnchorX = e.target.x() - curveX;
              const newAnchorY = e.target.y() - curveY;

              // Update anchor position in points
              const newPoints = [...pts];
              newPoints[idx * 2] = newAnchorX;
              newPoints[idx * 2 + 1] = newAnchorY;

              // Handles are offsets from anchor, so they automatically stay relative.
              updateCurve({ points: newPoints });
            }}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'move';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
          />
        );
      })}
    </Group>
  );
}
