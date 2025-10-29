import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nuvitae.healthpilot',
  appName: 'HealthPilot',
  webDir: 'dist/public',
  // server: {
  //   // DEVELOPMENT ONLY: Uncomment to load from Replit dev server
  //   androidScheme: 'https',
  //   hostname: '0d420476-b7bb-4cc4-9f5a-da35f5e473e4-00-1n1tyyvrb5uvz.pike.replit.dev',
  //   iosScheme: 'https'
  // },
  ios: {
    contentInset: 'always',
    scheme: 'healthpilot'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  },
  plugins: {
    App: {
      deepLinkingEnabled: true,
      customURLScheme: 'healthpilot',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
