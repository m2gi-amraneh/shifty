import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'app',
  webDir: 'www',
  plugins: {
    Firebase: {
      android: {
        googleServicesFile: './google-services.json',
      },
    },
  },
};

export default config;
