/**
 * Airhorn Hero — entry point.
 *
 * Mounts the app into #app and registers the service worker so the game is
 * installable and works offline on Android and iOS home screens.
 */
import { App } from './ui';

const root = document.getElementById('app');
if (root) {
  new App(root);
  console.log('Airhorn Hero build:', __BUILD_ID__);
}

// Register the service worker (skipped on the dev server, where it isn't built).
const isProd = (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD;
if ('serviceWorker' in navigator && isProd) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is best-effort */
    });
  });
}
