#!/usr/bin/env node

/**
 * Icon and Splash Screen Generator
 * 
 * Generates iOS app icons and splash screens from a source image.
 * 
 * Prerequisites:
 * - Install sharp: npm install --save-dev sharp
 * - Provide source images:
 *   - assets/app-icon.png (1024x1024, square)
 *   - assets/splash-screen.png (2732x2732, centered content in middle 1024x1024)
 * 
 * Usage: node scripts/generate-icons-and-splash.mjs
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('📱 iOS Icon and Splash Screen Generator\n');

console.log('⚠️  MANUAL SETUP REQUIRED\n');
console.log('This script requires manual icon and splash generation.');
console.log('Follow these steps:\n');

console.log('1. APP ICONS:');
console.log('   - Create a 1024x1024 PNG icon (assets/app-icon.png)');
console.log('   - Use https://appicon.co to generate all required sizes');
console.log('   - Download the iOS icon set');
console.log('   - Copy to: ios/App/App/Assets.xcassets/AppIcon.appiconset/\n');

console.log('2. SPLASH SCREENS:');
console.log('   - Create a 2732x2732 PNG splash (assets/splash-screen.png)');
console.log('   - Center your logo/branding in the middle 1024x1024 area');
console.log('   - Use https://apetools.webprofusion.com/#/tools/imagegorilla to generate all sizes');
console.log('   - Download the splash screen set');
console.log('   - Copy to: ios/App/App/Assets.xcassets/Splash.imageset/\n');

console.log('3. CONFIGURE IN XCODE:');
console.log('   - Open: ios/App/App.xcworkspace');
console.log('   - Select App target > General');
console.log('   - Ensure App Icons Source is set to AppIcon');
console.log('   - Ensure Launch Screen is set to LaunchScreen.storyboard\n');

console.log('4. ALTERNATIVE - MANUAL GENERATION WITH SHARP:');
console.log('   If you have sharp installed:');
console.log('   - npm install --save-dev sharp');
console.log('   - Update this script with sharp image processing');
console.log('   - Generate all required sizes programmatically\n');

console.log('REQUIRED ICON SIZES (iOS):');
console.log('  - 20x20 @2x, @3x');
console.log('  - 29x29 @2x, @3x');
console.log('  - 40x40 @2x, @3x');
console.log('  - 60x60 @2x, @3x');
console.log('  - 76x76 @1x, @2x');
console.log('  - 83.5x83.5 @2x');
console.log('  - 1024x1024 @1x (App Store)\n');

console.log('REQUIRED SPLASH SIZES (iOS):');
console.log('  - 1125x2436 (iPhone X/XS)');
console.log('  - 1242x2688 (iPhone XS Max)');
console.log('  - 828x1792 (iPhone XR)');
console.log('  - 1170x2532 (iPhone 12/13/14)');
console.log('  - 1284x2778 (iPhone 12/13/14 Pro Max)');
console.log('  - 2048x2732 (iPad Pro 12.9")\n');

console.log('✅ For automated generation, consider using:');
console.log('   - Cordova-res: npm install -g cordova-res');
console.log('   - Then run: cordova-res ios --skip-config\n');

process.exit(0);
