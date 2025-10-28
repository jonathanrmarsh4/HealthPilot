import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Dumbbell, Sparkles, Shield, Brain, TrendingUp, Apple, Lock, Check } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";
import { getBrowserAdapter } from "@/mobile/adapters";
import { isNativePlatform } from "@/mobile/MobileBootstrap";
import { App as CapacitorApp } from '@capacitor/app';
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

export default function Login() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    const handleAppUrlOpen = async (event: { url: string }) => {
      console.log('[Login] App URL opened:', event.url);
      
      if (event.url.includes('oauth-success')) {
        const browser = getBrowserAdapter();
        await browser.close();
        
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        window.location.href = '/';
      }
    };

    const listener = CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen);

    return () => {
      listener.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (isNativePlatform()) {
      const browser = getBrowserAdapter();
      const loginUrl = `${window.location.origin}/api/login`;
      await browser.openInApp(loginUrl);
    } else {
      window.location.href = "/api/login";
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
              <CardTitle className="text-2xl text-white">Start Your Health Journey</CardTitle>
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
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Sign In with Replit
              </Button>
              
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
