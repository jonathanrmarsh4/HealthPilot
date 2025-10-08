import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";

export default function Logout() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="HealthPilot" className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl">You've been logged out</CardTitle>
          <CardDescription>
            Your session has been ended successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>To see the login page as a new user:</p>
            <ul className="list-disc list-inside text-left max-w-xs mx-auto">
              <li>Open a private/incognito window</li>
              <li>Or clear your browser cookies</li>
            </ul>
          </div>
          
          <Button
            onClick={handleLogin}
            className="w-full"
            data-testid="button-login-again"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign in again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
