import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";

export default function OAuthSuccess() {
  useEffect(() => {
    setTimeout(() => {
      window.location.href = "healthpilot://oauth-success";
    }, 500);
  }, []);

  const handleManualReturn = () => {
    window.location.href = "healthpilot://oauth-success";
  };

  return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="HealthPilot" className="h-16 w-16" />
          </div>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-[#00E0C6]" />
          </div>
          <CardTitle className="text-2xl text-white">Login Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-400">
            You've successfully logged in to HealthPilot.
          </p>
          <p className="text-sm text-gray-500">
            Returning to the app...
          </p>
          <Button
            onClick={handleManualReturn}
            className="w-full bg-[#00E0C6] text-[#0A0F1F] hover:bg-[#00E0C6]/90"
            data-testid="button-return-to-app"
          >
            Return to App
          </Button>
          <p className="text-xs text-gray-600">
            If the app doesn't open automatically, tap the button above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
