import fs from 'fs';
import path from 'path';
import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'CS-MAST',
  tagline: 'Context-Stratified Merkelized Abstract Syntax Tree — reference TypeScript implementation',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://cs-mast.ss0x00.com',
  baseUrl: '/',

  organizationName: 'shriyanss',
  projectName: 'cs-mast',

  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

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
          editUrl: 'https://github.com/shriyanss/cs-mast/tree/main/docs/',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    function cryptoFallbackPlugin() {
      return {
        name: 'crypto-fallback-plugin',
        // crypto is a Node.js built-in used only in the Node.js path of @shriyanss/cs-mast.
        // Tell the bundler not to provide a browser fallback — the isNode guard prevents
        // this code from ever executing in a browser context.
        configureWebpack() {
          return {
            resolve: {
              fallback: { crypto: false },
            },
          };
        },
      };
    },
    function csMastDevSourcePlugin() {
      return {
        name: 'cs-mast-dev-source-plugin',
        // In development (npm start), alias @shriyanss/cs-mast directly to the local
        // TypeScript source so edits to src/ are picked up immediately without a build step.
        // In production (npm run build), the alias is omitted and the published dist/ is used.
        configureWebpack() {
          if (process.env.NODE_ENV !== 'development') return {};
          return {
            resolve: {
              alias: {
                '@shriyanss/cs-mast': path.resolve(__dirname, '../src/index.ts'),
              },
            },
          };
        },
      };
    },
    function robotsTxtPlugin(context: { siteConfig: { url: string } }) {
      return {
        name: 'robots-txt-plugin',
        async postBuild({ outDir }: { outDir: string }) {
          const content = [
            'User-agent: *',
            'Allow: /',
            '',
            `Sitemap: ${context.siteConfig.url}/sitemap.xml`,
          ].join('\n');
          fs.writeFileSync(path.join(outDir, 'robots.txt'), content);
        },
      };
    },
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'CS-MAST',
      logo: {
        alt: 'CS-MAST Logo',
        src: 'img/cs-mast-logo-plain-bg.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docSidebar',
          sidebarId: 'api',
          position: 'left',
          label: 'API Reference',
        },
        {
          to: '/playground',
          label: 'Playground',
          position: 'left',
        },
        {
          href: 'https://github.com/shriyanss/cs-mast',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/getting-started' },
            { label: 'Configuration', to: '/configuration' },
            { label: 'Signature Format', to: '/signature-format' },
          ],
        },
        {
          title: 'API',
          items: [
            { label: 'cs_mast_init', to: '/api/cs-mast-init' },
            { label: 'cs_mast_s_exists', to: '/api/cs-mast-s-exists' },
            { label: 'Types', to: '/api/types' },
          ],
        },
        {
          title: 'More',
          items: [

            { label: 'GitHub', href: 'https://github.com/shriyanss/cs-mast' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Shriyans Sudhi. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['typescript', 'bash'],
    },
    algolia: undefined,
  } satisfies Preset.ThemeConfig,
};

export default config;
