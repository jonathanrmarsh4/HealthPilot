import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";

export default function OAuthSuccess() {
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
          <div className="bg-[#00E0C6]/10 border border-[#00E0C6]/30 rounded-lg p-4">
            <p className="text-white font-semibold mb-2">Next Step:</p>
            <p className="text-sm text-gray-300">
              Tap the <strong>Done</strong> or <strong>×</strong> button at the top of this screen to close this browser and return to the app.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <X className="h-4 w-4" />
            <span>Look for the close button above</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
