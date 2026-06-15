// Polyfill `process` for browser environments.
// @babel/traverse and other Node.js-targeting packages reference process.env.NODE_ENV
// at module initialization time. Without this, they throw "process is not defined"
// when loaded in a browser bundle that doesn't include Node.js polyfills.
if (typeof globalThis !== 'undefined' && typeof (globalThis as Record<string, unknown>)['process'] === 'undefined') {
  (globalThis as Record<string, unknown>)['process'] = {
    env: { NODE_ENV: 'production' },
    browser: true,
    version: '',
    versions: {},
    nextTick: (fn: () => void, ...args: unknown[]) => setTimeout(() => fn(...(args as [])), 0),
    platform: 'browser',
    argv: [],
    cwd: () => '/',
  };
}
