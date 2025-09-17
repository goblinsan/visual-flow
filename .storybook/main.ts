import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // Only include canonical canvas stories
  stories: [
    "../src/Canvas.stories.@(tsx|mdx)",
    "../src/CanvasGrid.stories.@(tsx|mdx)",
    "../src/CanvasImage.stories.@(tsx|mdx)",
    "../src/CanvasStage.stories.@(tsx|mdx)",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
};

export default config;
