import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drift.app',
  appName: 'Drift',
  webDir: 'out',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    backgroundColor: '#15151b',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#e07a3a',
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
