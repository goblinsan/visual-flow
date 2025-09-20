import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import CanvasStage from '../canvas/CanvasStage';
import type { LayoutSpec } from '../layout-schema';

const meta: Meta = {
  title: 'Interaction/TransformerMultiSelect',
};
export default meta;

type Story = StoryObj;

const buildSpec = (): LayoutSpec => ({
  root: {
    id: 'root',
    type: 'frame',
    size: { width: 800, height: 600 },
    background: '#ffffff',
    children: [
      { id: 'rect_a', type: 'rect', position: { x: 80, y: 120 }, size: { width: 140, height: 100 }, fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 4 },
      { id: 'rect_b', type: 'rect', position: { x: 280, y: 180 }, size: { width: 160, height: 140 }, fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 4 },
      { id: 'rect_c', type: 'rect', position: { x: 520, y: 140 }, size: { width: 120, height: 160 }, fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 4 },
    ],
  },
});

const Template = () => {
  const [spec, setSpec] = useState<LayoutSpec>(buildSpec());
  const [selection, setSelection] = useState<string[]>(['rect_a', 'rect_b']);
  return (
    <div style={{ width: 820, height: 620, border: '1px solid #e2e8f0' }}>
      <CanvasStage
        spec={spec}
        width={800}
        height={600}
        selection={selection}
        setSelection={setSelection}
        setSpec={setSpec}
        tool="select"
        rectDefaults={{ strokeWidth: 1, radius: 0, opacity: 1 }}
      />
      <p style={{ fontSize: 12, padding: '4px 8px', color: '#475569' }}>Drag handles to resize both rectangles; demonstrates multi-transform behavior.</p>
    </div>
  );
};

export const MultiSelect: Story = { render: Template };
