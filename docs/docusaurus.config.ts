import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'TelePortal GDS',
  tagline: 'Schema-driven GovUK Design System component library for Next.js',
  url: 'https://teleportal-gds.example',
  baseUrl: '/',
  organizationName: 'cloudthing',
  projectName: 'teleportal-gds',
  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'TelePortal GDS',
      items: [
        { to: '/', label: 'Introduction', position: 'left', activeBaseRegex: '^/$' },
        { to: '/usage', label: 'Usage', position: 'left' },
        {
          to: '/schema-reference',
          label: 'Schema Reference',
          position: 'left',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Cloudthing.`,
    },
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
