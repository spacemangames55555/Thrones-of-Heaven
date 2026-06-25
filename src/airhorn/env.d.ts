// Ambient declarations so `tsc --noEmit` accepts the CSS side-effect import and
// the Vite-injected build constant. Vite resolves the real CSS at build time.
declare module '*.css';

declare const __BUILD_ID__: string;
