import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

const featureDescriptions: Record<string, { title: string; description: string; benefits: string[] }> = {
  chat: {
    title: "Unlimited AI Chat",
    description: "Get unlimited conversations with your AI health coach, plus voice chat support.",
    benefits: [
      "Unlimited daily messages",
      "Voice chat with AI coach",
      "Priority response times",
      "Advanced health insights"
    ]
  },
  mealPlans: {
    title: "AI Meal Plans",
    description: "Get personalized, AI-generated meal plans based on your health data and goals.",
    benefits: [
      "Weekly AI meal planning",
      "Health-optimized recipes",
      "Macro tracking",
      "Dietary preference matching"
    ]
  },
  biologicalAge: {
    title: "Biological Age",
    description: "Calculate your biological age using advanced PhenoAge algorithms.",
    benefits: [
      "PhenoAge calculation",
      "Track aging trends",
      "Compare to chronological age",
      "Personalized longevity insights"
    ]
  },
  appleHealthSync: {
    title: "Apple Health Sync",
    description: "Automatically sync your health data from Apple Health for seamless tracking.",
    benefits: [
      "Automatic data sync",
      "Native HealthKit integration",
      "Real-time updates",
      "Complete workout tracking"
    ]
  },
  supplements: {
    title: "Supplement Tracking",
    description: "Track supplements with AI-powered recommendations and daily reminders.",
    benefits: [
      "AI supplement recommendations",
      "Daily reminder notifications",
      "Streak tracking",
      "Interaction warnings"
    ]
  },
  voiceChat: {
    title: "Voice Chat",
    description: "Have natural voice conversations with your AI health coach.",
    benefits: [
      "Two-way voice chat",
      "Natural conversations",
      "Real-time responses",
      "Hands-free coaching"
    ]
  },
  unlimitedBiomarkers: {
    title: "Unlimited Biomarkers",
    description: "Track unlimited biomarker types with full historical data.",
    benefits: [
      "Unlimited biomarker types",
      "Full historical data",
      "Advanced trend analysis",
      "Custom biomarkers"
    ]
  }
};

export function UpgradePrompt({ open, onOpenChange, feature }: UpgradePromptProps) {
  const [, setLocation] = useLocation();
  
  const featureInfo = featureDescriptions[feature] || {
    title: "Premium Feature",
    description: "Unlock this premium feature and many more.",
    benefits: [
      "Unlimited AI chat",
      "AI meal plans",
      "Apple Health sync",
      "Biological age calculation"
    ]
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    setLocation("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-upgrade-prompt">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <DialogTitle className="text-xl" data-testid="text-upgrade-title">
              {featureInfo.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base" data-testid="text-upgrade-description">
            {featureInfo.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 my-4">
          {featureInfo.benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3" data-testid={`benefit-${index}`}>
              <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-foreground">{benefit}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={handleUpgrade} size="lg" className="w-full" data-testid="button-view-pricing">
            View Pricing
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            size="lg"
            data-testid="button-cancel-upgrade"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
