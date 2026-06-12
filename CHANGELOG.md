# Change Log

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
