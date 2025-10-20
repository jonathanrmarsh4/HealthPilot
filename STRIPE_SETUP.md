# Stripe Payment Integration Setup Guide

This guide walks you through setting up Stripe for HealthPilot's subscription system in production.

## Overview

HealthPilot uses Stripe for:
- **Subscription Management**: Premium and Enterprise tier subscriptions
- **Payment Processing**: Monthly and annual billing cycles
- **Customer Portal**: Self-service payment method and subscription management
- **Promo Codes**: Marketing campaigns and referral discounts
- **Webhooks**: Real-time subscription status synchronization

## Prerequisites

- Stripe account (sign up at [stripe.com](https://stripe.com))
- Replit project with environment secrets configured
- Domain configured for production deployment

## Step 1: Configure Stripe Products and Prices

### Option A: Use Dynamic Pricing (Current Implementation)

The application currently uses `price_data` in checkout sessions, which creates prices dynamically. This works but is not recommended for production.

### Option B: Create Stripe Products (Recommended for Production)

1. **Log in to Stripe Dashboard** → Products → Create Product

2. **Create Premium Product**:
   - Product name: `HealthPilot Premium`
   - Description: `Unlimited AI chat, meal plans, biological age, and more`
   - Create two prices:
     - **Monthly**: $19.99 USD/month (recurring)
     - **Annual**: $191.88 USD/year (recurring) - 20% discount included

3. **Create Enterprise Product**:
   - Product name: `HealthPilot Enterprise`
   - Description: `Enterprise features with team management and custom integrations`
   - Create two prices:
     - **Monthly**: $99.99 USD/month (recurring)
     - **Annual**: $959.88 USD/year (recurring) - 20% discount included

4. **Copy Price IDs**: Save the price IDs (e.g., `price_...`) for configuration

## Step 2: Environment Variables

Add these secrets to your Replit project:

```env
STRIPE_SECRET_KEY=sk_live_... # Your Stripe secret key (LIVE for production)
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret (see Step 3)
```

### Getting Your API Keys

1. Go to Stripe Dashboard → Developers → API keys
2. Copy the **Secret key** (starts with `sk_live_` for production)
3. **Important**: Never commit API keys to version control!

## Step 3: Configure Webhooks

Webhooks notify your application when subscription events occur (payments, cancellations, etc.).

### Production Webhook Setup

1. **Go to Stripe Dashboard** → Developers → Webhooks → Add endpoint

2. **Configure Endpoint**:
   - **Endpoint URL**: `https://your-domain.replit.app/api/stripe/webhook`
   - **Description**: HealthPilot Production Webhook
   - **API Version**: 2024-11-20 (or latest)

3. **Select Events** to listen for:
   ```
   checkout.session.completed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.payment_succeeded
   invoice.payment_failed
   ```

4. **Copy Webhook Signing Secret**:
   - After creating the endpoint, reveal the "Signing secret"
   - It starts with `whsec_...`
   - Add it to your environment as `STRIPE_WEBHOOK_SECRET`

### Local Development Webhook Setup

For local testing, use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Copy the webhook signing secret shown in terminal
# Add it to your .env as STRIPE_WEBHOOK_SECRET
```

## Step 4: Enable Customer Portal

The Customer Portal allows users to manage their subscriptions and payment methods.

1. **Go to Stripe Dashboard** → Settings → Billing → Customer portal
2. **Configure Portal Settings**:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to view invoices
   - ✅ Allow customers to cancel subscriptions (with options)
   - ✅ Allow customers to update billing information
3. **Save Changes**

## Step 5: Test the Integration

### Test Checkout Flow

1. **Use Test Cards** (in test mode):
   ```
   Success: 4242 4242 4242 4242
   Decline: 4000 0000 0000 0002
   3D Secure: 4000 0025 0000 3155
   ```

2. **Test Scenarios**:
   - ✅ New subscription creation
   - ✅ Successful payment
   - ✅ Failed payment
   - ✅ Subscription cancellation
   - ✅ Subscription reactivation
   - ✅ Promo code application

### Verify Webhook Events

1. Complete a test checkout
2. Check Stripe Dashboard → Developers → Events
3. Verify events are being sent to your webhook endpoint
4. Check your application logs for webhook processing

## Step 6: Production Checklist

Before going live:

- [ ] Switch from test keys to live keys in production
- [ ] Configure production webhook endpoint
- [ ] Test live subscription creation with real card
- [ ] Verify webhook events are processed correctly
- [ ] Test customer portal access
- [ ] Test subscription cancellation flow
- [ ] Set up Stripe email notifications
- [ ] Configure tax collection (if required)
- [ ] Review Stripe compliance settings
- [ ] Set up fraud prevention rules

## Stripe Features Used

### Subscription Features
- **Trial Periods**: 7-day free trial on all subscriptions
- **Promo Codes**: Marketing campaigns with percentage discounts
- **Metadata**: User ID, tier, and billing cycle stored for tracking
- **Customer Portal**: Self-service subscription management

### Payment Features
- **Payment Methods**: Credit/debit cards
- **Billing Cycles**: Monthly and annual options
- **Automatic Retries**: Failed payments automatically retried
- **Invoice History**: Full payment history in customer portal

### Security Features
- **Webhook Signatures**: Cryptographic verification of webhook events
- **Idempotency**: Duplicate webhook handling prevented
- **PCI Compliance**: Stripe-hosted checkout (no PCI burden)

## Troubleshooting

### Webhooks Not Received

1. Check webhook endpoint URL is correct
2. Verify STRIPE_WEBHOOK_SECRET is set correctly
3. Check Stripe Dashboard → Developers → Webhooks for failed deliveries
4. Review application logs for webhook errors

### Subscription Not Updating

1. Verify webhook events are being received
2. Check database for subscription record
3. Review server logs for processing errors
4. Ensure Stripe customer ID is stored correctly

### Payment Failures

1. Check Stripe Dashboard for specific error
2. Verify card details are correct
3. Check for fraud prevention blocks
4. Review customer's billing information

## Support

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: Dashboard → Help
- **Application Logs**: Check server logs for detailed errors

## Security Best Practices

1. **Never expose secret keys**: Always use environment variables
2. **Verify webhook signatures**: Already implemented in code
3. **Use HTTPS**: Required for production webhooks
4. **Monitor failed payments**: Set up alerts in Stripe Dashboard
5. **Regular audits**: Review subscription status regularly
6. **Secure customer data**: Never log sensitive payment information

## Migration Notes

If you need to migrate from dynamic pricing to fixed Price IDs:

1. Create products and prices in Stripe Dashboard
2. Update checkout session creation in `server/routes.ts`:
   ```typescript
   // Replace price_data with price ID
   line_items: [{
     price: 'price_xxxxxxxxxxxxx', // Your Stripe Price ID
     quantity: 1,
   }]
   ```
3. Test thoroughly before deploying to production
4. Update webhook handling if needed

## Additional Resources

- [Stripe Billing Documentation](https://stripe.com/docs/billing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
- [Customer Portal Configuration](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
