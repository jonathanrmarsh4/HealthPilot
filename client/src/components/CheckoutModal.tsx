import { useState, useEffect } from "react";
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
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { StripePaymentForm } from "./StripePaymentForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: SubscriptionTier;
  tierName: string;
}

interface PromoCodeResponse {
  valid: boolean;
  code?: string;
  discountPercent?: number;
  description?: string;
  error?: string;
}

export function CheckoutModal({ open, onOpenChange, tier: initialTier, tierName }: CheckoutModalProps) {
  const [tier, setTier] = useState<SubscriptionTier>(initialTier);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [validatedPromo, setValidatedPromo] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isLoadingIntent, setIsLoadingIntent] = useState(false);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [subscriptionCreationFailed, setSubscriptionCreationFailed] = useState(false);
  const { toast } = useToast();

  const validatePromoMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest<PromoCodeResponse>("/api/checkout/validate-promo", {
        method: "POST",
        body: JSON.stringify({ code, tier }),
      });
    },
    onSuccess: (data) => {
      if (data.valid) {
        setValidatedPromo(data);
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
    onError: (error: any) => {
      toast({
        title: "Invalid promo code",
        description: error.message,
        variant: "destructive",
      });
      setValidatedPromo(null);
    },
  });

  const handleProceedToPayment = async () => {
    setIsLoadingIntent(true);
    try {
      const response = await apiRequest<{ clientSecret: string; paymentIntentId: string; amount: number; discount: number }>(
        "/api/stripe/create-payment-intent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tier,
            billingCycle,
            promoCode: validatedPromo?.code,
          }),
        }
      );

      setClientSecret(response.clientSecret);
      setPaymentIntentId(response.paymentIntentId);
      setShowPaymentForm(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive",
      });
    } finally {
      setIsLoadingIntent(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!paymentIntentId) {
      toast({
        title: "Error",
        description: "Payment Intent ID missing. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingSubscription(true);
    setSubscriptionCreationFailed(false); // Reset failure state on retry
    
    try {
      // Call backend to create subscription - this is idempotent
      await apiRequest("/api/stripe/confirm-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId,
        }),
      });

      // Only show success and close modal after subscription is confirmed
      toast({
        title: "Payment successful!",
        description: "Your subscription is now active.",
      });
      
      await queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onOpenChange(false);
      setShowPaymentForm(false);
      setClientSecret(null);
      setPaymentIntentId(null);
      setSubscriptionCreationFailed(false);
    } catch (error: any) {
      // Keep modal open so user can retry
      setSubscriptionCreationFailed(true);
      toast({
        title: "Subscription activation failed",
        description: `Payment succeeded but subscription setup failed: ${error.message || "Unknown error"}. Please click "Retry Activation" below or contact support.`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment failed",
      description: error,
      variant: "destructive",
    });
  };

  const pricing = paymentService.calculatePrice(
    tier,
    billingCycle,
    validatedPromo?.discountPercent
  );

  // Reset payment form when modal closes
  useEffect(() => {
    if (!open) {
      setShowPaymentForm(false);
      setClientSecret(null);
      setPaymentIntentId(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-checkout">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {showPaymentForm ? "Complete Payment" : `Upgrade to ${tierName}`}
          </DialogTitle>
          <DialogDescription>
            {showPaymentForm ? "Enter your payment details" : "Start your 7-day free trial, cancel anytime"}
          </DialogDescription>
        </DialogHeader>

        {!showPaymentForm ? (
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
              onClick={handleProceedToPayment}
              disabled={isLoadingIntent}
              data-testid="button-start-trial"
            >
              {isLoadingIntent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Continue to Payment"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Stripe
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payment Summary */}
            <div className="rounded-lg border p-3 space-y-1 bg-secondary/20">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {tierName} - {billingCycle === "monthly" ? "Monthly" : "Annual"}
                </span>
                <span className="font-semibold">${pricing.finalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Embedded Stripe Payment Form */}
            {clientSecret && !subscriptionCreationFailed && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                  },
                }}
              >
                <StripePaymentForm
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  amount={pricing.finalPrice}
                  tier={tier}
                  billingCycle={billingCycle}
                />
              </Elements>
            )}

            {/* Subscription Creation Failed - Show Retry */}
            {subscriptionCreationFailed && (
              <div className="space-y-3">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive">Payment succeeded but subscription activation failed</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your payment was processed successfully, but we encountered an error setting up your subscription.
                    Please try activating again or contact support if the problem persists.
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePaymentSuccess}
                  disabled={isCreatingSubscription}
                  data-testid="button-retry-activation"
                >
                  {isCreatingSubscription ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Retry Activation"
                  )}
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={() => {
                setShowPaymentForm(false);
                setClientSecret(null);
                setSubscriptionCreationFailed(false);
              }}
              className="w-full"
              data-testid="button-back"
              disabled={isCreatingSubscription}
            >
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
