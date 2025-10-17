import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Dumbbell, Sparkles, Shield, Brain, TrendingUp, Apple, Lock, Check } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={logo} alt="HealthPilot" className="h-16 w-16" />
            <h1 className="text-5xl font-bold">HealthPilot</h1>
          </div>

          {/* Main Headline */}
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground max-w-4xl mx-auto leading-tight">
              Evidence-Based AI Health Optimization Aligned with Medical Standards
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Your personal health intelligence system that transforms biomarkers, wearable data, and health records into actionable insights—powered by AI trained on ACSM, NSCA, and WHO guidelines.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                ACSM Aligned
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                NSCA Standards
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                WHO Guidelines
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                HIPAA Compliant
              </Badge>
            </div>
          </div>

          {/* Login Card - Centered */}
          <Card className="w-full max-w-md mx-auto mb-16">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Start Your Health Journey</CardTitle>
              <CardDescription>
                Join thousands optimizing their health with AI-powered insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleLogin}
                className="w-full"
                size="lg"
                data-testid="button-login"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Sign In with Replit
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                By signing in, you agree to our{" "}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                {" "}and{" "}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
              </p>
            </CardContent>
          </Card>

          {/* Core Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <Card className="hover-elevate">
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">AI-Powered Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Advanced AI analyzes your biomarkers, sleep, HRV, and workout data to deliver personalized daily recommendations with transparent evidence citations.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Evidence-Based Training</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Training prescriptions aligned with ACSM and NSCA standards. Progressive overload, auto-regulation, and safety-first guardrails built in.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Personalized Nutrition</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AI-generated meal plans based on ADA and AND guidelines. Macros calculated from your biomarkers, activity level, and health goals.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Biomarker Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track blood work, vitals, and health metrics over time. AI identifies patterns and alerts you to concerning trends before they become problems.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <Apple className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Apple Health Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Seamlessly sync sleep, HRV, workouts, and activity data. Native iOS app with direct HealthKit integration for real-time insights.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Readiness Score System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Multi-factor readiness assessment using sleep quality, HRV, resting heart rate, and workout load to optimize training and recovery.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How It Works Section */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-center mb-8">How HealthPilot Works</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h4 className="font-semibold text-lg">Connect Your Data</h4>
                <p className="text-sm text-muted-foreground">
                  Sync Apple Health, upload blood work, or manually track biomarkers. All data encrypted and HIPAA-compliant.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h4 className="font-semibold text-lg">AI Analyzes & Learns</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI processes your data against medical guidelines, identifies patterns, and learns your unique physiology.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h4 className="font-semibold text-lg">Get Personalized Plans</h4>
                <p className="text-sm text-muted-foreground">
                  Receive daily training prescriptions, meal plans, and health insights tailored to your current state and goals.
                </p>
              </div>
            </div>
          </div>

          {/* Health Standards Section */}
          <Card className="mb-16">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Built on Medical & Scientific Standards</CardTitle>
              <CardDescription>
                Every recommendation is grounded in peer-reviewed research and clinical guidelines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">ACSM (American College of Sports Medicine)</p>
                    <p className="text-sm text-muted-foreground">Exercise prescription, HR max caps, screening guidelines</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">NSCA (National Strength & Conditioning)</p>
                    <p className="text-sm text-muted-foreground">Progressive overload, periodization, volume/intensity limits</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">WHO (World Health Organization)</p>
                    <p className="text-sm text-muted-foreground">Physical activity guidelines, minimum rest days</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">ADA & AND (Nutrition Standards)</p>
                    <p className="text-sm text-muted-foreground">Dietary guidelines, macro recommendations</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">AHA (American Heart Association)</p>
                    <p className="text-sm text-muted-foreground">Cardiovascular health, blood pressure thresholds</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Evidence Citations</p>
                    <p className="text-sm text-muted-foreground">Transparent references for all AI recommendations</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Ready to Optimize Your Health?</h3>
            <p className="text-muted-foreground mb-6">
              Join the future of personalized health intelligence
            </p>
            <Button
              onClick={handleLogin}
              size="lg"
              className="text-lg px-8"
              data-testid="button-login-cta"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Get Started Free
            </Button>
          </div>

          {/* Privacy & Compliance Footer */}
          <div className="border-t border-border pt-8">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  HIPAA Compliant
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  GDPR Compliant
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  PIPEDA Compliant
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Australia Privacy Act
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                <strong>Privacy & Data Protection:</strong> HealthPilot complies with HIPAA (US), GDPR (EU), PIPEDA (Canada), and Australia Privacy Act standards. 
                All health data is encrypted at rest and in transit. We provide granular consent management, comprehensive audit logging, 
                30-day account deletion grace period, and full data export capabilities. Your health data is never sold to third parties. 
                You maintain complete control over your data through our{" "}
                <a href="/privacy-dashboard" className="text-primary hover:underline">Privacy Dashboard</a>.
              </p>
              
              <p className="text-xs text-muted-foreground">
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                {" · "}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                {" · "}
                <a href="/privacy-dashboard" className="text-primary hover:underline">Privacy Dashboard</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
