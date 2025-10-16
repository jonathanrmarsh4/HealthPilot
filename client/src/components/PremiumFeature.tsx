import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradePrompt } from "./UpgradePrompt";
import { useQuery } from "@tanstack/react-query";

interface PremiumFeatureProps {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
  showLock?: boolean;
  lockMessage?: string;
}

export function PremiumFeature({ 
  children, 
  feature, 
  fallback,
  showLock = true,
  lockMessage = "This is a premium feature"
}: PremiumFeatureProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: user } = useQuery<{ subscriptionTier: string; role?: string }>({
    queryKey: ["/api/auth/user"],
  });

  const isPremium = user?.subscriptionTier === "premium" || user?.subscriptionTier === "enterprise" || user?.role === "admin";

  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showLock) {
    return (
      <>
        <div 
          className="relative group cursor-pointer"
          onClick={() => setShowUpgrade(true)}
          data-testid={`premium-lock-${feature}`}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 hover-elevate active-elevate-2">
            <Lock className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground font-medium">{lockMessage}</p>
            <Button size="sm" className="mt-3" data-testid="button-upgrade-prompt">
              Upgrade to Premium
            </Button>
          </div>
          <div className="opacity-30 pointer-events-none">
            {children}
          </div>
        </div>
        <UpgradePrompt 
          open={showUpgrade} 
          onOpenChange={setShowUpgrade}
          feature={feature}
        />
      </>
    );
  }

  return null;
}
