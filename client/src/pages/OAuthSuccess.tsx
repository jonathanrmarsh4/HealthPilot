import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft } from "lucide-react";
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
          <div className="bg-[#00E0C6]/10 border border-[#00E0C6]/30 rounded-lg p-6">
            <p className="text-white font-semibold text-lg mb-3">Next Step:</p>
            <p className="text-base text-white mb-4">
              Tap the blue <strong>"Done"</strong> button at the top-left corner of this screen
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
              <ArrowLeft className="h-5 w-5" />
              <span>Look for "Done" in the top-left</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            The app will automatically log you in once you close this browser
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
