import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
  },
  // GovUK's bundled CSS contains an old `@media screen\0` IE hack that
  // LightningCSS (the Vite 8 default minifier) refuses to parse. Use
  // esbuild for CSS minification instead.
  viteFinal: async (cfg) => ({
    ...cfg,
    build: {
      ...cfg.build,
      cssMinify: 'esbuild' as const,
    },
  }),
};

export default config;
