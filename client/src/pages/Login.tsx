import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";
import { isNativePlatform } from "@/mobile/MobileBootstrap";
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { apiRequest, getApiBaseUrl, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import type { PluginListenerHandle } from '@capacitor/core';

export default function Login() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { theme } = useTheme();

  // Poll server for auth token using device ID
  const checkForPendingAuth = async () => {
    try {
      // Get device ID (create one if it doesn't exist)
      let { value: deviceId } = await Preferences.get({ key: 'deviceId' });
      
      if (!deviceId) {
        deviceId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await Preferences.set({ key: 'deviceId', value: deviceId });
      }
      
      // Poll the server using device ID (use full URL for mobile)
      const pollUrl = `${getApiBaseUrl()}/api/mobile-auth/poll?deviceId=${encodeURIComponent(deviceId)}`;
      const response = await fetch(pollUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to poll for auth');
      }
      
      const data = await response.json();
      
      if (!data.ready) {
        // Not ready yet, keep polling silently
        return;
      }
      
      setIsProcessing(true);
      
      // Exchange token for session
      const authResponse = await apiRequest('/api/mobile-auth', {
        method: 'POST',
        body: JSON.stringify({ token: data.token }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error('[Login] Failed to exchange token:', errorText);
        throw new Error('Failed to exchange token');
      }
      
      const authData = await authResponse.json();
      console.log('[Login] Received authData:', { 
        hasSessionToken: !!authData.sessionToken,
        sessionTokenType: typeof authData.sessionToken,
        sessionTokenLength: authData.sessionToken?.length 
      });
      
      // Validate sessionToken before storing
      if (!authData.sessionToken || typeof authData.sessionToken !== 'string') {
        console.error('[Login] Invalid sessionToken:', authData.sessionToken);
        throw new Error('Invalid session token received from server');
      }
      
      // Store session token
      console.log('[Login] Storing sessionToken in SecureStorage...');
      // @ts-expect-error - TypeScript types may be outdated, but API requires object params
      await SecureStorage.set({ key: 'sessionToken', value: authData.sessionToken });
      console.log('[Login] SessionToken stored successfully');
      
      // Invalidate queries and redirect
      await queryClient.invalidateQueries();
      window.location.href = '/';
    } catch (_error) {
      console.error('[Login] Error checking for auth:', _error);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isNativePlatform()) return;

    // Check immediately when component mounts
    checkForPendingAuth();

    let listenerHandle: PluginListenerHandle | null = null;

    // Listen for app state changes (when user returns from browser)
    const setupListener = async () => {
      listenerHandle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          checkForPendingAuth();
        }
      });
    };
    setupListener();

    // Also poll every second while on this page
    pollIntervalRef.current = window.setInterval(() => {
      checkForPendingAuth();
    }, 1000);

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleLogin = async () => {
    if (isNativePlatform()) {
      try {
        // Get or create device ID
        let { value: deviceId } = await Preferences.get({ key: 'deviceId' });
        
        if (!deviceId) {
          deviceId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
          await Preferences.set({ key: 'deviceId', value: deviceId });
        }
        
        const loginUrl = `${getApiBaseUrl()}/api/login?deviceId=${encodeURIComponent(deviceId)}`;
        
        // Don't use presentationStyle: 'popover' on iPhone - it fails silently
        // Use fullscreen presentation which works on all iOS devices
        await Browser.open({
          url: loginUrl,
          presentationStyle: 'fullscreen',
          toolbarColor: '#000000',
        });
        // Polling will handle the token exchange when user returns
      } catch (error) {
        console.error('[Login] Failed to open browser:', error);
        toast({
          variant: "destructive",
          title: "Login Error",
          description: `Failed to open sign-in browser: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    } else {
      window.location.href = "/api/login";
    }
  };

  const handleForceLogout = async () => {
    if (!isNativePlatform()) {
      toast({
        variant: "destructive",
        title: "Mobile Only",
        description: "This feature is only available on the native iOS app",
      });
      return;
    }

    const confirmed = confirm(
      '⚠️ FORCE LOGOUT\n\n' +
      'This will clear ALL authentication data from iOS Keychain including:\n' +
      '- Session tokens\n' +
      '- User ID\n' +
      '- Refresh tokens\n' +
      '- Device ID\n\n' +
      'You will need to sign in again.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    try {
      await SecureStorage.clear();
      await Preferences.remove({ key: 'deviceId' });
      
      toast({
        title: "Keychain Cleared",
        description: "All authentication data has been removed. Please sign in again.",
      });
      
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: error.message || "Failed to clear Keychain data",
      });
    }
  };

  return (
    <div className={`premium-theme ${theme === 'dark' ? 'dark' : ''} min-h-screen flex flex-col items-center justify-between p-6 relative overflow-hidden`}>
      {/* Premium gradient background */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, rgba(255,124,119,1) 0%, rgba(229,138,201,0.9) 40%, rgba(0,207,207,1) 100%)'
        }}
      />

      {/* Top spacer */}
      <div className="flex-1" />

      {/* Main content - centered */}
      <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-md">
        {/* Logo */}
        <img 
          src={logo} 
          alt="HealthPilot" 
          className="h-32 w-32 drop-shadow-lg"
        />

        {/* Brand name */}
        <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-md">
          HealthPilot
        </h1>

        {/* Tagline */}
        <p className="text-2xl text-white/95 font-light">
          Your Body, Decoded.
        </p>

        {/* Sign In Button */}
        <Button
          onClick={handleLogin}
          className="w-full max-w-sm bg-white text-gray-800 hover:bg-white/90 rounded-full py-7 text-xl font-medium shadow-lg"
          size="lg"
          data-testid="button-login"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Completing Login...
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        {/* Dev Tools - hidden by default, show on triple tap */}
        {isNativePlatform() && showDevTools && (
          <div className="w-full max-w-sm space-y-2 pt-4">
            <Button
              onClick={handleForceLogout}
              variant="destructive"
              size="sm"
              className="w-full"
              data-testid="button-force-logout"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Clear Keychain & Force Logout
            </Button>
            <p className="text-xs text-white/70 text-center">
              Dev tool: Use if stuck in auto-login loop
            </p>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center space-y-4 w-full max-w-md pb-8">
        {/* SignUp link */}
        <button
          onClick={handleLogin}
          className="text-white text-lg font-light hover:underline"
          data-testid="button-signup"
        >
          SignUp
        </button>

        {/* Privacy & Terms - minimal */}
        <p className="text-xs text-center text-white/80">
          By signing in, you agree to our{" "}
          <a href="/privacy" className="underline">Privacy Policy</a>
          {" "}and{" "}
          <a href="/terms" className="underline">Terms of Service</a>
        </p>

        {/* Hidden dev trigger - triple tap to show dev tools */}
        {isNativePlatform() && (
          <div
            onClick={(e) => {
              if (e.detail === 3) {
                setShowDevTools(!showDevTools);
              }
            }}
            className="h-8 w-full"
          />
        )}
      </div>
    </div>
  );
}
