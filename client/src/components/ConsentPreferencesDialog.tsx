import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, MapPin, Monitor, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ConsentPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConsentType {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

const CONSENT_TYPES: ConsentType[] = [
  {
    key: "health_data",
    label: "Health Data Processing",
    description: "Allow processing of your health data, biomarkers, and activity tracking for personalized insights.",
    required: true,
  },
  {
    key: "ai_analysis",
    label: "AI Analysis",
    description: "Enable AI-powered analysis of your health data for personalized recommendations and insights.",
    required: true,
  },
  {
    key: "third_party",
    label: "Third-Party Integrations",
    description: "Allow integration with external services like Apple Health, wearables, and health platforms.",
    required: false,
  },
  {
    key: "marketing",
    label: "Marketing Communications",
    description: "Receive product updates, health tips, and promotional offers via email.",
    required: false,
  },
];

export function ConsentPreferencesDialog({ open, onOpenChange }: ConsentPreferencesDialogProps) {
  const { toast } = useToast();
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const initializedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/privacy/consent"],
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async (consents: Record<string, boolean>) => {
      return apiRequest("/api/privacy/consent", {
        method: "POST",
        body: JSON.stringify({ consents }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/privacy/consent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/privacy/audit-log"] });
      toast({
        title: "Consent Preferences Saved",
        description: "Your privacy preferences have been updated successfully.",
      });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Preferences",
        description: error.message || "Failed to update consent preferences.",
        variant: "destructive",
      });
    },
  });

  // Initialize consents from API data once when modal opens
  // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time initialization from server data with ref guard
  useEffect(() => {
    if (open && data?.consents && !initializedRef.current) {
      const initialConsents: Record<string, boolean> = {};
      CONSENT_TYPES.forEach((type) => {
        initialConsents[type.key] = data.consents[type.key]?.granted ?? type.required;
      });
      setConsents(initialConsents);
      setHasChanges(false);
      initializedRef.current = true;
    } else if (!open) {
      // Reset initialization flag when modal closes
      initializedRef.current = false;
    }
  }, [open, data]);

  const handleToggle = (key: string, required: boolean) => {
    if (required) return; // Can't toggle required consents
    
    setConsents(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(consents);
  };

  const handleCancel = () => {
    // Reset to original values
    if (data?.consents) {
      const originalConsents: Record<string, boolean> = {};
      CONSENT_TYPES.forEach((type) => {
        originalConsents[type.key] = data.consents[type.key]?.granted ?? type.required;
      });
      setConsents(originalConsents);
    }
    setHasChanges(false);
    onOpenChange(false);
  };

  const getConsentInfo = (key: string) => {
    return data?.consents?.[key];
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open && hasChanges) {
        // Warn before closing with unsaved changes
        const confirmed = window.confirm("You have unsaved changes. Are you sure you want to close?");
        if (!confirmed) return;
      }
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Manage Consent Preferences
          </DialogTitle>
          <DialogDescription>
            Control how your health data is processed and used
          </DialogDescription>
        </DialogHeader>

        {/* GDPR/HIPAA Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            Your privacy matters. These settings determine how we process your health information 
            in compliance with GDPR, HIPAA, PIPEDA, and Australia Privacy Act requirements.
          </p>
        </div>

        {/* Consent List */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            CONSENT_TYPES.map((consentType) => {
              const consentInfo = getConsentInfo(consentType.key);
              const isEnabled = consents[consentType.key] ?? false;

              return (
                <div 
                  key={consentType.key} 
                  className="border rounded-lg p-4 space-y-3"
                  data-testid={`consent-item-${consentType.key}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label 
                          htmlFor={consentType.key}
                          className="text-base font-medium cursor-pointer"
                        >
                          {consentType.label}
                        </Label>
                        {consentType.required && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {consentType.description}
                      </p>
                    </div>

                    <Switch
                      id={consentType.key}
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(consentType.key, consentType.required)}
                      disabled={consentType.required || saveMutation.isPending}
                      data-testid={`switch-${consentType.key}`}
                    />
                  </div>

                  {/* Consent History */}
                  {consentInfo && (
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        {isEnabled ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span className="text-muted-foreground">Granted:</span>
                            <span data-testid={`granted-at-${consentType.key}`}>
                              {consentInfo.grantedAt 
                                ? format(new Date(consentInfo.grantedAt), "MMM d, yyyy HH:mm")
                                : "N/A"}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 text-orange-600" />
                            <span className="text-muted-foreground">Revoked:</span>
                            <span data-testid={`revoked-at-${consentType.key}`}>
                              {consentInfo.revokedAt 
                                ? format(new Date(consentInfo.revokedAt), "MMM d, yyyy HH:mm")
                                : "N/A"}
                            </span>
                          </>
                        )}
                      </div>

                      {consentInfo.ipAddress && (
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">IP:</span>
                          <span className="font-mono" data-testid={`ip-${consentType.key}`}>
                            {consentInfo.ipAddress}
                          </span>
                        </div>
                      )}

                      {consentInfo.userAgent && (
                        <div className="flex items-center gap-2 text-xs">
                          <Monitor className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Device:</span>
                          <span 
                            className="truncate max-w-[300px]" 
                            title={consentInfo.userAgent}
                            data-testid={`user-agent-${consentType.key}`}
                          >
                            {consentInfo.userAgent.split(' ')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full gap-3">
            <p className="text-xs text-muted-foreground">
              All changes are logged for compliance
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saveMutation.isPending}
                data-testid="button-cancel-consent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
                data-testid="button-save-consent"
              >
                {saveMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
