import type { Meta, StoryObj } from '@storybook/react';
import DefaultsPanel from '../components/DefaultsPanel';
import { useState } from 'react';

const meta: Meta<typeof DefaultsPanel> = {
  title: 'Panels/DefaultsPanel',
  component: DefaultsPanel,
};
export default meta;

type Story = StoryObj<typeof DefaultsPanel>;

const Template = (args: any) => {
  const [defaults, setDefaults] = useState<any>({ fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 4, opacity: 1 });
  return (
    <div style={{ width: 300 }}>
      <DefaultsPanel
        defaults={defaults}
        updateDefaults={(patch: any) => setDefaults((d: any) => ({ ...d, ...patch }))}
        beginRecentSession={() => {}}
        previewRecent={() => {}}
        commitRecent={() => {}}
        recentColors={['#ffffff', '#334155', '#ef4444']}
        {...args}
      />
    </div>
  );
};

export const Default: Story = { render: Template };
export const Dashed: Story = { render: Template, args: { defaults: { fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 4, opacity: 1, strokeDash: [4,4] } } };
