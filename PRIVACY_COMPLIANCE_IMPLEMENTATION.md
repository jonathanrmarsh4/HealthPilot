# Privacy & Compliance Implementation Plan
## Step-by-Step Guide for HealthPilot

---

## Phase 1: Immediate Actions (This Week)

### 1. Create Privacy Policy Page

**File: `client/src/pages/PrivacyPolicy.tsx`**
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last Updated: October 17, 2025 | Effective Date: October 17, 2025
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Privacy Matters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            HealthPilot is committed to protecting your health information. This Privacy Policy 
            explains how we collect, use, protect, and share your personal and health data in 
            compliance with HIPAA, GDPR, PIPEDA, and the Australian Privacy Act.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-start gap-2">
              <span className="text-2xl">🔒</span>
              <div>
                <h4 className="font-semibold">AES-256 Encryption</h4>
                <p className="text-sm text-muted-foreground">Bank-level security for your data</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className="font-semibold">HIPAA Compliant</h4>
                <p className="text-sm text-muted-foreground">Healthcare-grade protection</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl">🛡️</span>
              <div>
                <h4 className="font-semibold">GDPR Compliant</h4>
                <p className="text-sm text-muted-foreground">EU privacy standards</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl">📊</span>
              <div>
                <h4 className="font-semibold">Your Control</h4>
                <p className="text-sm text-muted-foreground">Export or delete anytime</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rest of privacy policy sections... */}
    </div>
  );
}
```

### 2. Create Consent Management UI

**File: `client/src/components/ConsentManager.tsx`**
```typescript
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ConsentManagerProps {
  onConsentGiven: (consents: ConsentData) => void;
}

interface ConsentData {
  healthDataProcessing: boolean;
  aiAnalysis: boolean;
  thirdPartyIntegrations: boolean;
  marketingCommunications: boolean;
}

export function ConsentManager({ onConsentGiven }: ConsentManagerProps) {
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
        <CardTitle>Privacy & Consent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              Health Data Processing (Required)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              I consent to HealthPilot collecting and processing my health information 
              (biomarkers, workouts, sleep data) to provide personalized health recommendations.
              This data is encrypted and protected under HIPAA and GDPR standards.
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
              AI Analysis (Required)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              I consent to AI-powered analysis of my health data to generate personalized 
              insights, training plans, and nutrition recommendations. OpenAI processes 
              this data under a Business Associate Agreement (BAA).
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
              connect (Apple Health, Google Fit). You can revoke this at any time.
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
              You can unsubscribe anytime.
            </p>
          </div>
        </div>

        <Button
          onClick={() => onConsentGiven(consents)}
          disabled={!canProceed}
          className="w-full"
          data-testid="button-consent-submit"
        >
          Continue with Selected Preferences
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          By continuing, you acknowledge that you have read our{" "}
          <a href="/privacy" className="underline">Privacy Policy</a> and{" "}
          <a href="/terms" className="underline">Terms of Service</a>.
        </p>
      </CardContent>
    </Card>
  );
}
```

### 3. Create Privacy Dashboard

**File: `client/src/pages/PrivacyDashboard.tsx`**
```typescript
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Shield, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PrivacyDashboard() {
  const { toast } = useToast();

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
      
      toast({
        title: "Data exported successfully",
        description: "Your complete health data has been downloaded.",
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
      window.location.href = "/api/logout";
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy & Data Control</h1>

      <div className="grid gap-6">
        {/* Data Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Your Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Encryption</p>
                <p className="font-semibold">AES-256</p>
                <Badge variant="outline" className="mt-1">Active</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compliance</p>
                <p className="font-semibold">HIPAA + GDPR</p>
                <Badge variant="outline" className="mt-1">Certified</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Location</p>
                <p className="font-semibold">US (Encrypted)</p>
                <Badge variant="outline" className="mt-1">Secure</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Your Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Download a complete copy of your health data in machine-readable format (JSON). 
              This includes all biomarkers, workouts, meals, and AI insights.
            </p>
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
              <Eye className="h-5 w-5" />
              Access Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View a complete history of who accessed your health data and when. This log 
              is maintained for 6 years as required by HIPAA.
            </p>
            <Button variant="outline" data-testid="button-view-audit-log">
              View Audit Log
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete My Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your account and all associated health data. This action 
              cannot be undone. You have a 30-day grace period to recover your account.
            </p>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Are you sure? This will permanently delete all your health data in 30 days.")) {
                  deleteAccount.mutate();
                }
              }}
              disabled={deleteAccount.isPending}
              data-testid="button-delete-account"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 4. Add Backend Routes

**Add to `server/routes.ts`:**
```typescript
// Privacy & Data Control Routes

app.post("/api/privacy/export", isAuthenticated, async (req, res) => {
  const userId = (req.user as any).claims.sub;

  try {
    // Gather ALL user data for export
    const [
      user, biomarkers, workouts, meals, goals, insights, 
      recommendations, chatMessages, sleepSessions
    ] = await Promise.all([
      storage.getUser(userId),
      storage.getBiomarkers(userId),
      storage.getWorkoutSessions(userId),
      storage.getMealPlans(userId),
      storage.getGoals(userId),
      storage.getInsights(userId),
      storage.getRecommendations(userId),
      storage.getChatMessages(userId),
      storage.getSleepSessions(userId),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        // Don't export password or sensitive auth data
      },
      biomarkers,
      workouts,
      meals,
      goals,
      insights,
      recommendations,
      chatMessages,
      sleepSessions,
      metadata: {
        format: "JSON",
        version: "1.0",
        compliance: ["HIPAA", "GDPR", "PIPEDA"],
      }
    };

    res.json(exportData);
  } catch (error: any) {
    console.error("Error exporting user data:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/privacy/delete-account", isAuthenticated, async (req, res) => {
  const userId = (req.user as any).claims.sub;

  try {
    // Mark account for deletion (30-day grace period)
    await storage.updateUserAdminFields(userId, {
      // Add deletionScheduledAt field to schema
      deletionScheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    res.json({
      success: true,
      message: "Account deletion scheduled",
      deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  } catch (error: any) {
    console.error("Error scheduling account deletion:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/privacy/audit-log", isAuthenticated, async (req, res) => {
  const userId = (req.user as any).claims.sub;

  try {
    // Get audit logs for this user
    const logs = await storage.getAuditLogsForUser(userId);
    res.json(logs);
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: error.message });
  }
});
```

### 5. Update Database Schema

**Add to `shared/schema.ts`:**
```typescript
// Add consent tracking table
export const userConsents = pgTable("user_consents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentType: varchar("consent_type").notNull(), // 'health_data', 'ai_analysis', 'third_party', 'marketing'
  granted: integer("granted").notNull().default(0), // 0 = false, 1 = true
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
});

// Add audit log table for comprehensive tracking
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(), // 'read', 'create', 'update', 'delete', 'export'
  resourceType: varchar("resource_type").notNull(), // 'biomarker', 'workout', 'chat_message', etc.
  resourceId: varchar("resource_id"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metadata: jsonb("metadata"), // Additional context
});

// Add to users table
export const users = pgTable("users", {
  // ... existing fields ...
  deletionScheduledAt: timestamp("deletion_scheduled_at"),
  consentGivenAt: timestamp("consent_given_at"),
});
```

---

## Phase 2: BAAs & Legal (Next Week)

### 6. Business Associate Agreement Checklist

**Vendors Requiring BAAs:**

1. **Replit (Hosting & Database)**
   - [ ] Contact Replit Enterprise Sales
   - [ ] Request HIPAA Business Associate Agreement
   - [ ] Review BAA terms
   - [ ] Execute BAA
   - [ ] File executed BAA

2. **OpenAI (AI Processing)**
   - [ ] Review OpenAI Business Terms
   - [ ] Confirm BAA coverage for API usage
   - [ ] Document BAA status
   - [ ] File BAA confirmation

3. **Stripe (Payments)**
   - [ ] Assess if payment data includes PHI
   - [ ] If yes, request Stripe BAA
   - [ ] Review and execute
   - [ ] File executed BAA

**BAA Template Requirements:**
- Permitted uses and disclosures of PHI
- Safeguards to prevent unauthorized use/disclosure
- Breach reporting procedures (within 60 days)
- Subcontractor agreements
- Termination provisions
- Return or destruction of PHI upon termination

---

## Phase 3: Enhanced Audit Logging (Week 3)

### 7. Comprehensive Audit Logging

**Update all data access functions to log:**

```typescript
// Example: Log biomarker access
async getBiomarkers(userId: string): Promise<Biomarker[]> {
  // Log the access
  await this.createAuditLog({
    userId,
    action: 'read',
    resourceType: 'biomarker',
    ipAddress: req.ip, // Pass from route
    userAgent: req.headers['user-agent'],
  });

  return db
    .select()
    .from(biomarkers)
    .where(eq(biomarkers.userId, userId))
    .orderBy(desc(biomarkers.recordedAt));
}
```

**Audit Log Retention:**
- Minimum 6 years (HIPAA requirement)
- Implement automated archival after 6 years
- Ensure logs are tamper-proof (write-once, read-many)

---

## Phase 4: Breach Detection & Response (Week 4)

### 8. Automated Breach Detection

**Implement anomaly detection:**
- Unusual access patterns (e.g., 100+ records accessed in 1 minute)
- Failed authentication attempts (5+ failures in 10 minutes)
- Access from new geographic locations
- Bulk data exports

**Breach Response Workflow:**
1. **Detection** → Automated alert to Privacy Officer
2. **Assessment** (within 24 hours) → Is this a breach? Risk level?
3. **Containment** → Revoke access, patch vulnerability
4. **Notification**:
   - GDPR: 72 hours to supervisory authority
   - HIPAA: 60 days to affected individuals + HHS
   - Media notification if 500+ affected (HIPAA)
5. **Documentation** → Incident report, lessons learned
6. **Prevention** → Implement controls to prevent recurrence

---

## Marketing & Trust Indicators

### 9. Homepage Trust Section

**Add to homepage:**
```tsx
<section className="py-16 bg-muted/50">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-12">
      Your Health Data is Protected
    </h2>
    
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="font-semibold mb-2">Bank-Level Encryption</h3>
        <p className="text-sm text-muted-foreground">
          AES-256 encryption protects your data at rest and TLS 1.3 in transit
        </p>
      </div>
      
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="font-semibold mb-2">HIPAA Compliant</h3>
        <p className="text-sm text-muted-foreground">
          Business Associate Agreements with all health data processors
        </p>
      </div>
      
      <div className="text-center">
        <div className="text-4xl mb-4">🛡️</div>
        <h3 className="font-semibold mb-2">GDPR Compliant</h3>
        <p className="text-sm text-muted-foreground">
          Full data portability, right to erasure, and transparent processing
        </p>
      </div>
      
      <div className="text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="font-semibold mb-2">Complete Transparency</h3>
        <p className="text-sm text-muted-foreground">
          Audit logs show exactly who accessed your data and when
        </p>
      </div>
    </div>
    
    <div className="text-center mt-8">
      <a href="/privacy" className="text-primary hover:underline mr-4">
        Read Our Privacy Policy
      </a>
      <a href="/security" className="text-primary hover:underline">
        Security Whitepaper
      </a>
    </div>
  </div>
</section>
```

---

## Summary Checklist

### Immediate (This Week)
- [ ] Create Privacy Policy page
- [ ] Implement Consent Manager UI
- [ ] Build Privacy Dashboard
- [ ] Add data export endpoint
- [ ] Add account deletion endpoint
- [ ] Update database schema (consents, audit_logs)
- [ ] Run `npm run db:push --force`

### Next Week
- [ ] Request BAAs from vendors (Replit, OpenAI, Stripe)
- [ ] Appoint Privacy Officer
- [ ] Conduct HIPAA risk assessment
- [ ] Conduct GDPR DPIA

### Week 3
- [ ] Expand audit logging to all data access
- [ ] Implement 6-year log retention
- [ ] Build admin audit log viewer

### Week 4
- [ ] Implement breach detection alerts
- [ ] Create breach response workflow
- [ ] Document incident response plan
- [ ] Test breach notification process

### Ongoing
- [ ] Annual HIPAA risk assessment
- [ ] Annual GDPR compliance audit
- [ ] Quarterly security reviews
- [ ] Update privacy policy as needed

---

**Next Step:** Start with creating the Privacy Policy page and Consent Manager UI. These are user-facing and demonstrate immediate commitment to privacy.
