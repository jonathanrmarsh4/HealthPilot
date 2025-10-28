import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";
import { Browser } from '@capacitor/browser';
import { isNativePlatform } from "@/mobile/MobileBootstrap";

export default function MobileAuthRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Redirect to app URL scheme
      window.location.href = `healthpilot://auth?token=${token}`;
      
      // Close the browser after a short delay
      setTimeout(() => {
        if (isNativePlatform()) {
          Browser.close();
        }
      }, 1000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="HealthPilot" className="h-16 w-16" />
          </div>
          <div className="flex justify-center mb-4">
            <Loader2 className="h-16 w-16 text-[#00E0C6] animate-spin" />
          </div>
          <CardTitle className="text-2xl text-white">Completing Login...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-400">
            Redirecting you back to the app...
          </p>
          <p className="text-sm text-gray-500">
            If prompted, tap "Open" to continue to HealthPilot
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
