/**
 * NativeDiagnostics.tsx
 * 
 * Comprehensive diagnostic screen for validating all mobile capabilities.
 * Tests: Platform detection, secure storage, HealthKit, deep links, haptics, share, browser.
 * 
 * Access this screen via a dev menu or direct route for testing.
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Smartphone, Activity } from 'lucide-react';
import { 
  getPlatform, 
  isNativePlatform, 
  checkAppState 
} from '../../MobileBootstrap';
import { 
  getSecureStorage,
  testSecureStorage,
  getHealthKitAdapter,
  testHealthKitAdapter,
  getHapticsAdapter,
  getShareAdapter,
  getBrowserAdapter,
} from '../../adapters';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: any;
}

export function NativeDiagnostics() {
  const [appState, setAppState] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadAppState();
  }, []);

  async function loadAppState() {
    const state = await checkAppState();
    setAppState(state);
  }

  async function runAllTests() {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Platform Detection
    results.push({
      name: 'Platform Detection',
      status: 'pass',
      message: `Running on ${getPlatform()}${isNativePlatform() ? ' (native)' : ' (web)'}`,
      details: appState,
    });

    // Test 2: Secure Storage
    const secureStorageResult = await testSecureStorage();
    results.push({
      name: 'Secure Storage',
      status: secureStorageResult.success ? 'pass' : 'fail',
      message: secureStorageResult.success 
        ? 'Secure storage working correctly'
        : `Secure storage failed: ${secureStorageResult.error}`,
      details: secureStorageResult.details,
    });

    // Test 3: HealthKit
    const healthKitResult = await testHealthKitAdapter();
    results.push({
      name: 'HealthKit Adapter',
      status: healthKitResult.success ? (healthKitResult.available ? 'pass' : 'warning') : 'fail',
      message: healthKitResult.available 
        ? 'HealthKit available and functional'
        : 'HealthKit not available (expected on web/Android)',
      details: healthKitResult.details,
    });

    // Test 4: Haptics
    try {
      const haptics = getHapticsAdapter();
      await haptics.impact('light');
      results.push({
        name: 'Haptics',
        status: 'pass',
        message: 'Haptic feedback working',
      });
    } catch (error: any) {
      results.push({
        name: 'Haptics',
        status: 'fail',
        message: `Haptics failed: ${error.message}`,
      });
    }

    // Test 5: Share
    try {
      const share = getShareAdapter();
      const canShare = await share.canShare();
      results.push({
        name: 'Share API',
        status: canShare ? 'pass' : 'warning',
        message: canShare ? 'Share API available' : 'Share API not available',
      });
    } catch (error: any) {
      results.push({
        name: 'Share API',
        status: 'fail',
        message: `Share API failed: ${error.message}`,
      });
    }

    // Test 6: Browser
    try {
      getBrowserAdapter();
      results.push({
        name: 'Browser Adapter',
        status: 'pass',
        message: 'Browser adapter initialized',
      });
    } catch (error: any) {
      results.push({
        name: 'Browser Adapter',
        status: 'fail',
        message: `Browser adapter failed: ${error.message}`,
      });
    }

    setTestResults(results);
    setIsRunning(false);
  }

  async function testHealthKitPermissions() {
    const healthKit = getHealthKitAdapter();
    if (!healthKit.isAvailable()) {
      alert('HealthKit is only available on iOS');
      return;
    }

    const granted = await healthKit.requestAuthorization({
      read: ['heartRate', 'heartRateVariability', 'oxygenSaturation', 'sleepAnalysis'],
    });

    alert(granted ? 'HealthKit permissions granted!' : 'HealthKit permissions denied');
    runAllTests();
  }

  async function testSecureStorageRoundTrip() {
    const storage = getSecureStorage();
    const testValue = 'test_' + Date.now();
    
    await storage.setAuthToken(testValue);
    const retrieved = await storage.getAuthToken();
    await storage.clearAuthToken();

    alert(
      retrieved === testValue
        ? `✅ Round-trip successful!\nStored: ${testValue}\nRetrieved: ${retrieved}`
        : `❌ Round-trip failed!\nStored: ${testValue}\nRetrieved: ${retrieved}`
    );
  }

  async function testHaptics() {
    const haptics = getHapticsAdapter();
    await haptics.notification('success');
    setTimeout(() => haptics.impact('heavy'), 500);
  }

  async function testShare() {
    const share = getShareAdapter();
    await share.share({
      title: 'HealthPilot Diagnostics',
      text: `Mobile diagnostics test from ${getPlatform()}`,
      url: 'https://healthpilot.pro',
    });
  }

  async function testBrowser() {
    const browser = getBrowserAdapter();
    await browser.openInApp('https://healthpilot.pro');
  }

  async function viewKeychainContents() {
    const storage = getSecureStorage();
    const sessionToken = await storage.getAuthToken();
    const userId = await storage.getUserId();
    const refreshToken = await storage.getRefreshToken();

    alert(
      `🔐 iOS Keychain Contents:\n\n` +
      `Session Token: ${sessionToken ? '✅ STORED (' + sessionToken.substring(0, 20) + '...)' : '❌ NOT FOUND'}\n` +
      `User ID: ${userId || '❌ NOT FOUND'}\n` +
      `Refresh Token: ${refreshToken ? '✅ STORED (' + refreshToken.substring(0, 20) + '...)' : '❌ NOT FOUND'}\n\n` +
      `This data persists even when you delete and reinstall the app!`
    );
  }

  async function clearAllKeychain() {
    const confirmed = confirm(
      '⚠️ WARNING: This will completely clear ALL authentication data from iOS Keychain!\n\n' +
      'This includes:\n' +
      '- Session tokens\n' +
      '- User ID\n' +
      '- Refresh tokens\n' +
      '- Device ID\n\n' +
      'You will be logged out and need to sign in again.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    try {
      const storage = getSecureStorage();
      await storage.clearAll();
      
      // Also clear device ID from Preferences
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key: 'deviceId' });
      
      alert('✅ iOS Keychain cleared successfully!\n\nRedirecting to login...');
      window.location.href = '/login';
    } catch (error: any) {
      alert(`❌ Failed to clear Keychain: ${error.message}`);
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-diagnostics-title">
            <Smartphone className="w-6 h-6" />
            Native Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-platform-info">
            Platform: {getPlatform()} {isNativePlatform() ? '(Native)' : '(Web)'}
          </p>
        </div>
        <Button 
          onClick={runAllTests} 
          disabled={isRunning}
          data-testid="button-run-tests"
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      {appState && (
        <Card className="p-4">
          <h2 className="font-semibold mb-2">App Information</h2>
          <div className="space-y-1 text-sm" data-testid="card-app-info">
            <p>Platform: <Badge variant="secondary">{appState.platform}</Badge></p>
            <p>Native: <Badge variant={appState.isNative ? 'default' : 'outline'}>{appState.isNative ? 'Yes' : 'No'}</Badge></p>
            {appState.appInfo && (
              <>
                <p>App ID: {appState.appInfo.id}</p>
                <p>Version: {appState.appInfo.version}</p>
                <p>Build: {appState.appInfo.build}</p>
              </>
            )}
          </div>
        </Card>
      )}

      {testResults.length > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Test Results</h2>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                data-testid={`test-result-${index}`}
              >
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="font-medium">{result.name}</div>
                  <div className="text-sm text-muted-foreground">{result.message}</div>
                  {result.details && (
                    <pre className="text-xs mt-1 p-2 bg-background rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Interactive Tests
        </h2>
        <div className="space-y-2">
          <Button 
            onClick={testHealthKitPermissions} 
            variant="outline" 
            className="w-full justify-start"
            data-testid="button-test-healthkit"
          >
            Request HealthKit Permissions
          </Button>
          <Button 
            onClick={testSecureStorageRoundTrip} 
            variant="outline" 
            className="w-full justify-start"
            data-testid="button-test-storage"
          >
            Test Secure Storage Round-Trip
          </Button>
          <Button 
            onClick={testHaptics} 
            variant="outline" 
            className="w-full justify-start"
            data-testid="button-test-haptics"
          >
            Test Haptic Feedback
          </Button>
          <Button 
            onClick={testShare} 
            variant="outline" 
            className="w-full justify-start"
            data-testid="button-test-share"
          >
            Test Native Share
          </Button>
          <Button 
            onClick={testBrowser} 
            variant="outline" 
            className="w-full justify-start"
            data-testid="button-test-browser"
          >
            Test In-App Browser
          </Button>
        </div>
      </Card>

      <Card className="p-4 border-destructive/50">
        <h2 className="font-semibold mb-2 text-destructive flex items-center gap-2">
          ⚠️ Keychain Management (Dev Tools)
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          iOS Keychain data persists even when you delete and reinstall the app. Use these tools to debug authentication issues.
        </p>
        <div className="space-y-2">
          <Button 
            onClick={viewKeychainContents} 
            variant="outline" 
            className="w-full justify-start"
            data-testid="button-view-keychain"
          >
            🔍 View Keychain Contents
          </Button>
          <Button 
            onClick={clearAllKeychain} 
            variant="destructive" 
            className="w-full justify-start"
            data-testid="button-clear-keychain"
          >
            🗑️ Clear ALL Keychain Data (Force Logout)
          </Button>
        </div>
      </Card>
    </div>
  );
}
