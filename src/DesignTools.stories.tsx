import type { Meta, StoryObj } from '@storybook/react';
import { Renderer } from '../renderer/Renderer';
import type { RootSpec } from '../dsl';

const meta: Meta<typeof Renderer> = {
  title: 'Components/Design Tools',
  component: Renderer,
};

export default meta;
type Story = StoryObj<typeof Renderer>;

// Accordion example
export const AccordionExample: Story = {
  args: {
    spec: {
      background: 'white',
      padding: 4,
      body: {
        type: 'accordion',
        allowMultiple: false,
        items: [
          {
            title: 'What is Material Design?',
            content: {
              type: 'text',
              text: 'Material Design is a design system created by Google to help teams build high-quality digital experiences.',
              variant: 'body',
            },
            defaultExpanded: true,
          },
          {
            title: 'Key Principles',
            content: {
              type: 'stack',
              direction: 'vertical',
              gap: 2,
              children: [
                { type: 'text', text: '• Material is the metaphor', variant: 'body' },
                { type: 'text', text: '• Bold, graphic, intentional', variant: 'body' },
                { type: 'text', text: '• Motion provides meaning', variant: 'body' },
              ],
            },
          },
          {
            title: 'Components Available',
            content: {
              type: 'text',
              text: 'Buttons, Cards, Dialogs, Navigation, and many more...',
              variant: 'body',
            },
          },
        ],
      } as any,
    } as RootSpec,
  },
};

// Carousel example
export const CarouselExample: Story = {
  args: {
    spec: {
      background: 'slate',
      padding: 4,
      body: {
        type: 'carousel',
        showDots: true,
        showArrows: true,
        items: [
          {
            type: 'box',
            variant: 'card',
            padding: 6,
            children: [
              { type: 'text', text: 'Slide 1', variant: 'h2' },
              { type: 'text', text: 'Welcome to our component carousel', variant: 'body' },
            ],
          },
          {
            type: 'box',
            variant: 'card',
            padding: 6,
            children: [
              { type: 'text', text: 'Slide 2', variant: 'h2' },
              { type: 'text', text: 'Explore Material Design components', variant: 'body' },
            ],
          },
          {
            type: 'box',
            variant: 'card',
            padding: 6,
            children: [
              { type: 'text', text: 'Slide 3', variant: 'h2' },
              { type: 'text', text: 'Build beautiful interfaces', variant: 'body' },
            ],
          },
        ],
      } as any,
    } as RootSpec,
  },
};

// Combined example
export const CombinedExample: Story = {
  args: {
    spec: {
      background: 'white',
      padding: 4,
      body: {
        type: 'stack',
        direction: 'vertical',
        gap: 4,
        children: [
          { type: 'text', text: 'Material Design Components', variant: 'h1' },
          { type: 'text', text: 'Examples of Accordion and Carousel components', variant: 'caption' },
          {
            type: 'grid',
            columns: 2,
            gap: 4,
            children: [
              {
                type: 'box',
                variant: 'card',
                padding: 4,
                children: [
                  { type: 'text', text: 'Accordion', variant: 'h3' },
                  {
                    type: 'accordion',
                    items: [
                      { title: 'Section 1', content: { type: 'text', text: 'Content 1', variant: 'body' } },
                      { title: 'Section 2', content: { type: 'text', text: 'Content 2', variant: 'body' } },
                    ],
                  } as any,
                ],
              },
              {
                type: 'box',
                variant: 'card',
                padding: 4,
                children: [
                  { type: 'text', text: 'Carousel', variant: 'h3' },
                  {
                    type: 'carousel',
                    showDots: true,
                    items: [
                      { type: 'box', variant: 'plain', padding: 3, children: [{ type: 'text', text: '📱 Card 1', variant: 'body' }] },
                      { type: 'box', variant: 'plain', padding: 3, children: [{ type: 'text', text: '🎨 Card 2', variant: 'body' }] },
                      { type: 'box', variant: 'plain', padding: 3, children: [{ type: 'text', text: '✨ Card 3', variant: 'body' }] },
                    ],
                  } as any,
                ],
              },
            ],
          },
        ],
      },
    } as RootSpec,
  },
};
