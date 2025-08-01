import type { Preview } from '@storybook/nextjs-vite';
import '../src/styles/global.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true, // Enable App Router support
    },
    docs: {
      toc: true, // Enable table of contents
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: false, // Disable color contrast check
          },
        ],
      },
    },
  },
  tags: ['autodocs'],
};

export default preview;
