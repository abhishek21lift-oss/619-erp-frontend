import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myptstudio.erp',
  appName: '619 ERP',
  webDir: 'www',
  server: {
    url: 'https://myptstudio.com',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
