import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

export interface StripePaymentPlugin {
  presentPaymentSheet(options: {
    clientSecret: string;
    merchantDisplayName: string;
    customerId: string;
    ephemeralKey: string;
  }): Promise<{ success: boolean; message: string }>;
  
  canMakeApplePayPayments(): Promise<{ available: boolean }>;
}

const StripePayment = registerPlugin<StripePaymentPlugin>('StripePayment', {
  web: () => ({
    async presentPaymentSheet() {
      throw new Error('presentPaymentSheet is only available on iOS');
    },
    async canMakeApplePayPayments() {
      return { available: false };
    },
  }),
});

export class StripePaymentService {
  private static instance: StripePaymentService;
  
  private constructor() {}
  
  static getInstance(): StripePaymentService {
    if (!StripePaymentService.instance) {
      StripePaymentService.instance = new StripePaymentService();
    }
    return StripePaymentService.instance;
  }
  
  /**
   * Check if Apple Pay is available on this device
   */
  async isApplePayAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return false;
    }
    
    try {
      const result = await StripePayment.canMakeApplePayPayments();
      return result.available;
    } catch (error) {
      console.error('Error checking Apple Pay availability:', error);
      return false;
    }
  }
  
  /**
   * Present the native Stripe payment sheet for iOS
   */
  async presentNativePayment(params: {
    clientSecret: string;
    customerId: string;
    ephemeralKey: string;
  }): Promise<{ success: boolean; message?: string }> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      throw new Error('Native payment is only available on iOS');
    }
    
    try {
      const result = await StripePayment.presentPaymentSheet({
        clientSecret: params.clientSecret,
        merchantDisplayName: 'HealthPilot',
        customerId: params.customerId,
        ephemeralKey: params.ephemeralKey,
      });
      
      return {
        success: result.success,
        message: result.message,
      };
    } catch (error: any) {
      console.error('Native payment error:', error);
      return {
        success: false,
        message: error.message || 'Payment failed',
      };
    }
  }
  
  /**
   * Determine payment platform (ios-native or web)
   */
  getPaymentPlatform(): 'ios-native' | 'web' {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
      ? 'ios-native'
      : 'web';
  }
}

export const stripePaymentService = StripePaymentService.getInstance();
