# Change Log

## 0.1.6 - 2026-06-18

### Changed

- Use Node.js built-in `crypto.createHash('sha256')` when running in Node.js for faster hashing; fall back to `@noble/hashes/sha256` in browser environments

## 0.1.5 - 2026-06-16

### Added

- Dynamically generated `robots.txt` and `sitemap.xml` in the docs site

## 0.1.4 - 2026-06-15

### Added

- Replace `node:crypto` with `@noble/hashes` for isomorphic SHA-256, making the library browser-compatible
- Interactive CS-MAST Playground at `/playground` in the docs site:
    - Monaco code editor (left) with live CS-MAST tree viewer (right)
    - Settings bar for `scat`, `sinc`, `lang`, `lver`, `prsr`, `sourceType`
    - Full 64-char hash shown per node; click hash copies PHC signature to clipboard
    - Cursor/text-selection in editor highlights the corresponding AST node
    - Inactive nodes (not in active scat/sinc) dimmed at 40% opacity
    - "Hide inactive nodes" toggle to filter tree to hashed nodes only

## 0.1.3 - 2026-06-12

### Changed

- Replace favicon with logo-derived ICO (16/32/48px) generated from cs-mast-logo-plain-bg.png
- Update Docusaurus navbar logo to use cs-mast-logo-plain-bg.png
- Add logo to README

## 0.1.2 - 2026-06-12

### Fixed

- Remove untrusted PR data from branch-checker CI comment body to prevent injection

## 0.1.1 - 2026-06-12

### Changed

- Fix CI workflows to use `GITHUB_TOKEN` instead of `DEPLOY_KEY` for prettier auto-commit and post-release merge (no `DEPLOY_KEY` secret required)

## 0.1.0 - 2026-06-12

### Added

- Initial release of `@shriyanss/cs-mast` — Context-Stratified Merkelized Abstract Syntax Tree reference TypeScript implementation
- `cs_mast_init()`, `cs_mast_s_exists()`, `cs_mast_init_codebase()` core API
- `BabelAdapter` — `IParserAdapter` backed by `@babel/parser` + `@babel/traverse`
- All 21 hash equations from the CS-MAST specification (§IV)
- `guardPath()` — Proxy-based mutation guard
- PHC-format signature utilities: `buildSignature()`, `parseSignature()`, `sanitizePrsr()`
- `sha256()` — thin Node.js crypto wrapper (64-char hex)
- Full TypeScript type exports and Jest test suite (13 tests)
