import type { Meta, StoryObj } from '@storybook/react';
import RectAttributesPanel from '../components/RectAttributesPanel';
import { useState } from 'react';

const meta: Meta<typeof RectAttributesPanel> = {
  title: 'Panels/RectAttributesPanel',
  component: RectAttributesPanel,
  args: {},
};
export default meta;

type Story = StoryObj<typeof RectAttributesPanel>;

const Template = (args: any) => {
  const [rect, setRect] = useState<any>({ id: 'r1', type: 'rect', position: { x: 0, y: 0 }, size: { width: 120, height: 80 }, fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 4, opacity: 1, strokeDash: undefined });
  const [rawDash, setRawDash] = useState('');
  const updateRect = (patch: any) => setRect((r: any) => ({ ...r, ...patch }));
  return (
    <div style={{ width: 260 }}>
      <RectAttributesPanel
        rect={rect}
        lastFillById={{}}
        lastStrokeById={{}}
        setLastFillById={() => {}}
        setLastStrokeById={() => {}}
        updateRect={updateRect}
        rawDashInput={rawDash}
        setRawDashInput={setRawDash}
        beginRecentSession={() => {}}
        previewRecent={() => {}}
        commitRecent={() => {}}
        pushRecent={() => {}}
        recentColors={['#ffffff', '#334155', '#ef4444']}
        {...args}
      />
    </div>
  );
};

export const Default: Story = { render: Template };
export const Dashed: Story = { render: Template, args: { rect: { id: 'r1', type: 'rect', strokeDash: [4,4] } } };
export const NoFillStroke: Story = { render: Template, args: { rect: { id: 'r1', type: 'rect', fill: undefined, stroke: undefined } } };
