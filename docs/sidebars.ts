import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'usage',
    {
      type: 'category',
      label: 'Next.js Project',
      collapsed: false,
      items: [
        'nextjs/project-structure',
        {
          type: 'category',
          label: 'JSON Schema Reference',
          collapsed: false,
          items: [
            'nextjs/schemas/overview',
            'nextjs/schemas/form-schema',
            'nextjs/schemas/summary-schema',
            'nextjs/schemas/task-list-schema',
            'nextjs/schemas/confirmation-schema',
            'nextjs/schemas/navigation-tokens',
            'nextjs/schemas/state-persistence',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Monorepo',
      collapsed: false,
      items: [
        'monorepo/overview',
        'monorepo/framework',
        'monorepo/components-library',
        'monorepo/journey-builder',
      ],
    },
    'mural-conventions',
  ],
};

export default sidebars;
