# CS-MAST Docs — Developer Guide

This directory contains the Docusaurus documentation site for the CS-MAST library.

## Commands

```bash
npm install      # install deps
npm start        # dev server at http://localhost:3000
npm run build    # static build → build/
npm run serve    # serve the static build
```

## Structure

```
docs/
├── docs/                    # Markdown documentation pages
│   ├── intro.md             # Introduction (homepage)
│   ├── getting-started.md
│   ├── configuration.md
│   ├── signature-format.md
│   ├── scat-categories.md
│   ├── hash-formulas.md
│   ├── mutation-guard.md
│   ├── extending.md
│   ├── design-decisions.md  # Spec ambiguities A1-A11
│   └── api/
│       ├── index.md         # API overview
│       ├── cs-mast-init.md
│       ├── cs-mast-s-exists.md
│       ├── cs-mast-init-codebase.md
│       ├── signature-utils.md
│       ├── types.md
│       ├── errors.md
│       └── guard.md
├── src/css/custom.css       # Blue/indigo theme overrides
├── sidebars.ts              # Two sidebars: 'docs' and 'api'
└── docusaurus.config.ts     # Site config, navbar, footer
```

## Adding a Page

1. Create a `.md` file under `docs/docs/` (or `docs/docs/api/`)
2. Add frontmatter: `id`, `title`, `sidebar_position`
3. Add the `id` to the appropriate sidebar in `sidebars.ts`

## Navbar

Two top-level nav items: **Docs** (sidebar `docs`) and **API Reference** (sidebar `api`).
`routeBasePath: '/'` means the docs root is at `/` not `/docs/`.
