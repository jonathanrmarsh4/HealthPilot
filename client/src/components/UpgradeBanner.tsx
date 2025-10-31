import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { CheckoutModal } from "./CheckoutModal";
import { paymentService } from "@/services/payment";

export function UpgradeBanner() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentPlatform, setPaymentPlatform] = useState<string>("Credit Card");

  useEffect(() => {
    const detectPaymentMethod = async () => {
      const platform = paymentService.getPaymentPlatform();
      setPaymentPlatform(platform);
    };
    detectPaymentMethod();
  }, []);

  return (
    <>
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
            <Button 
              onClick={() => setShowCheckout(true)} 
              data-testid="button-upgrade-now"
            >
              {paymentPlatform === "Apple Pay" ? "Pay with Apple Pay" : "Upgrade Now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
      />
    </>
  );
}
