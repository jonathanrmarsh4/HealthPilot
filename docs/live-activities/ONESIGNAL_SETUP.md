# OneSignal Configuration for Live Activities

Live Activities require Apple Push Notification service (APNs) to send real-time updates from your server to the iPhone lock screen. OneSignal manages the APNs integration for you.

## Prerequisites
- OneSignal account (free tier works)
- Apple Developer account
- APNs Authentication Key (.p8 file)

## Step 1: Get APNs Authentication Key from Apple

1. Go to [Apple Developer Portal - Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click the **+** button to create a new key
3. Enter details:
   - **Key Name**: "HealthPilot APNs Key" (or any name you prefer)
   - **Enable**: Check **Apple Push Notifications service (APNs)**
4. Click **Continue** → **Register**
5. **Download the .p8 file** immediately
   - ⚠️ You can only download this ONCE!
   - Save it somewhere safe (e.g., `/Users/yourname/Documents/HealthPilot_APNs.p8`)
6. Note the **Key ID** displayed (e.g., `ABC123XYZ4`)

## Step 2: Get Your Apple Team ID

1. In Apple Developer Portal, click your account name (top right)
2. Select **View Membership**
3. Copy your **Team ID** (e.g., `TEAM123456`)

## Step 3: Get Your App Bundle ID

1. Open your Xcode project
2. Select the **App** target
3. Go to **General** tab
4. Copy the **Bundle Identifier** (e.g., `com.healthpilot.app`)

## Step 4: Configure OneSignal Dashboard

### A. Create OneSignal App (if you haven't already)

1. Go to [OneSignal Dashboard](https://app.onesignal.com/)
2. Click **New App/Website**
3. Enter app name: "HealthPilot"
4. Select **Apple iOS (APNs)**
5. Click **Next**

### B. Upload APNs Credentials

1. In OneSignal Dashboard, go to **Settings** → **Platforms**
2. Find **Apple iOS (APNs)** section
3. Click **Configure** or **Edit**
4. Upload your APNs credentials:
   - **Upload .p8 File**: Click and select your downloaded `.p8` file
   - **Key ID**: Enter the Key ID from Step 1 (e.g., `ABC123XYZ4`)
   - **Team ID**: Enter your Team ID from Step 2 (e.g., `TEAM123456`)
   - **Bundle ID**: Enter your Bundle ID from Step 3 (e.g., `com.healthpilot.app`)
5. Click **Save**

## Step 5: Get OneSignal App Credentials

1. Still in OneSignal Dashboard, go to **Settings** → **Keys & IDs**
2. Copy these values:
   - **OneSignal App ID**: (e.g., `a1b2c3d4-e5f6-7890-abcd-1234567890ab`)
   - **REST API Key**: (e.g., `ZGFzZGFzZGFzZGFzZGFzZGFzZGFz`)

## Step 6: Add Credentials to Replit Secrets

1. In your Replit project, go to **Tools** → **Secrets**
2. Add these environment variables:
   ```
   ONESIGNAL_APP_ID=a1b2c3d4-e5f6-7890-abcd-1234567890ab
   ONESIGNAL_API_KEY=ZGFzZGFzZGFzZGFzZGFzZGFzZGFz
   ```
3. Click **Save**

## Step 7: Restart Your Server

After adding the secrets:
1. In Replit, click **Shell** tab
2. Stop the server if running (Ctrl+C)
3. Run: `npm run dev`

## Verification

Check your server logs for:
```
✅ OneSignal configured for Live Activities
```

If you see:
```
⚠️ OneSignal credentials not configured for Live Activities
```

Then double-check:
- Environment variables are spelled correctly
- No extra spaces in the values
- Server was restarted after adding secrets

## Troubleshooting

### "Invalid APNs credentials"
- Verify Key ID is correct (10 characters)
- Verify Team ID is correct
- Make sure .p8 file is the correct one
- Ensure Bundle ID matches your Xcode project exactly

### "Push notifications not authorized"
- User must grant push notification permission in the app
- Check Push Notifications capability is enabled in Xcode

### Live Activity doesn't update
- Check OneSignal Dashboard → **Message Delivery** for errors
- Verify APNs credentials are still valid
- Check server logs for push notification errors

## Testing Push Notifications

Once configured, you can test in OneSignal Dashboard:

1. Go to **Messages** → **New Push**
2. Select your iOS app
3. Send a test notification to verify APNs is working
4. If test succeeds, Live Activities will also work!

## Production Checklist

Before going to production:

- [ ] .p8 file backed up securely
- [ ] OneSignal credentials stored in Replit Secrets (not hardcoded)
- [ ] APNs entitlement enabled in Xcode
- [ ] Push Notifications capability enabled in Xcode
- [ ] App Groups configured correctly
- [ ] Tested on physical iOS device (not Simulator)

## Security Notes

- ⚠️ Never commit your .p8 file to Git
- ⚠️ Never share your APNs Key ID publicly
- ⚠️ Never share your OneSignal REST API Key publicly
- ✅ Use Replit Secrets for all sensitive credentials
- ✅ OneSignal REST API Key should have "Default" permission level

---

**Next Steps**: Once OneSignal is configured, proceed to the main [Setup Guide](./SETUP_GUIDE.md) to implement the Live Activity in Xcode.
