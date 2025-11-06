import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nuvitae.healthpilot',
  appName: 'HealthPilot',
  webDir: 'dist/public',
  // PRODUCTION: Live reload disabled - app uses bundled assets
  // Uncomment server block below only for live reload during development
  // server: {
  //   url: 'https://0d420476-b7bb-4cc4-9f5a-da35f5e473e4-00-1n1tyyvrb5uvz.pike.replit.dev',
  //   cleartext: true
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
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#E58AC9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#FFFFFF',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#E58AC9',
      overlay: true
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
