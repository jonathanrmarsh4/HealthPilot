import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const plans = [
  {
    name: "Free",
    tier: "free",
    icon: Zap,
    price: "$0",
    period: "forever",
    description: "Get started with basic health tracking",
    features: [
      { text: "10 AI chat messages per day", included: true },
      { text: "Track up to 3 biomarker types", included: true },
      { text: "7 days of historical data", included: true },
      { text: "Manual data entry", included: true },
      { text: "Basic health insights", included: true },
      { text: "AI meal plans", included: false },
      { text: "Apple Health sync", included: false },
      { text: "Biological age calculation", included: false },
      { text: "Voice chat with AI coach", included: false },
    ],
    cta: "Current Plan",
    ctaVariant: "outline" as const,
  },
  {
    name: "Premium",
    tier: "premium",
    icon: Sparkles,
    price: "$19.99",
    period: "per month",
    description: "Unlock AI-powered health optimization",
    popular: true,
    features: [
      { text: "Unlimited AI chat messages", included: true },
      { text: "Track unlimited biomarker types", included: true },
      { text: "Full historical data access", included: true },
      { text: "Voice chat with AI coach", included: true },
      { text: "AI-generated meal plans", included: true },
      { text: "Apple Health sync", included: true },
      { text: "Biological age calculation", included: true },
      { text: "Advanced readiness score", included: true },
      { text: "Supplement tracking & reminders", included: true },
      { text: "AI training recommendations", included: true },
    ],
    cta: "Upgrade to Premium",
    ctaVariant: "default" as const,
  },
  {
    name: "Enterprise",
    tier: "enterprise",
    icon: Crown,
    price: "Custom",
    period: "contact us",
    description: "For teams and organizations",
    features: [
      { text: "Everything in Premium", included: true },
      { text: "Team management", included: true },
      { text: "Custom integrations", included: true },
      { text: "Priority support", included: true },
      { text: "HIPAA compliance", included: true },
      { text: "Custom data retention", included: true },
      { text: "Advanced analytics", included: true },
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const { data: user } = useQuery<{ subscriptionTier: string; role?: string }>({
    queryKey: ["/api/user"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (tier: string) => {
      const res = await apiRequest<{ sessionUrl: string }>("/api/stripe/create-checkout", {
        method: "POST",
        body: JSON.stringify({ tier }),
        headers: { "Content-Type": "application/json" },
      });
      return res;
    },
    onSuccess: (data) => {
      window.location.href = data.sessionUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
      setLoadingTier(null);
    },
  });

  const handleUpgrade = async (tier: string) => {
    if (tier === "free") {
      return;
    }

    if (tier === "enterprise") {
      window.location.href = "mailto:sales@healthinsights.ai?subject=Enterprise Inquiry";
      return;
    }

    setLoadingTier(tier);
    checkoutMutation.mutate(tier);
  };

  // Admins are treated as enterprise tier
  const currentTier = user?.role === "admin" ? "enterprise" : (user?.subscriptionTier || "free");

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-subtitle">
            Unlock AI-powered health insights and personalized recommendations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentTier === plan.tier;
            const isPremiumOrHigher = currentTier === "premium" || currentTier === "enterprise";
            const isDowngrade = (plan.tier === "free" && isPremiumOrHigher);
            
            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col ${
                  plan.popular ? "border-primary shadow-lg" : ""
                }`}
                data-testid={`card-plan-${plan.tier}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1" data-testid="badge-popular">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-6 h-6 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                    <CardTitle className="text-2xl" data-testid={`text-plan-name-${plan.tier}`}>
                      {plan.name}
                    </CardTitle>
                  </div>
                  <div className="mb-2">
                    <span className="text-4xl font-bold" data-testid={`text-price-${plan.tier}`}>
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground ml-2">/{plan.period}</span>
                  </div>
                  <CardDescription data-testid={`text-description-${plan.tier}`}>
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2"
                        data-testid={`feature-${plan.tier}-${idx}`}
                      >
                        {feature.included ? (
                          <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                        ) : (
                          <div className="rounded-full bg-muted p-1 mt-0.5">
                            <Check className="w-3 h-3 text-muted-foreground opacity-30" />
                          </div>
                        )}
                        <span
                          className={`text-sm ${
                            feature.included ? "text-foreground" : "text-muted-foreground line-through"
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    variant={isCurrentPlan ? "outline" : plan.ctaVariant}
                    size="lg"
                    className="w-full"
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={isCurrentPlan || isDowngrade || loadingTier === plan.tier}
                    data-testid={`button-select-${plan.tier}`}
                  >
                    {loadingTier === plan.tier
                      ? "Loading..."
                      : isCurrentPlan
                      ? "Current Plan"
                      : isDowngrade
                      ? "Contact Support"
                      : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            All plans include secure data encryption and privacy protection
          </p>
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-back-dashboard"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
