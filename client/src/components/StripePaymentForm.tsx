import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StripePaymentFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  amount: number;
  tier: string;
  billingCycle: string;
}

export function StripePaymentForm({ onSuccess, onError, amount, tier, billingCycle }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/?upgrade=success`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        onSuccess();
        toast({
          title: "Payment successful!",
          description: "Your subscription is now active.",
        });
      }
    } catch (err: any) {
      onError(err.message || "An unexpected error occurred");
      toast({
        title: "Payment error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </Button>
    </form>
  );
}
