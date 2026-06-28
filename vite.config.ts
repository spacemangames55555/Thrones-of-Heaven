import { defineConfig } from 'vite';

// Build identifier, resolved at build time: the commit short-hash when a CI/host
// provides it (Vercel, GitHub Actions, Netlify), otherwise an ISO timestamp.
// Injected as the global __BUILD_ID__ and logged once to the console on load
// (see src/airhorn/main.ts).
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.GITHUB_SHA?.slice(0, 7) ||
  process.env.COMMIT_REF?.slice(0, 7) ||
  new Date().toISOString();

// Static build -> ./dist, which Vercel serves with zero extra config.
export default defineConfig({
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
