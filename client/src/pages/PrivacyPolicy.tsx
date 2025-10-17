import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Download } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last Updated: October 17, 2025 | Effective Date: October 17, 2025
        </p>
      </div>

      {/* Trust Indicators */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Health Data is Protected</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            HealthPilot is committed to protecting your health information. This Privacy Policy 
            explains how we collect, use, protect, and share your personal and health data in 
            compliance with HIPAA, GDPR, PIPEDA, and the Australian Privacy Act.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Lock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Bank-Level Encryption</h4>
                <p className="text-sm text-muted-foreground">AES-256 encryption for data at rest, TLS 1.3 for data in transit</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">HIPAA & GDPR Compliant</h4>
                <p className="text-sm text-muted-foreground">Healthcare-grade protection with international privacy standards</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Eye className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Complete Transparency</h4>
                <p className="text-sm text-muted-foreground">Audit logs show exactly who accessed your data and when</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Download className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Your Control</h4>
                <p className="text-sm text-muted-foreground">Export or delete your data anytime</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Badges */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Badge variant="outline" className="py-1">HIPAA Compliant</Badge>
        <Badge variant="outline" className="py-1">GDPR Compliant</Badge>
        <Badge variant="outline" className="py-1">PIPEDA Compliant</Badge>
        <Badge variant="outline" className="py-1">Australia Privacy Act Compliant</Badge>
      </div>

      {/* Policy Content */}
      <div className="space-y-8">
        {/* Section 1 */}
        <Card>
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Personal Information</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Name, email address, date of birth</li>
                <li>Height, weight, gender, activity level</li>
                <li>Location (city, country)</li>
                <li>Profile preferences and settings</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Health Information (Protected Health Information - PHI)</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Biomarkers (blood work, glucose, cholesterol, HRV, RHR, cortisol, etc.)</li>
                <li>Workout and training data (exercises, sets, reps, weights, RPE)</li>
                <li>Sleep data (duration, quality, patterns)</li>
                <li>Nutrition and meal information</li>
                <li>AI-generated health insights and recommendations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Automatically Collected Information</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Device information (type, operating system, browser)</li>
                <li>IP address and general location</li>
                <li>Usage patterns and feature interactions</li>
                <li>Log data (access times, errors, performance metrics)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card>
          <CardHeader>
            <CardTitle>2. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong>Providing Personalized Health Services:</strong> We use your health data to generate AI-powered insights, training plans, nutrition recommendations, and recovery protocols tailored to your goals.</p>
            <p><strong>AI-Powered Analysis:</strong> OpenAI processes your health information under a Business Associate Agreement (BAA) to provide intelligent recommendations aligned with ACSM, NSCA, WHO, ADA, and AHA standards.</p>
            <p><strong>Service Improvement:</strong> We analyze anonymized, aggregated data to improve our AI algorithms, detect patterns, and enhance platform features.</p>
            <p><strong>Communication:</strong> We send you important updates about your health insights, account notifications, and (with your consent) educational content.</p>
            <p><strong>Safety & Compliance:</strong> We maintain audit logs and security monitoring to protect your data and comply with healthcare privacy regulations.</p>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card>
          <CardHeader>
            <CardTitle>3. Legal Basis for Processing (GDPR)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong>Consent:</strong> You explicitly consent to our collection and processing of your health data when you create an account and agree to this Privacy Policy.</p>
            <p><strong>Contract Performance:</strong> Processing is necessary to provide our health tracking and AI recommendation services.</p>
            <p><strong>Legitimate Interest:</strong> We process anonymized data for service improvement and research purposes.</p>
            <p><strong>Legal Obligations:</strong> We may process data to comply with applicable laws, court orders, or regulatory requirements.</p>
          </CardContent>
        </Card>

        {/* Section 4 */}
        <Card>
          <CardHeader>
            <CardTitle>4. Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">GDPR Rights (European Union)</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Right to Access:</strong> Download a complete copy of your health data in JSON format</li>
                <li><strong>Right to Rectification:</strong> Update or correct inaccurate information</li>
                <li><strong>Right to Erasure:</strong> Request permanent deletion of your account and data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in machine-readable format</li>
                <li><strong>Right to Restriction:</strong> Limit processing of specific data</li>
                <li><strong>Right to Object:</strong> Opt-out of specific processing activities</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">HIPAA Rights (United States)</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Access:</strong> View and obtain copies of your health records</li>
                <li><strong>Amendment:</strong> Request corrections to health information</li>
                <li><strong>Accounting of Disclosures:</strong> See who accessed your data via audit logs</li>
                <li><strong>Restriction Requests:</strong> Limit certain uses or disclosures</li>
              </ul>
            </div>
            <p className="text-sm">
              <strong>Exercise Your Rights:</strong> Visit your <a href="/privacy-dashboard" className="text-primary hover:underline">Privacy Dashboard</a> to access, export, or delete your data.
            </p>
          </CardContent>
        </Card>

        {/* Section 5 */}
        <Card>
          <CardHeader>
            <CardTitle>5. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong>Encryption:</strong> All health data is encrypted using AES-256 encryption at rest and TLS 1.3 encryption in transit.</p>
            <p><strong>Access Controls:</strong> Role-based access control (RBAC) ensures only authorized personnel can access specific data.</p>
            <p><strong>Authentication:</strong> Industry-standard OpenID Connect (OAuth 2.0) via Replit Auth with automatic session management.</p>
            <p><strong>Audit Logging:</strong> We maintain comprehensive logs of all health data access for 6 years (HIPAA requirement).</p>
            <p><strong>Regular Security Audits:</strong> Annual HIPAA risk assessments, quarterly security reviews, and annual penetration testing.</p>
          </CardContent>
        </Card>

        {/* Section 6 */}
        <Card>
          <CardHeader>
            <CardTitle>6. Data Sharing & Business Associates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong>With Your Explicit Consent Only:</strong> We never share your health data without your permission.</p>
            <div>
              <p className="font-semibold mb-2">Business Associates (HIPAA BAAs Executed):</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Replit:</strong> Hosting infrastructure and database services</li>
                <li><strong>OpenAI:</strong> AI-powered analysis and recommendations</li>
                <li><strong>Stripe:</strong> Secure payment processing</li>
              </ul>
            </div>
            <p><strong>Apple Health Integration:</strong> Documented as user-permitted disclosure when you choose to connect your Apple Health data.</p>
            <p><strong>Legal Obligations:</strong> We may disclose information in response to court orders, subpoenas, or other legal processes.</p>
            <p><strong>No Sale of Data:</strong> We never sell your personal or health information to third parties.</p>
          </CardContent>
        </Card>

        {/* Section 7 */}
        <Card>
          <CardHeader>
            <CardTitle>7. Data Retention & Deletion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong>Active Accounts:</strong> Your data is retained for the duration of your service usage.</p>
            <p><strong>Account Deletion:</strong> When you delete your account, you have a 30-day grace period to recover it. After 30 days, all data is permanently and irreversibly deleted.</p>
            <p><strong>Audit Logs:</strong> Security and access logs are retained for 6 years as required by HIPAA, then automatically archived.</p>
            <p><strong>Backups:</strong> Encrypted backups are maintained for 90 days with automated rotation.</p>
            <p><strong>Deletion Procedures:</strong> We use secure erasure methods meeting NIST standards to ensure complete data removal.</p>
          </CardContent>
        </Card>

        {/* Section 8 */}
        <Card>
          <CardHeader>
            <CardTitle>8. International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong>Standard Contractual Clauses (SCCs):</strong> We use EU-approved SCCs for transfers of European user data.</p>
            <p><strong>Adequacy Decisions:</strong> We comply with applicable data protection frameworks for cross-border data flows.</p>
            <p><strong>User Consent:</strong> By using our service, you consent to international data transfers necessary for service delivery.</p>
            <p><strong>Data Location:</strong> Your data is primarily stored in secure US-based data centers with encryption and access controls.</p>
          </CardContent>
        </Card>

        {/* Section 9 */}
        <Card>
          <CardHeader>
            <CardTitle>9. Breach Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong>Automated Detection:</strong> We employ real-time monitoring and anomaly detection for unauthorized access.</p>
            <p><strong>GDPR Timeline:</strong> We notify affected individuals and supervisory authorities within 72 hours of breach discovery.</p>
            <p><strong>HIPAA Timeline:</strong> We notify affected individuals, HHS, and media (if 500+ affected) within 60 days.</p>
            <p><strong>Incident Response:</strong> Our documented breach response plan includes immediate containment, investigation, and remediation.</p>
          </CardContent>
        </Card>

        {/* Section 10 */}
        <Card>
          <CardHeader>
            <CardTitle>10. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>HealthPilot is not intended for users under 18 years of age. We do not knowingly collect health information from minors. If we discover that a user under 18 has provided personal information, we will delete it immediately.</p>
          </CardContent>
        </Card>

        {/* Section 11 */}
        <Card>
          <CardHeader>
            <CardTitle>11. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. We will notify you of material changes via email or prominent notice in the application.</p>
            <p><strong>Last Updated:</strong> October 17, 2025</p>
            <p><strong>Review Schedule:</strong> This policy is reviewed annually and updated as needed.</p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>12. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold">Privacy Officer</p>
              <p>Email: privacy@healthpilot.pro</p>
            </div>
            <div>
              <p className="font-semibold">Data Protection Officer (DPO) - EU Inquiries</p>
              <p>Email: dpo@healthpilot.ai</p>
            </div>
            <div>
              <p className="font-semibold">Security Concerns</p>
              <p>Email: security@healthpilot.ai</p>
            </div>
            <div>
              <p className="font-semibold">Supervisory Authority (GDPR)</p>
              <p>Contact your local data protection authority for EU privacy concerns</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Links */}
      <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
        <p className="mb-2">
          <a href="/privacy-dashboard" className="text-primary hover:underline">Privacy Dashboard</a> |{" "}
          <a href="/terms" className="text-primary hover:underline">Terms of Service</a> |{" "}
          <a href="/security" className="text-primary hover:underline">Security Whitepaper</a>
        </p>
        <p>© 2025 HealthPilot. All rights reserved.</p>
      </div>
    </div>
  );
}
