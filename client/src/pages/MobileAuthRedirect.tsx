import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";
import { Preferences } from '@capacitor/preferences';

export default function MobileAuthRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    console.log('[MobileAuthRedirect] Token received:', token ? 'yes' : 'no');
    
    if (token) {
      // Store token in Preferences so the app can pick it up
      Preferences.set({ key: 'pendingAuthToken', value: token })
        .then(() => {
          console.log('[MobileAuthRedirect] Token stored in Preferences');
          // Show success message
          window.document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-center; height: 100vh; background: #0A0F1F; color: white; text-align: center; font-family: system-ui;">
              <div>
                <h1 style="font-size: 24px; margin-bottom: 16px;">✅ Authentication Complete!</h1>
                <p style="color: #00E0C6; font-size: 18px;">You can close this tab and return to the app</p>
              </div>
            </div>
          `;
        })
        .catch(err => {
          console.error('[MobileAuthRedirect] Error storing token:', err);
        });
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
