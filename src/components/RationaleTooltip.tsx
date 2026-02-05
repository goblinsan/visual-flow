/**
 * Tooltip displaying AI agent design rationale
 * Phase 4: Agent Collaboration
 */

import React from 'react';
import type { DesignRationale } from '../types/agent';

export interface RationaleTooltipProps {
  rationale: DesignRationale;
  position: { x: number; y: number };
  visible: boolean;
}

export function RationaleTooltip(props: RationaleTooltipProps): JSX.Element | null {
  const { rationale, position, visible } = props;

  if (!visible) return null;

  return (
    <div
      className="absolute z-50 max-w-xs pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg p-3 mb-2">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700">Agent Rationale</div>
            <div className="text-xs text-gray-500">{rationale.agentId}</div>
          </div>
        </div>

        <div className="text-sm text-gray-800 mb-2">{rationale.text}</div>

        <div className="text-xs text-gray-400">
          {new Date(rationale.timestamp).toLocaleString()}
        </div>

        {/* Arrow pointing down */}
        <div
          className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #3B82F6',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Container for displaying rationale tooltips on canvas
 */
export interface RationaleOverlayProps {
  rationales: Map<string, DesignRationale>;
  hoveredNodeId: string | null;
  getNodePosition: (nodeId: string) => { x: number; y: number } | null;
}

export function RationaleOverlay(props: RationaleOverlayProps): JSX.Element {
  const { rationales, hoveredNodeId, getNodePosition } = props;

  if (!hoveredNodeId || !rationales.has(hoveredNodeId)) {
    return <></>;
  }

  const rationale = rationales.get(hoveredNodeId)!;
  const position = getNodePosition(hoveredNodeId);

  if (!position) {
    return <></>;
  }

  return (
    <RationaleTooltip
      rationale={rationale}
      position={position}
      visible={true}
    />
  );
}
