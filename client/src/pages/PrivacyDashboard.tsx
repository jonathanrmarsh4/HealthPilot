import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Shield, Eye, Lock, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PrivacyDashboard() {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Export data mutation
  const exportData = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/privacy/export", "POST");
      return response;
    },
    onSuccess: (data) => {
      // Trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `healthpilot-data-${new Date().toISOString()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Data exported successfully",
        description: "Your complete health data has been downloaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccount = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/privacy/delete-account", "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Account deletion initiated",
        description: "Your account and all data will be permanently deleted in 30 days.",
        variant: "destructive",
      });
      // Logout after 2 seconds
      setTimeout(() => {
        window.location.href = "/api/logout";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Privacy & Data Control</h1>
        <p className="text-muted-foreground">
          Manage your health data, privacy preferences, and account settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Data Protection Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Your Data Protection Status
            </CardTitle>
            <CardDescription>
              Your health data is protected with industry-leading security standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Encryption</p>
                </div>
                <p className="text-2xl font-bold">AES-256</p>
                <Badge variant="outline" className="mt-2" data-testid="badge-encryption-status">
                  Active
                </Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Compliance</p>
                </div>
                <p className="text-2xl font-bold">HIPAA + GDPR</p>
                <Badge variant="outline" className="mt-2" data-testid="badge-compliance-status">
                  Certified
                </Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Data Location</p>
                </div>
                <p className="text-2xl font-bold">US (Encrypted)</p>
                <Badge variant="outline" className="mt-2" data-testid="badge-location-status">
                  Secure
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Your Data
            </CardTitle>
            <CardDescription>
              Download a complete copy of your health data (GDPR Article 15 - Right to Access)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Download a complete copy of your health data in machine-readable JSON format. 
              This includes all biomarkers, workouts, meals, sleep data, AI insights, chat history, 
              and recommendations.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium mb-2">Export includes:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Personal profile and health information</li>
                <li>• All biomarker readings and trends</li>
                <li>• Workout and training history</li>
                <li>• Meal plans and nutrition data</li>
                <li>• AI-generated insights and recommendations</li>
                <li>• Chat message history</li>
                <li>• Sleep and readiness data</li>
              </ul>
            </div>
            <Button
              onClick={() => exportData.mutate()}
              disabled={exportData.isPending}
              data-testid="button-export-data"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportData.isPending ? "Preparing..." : "Download My Data"}
            </Button>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Access Audit Log
            </CardTitle>
            <CardDescription>
              View complete history of data access (HIPAA - Accounting of Disclosures)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View a complete history of who accessed your health data and when. This log 
              is maintained for 6 years as required by HIPAA compliance. All access is logged 
              with timestamps, IP addresses, and action types.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium mb-2">Audit log tracks:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Data reads, updates, and deletions</li>
                <li>• AI analysis operations</li>
                <li>• Data exports and downloads</li>
                <li>• Authentication and session activity</li>
              </ul>
            </div>
            <Button variant="outline" data-testid="button-view-audit-log">
              <Eye className="h-4 w-4 mr-2" />
              View Audit Log
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Audit logs are retained for 6 years (HIPAA requirement)
            </p>
          </CardContent>
        </Card>

        {/* Privacy Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy Preferences
            </CardTitle>
            <CardDescription>
              Manage your consent and data processing preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Review and update your privacy consents. You can withdraw consent at any time,
              though this may limit certain features.
            </p>
            <Button variant="outline" data-testid="button-manage-consent">
              Manage Consent Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete My Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all data (GDPR Article 17 - Right to Erasure)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-destructive mb-2">⚠️ Warning: This action cannot be undone</p>
              <p className="text-sm text-muted-foreground">
                Deleting your account will permanently remove all your health data, including:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• All biomarker readings and health records</li>
                <li>• Workout and training history</li>
                <li>• Meal plans and nutrition data</li>
                <li>• AI insights and recommendations</li>
                <li>• Chat history and personal context</li>
              </ul>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium mb-2">30-Day Grace Period</p>
              <p className="text-sm text-muted-foreground">
                After initiating deletion, you have 30 days to recover your account by logging 
                back in. After 30 days, all data is permanently and irreversibly deleted using 
                NIST-compliant secure erasure methods.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteAccount.isPending}
              data-testid="button-delete-account"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteAccount.isPending ? "Deleting..." : "Delete My Account"}
            </Button>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Privacy Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a 
              href="/privacy" 
              className="text-sm text-primary hover:underline block"
              data-testid="link-privacy-policy"
            >
              → View Privacy Policy
            </a>
            <a 
              href="/security" 
              className="text-sm text-primary hover:underline block"
              data-testid="link-security-whitepaper"
            >
              → Security Whitepaper
            </a>
            <a 
              href="/terms" 
              className="text-sm text-primary hover:underline block"
              data-testid="link-terms-of-service"
            >
              → Terms of Service
            </a>
            <p className="text-sm text-muted-foreground mt-4">
              Questions? Contact our Privacy Officer at{" "}
              <a href="mailto:privacy@healthpilot.ai" className="text-primary hover:underline">
                privacy@healthpilot.ai
              </a>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action will permanently delete your account and all associated health data 
                after a 30-day grace period.
              </p>
              <p className="font-medium">
                You will lose access to:
              </p>
              <ul className="text-sm space-y-1">
                <li>• All biomarker and health records</li>
                <li>• Training and workout history</li>
                <li>• AI insights and recommendations</li>
                <li>• Meal plans and nutrition data</li>
                <li>• Chat history and personal context</li>
              </ul>
              <p className="text-destructive font-medium">
                After 30 days, this data cannot be recovered.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteAccount.mutate();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Yes, Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
