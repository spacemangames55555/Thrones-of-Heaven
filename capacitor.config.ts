import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config. The web app builds to `dist/`, which Capacitor copies into
 * the native Android/iOS shells. See README ("Native builds") for the workflow:
 *   npm run build && npx cap add android && npx cap open android
 */
const config: CapacitorConfig = {
  appId: 'com.airhornhero.app',
  appName: 'Airhorn Hero',
  webDir: 'dist',
  backgroundColor: '#0a0e1aff',
  android: {
    backgroundColor: '#0a0e1aff',
  },
  ios: {
    backgroundColor: '#0a0e1aff',
    contentInset: 'never',
  },
};

export default config;
