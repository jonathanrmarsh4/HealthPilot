# Apple Pay Setup Guide for HealthPilot

Complete step-by-step instructions for configuring Apple Pay in the Apple Developer Portal.

---

## Prerequisites

✅ **Apple Developer Account** (Account Holder or Admin role)  
✅ **Active Apple Developer Program membership** ($99/year)  
✅ **Mac computer** (for generating certificates)

---

## Part 1: Create Merchant ID (15 minutes)

### Step 1: Navigate to Developer Portal

1. Open your browser and go to: https://developer.apple.com/account/
2. Sign in with your Apple ID
3. Click **"Certificates, Identifiers & Profiles"** in the sidebar

### Step 2: Access Merchant IDs Section

1. In the left sidebar, click **"Identifiers"**
2. At the top of the page, use the dropdown filter (next to the ➕ button)
3. Select **"Merchant IDs"** from the dropdown

### Step 3: Create New Merchant ID

1. Click the **➕ (plus button)** in the top-left corner
2. Select **"Merchant IDs"** from the list
3. Click **"Continue"**

### Step 4: Configure Merchant ID

Fill in the form:

- **Description:** `HealthPilot Apple Pay`
- **Identifier:** `merchant.com.nuvitae.healthpilot`

> ⚠️ **Important:** The identifier must be EXACTLY `merchant.com.nuvitae.healthpilot` (this matches your code)

4. Click **"Continue"**
5. Review your settings
6. Click **"Register"**
7. Click **"Done"**

✅ **Success!** Your Merchant ID is now created. It never expires and can be reused across apps.

---

## Part 2: Create Payment Processing Certificate (10 minutes)

This certificate allows Apple Pay to securely encrypt payment data.

### Step 5: Generate Certificate Signing Request (CSR) on Your Mac

> ⚠️ **IMPORTANT:** Apple Pay requires a special **ECC 256-bit certificate** (not the default RSA)

1. Open **Keychain Access** app (found in Applications → Utilities)
2. In the **menu bar at the top of your screen**, go to: **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**
3. In the dialog that appears:
   - **User Email Address:** Enter your email (e.g., `you@example.com`)
   - **Common Name:** Enter `HealthPilot Apple Pay Certificate`
   - **CA Email Address:** Leave this field **EMPTY**
   - **Request is:** Select **"Saved to disk"**
   - ✅ **CHECK THIS BOX:** **"Let me specify key pair information"** ← **CRITICAL!**
4. Click **"Continue"**
5. Save the file as `HealthPilot_CSR.certSigningRequest` to your Desktop

6. **NEW: Key Pair Information dialog will appear**
   - **Algorithm:** Select **"ECC"** (NOT "RSA")
   - **Key Size:** Select **"256 bits"**
   - Click **"Continue"**

7. Click **"Done"**

> 💡 **What just happened?** You created an ECC 256-bit private key (stored in Keychain) and a certificate request file on your Desktop.

### Step 6: Upload CSR to Apple Developer Portal

1. Go back to your browser (Apple Developer Portal)
2. In **Identifiers**, make sure **"Merchant IDs"** is selected in the dropdown
3. Click on your **"HealthPilot Apple Pay"** merchant ID from the list
4. Scroll down to **"Apple Pay Payment Processing Certificate"**
5. Click **"Create Certificate"**

> ⚠️ **If you see a banner about accepting an agreement:** Click **"Review Agreement"**, read it, and accept before continuing.

6. Click **"Choose File"**
7. Select the `HealthPilot_CSR.certSigningRequest` file from your Desktop
8. Click **"Continue"**
9. Click **"Download"** to download the certificate file (`.cer`)
10. **Double-click** the downloaded `.cer` file to install it in Keychain

✅ **Success!** Your payment processing certificate is now installed.

> 📅 **Reminder:** This certificate expires every 25 months. Set a calendar reminder to renew it before expiration.

---

## Part 3: Enable Apple Pay on Your App ID (5 minutes)

### Step 7: Find Your App ID

1. In **Certificates, Identifiers & Profiles**, click **"Identifiers"** in the sidebar
2. In the dropdown at the top, select **"App IDs"**
3. Find and click on your HealthPilot app identifier
   - It should look like: `com.nuvitae.healthpilot` or similar

### Step 8: Enable Apple Pay Capability

1. Scroll down to the **Capabilities** section
2. Find **"Apple Pay and Apple Pay on the Web"**
3. Check the ✅ checkbox next to it
4. Click **"Edit"** (appears next to Apple Pay after you check it)

### Step 9: Assign Your Merchant ID

1. In the Merchant IDs table, **check the box** next to `merchant.com.nuvitae.healthpilot`
2. Click **"Continue"**
3. Click **"Save"**
4. A warning will appear: **"Modify App Capabilities - This will invalidate existing provisioning profiles"**
5. Click **"Confirm"**

✅ **Success!** Apple Pay is now enabled for your app.

---

## Part 4: Configure in Xcode (5 minutes)

### Step 10: Install CocoaPods Dependencies

Open Terminal on your Mac and run:

```bash
cd /path/to/your/project/ios/App
pod install
```

> 💡 Replace `/path/to/your/project` with your actual project location

Wait for the installation to complete (may take 2-3 minutes).

### Step 11: Open Xcode Project

```bash
open App.xcworkspace
```

> ⚠️ **Important:** Open the `.xcworkspace` file, NOT the `.xcodeproj` file!

### Step 12: Add Apple Pay Capability in Xcode

1. In Xcode, select your project in the Navigator (left sidebar)
2. Select the **"App"** target
3. Click the **"Signing & Capabilities"** tab at the top
4. Click **"+ Capability"** button
5. Search for **"Apple Pay"** and double-click it
6. In the **"Merchant IDs"** section that appears:
   - Check the box next to `merchant.com.nuvitae.healthpilot`

✅ **Success!** Your Xcode project is now configured for Apple Pay.

---

## Part 5: Test on Physical iPhone (10 minutes)

> ⚠️ **Apple Pay ONLY works on physical devices** - it will NOT work in the iOS Simulator.

### Step 13: Build and Deploy

1. Connect your iPhone to your Mac with a cable
2. In Xcode, select your iPhone from the device dropdown (top-left, next to the Play button)
3. Click the **▶️ Play button** to build and run
4. When prompted on your iPhone, trust the developer certificate

### Step 14: Test the Payment Flow

1. Open the HealthPilot app on your iPhone
2. Navigate to **Profile → Billing** tab
3. Tap **"Upgrade Now"**
4. Select **Premium** or **Enterprise** tier
5. Tap **"Continue to Payment"**
6. The native Apple Pay sheet should appear
7. Authenticate with Face ID / Touch ID
8. Complete the test payment

✅ **Success!** If you see the Apple Pay sheet, everything is working!

---

## Troubleshooting

### ❌ "Apple Pay is not available"
- **Cause:** You're testing on the Simulator
- **Solution:** Use a physical iPhone

### ❌ "Merchant ID not found"
- **Cause:** The Merchant ID doesn't match between code and Developer Portal
- **Solution:** Verify `merchant.com.nuvitae.healthpilot` is spelled exactly the same everywhere

### ❌ "No payment methods available"
- **Cause:** No cards added to Apple Wallet
- **Solution:** Open Wallet app → Add a test card (you can use Stripe test cards)

### ❌ Certificate expired warning
- **Cause:** Payment Processing Certificate is older than 25 months
- **Solution:** Repeat Part 2 to create a new certificate

### ❌ Build errors about missing Stripe SDK
- **Cause:** CocoaPods dependencies not installed
- **Solution:** Run `pod install` in the `ios/App` directory

---

## Summary Checklist

- ✅ Created Merchant ID: `merchant.com.nuvitae.healthpilot`
- ✅ Generated and uploaded CSR
- ✅ Downloaded and installed Payment Processing Certificate
- ✅ Enabled Apple Pay on App ID
- ✅ Assigned Merchant ID to App ID
- ✅ Installed CocoaPods dependencies
- ✅ Added Apple Pay capability in Xcode
- ✅ Selected Merchant ID in Xcode
- ✅ Tested on physical iPhone

---

## Next Steps

Once Apple Pay is working:

1. **Test promo codes:** Try code `LAUNCH50` for 50% off
2. **Test annual billing:** Verify 20% discount calculates correctly
3. **Test subscription activation:** Confirm Premium/Enterprise features unlock
4. **Monitor Stripe Dashboard:** Check that payments appear correctly

---

## Important Notes

- **Payment Processing Certificate** expires every 25 months - set a reminder!
- **Merchant ID** never expires - you can reuse it forever
- **Stripe integration** handles the actual payment processing - Apple Pay is just the UI
- **Test cards** work in test mode - your Stripe account is in test mode by default
- **Production:** Switch to live Stripe keys when ready to accept real payments

---

## Support Resources

- **Stripe Documentation:** https://stripe.com/docs/apple-pay
- **Apple Developer Help:** https://developer.apple.com/help/account/configure-app-capabilities/configure-apple-pay/
- **HealthPilot Payment Docs:** See `ios/PAYMENT_SETUP.md` for technical details

---

**Questions?** Contact your development team or refer to the official Apple Developer documentation.
