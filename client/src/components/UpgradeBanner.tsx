import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export function UpgradeBanner() {
  const [, setLocation] = useLocation();

  return (
    <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5" data-testid="card-upgrade-banner">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-1">Unlock Premium Features</h3>
              <p className="text-sm text-muted-foreground">
                Get unlimited AI messages, voice chat, meal plans, and more with Premium
              </p>
            </div>
          </div>
          <Button onClick={() => setLocation("/pricing")} data-testid="button-upgrade-now">
            Upgrade Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
