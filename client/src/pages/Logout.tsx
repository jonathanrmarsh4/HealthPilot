import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import logo from "@assets/HealthPilot_Logo_1759904141260.png";

export default function Logout() {
  const handleReturnHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="HealthPilot" className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl">You&apos;ve been logged out</CardTitle>
          <CardDescription>
            Thank you for using HealthPilot. Your session has ended successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleReturnHome}
            className="w-full"
            data-testid="button-return-home"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
