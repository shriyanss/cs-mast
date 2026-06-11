import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    { type: 'doc', id: 'intro',             label: 'Introduction' },
    { type: 'doc', id: 'getting-started',   label: 'Getting Started' },
    { type: 'doc', id: 'configuration',     label: 'Configuration' },
    { type: 'doc', id: 'signature-format',  label: 'Signature Format' },
    { type: 'doc', id: 'scat-categories',   label: 'scat Categories' },
    { type: 'doc', id: 'hash-formulas',     label: 'Hash Formulas' },
    { type: 'doc', id: 'mutation-guard',    label: 'Mutation Guard' },
    { type: 'doc', id: 'extending',         label: 'Writing an Adapter' },
    { type: 'doc', id: 'design-decisions',  label: 'Design Decisions (A1–A11)' },
  ],

  api: [
    {
      type: 'category',
      label: 'API Reference',
      collapsible: false,
      items: [
        'api/index',
        'api/cs-mast-init',
        'api/cs-mast-s-exists',
        'api/cs-mast-init-codebase',
        'api/signature-utils',
        'api/types',
        'api/errors',
        'api/guard',
      ],
    },
  ],
};

export default sidebars;
