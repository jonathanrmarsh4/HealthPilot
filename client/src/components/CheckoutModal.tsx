import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { paymentService, type SubscriptionTier, type BillingCycle } from "@/services/payment";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTier?: SubscriptionTier;
}

export function CheckoutModal({ isOpen, onClose, defaultTier = "premium" }: CheckoutModalProps) {
  const [tier, setTier] = useState<SubscriptionTier>(defaultTier);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [validatedPromo, setValidatedPromo] = useState<{ code: string; discountPercent: number; description: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const validatePromoMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("/api/checkout/validate-promo", {
        method: "POST",
        body: JSON.stringify({ code, tier }),
      });
      return response.json();
    },
    onSuccess: (data: { valid?: boolean; discountPercent?: number; description?: string; error?: string; code?: string }) => {
      if (data.valid && data.code && data.discountPercent && data.description) {
        setValidatedPromo({ code: data.code, discountPercent: data.discountPercent, description: data.description });
        toast({
          title: "Promo code applied!",
          description: `${data.discountPercent}% discount: ${data.description}`,
        });
      } else {
        setValidatedPromo(null);
        toast({
          title: "Invalid promo code",
          description: data.error || "This promo code is not valid",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid promo code",
        description: error.message,
        variant: "destructive",
      });
      setValidatedPromo(null);
    },
  });

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      const result = await paymentService.initiatePayment({
        tier,
        billingCycle,
        promoCode: validatedPromo?.code,
      });

      if (result.success) {
        // If iOS native payment completed, refresh user data and close modal
        if (result.subscriptionId) {
          toast({
            title: "Subscription activated!",
            description: "Your premium features are now unlocked.",
          });
          await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          onClose();
        }
        // If web checkout, redirect happens automatically in paymentService
      } else {
        toast({
          title: "Payment failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pricing = paymentService.calculatePrice(
    tier,
    billingCycle,
    validatedPromo?.discountPercent
  );

  const tierName = tier === "premium" ? "Premium" : "Enterprise";
  const paymentPlatform = paymentService.getPaymentPlatform();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          {/* Tier Selection */}
          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={tier === "premium" ? "default" : "outline"}
                onClick={() => setTier("premium")}
                data-testid="button-premium"
              >
                Premium
              </Button>
              <Button
                variant={tier === "enterprise" ? "default" : "outline"}
                onClick={() => setTier("enterprise")}
                data-testid="button-enterprise"
              >
                Enterprise
              </Button>
            </div>
          </div>

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
              <span className="font-medium">${pricing.basePrice.toFixed(2)}</span>
            </div>
            {pricing.savingsPercent && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Annual discount ({pricing.savingsPercent}%)</span>
                <span>Included</span>
              </div>
            )}
            {pricing.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Promo: {validatedPromo.code}</span>
                <span>-${pricing.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>First Payment</span>
              <span>${pricing.finalPrice.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              7-day free trial, then ${pricing.basePrice.toFixed(2)}/{billingCycle === "monthly" ? "month" : "year"}
            </p>
          </div>

          {/* CTA */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={isProcessing}
            data-testid="button-start-trial"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {paymentPlatform === "Apple Pay" ? "Pay with Apple Pay" : "Start 7-Day Free Trial"}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {paymentPlatform === "Apple Pay" 
              ? "Secure payment via Apple Pay"
              : "Cancel anytime during trial, no charges"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
