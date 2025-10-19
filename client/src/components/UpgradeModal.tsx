import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Lock, TrendingUp, MessageSquare } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: "voice-chat" | "ai-messages" | "biomarkers" | "historical-data" | "advanced-features";
  currentUsage?: number;
  limit?: number;
}

const FEATURE_CONFIG = {
  "voice-chat": {
    icon: MessageSquare,
    title: "Unlock Voice Chat with AI Coach",
    description: "Get real-time voice coaching with personalized feedback and conversational guidance.",
    benefits: [
      "Natural voice conversations with AI coach",
      "Hands-free workout coaching",
      "Real-time form feedback and motivation",
      "Personalized insights based on your progress",
    ],
  },
  "ai-messages": {
    icon: Sparkles,
    title: "Unlimited AI Messages",
    description: "You've reached your monthly limit of 50 AI messages. Upgrade to continue chatting.",
    benefits: [
      "Unlimited AI chat messages",
      "24/7 access to your AI health coach",
      "Personalized workout and nutrition guidance",
      "Priority response times",
    ],
  },
  "biomarkers": {
    icon: TrendingUp,
    title: "Track Unlimited Biomarkers",
    description: "Free tier is limited to 3 biomarker types. Upgrade to track comprehensive health metrics.",
    benefits: [
      "Track unlimited biomarker types",
      "Advanced health insights and trends",
      "Comprehensive blood work analysis",
      "Correlations across multiple metrics",
    ],
  },
  "historical-data": {
    icon: TrendingUp,
    title: "Access Full Historical Data",
    description: "Free tier shows 7 days of data. Unlock unlimited history to see long-term trends.",
    benefits: [
      "Unlimited historical data access",
      "Long-term trend analysis",
      "Compare progress over months/years",
      "Advanced pattern recognition",
    ],
  },
  "advanced-features": {
    icon: Lock,
    title: "Unlock Premium Features",
    description: "This feature is only available on Premium and Enterprise plans.",
    benefits: [
      "AI-generated meal plans",
      "Biological age calculation",
      "Apple Health sync",
      "Advanced analytics and insights",
    ],
  },
};

export function UpgradeModal({
  open,
  onOpenChange,
  feature = "advanced-features",
  currentUsage,
  limit,
}: UpgradeModalProps) {
  const config = FEATURE_CONFIG[feature];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-upgrade">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs">
              Premium Feature
            </Badge>
          </div>
          <DialogTitle className="text-xl">{config.title}</DialogTitle>
          <DialogDescription className="text-base">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        {feature === "ai-messages" && currentUsage !== undefined && limit !== undefined && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Usage</span>
              <span className="text-sm text-muted-foreground">
                {currentUsage} / {limit} messages
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Premium Benefits:
          </h4>
          <ul className="space-y-2">
            {config.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Link href="/pricing">
            <Button className="w-full" data-testid="button-view-pricing">
              <Sparkles className="mr-2 h-4 w-4" />
              View Pricing Plans
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-modal"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
