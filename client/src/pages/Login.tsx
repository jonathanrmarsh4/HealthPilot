import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Dumbbell, Sparkles, Shield, Brain, TrendingUp, Apple, Lock, Check, Loader2, Trash2 } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";
import { isNativePlatform } from "@/mobile/MobileBootstrap";
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { apiRequest, queryClient, getApiBaseUrl } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Poll server for auth token using device ID
  const checkForPendingAuth = async () => {
    try {
      // Get device ID (create one if it doesn't exist)
      let { value: deviceId } = await Preferences.get({ key: 'deviceId' });
      
      if (!deviceId) {
        deviceId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await Preferences.set({ key: 'deviceId', value: deviceId });
        console.log('[Login] Created new device ID:', deviceId);
      }
      
      console.log('[Login] Polling server with device ID...');
      
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
      
      console.log('[Login] Auth ready, exchanging token...');
      setIsProcessing(true);
      
      // Exchange token for session
      const authResponse = await apiRequest('/api/mobile-auth', {
        method: 'POST',
        body: JSON.stringify({ token: data.token }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!authResponse.ok) {
        throw new Error('Failed to exchange token');
      }
      
      const authData = await authResponse.json();
      console.log('[Login] Session created successfully');
      
      // Store session token
      await SecureStorage.set('sessionToken', authData.sessionToken);
      
      // Invalidate queries and redirect
      await queryClient.invalidateQueries();
      window.location.href = '/';
    } catch (error) {
      console.error('[Login] Error checking for auth:', error);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isNativePlatform()) return;

    // Check immediately when component mounts
    checkForPendingAuth();

    // Listen for app state changes (when user returns from browser)
    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log('[Login] App became active, checking for pending auth...');
        checkForPendingAuth();
      }
    });

    // Also poll every second while on this page
    pollIntervalRef.current = window.setInterval(() => {
      checkForPendingAuth();
    }, 1000);

    return () => {
      stateListener.remove();
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
          console.log('[Login] Created new device ID for auth:', deviceId);
        }
        
        const loginUrl = `${getApiBaseUrl()}/api/login?deviceId=${encodeURIComponent(deviceId)}`;
        console.log('[Login] Opening browser for OAuth:', loginUrl);
        
        // Don't use presentationStyle: 'popover' on iPhone - it fails silently
        // Use fullscreen presentation which works on all iOS devices
        await Browser.open({
          url: loginUrl,
          presentationStyle: 'fullscreen',
          toolbarColor: '#000000',
        });
        
        console.log('[Login] Browser opened successfully');
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
    <div className="min-h-screen bg-[#0A0F1F]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={logo} alt="HealthPilot" className="h-16 w-16" />
            <h1 className="text-5xl font-bold text-white">HealthPilot</h1>
          </div>

          {/* Main Headline */}
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold text-white max-w-4xl mx-auto leading-tight">
              Evidence-Based AI Health Optimization Aligned with Medical Standards
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Your personal health intelligence system that transforms biomarkers, wearable data, and health records into actionable insights—powered by AI trained on ACSM, NSCA, and WHO guidelines.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <Badge variant="outline" className="text-xs border-[#00E0C6]/30 bg-[#00E0C6]/5 text-[#00E0C6]">
                <Shield className="h-3 w-3 mr-1" />
                ACSM Aligned
              </Badge>
              <Badge variant="outline" className="text-xs border-[#00E0C6]/30 bg-[#00E0C6]/5 text-[#00E0C6]">
                <Shield className="h-3 w-3 mr-1" />
                NSCA Standards
              </Badge>
              <Badge variant="outline" className="text-xs border-[#00E0C6]/30 bg-[#00E0C6]/5 text-[#00E0C6]">
                <Shield className="h-3 w-3 mr-1" />
                WHO Guidelines
              </Badge>
              <Badge variant="outline" className="text-xs border-[#00E0C6]/30 bg-[#00E0C6]/5 text-[#00E0C6]">
                <Lock className="h-3 w-3 mr-1" />
                HIPAA Compliant
              </Badge>
            </div>
          </div>

          {/* Login Card - Centered */}
          <Card className="w-full max-w-md mx-auto mb-16 bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="text-center">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1" />
                <CardTitle className="text-2xl text-white flex-1">Start Your Health Journey</CardTitle>
                {isNativePlatform() && (
                  <button
                    onClick={() => setShowDevTools(!showDevTools)}
                    className="text-xs text-gray-500 hover:text-gray-300 px-2"
                  >
                    {showDevTools ? 'Hide' : 'Dev'}
                  </button>
                )}
              </div>
              <CardDescription className="text-gray-400">
                Join thousands optimizing their health with AI-powered insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleLogin}
                className="w-full bg-[#00E0C6] text-[#0A0F1F] hover:bg-[#00E0C6]/90 shadow-[0_0_24px_rgba(0,224,198,0.35)] hover:shadow-[0_0_36px_rgba(0,224,198,0.55)]"
                size="lg"
                data-testid="button-login"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing Login...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sign In with Replit
                  </>
                )}
              </Button>

              {isNativePlatform() && showDevTools && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <p className="text-xs text-gray-400">
                    🔧 Dev Tools (iOS only)
                  </p>
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
                  <p className="text-xs text-gray-500 text-center">
                    Use this if you're stuck in auto-login loop
                  </p>
                </div>
              )}
              
              <p className="text-xs text-center text-gray-500">
                By signing in, you agree to our{" "}
                <a href="/privacy" className="text-[#00E0C6] hover:underline">Privacy Policy</a>
                {" "}and{" "}
                <a href="/terms" className="text-[#00E0C6] hover:underline">Terms of Service</a>
              </p>
            </CardContent>
          </Card>

          {/* Core Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-lg bg-[#00E0C6]/10 w-fit mb-2">
                  <Brain className="h-6 w-6 text-[#00E0C6]" />
                </div>
                <CardTitle className="text-lg text-white">AI-Powered Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  Advanced AI analyzes your biomarkers, sleep, HRV, and workout data to deliver personalized daily recommendations with transparent evidence citations.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-lg bg-[#00E0C6]/10 w-fit mb-2">
                  <Dumbbell className="h-6 w-6 text-[#00E0C6]" />
                </div>
                <CardTitle className="text-lg text-white">Evidence-Based Training</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  Training prescriptions aligned with ACSM and NSCA standards. Progressive overload, auto-regulation, and safety-first guardrails built in.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-lg bg-[#00E0C6]/10 w-fit mb-2">
                  <Heart className="h-6 w-6 text-[#00E0C6]" />
                </div>
                <CardTitle className="text-lg text-white">Personalized Nutrition</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  AI-generated meal plans based on ADA and AND guidelines. Macros calculated from your biomarkers, activity level, and health goals.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-lg bg-[#00E0C6]/10 w-fit mb-2">
                  <Activity className="h-6 w-6 text-[#00E0C6]" />
                </div>
                <CardTitle className="text-lg text-white">Biomarker Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  Track blood work, vitals, and health metrics over time. AI identifies patterns and alerts you to concerning trends before they become problems.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-lg bg-[#00E0C6]/10 w-fit mb-2">
                  <Apple className="h-6 w-6 text-[#00E0C6]" />
                </div>
                <CardTitle className="text-lg text-white">Apple Health Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  Seamlessly sync sleep, HRV, workouts, and activity data. Native iOS app with direct HealthKit integration for real-time insights.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-lg bg-[#00E0C6]/10 w-fit mb-2">
                  <TrendingUp className="h-6 w-6 text-[#00E0C6]" />
                </div>
                <CardTitle className="text-lg text-white">Readiness Score System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  Multi-factor readiness assessment using sleep quality, HRV, resting heart rate, and workout load to optimize training and recovery.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How It Works Section */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-center mb-8 text-white">How HealthPilot Works</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#00E0C6]/10 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-[#00E0C6]">1</span>
                </div>
                <h4 className="font-semibold text-lg text-white">Connect Your Data</h4>
                <p className="text-sm text-gray-400">
                  Sync Apple Health, upload blood work, or manually track biomarkers. All data encrypted and HIPAA-compliant.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#00E0C6]/10 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-[#00E0C6]">2</span>
                </div>
                <h4 className="font-semibold text-lg text-white">AI Analyzes & Learns</h4>
                <p className="text-sm text-gray-400">
                  Our AI processes your data against medical guidelines, identifies patterns, and learns your unique physiology.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#00E0C6]/10 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-[#00E0C6]">3</span>
                </div>
                <h4 className="font-semibold text-lg text-white">Get Personalized Plans</h4>
                <p className="text-sm text-gray-400">
                  Receive daily training prescriptions, meal plans, and health insights tailored to your current state and goals.
                </p>
              </div>
            </div>
          </div>

          {/* Health Standards Section */}
          <Card className="mb-16 bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Built on Medical & Scientific Standards</CardTitle>
              <CardDescription className="text-gray-400">
                Every recommendation is grounded in peer-reviewed research and clinical guidelines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#00E0C6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">ACSM (American College of Sports Medicine)</p>
                    <p className="text-sm text-gray-400">Exercise prescription, HR max caps, screening guidelines</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#00E0C6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">NSCA (National Strength & Conditioning)</p>
                    <p className="text-sm text-gray-400">Progressive overload, periodization, volume/intensity limits</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#00E0C6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">WHO (World Health Organization)</p>
                    <p className="text-sm text-gray-400">Physical activity guidelines, minimum rest days</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#00E0C6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">ADA & AND (Nutrition Standards)</p>
                    <p className="text-sm text-gray-400">Dietary guidelines, macro recommendations</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#00E0C6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">AHA (American Heart Association)</p>
                    <p className="text-sm text-gray-400">Cardiovascular health, blood pressure thresholds</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#00E0C6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Evidence Citations</p>
                    <p className="text-sm text-gray-400">Transparent references for all AI recommendations</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4 text-white">Ready to Optimize Your Health?</h3>
            <p className="text-gray-400 mb-6">
              Join the future of personalized health intelligence
            </p>
            <Button
              onClick={handleLogin}
              size="lg"
              className="text-lg px-8 bg-[#00E0C6] text-[#0A0F1F] hover:bg-[#00E0C6]/90 shadow-[0_0_24px_rgba(0,224,198,0.35)] hover:shadow-[0_0_36px_rgba(0,224,198,0.55)]"
              data-testid="button-login-cta"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Get Started Free
            </Button>
          </div>

          {/* Privacy & Compliance Footer */}
          <div className="border-t border-white/10 pt-8">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs border-white/20 text-gray-300 bg-white/5">
                  <Lock className="h-3 w-3 mr-1" />
                  HIPAA Compliant
                </Badge>
                <Badge variant="outline" className="text-xs border-white/20 text-gray-300 bg-white/5">
                  <Lock className="h-3 w-3 mr-1" />
                  GDPR Compliant
                </Badge>
                <Badge variant="outline" className="text-xs border-white/20 text-gray-300 bg-white/5">
                  <Lock className="h-3 w-3 mr-1" />
                  PIPEDA Compliant
                </Badge>
                <Badge variant="outline" className="text-xs border-white/20 text-gray-300 bg-white/5">
                  <Lock className="h-3 w-3 mr-1" />
                  Australia Privacy Act
                </Badge>
              </div>
              
              <p className="text-xs text-gray-400 max-w-4xl mx-auto leading-relaxed">
                <strong className="text-white">Privacy & Data Protection:</strong> HealthPilot complies with HIPAA (US), GDPR (EU), PIPEDA (Canada), and Australia Privacy Act standards. 
                All health data is encrypted at rest and in transit. We provide granular consent management, comprehensive audit logging, 
                30-day account deletion grace period, and full data export capabilities. Your health data is never sold to third parties. 
                You maintain complete control over your data through our{" "}
                <a href="/privacy-dashboard" className="text-[#00E0C6] hover:underline">Privacy Dashboard</a>.
              </p>
              
              <p className="text-xs text-gray-500">
                <a href="/privacy" className="text-[#00E0C6] hover:underline">Privacy Policy</a>
                {" · "}
                <a href="/terms" className="text-[#00E0C6] hover:underline">Terms of Service</a>
                {" · "}
                <a href="/privacy-dashboard" className="text-[#00E0C6] hover:underline">Privacy Dashboard</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
