import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, LineChart, Sparkles } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="space-y-6 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <img src={logo} alt="HealthPilot" className="h-12 w-12" />
            <h1 className="text-4xl font-bold">HealthPilot</h1>
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
            Your AI-Powered Health Companion
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-md mx-auto lg:mx-0">
            Track biomarkers, analyze health records, get personalized meal plans and training schedules - all powered by AI.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Track Biomarkers</h3>
                <p className="text-sm text-muted-foreground">Monitor your health metrics over time</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">Get insights from your health data</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Personalized Plans</h3>
                <p className="text-sm text-muted-foreground">Custom meal and training schedules</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <LineChart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Track Progress</h3>
                <p className="text-sm text-muted-foreground">Visualize your health journey</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to HealthPilot</CardTitle>
            <CardDescription>
              Sign in to access your personalized health dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleLogin}
              className="w-full"
              size="lg"
              data-testid="button-login"
            >
              Sign In
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
