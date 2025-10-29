# iOS Native Apple Pay Setup Guide

This guide will help you complete the iOS native Apple Pay integration on your Mac with Xcode.

## Prerequisites
- Mac with Xcode installed
- HealthPilot iOS app project cloned to your Mac
- Stripe account with STRIPE_SECRET_KEY configured in Replit
- Apple Developer account

## Step 1: Install CocoaPods Dependencies

Navigate to the iOS app directory and install dependencies:

```bash
cd ios/App
pod install
```

This will install:
- Stripe Payment Sheet SDK (version 23.0)
- All existing Capacitor plugins

## Step 2: Configure Apple Pay in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select your app's **Identifier** (com.nuvitae.healthpilot)
4. Enable **Apple Pay** capability
5. Create a **Merchant ID**:
   - Format: `merchant.com.nuvitae.healthpilot`
   - Display Name: "HealthPilot"
6. Save your changes

## Step 3: Configure Xcode Project

1. Open `ios/App/App.xcworkspace` in Xcode (NOT .xcodeproj)
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. Add **Apple Pay** capability if not already present
5. Select your Merchant ID: `merchant.com.nuvitae.healthpilot`
6. Ensure your provisioning profile includes Apple Pay

## Step 4: Verify Plugin Registration

The following files should already be present in your project:

- `ios/App/App/StripePaymentPlugin.swift` - Native plugin implementation
- `ios/App/App/StripePaymentPlugin.m` - Objective-C bridge
- `ios/App/App/capacitor.config.json` - Plugin registration (includes "StripePaymentPlugin")

If Xcode shows these files in red, right-click the App folder → Add Files to "App" → Select the missing files.

## Step 5: Configure Info.plist (if needed)

Your Info.plist should already have basic configuration. No additional entries are required for Stripe.

## Step 6: Build and Test

1. Clean build folder: **Product → Clean Build Folder**
2. Build the app: **Product → Build** (⌘B)
3. Run on a physical device (Apple Pay doesn't work in simulator)
4. Test the payment flow:
   - Navigate to Profile → Billing tab
   - Click "Upgrade Now" or "Start 7-Day Free Trial"
   - The native Apple Pay sheet should appear
   - Complete payment with Apple Pay

## Troubleshooting

### Build Errors

**Error: "No such module 'StripePaymentSheet'"**
- Solution: Run `pod install` and ensure you're opening `.xcworkspace` not `.xcodeproj`

**Error: Plugin not found**
- Solution: Verify `packageClassList` in `capacitor.config.json` includes "StripePaymentPlugin"
- Clean and rebuild the project

### Runtime Errors

**Apple Pay not available**
- Ensure you're testing on a physical device (not simulator)
- Verify Apple Pay is configured in Settings → Wallet & Apple Pay
- Check that Merchant ID is correctly configured

**Payment Intent creation fails**
- Verify STRIPE_SECRET_KEY is set in Replit environment
- Check backend logs for API errors
- Ensure user is authenticated

## Payment Flow Architecture

### iOS Native Flow:
1. User clicks "Upgrade Now" → CheckoutModal opens
2. Frontend calls `/api/payments/create-intent` → Creates PaymentIntent + Ephemeral Key
3. Native plugin presents Stripe PaymentSheet with Apple Pay
4. User authenticates with Face ID/Touch ID
5. Payment completes → Frontend calls `/api/payments/confirm-subscription`
6. Backend creates Stripe subscription and updates user tier
7. User sees "Subscription activated!" message

**Technical Details:**
- Backend creates both PaymentIntent and Customer Ephemeral Key
- Ephemeral key allows PaymentSheet to access customer's saved payment methods
- Client secret and ephemeral key are passed to native plugin
- PaymentSheet securely handles payment without exposing sensitive data

### Web Flow (Safari):
1. User clicks "Upgrade Now" → CheckoutModal opens  
2. Frontend calls `/api/stripe/create-checkout` → Creates Checkout Session
3. Redirects to Stripe Hosted Checkout
4. Stripe webhook confirms payment
5. User redirected back to app with success message

## Features Supported

✅ Apple Pay (iOS native)
✅ Credit/Debit cards (web and iOS)
✅ Promo code validation and application
✅ Monthly and annual billing cycles
✅ 7-day free trial
✅ Automatic subscription activation
✅ 20% annual discount built-in

## Security Notes

- Payment secrets are handled server-side only
- Client secrets are ephemeral and single-use
- Apple Pay uses device biometric authentication
- IDOR protection ensures users can only access their own payments
- All API endpoints require authentication

## Support

If you encounter issues:
1. Check Xcode console for error messages
2. Review backend logs in Replit
3. Verify Stripe dashboard for payment intents
4. Ensure all environment variables are set

---

**Last Updated:** October 2024
**Plugin Version:** StripePaymentPlugin v1.0
**Stripe SDK Version:** 23.0
