import { AlertTriangle, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SafetyEscalationBannerProps {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  matchedKeywords?: string[];
  onDismiss: () => void;
}

export function SafetyEscalationBanner({
  riskLevel,
  message,
  matchedKeywords,
  onDismiss
}: SafetyEscalationBannerProps) {
  // Determine styling based on risk level
  const isCritical = riskLevel === 'critical';
  const isHighOrCritical = riskLevel === 'high' || riskLevel === 'critical';
  
  const bgColor = isCritical 
    ? 'bg-red-600 dark:bg-red-700' 
    : isHighOrCritical
    ? 'bg-orange-600 dark:bg-orange-700'
    : 'bg-yellow-600 dark:bg-yellow-700';
    
  const borderColor = isCritical
    ? 'border-red-500'
    : isHighOrCritical
    ? 'border-orange-500'
    : 'border-yellow-500';

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 p-4 shadow-lg"
      data-testid="safety-escalation-banner"
    >
      <Card className={`${bgColor} ${borderColor} border-2 text-white`}>
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Alert Icon */}
            <div className={`p-3 rounded-full ${isCritical ? 'bg-red-800' : isHighOrCritical ? 'bg-orange-800' : 'bg-yellow-800'} flex-shrink-0`}>
              <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
              {/* Main Message */}
              <div>
                <h3 className="font-bold text-lg mb-2" data-testid="safety-message">
                  {isCritical ? 'EMERGENCY - IMMEDIATE ACTION REQUIRED' : isHighOrCritical ? 'URGENT MEDICAL ATTENTION NEEDED' : 'Health Advisory'}
                </h3>
                <p className="text-sm font-medium whitespace-pre-wrap">
                  {message}
                </p>
              </div>

              {/* Emergency Resources - only for high/critical */}
              {isHighOrCritical && (
                <div className="bg-white/10 rounded-lg p-3 space-y-2">
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Emergency Resources:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Emergency:</strong> 911
                    </div>
                    <div>
                      <strong>Crisis Hotline:</strong> 988
                    </div>
                    <div className="sm:col-span-2">
                      <strong>Poison Control:</strong> 1-800-222-1222
                    </div>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-xs opacity-90">
                HealthPilot AI is not a medical professional. This alert is based on keyword detection. Always consult qualified healthcare providers for medical advice.
              </p>

              {/* Debug info (optional, hidden in production) */}
              {matchedKeywords && matchedKeywords.length > 0 && (
                <p className="text-xs opacity-70">
                  Keywords detected: {matchedKeywords.join(', ')}
                </p>
              )}
            </div>

            {/* Dismiss Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={onDismiss}
              className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
              data-testid="button-dismiss-safety-banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
