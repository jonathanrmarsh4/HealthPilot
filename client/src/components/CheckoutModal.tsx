import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: "premium" | "enterprise";
  tierName: string;
}

export function CheckoutModal({ open, onOpenChange, tier, tierName }: CheckoutModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [validatedPromo, setValidatedPromo] = useState<any>(null);
  const { toast } = useToast();

  const pricing = {
    premium: {
      monthly: 19.99,
      annual: 191.88, // 20% off
    },
    enterprise: {
      monthly: 99.99,
      annual: 959.88, // 20% off
    },
  };

  const validatePromoMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest<any>("/api/checkout/validate-promo", {
        method: "POST",
        body: JSON.stringify({ code, tier }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (data) => {
      if (data.valid) {
        setValidatedPromo(data);
        toast({
          title: "Promo code applied!",
          description: `${data.discountPercent}% discount: ${data.description}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Invalid promo code",
        description: error.message,
        variant: "destructive",
      });
      setValidatedPromo(null);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ sessionUrl: string }>("/api/stripe/create-checkout", {
        method: "POST",
        body: JSON.stringify({
          tier,
          billingCycle,
          promoCode: validatedPromo?.code || undefined,
        }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (data) => {
      window.location.href = data.sessionUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const price = pricing[tier][billingCycle];
  const savings = billingCycle === "annual" ? Math.round(((pricing[tier].monthly * 12) - pricing[tier].annual) * 100) / 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-checkout">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Upgrade to {tierName}
          </DialogTitle>
          <DialogDescription>
            Start your 7-day free trial, cancel anytime
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Billing Cycle Toggle */}
          <div className="space-y-2">
            <Label>Billing Cycle</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={billingCycle === "monthly" ? "default" : "outline"}
                onClick={() => setBillingCycle("monthly")}
                data-testid="button-monthly"
              >
                Monthly
              </Button>
              <Button
                variant={billingCycle === "annual" ? "default" : "outline"}
                onClick={() => setBillingCycle("annual")}
                className="relative"
                data-testid="button-annual"
              >
                Annual
                <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
                  Save 20%
                </Badge>
              </Button>
            </div>
          </div>

          {/* Promo Code */}
          <div className="space-y-2">
            <Label htmlFor="promo">Promo Code (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="promo"
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                data-testid="input-promo"
              />
              <Button
                variant="outline"
                onClick={() => validatePromoMutation.mutate(promoCode)}
                disabled={!promoCode || validatePromoMutation.isPending}
                data-testid="button-apply-promo"
              >
                Apply
              </Button>
            </div>
            {validatedPromo && (
              <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                {validatedPromo.discountPercent}% off first payment
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="rounded-lg border p-4 space-y-2 bg-secondary/20">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {tierName} - {billingCycle === "monthly" ? "Monthly" : "Annual"}
              </span>
              <span className="font-medium">${price.toFixed(2)}</span>
            </div>
            {billingCycle === "annual" && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Annual discount (20%)</span>
                <span>-${savings.toFixed(2)}</span>
              </div>
            )}
            {validatedPromo && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Promo: {validatedPromo.code}</span>
                <span>-{validatedPromo.discountPercent}%</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>First Payment</span>
              <span>
                $
                {validatedPromo
                  ? (price * (1 - validatedPromo.discountPercent / 100)).toFixed(2)
                  : price.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              7-day free trial, then ${price}/{billingCycle === "monthly" ? "month" : "year"}
            </p>
          </div>

          {/* CTA */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            data-testid="button-start-trial"
          >
            {checkoutMutation.isPending ? "Loading..." : "Start 7-Day Free Trial"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime during trial, no charges
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
