import { registerPlugin } from '@capacitor/core';

export interface SafariDataPlugin {
  clearData(): Promise<{ success: boolean; message: string }>;
}

const SafariData = registerPlugin<SafariDataPlugin>('SafariDataPlugin', {
  web: () => ({
    clearData: async () => ({ 
      success: false, 
      message: 'Not available on web' 
    })
  })
});

export default SafariData;
