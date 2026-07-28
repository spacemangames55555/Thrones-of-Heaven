import { defineConfig } from 'vite';

// Build identifier, resolved at build time: the commit short-hash when a CI/host
// provides it (Vercel, GitHub Actions, Netlify), otherwise an ISO timestamp.
// Injected as the global __BUILD_ID__ and logged once to the console on load
// (see src/main.ts) — there is no on-screen build overlay anymore.
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.GITHUB_SHA?.slice(0, 7) ||
  process.env.COMMIT_REF?.slice(0, 7) ||
  new Date().toISOString();

const buildTime = new Date().toISOString();

// Static build -> ./dist, which Vercel serves with zero extra config.
export default defineConfig({
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    {
      // PWA UPDATE BEACON (Pass 6B addendum): a service worker whose ONLY job
      // is deploy detection — no fetch handler, no caching, nothing to go
      // stale. The baked build id makes each deploy's sw.js byte-different,
      // which is what makes the browser surface a WAITING worker; the client
      // shows the "Update ready" toast and activates it on tap (pwa-update.ts).
      name: 'toh-sw-beacon',
      generateBundle(): void {
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source:
            `/* ToH update beacon — build ${buildId} @ ${buildTime} */\n` +
            `self.addEventListener('install', () => { /* stay WAITING until the toast tap */ });\n` +
            `self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });\n`,
        });
      },
    },
  ],
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
