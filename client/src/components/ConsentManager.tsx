import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

interface ConsentManagerProps {
  onConsentGiven: (consents: ConsentData) => void;
  isLoading?: boolean;
}

export interface ConsentData {
  healthDataProcessing: boolean;
  aiAnalysis: boolean;
  thirdPartyIntegrations: boolean;
  marketingCommunications: boolean;
}

export function ConsentManager({ onConsentGiven, isLoading = false }: ConsentManagerProps) {
  const [consents, setConsents] = useState<ConsentData>({
    healthDataProcessing: false,
    aiAnalysis: false,
    thirdPartyIntegrations: false,
    marketingCommunications: false,
  });

  const canProceed = consents.healthDataProcessing && consents.aiAnalysis;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Privacy & Consent</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          We take your privacy seriously. Please review and confirm your data processing preferences below.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-3">
          <Checkbox
            id="health-data"
            checked={consents.healthDataProcessing}
            onCheckedChange={(checked) =>
              setConsents({ ...consents, healthDataProcessing: checked as boolean })
            }
            data-testid="checkbox-health-data-consent"
          />
          <div className="flex-1">
            <Label htmlFor="health-data" className="font-semibold cursor-pointer">
              Health Data Processing <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              I consent to HealthPilot collecting and processing my health information 
              (biomarkers, workouts, sleep data, nutrition) to provide personalized health recommendations.
              This data is encrypted with AES-256 and protected under HIPAA and GDPR standards.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="ai-analysis"
            checked={consents.aiAnalysis}
            onCheckedChange={(checked) =>
              setConsents({ ...consents, aiAnalysis: checked as boolean })
            }
            data-testid="checkbox-ai-analysis-consent"
          />
          <div className="flex-1">
            <Label htmlFor="ai-analysis" className="font-semibold cursor-pointer">
              AI-Powered Analysis <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              I consent to AI-powered analysis of my health data to generate personalized 
              insights, training plans, and nutrition recommendations. OpenAI processes 
              this data under a Business Associate Agreement (BAA) with bank-level encryption.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="third-party"
            checked={consents.thirdPartyIntegrations}
            onCheckedChange={(checked) =>
              setConsents({ ...consents, thirdPartyIntegrations: checked as boolean })
            }
            data-testid="checkbox-third-party-consent"
          />
          <div className="flex-1">
            <Label htmlFor="third-party" className="font-semibold cursor-pointer">
              Third-Party Integrations (Optional)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              I consent to sharing my health data with third-party services I choose to 
              connect (Apple Health, Google Fit). You can revoke this at any time in your 
              Privacy Dashboard.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="marketing"
            checked={consents.marketingCommunications}
            onCheckedChange={(checked) =>
              setConsents({ ...consents, marketingCommunications: checked as boolean })
            }
            data-testid="checkbox-marketing-consent"
          />
          <div className="flex-1">
            <Label htmlFor="marketing" className="font-semibold cursor-pointer">
              Marketing Communications (Optional)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              I consent to receive emails about new features, health tips, and special offers. 
              You can unsubscribe anytime from your settings or email links.
            </p>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <Button
            onClick={() => onConsentGiven(consents)}
            disabled={!canProceed || isLoading}
            className="w-full"
            data-testid="button-consent-submit"
          >
            {isLoading ? "Saving..." : "Continue with Selected Preferences"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            <span className="text-destructive">*</span> Required to use HealthPilot services
          </p>

          <p className="text-xs text-muted-foreground text-center">
            By continuing, you acknowledge that you have read our{" "}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> and{" "}
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>. 
            You can manage these preferences anytime in your{" "}
            <a href="/privacy-dashboard" className="text-primary hover:underline">Privacy Dashboard</a>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
