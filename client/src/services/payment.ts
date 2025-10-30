import { apiRequest } from '@/lib/queryClient';
import { stripePaymentService } from './stripe-payment';
import { Capacitor } from '@capacitor/core';

export type SubscriptionTier = 'premium' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface PaymentOptions {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  promoCode?: string;
}

export interface PaymentResult {
  success: boolean;
  message?: string;
  error?: string;
  subscriptionId?: string;
  tier?: SubscriptionTier;
}

export class PaymentService {
  private static instance: PaymentService;
  
  private constructor() {}
  
  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }
  
  /**
   * Check if this is an iOS native environment
   */
  private isIOSNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }
  
  /**
   * Initiate payment flow - routes to iOS native or web checkout
   */
  async initiatePayment(options: PaymentOptions): Promise<PaymentResult> {
    if (this.isIOSNative()) {
      return this.initiateIOSPayment(options);
    } else {
      return this.initiateWebCheckout(options);
    }
  }
  
  /**
   * iOS native payment flow using Stripe SDK
   */
  private async initiateIOSPayment(options: PaymentOptions): Promise<PaymentResult> {
    try {
      // Step 1: Create payment intent on backend
      const intentResponse = await apiRequest<{
        clientSecret: string;
        ephemeralKey: string;
        amount: number;
        currency: string;
        customerId: string;
        discountApplied: boolean;
        discountAmount: number;
      }>('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: options.tier,
          billingCycle: options.billingCycle,
          promoCode: options.promoCode,
        }),
      });
      
      // Step 2: Present native payment sheet
      const paymentResult = await stripePaymentService.presentNativePayment({
        clientSecret: intentResponse.clientSecret,
        customerId: intentResponse.customerId,
        ephemeralKey: intentResponse.ephemeralKey,
      });
      
      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.message || 'Payment failed',
        };
      }
      
      // Step 3: Confirm subscription on backend
      // Extract payment intent ID from client secret
      const paymentIntentId = intentResponse.clientSecret.split('_secret_')[0];
      
      const confirmResponse = await apiRequest<{
        success: boolean;
        subscriptionId: string;
        tier: SubscriptionTier;
      }>('/api/payments/confirm-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
        }),
      });
      
      return {
        success: confirmResponse.success,
        subscriptionId: confirmResponse.subscriptionId,
        tier: confirmResponse.tier,
        message: 'Subscription activated successfully!',
      };
    } catch (error: any) {
      console.error('iOS payment error:', error);
      return {
        success: false,
        error: error.message || 'Payment failed. Please try again.',
      };
    }
  }
  
  /**
   * Web checkout flow using Stripe Checkout Sessions
   */
  private async initiateWebCheckout(options: PaymentOptions): Promise<PaymentResult> {
    try {
      const response = await apiRequest<{ sessionUrl: string }>('/api/stripe/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          tier: options.tier,
          billingCycle: options.billingCycle,
          promoCode: options.promoCode,
        }),
      });
      
      // Redirect to Stripe Checkout
      window.location.href = response.sessionUrl;
      
      return {
        success: true,
        message: 'Redirecting to checkout...',
      };
    } catch (error: any) {
      console.error('Web checkout error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create checkout session',
      };
    }
  }
  
  /**
   * Check if Apple Pay is available
   */
  async isApplePayAvailable(): Promise<boolean> {
    if (this.isIOSNative()) {
      return await stripePaymentService.isApplePayAvailable();
    }
    
    // Check if Apple Pay is available in web browser (Safari)
    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get payment platform description for UI
   */
  getPaymentPlatform(): string {
    if (this.isIOSNative()) {
      return 'Apple Pay';
    }
    
    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      return 'Apple Pay or Card';
    }
    
    return 'Credit Card';
  }
  
  /**
   * Calculate pricing with discounts
   */
  calculatePrice(tier: SubscriptionTier, billingCycle: BillingCycle, discountPercent?: number): {
    basePrice: number;
    discountAmount: number;
    finalPrice: number;
    savingsPercent?: number;
  } {
    const pricing = {
      premium: {
        monthly: 19.99,
        annual: 191.88, // 20% off ($239.88)
      },
      enterprise: {
        monthly: 99.99,
        annual: 959.88, // 20% off ($1199.88)
      },
    };
    
    const basePrice = pricing[tier][billingCycle];
    let savingsPercent: number | undefined;
    
    // Calculate annual discount
    if (billingCycle === 'annual') {
      const monthlyEquivalent = pricing[tier].monthly * 12;
      savingsPercent = Math.round(((monthlyEquivalent - basePrice) / monthlyEquivalent) * 100);
    }
    
    // Apply promo code discount
    const discountAmount = discountPercent ? (basePrice * discountPercent) / 100 : 0;
    const finalPrice = basePrice - discountAmount;
    
    return {
      basePrice,
      discountAmount,
      finalPrice,
      savingsPercent,
    };
  }
}

export const paymentService = PaymentService.getInstance();
