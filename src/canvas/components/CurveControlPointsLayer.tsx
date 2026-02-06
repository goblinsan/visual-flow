import { Group, Line, Circle } from "react-konva";
import type { CurveNode, LayoutSpec, FrameNode } from "../../layout-schema";
import { mapNode } from "../../commands/types";

interface CurveControlPointsLayerProps {
  curveNode: CurveNode;
  scale: number;
  selectedCurvePointIndex?: number | null;
  setSelectedCurvePointIndex?: (index: number | null) => void;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
}

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
  
  // Extract control points from the points array
  // points are stored as [x1, y1, x2, y2, x3, y3, ...] pairs
  const controlPoints: Array<{ x: number; y: number; index: number }> = [];
  for (let i = 0; i < pts.length; i += 2) {
    controlPoints.push({ x: pts[i] + curveX, y: pts[i + 1] + curveY, index: i });
  }
  
  return (
    <Group listening={!curveNode.locked}>
      {/* Lines connecting control points */}
      {controlPoints.length >= 2 && controlPoints.map((cp, idx) => {
        if (idx === controlPoints.length - 1) return null;
        const next = controlPoints[idx + 1];
        return (
          <Line
            key={`curve-line-${curveNode.id}-${idx}`}
            points={[cp.x, cp.y, next.x, next.y]}
            stroke="rgba(59, 130, 246, 0.5)"
            strokeWidth={1 / scale}
            dash={[4 / scale, 4 / scale]}
            listening={false}
          />
        );
      })}
      {/* Control point circles */}
      {controlPoints.map((cp, idx) => {
        const isEndpoint = idx === 0 || idx === controlPoints.length - 1;
        const isSelected = selectedCurvePointIndex === idx;
        return (
          <Circle
            key={`curve-handle-${curveNode.id}-${idx}`}
            x={cp.x}
            y={cp.y}
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
            onDragMove={(e) => {
              const newX = e.target.x() - curveX;
              const newY = e.target.y() - curveY;
              
              // Update the curve points
              const newPoints = [...pts];
              newPoints[cp.index] = newX;
              newPoints[cp.index + 1] = newY;
              
              setSpec(prev => ({
                ...prev,
                root: mapNode<FrameNode>(prev.root, curveNode.id, (n) => {
                  if (n.type !== 'curve') return n;
                  return { ...n, points: newPoints };
                })
              }));
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
