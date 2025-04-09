import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'app',
  webDir: 'www',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '385822540976-kv23e5j31effa2mgnn349tsto0tbojmc.apps.googleusercontent.com',

      forceCodeForRefreshToken: true,
    },
    FacebookLogin: {
      appId: '1907280960089941',

    },
    Firebase: {
      android: {
        googleServicesFile: './google-services.json',
      },
    },
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
