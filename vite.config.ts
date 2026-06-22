import { defineConfig } from 'vite';

// Static build -> ./dist, which Vercel serves with zero extra config.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
