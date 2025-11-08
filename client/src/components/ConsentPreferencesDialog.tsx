import { useState, useMemo } from "react";
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
import { CheckCircle2, ShieldCheck } from "lucide-react";
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

interface ConsentInfo {
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  ipAddress?: string;
  userAgent?: string;
}

// Internal component with form logic - remounts when dialog opens
function ConsentForm({ 
  serverConsents, 
  onSave, 
  onCancel,
  data 
}: { 
  serverConsents: Record<string, boolean>; 
  onSave: (consents: Record<string, boolean>) => void;
  onCancel: () => void;
  data: {
    consents?: Record<string, ConsentInfo>;
  } | undefined;
}) {
  // Initialize local state from server consents
  const [consents, setConsents] = useState<Record<string, boolean>>(serverConsents);
  
  // Derive hasChanges by comparing to server state
  const hasChanges = useMemo(() => {
    return JSON.stringify(consents) !== JSON.stringify(serverConsents);
  }, [consents, serverConsents]);

  const handleToggle = (key: string, required: boolean) => {
    if (required) return; // Can't toggle required consents
    
    setConsents(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    onSave(consents);
  };

  const handleCancel = () => {
    onCancel();
  };

  const getConsentInfo = (key: string) => {
    return data?.consents?.[key];
  };

  return (
    <>
      {/* Consent List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {CONSENT_TYPES.map((consentType) => {
          const info = getConsentInfo(consentType.key);
          const isGranted = consents[consentType.key] ?? consentType.required;

          return (
            <div
              key={consentType.key}
              className="border rounded-lg p-4 space-y-3"
              data-testid={`consent-item-${consentType.key}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`consent-${consentType.key}`} className="font-medium">
                      {consentType.label}
                    </Label>
                    {consentType.required && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {isGranted && !consentType.required && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {consentType.description}
                  </p>
                  {info && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>
                        Granted: {info.grantedAt ? format(new Date(info.grantedAt), "PP") : "N/A"}
                      </span>
                      {info.revokedAt && (
                        <span className="text-destructive">
                          Revoked: {format(new Date(info.revokedAt), "PP")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Switch
                  id={`consent-${consentType.key}`}
                  checked={isGranted}
                  onCheckedChange={() => handleToggle(consentType.key, consentType.required)}
                  disabled={consentType.required}
                  data-testid={`switch-${consentType.key}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={handleCancel}
          data-testid="button-cancel-consent"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          data-testid="button-save-consent"
        >
          Save Preferences
        </Button>
      </DialogFooter>
    </>
  );
}

export function ConsentPreferencesDialog({ open, onOpenChange }: ConsentPreferencesDialogProps) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ consents?: Record<string, ConsentInfo> }>({
    queryKey: ["/api/privacy/consent"],
    enabled: open,
  });
  
  // Compute server consents from data
  const serverConsents = useMemo(() => {
    const result: Record<string, boolean> = {};
    CONSENT_TYPES.forEach((type) => {
      result[type.key] = data?.consents?.[type.key]?.granted ?? type.required;
    });
    return result;
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (consents: Record<string, boolean>) => {
      const response = await apiRequest("/api/privacy/consent", {
        method: "POST",
        body: JSON.stringify({ consents }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/privacy/consent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/privacy/audit-log"] });
      toast({
        title: "Consent Preferences Saved",
        description: "Your privacy preferences have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Preferences",
        description: error.message || "Failed to update consent preferences.",
        variant: "destructive",
      });
    },
  });

  const handleSaveConsents = (consents: Record<string, boolean>) => {
    saveMutation.mutate(consents);
  };

  const handleCancelEdit = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        {isLoading ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <ConsentForm
            key={String(open)}
            serverConsents={serverConsents}
            onSave={handleSaveConsents}
            onCancel={handleCancelEdit}
            data={data}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
