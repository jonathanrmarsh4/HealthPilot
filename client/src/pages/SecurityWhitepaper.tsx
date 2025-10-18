import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Database, AlertTriangle, CheckCircle, FileText, Globe, Users } from "lucide-react";

export default function SecurityWhitepaper() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Security & Privacy Whitepaper</h1>
        </div>
        <p className="text-muted-foreground">
          Comprehensive technical documentation of HealthPilot's security architecture, 
          privacy practices, and compliance implementations.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Last Updated: October 17, 2025 | Version 1.0
        </p>
      </div>

      {/* Executive Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            HealthPilot is an AI-powered health tracking platform designed with privacy and security 
            as foundational principles. Our architecture implements multiple layers of protection 
            to safeguard sensitive health data while maintaining compliance with international 
            healthcare and data protection regulations.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">HIPAA Compliant</p>
                <p className="text-xs">Protected Health Information safeguards</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">GDPR Compliant</p>
                <p className="text-xs">EU data protection standards</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">PIPEDA Compliant</p>
                <p className="text-xs">Canadian privacy requirements</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Australia Privacy Act</p>
                <p className="text-xs">Australian data handling standards</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Section 1: System Architecture */}
        <Card>
          <CardHeader>
            <CardTitle>1. System Architecture & Data Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">1.1 Architecture Overview</h4>
              <p>HealthPilot employs a modern, cloud-native architecture with security built into every layer:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Frontend:</strong> React TypeScript application with client-side encryption preparation</li>
                <li><strong>Backend:</strong> Express.js API server with strict authentication and authorization</li>
                <li><strong>Database:</strong> PostgreSQL with row-level security policies (RLS)</li>
                <li><strong>AI Processing:</strong> OpenAI GPT-4o with data minimization and PII filtering</li>
                <li><strong>Authentication:</strong> OpenID Connect (OIDC) via Replit Auth with JWT tokens</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">1.2 Data Flow Security</h4>
              <p>All data transmission follows secure pathways:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>HTTPS/TLS 1.3:</strong> All API communications are encrypted in transit</li>
                <li><strong>Session Management:</strong> Secure, HTTP-only cookies with CSRF protection</li>
                <li><strong>API Authentication:</strong> JWT tokens with expiration and refresh mechanisms</li>
                <li><strong>Database Connections:</strong> Encrypted connections with certificate validation</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">1.3 Zero-Trust Architecture</h4>
              <p>Every request is authenticated and authorized:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>No implicit trust based on network location</li>
                <li>User identity verification on every API call</li>
                <li>Resource-level access control with user ID validation</li>
                <li>Prevention of Insecure Direct Object References (IDOR)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Authentication & Authorization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              2. Authentication & Authorization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">2.1 Authentication Mechanism</h4>
              <p>HealthPilot uses industry-standard OpenID Connect (OIDC) for authentication:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Protocol:</strong> OAuth 2.0 / OpenID Connect via Replit Auth</li>
                <li><strong>Identity Provider:</strong> Replit's secure authentication service</li>
                <li><strong>Session Management:</strong> Passport.js with secure session storage</li>
                <li><strong>Token Security:</strong> Short-lived access tokens with secure refresh mechanisms</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">2.2 Authorization Model</h4>
              <p>Multi-layered authorization ensures users can only access their own data:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Middleware Protection:</strong> <code>isAuthenticated</code> guards all protected routes</li>
                <li><strong>User ID Validation:</strong> Every data query validates user ownership</li>
                <li><strong>Role-Based Access:</strong> Admin/user roles with separate permissions</li>
                <li><strong>API Key Isolation:</strong> Third-party API keys stored per-user, never shared</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">2.3 IDOR Prevention</h4>
              <p>Comprehensive protection against unauthorized data access:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>All database queries include user ID filtering</li>
                <li>UUIDs prevent enumeration attacks</li>
                <li>Server-side validation of resource ownership</li>
                <li>No client-side trust for authorization decisions</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Data Protection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              3. Data Protection & Encryption
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">3.1 Encryption Standards</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>In Transit:</strong> TLS 1.3 for all HTTPS communications</li>
                <li><strong>At Rest:</strong> PostgreSQL database encryption at the storage layer</li>
                <li><strong>API Communications:</strong> Encrypted connections to third-party services (OpenAI, Stripe)</li>
                <li><strong>File Uploads:</strong> Secure multipart/form-data handling with validation</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">3.2 Data Minimization</h4>
              <p>We collect and process only necessary data:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>AI processing receives aggregated/anonymized data when possible</li>
                <li>PII filtering before external API transmission</li>
                <li>Token limits to reduce unnecessary data exposure</li>
                <li>Automatic cleanup of expired sessions and temporary data</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">3.3 Database Security</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Row-Level Security:</strong> PostgreSQL RLS policies enforce user isolation</li>
                <li><strong>Parameterized Queries:</strong> Drizzle ORM prevents SQL injection</li>
                <li><strong>Schema Validation:</strong> Zod schemas validate all inputs before database insertion</li>
                <li><strong>Backup & Recovery:</strong> Automated daily backups with point-in-time recovery</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Privacy Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              4. Privacy Compliance Framework
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">4.1 HIPAA Compliance</h4>
              <p><strong>Health Insurance Portability and Accountability Act (United States)</strong></p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>PHI Protection:</strong> All Protected Health Information is encrypted and access-controlled</li>
                <li><strong>Audit Logging:</strong> Comprehensive logging of all PHI access and modifications</li>
                <li><strong>Business Associate Agreements:</strong> Contracts with third-party processors (OpenAI, Stripe)</li>
                <li><strong>Breach Notification:</strong> Procedures for timely notification in case of data breach</li>
                <li><strong>Administrative Safeguards:</strong> Access controls, workforce training, security incident procedures</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">4.2 GDPR Compliance</h4>
              <p><strong>General Data Protection Regulation (European Union)</strong></p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Lawful Basis:</strong> Explicit user consent for all data processing</li>
                <li><strong>Right to Access:</strong> Users can view all their personal data</li>
                <li><strong>Right to Erasure:</strong> Account deletion with 30-day grace period</li>
                <li><strong>Right to Portability:</strong> JSON export of all user data</li>
                <li><strong>Privacy by Design:</strong> Data protection integrated from initial system design</li>
                <li><strong>Data Protection Officer:</strong> Designated contact for EU privacy inquiries</li>
                <li><strong>Consent Management:</strong> Granular consent for required vs. optional data processing</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">4.3 PIPEDA Compliance</h4>
              <p><strong>Personal Information Protection and Electronic Documents Act (Canada)</strong></p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Consent Principle:</strong> Meaningful consent obtained for data collection</li>
                <li><strong>Purpose Limitation:</strong> Data used only for stated purposes</li>
                <li><strong>Access Rights:</strong> Users can access and correct their information</li>
                <li><strong>Safeguards:</strong> Security appropriate to sensitivity of data</li>
                <li><strong>Accountability:</strong> Designated privacy officer responsible for compliance</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">4.4 Australia Privacy Act Compliance</h4>
              <p><strong>Privacy Act 1988 (Australia)</strong></p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Australian Privacy Principles (APPs):</strong> Full compliance with 13 APPs</li>
                <li><strong>Sensitive Information:</strong> Special handling of health information</li>
                <li><strong>Overseas Disclosure:</strong> Safeguards for international data transfers</li>
                <li><strong>Privacy Policy:</strong> Clear notification of information handling practices</li>
                <li><strong>Complaint Handling:</strong> Internal complaint resolution process</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: User Rights & Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              5. User Rights & Privacy Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">5.1 Consent Management</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Granular Consent:</strong> Separate consent for required vs. optional data processing</li>
                <li><strong>Required Consents:</strong> EULA acceptance, essential data processing</li>
                <li><strong>Optional Consents:</strong> AI insights generation, research participation, marketing</li>
                <li><strong>Consent Withdrawal:</strong> Users can revoke optional consents at any time</li>
                <li><strong>Audit Trail:</strong> All consent changes logged with timestamps</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">5.2 Data Access Rights</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Privacy Dashboard:</strong> Centralized view of all privacy settings and data</li>
                <li><strong>Data Export:</strong> Complete JSON export of all user data</li>
                <li><strong>Audit Log Access:</strong> View history of account activities</li>
                <li><strong>Consent History:</strong> Track all consent changes over time</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">5.3 Data Deletion Rights</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Account Deletion:</strong> Self-service deletion with 30-day grace period</li>
                <li><strong>Grace Period:</strong> Users can cancel deletion request within 30 days</li>
                <li><strong>Permanent Deletion:</strong> All data permanently removed after grace period</li>
                <li><strong>Deletion Scope:</strong> Includes biomarkers, workouts, AI data, chat history, and all personal information</li>
                <li><strong>Audit Trail:</strong> Deletion events logged for compliance</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">5.4 Data Portability</h4>
              <p>Users can export all their data in machine-readable format (JSON):</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Complete health records and biomarkers</li>
                <li>Workout and training history</li>
                <li>AI insights and recommendations</li>
                <li>Meal plans and nutrition data</li>
                <li>Chat conversation history</li>
                <li>All metadata and timestamps</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Audit Logging */}
        <Card>
          <CardHeader>
            <CardTitle>6. Comprehensive Audit Logging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">6.1 Logged Events</h4>
              <p>All privacy-sensitive operations are logged with full context:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Consent Changes:</strong> Acceptance, updates, and revocations</li>
                <li><strong>Data Access:</strong> Views, exports, and downloads</li>
                <li><strong>Data Modifications:</strong> Creates, updates, and deletions</li>
                <li><strong>Account Actions:</strong> Registration, deletion requests, login events</li>
                <li><strong>Privacy Settings:</strong> Dashboard access, preference changes</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">6.2 Log Metadata</h4>
              <p>Each audit log entry captures:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Timestamp:</strong> Precise UTC timestamp of action</li>
                <li><strong>User ID:</strong> Authenticated user performing the action</li>
                <li><strong>IP Address:</strong> Source IP for security analysis</li>
                <li><strong>User Agent:</strong> Browser/device information</li>
                <li><strong>Action Type:</strong> Specific operation performed</li>
                <li><strong>Details:</strong> Context-specific information in JSON format</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">6.3 Log Retention</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Retention Period:</strong> Audit logs retained for 7 years (compliance requirement)</li>
                <li><strong>Security:</strong> Logs stored separately from application data</li>
                <li><strong>Access Control:</strong> Limited access to authorized personnel only</li>
                <li><strong>Immutability:</strong> Logs are append-only and cannot be modified</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Third-Party Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>7. Third-Party Data Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">7.1 OpenAI Integration</h4>
              <p><strong>Purpose:</strong> AI-powered health insights and recommendations</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Data Sent:</strong> Aggregated biomarker values, sleep data, workout metrics</li>
                <li><strong>PII Filtering:</strong> Names, emails, and direct identifiers removed before transmission</li>
                <li><strong>Token Limits:</strong> Data minimization to reduce unnecessary exposure</li>
                <li><strong>Data Retention:</strong> OpenAI retains data per their enterprise agreement (30 days)</li>
                <li><strong>Encryption:</strong> All API calls over HTTPS/TLS</li>
                <li><strong>Compliance:</strong> Business Associate Agreement in place for HIPAA</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">7.2 Stripe Integration</h4>
              <p><strong>Purpose:</strong> Payment processing for premium subscriptions</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Data Sent:</strong> Payment information (card details, billing address)</li>
                <li><strong>PCI Compliance:</strong> Stripe is PCI DSS Level 1 certified</li>
                <li><strong>Data Storage:</strong> HealthPilot never stores card details directly</li>
                <li><strong>Webhooks:</strong> Secure webhook verification for payment events</li>
                <li><strong>Encryption:</strong> All Stripe API calls over HTTPS/TLS</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">7.3 Apple Health Integration</h4>
              <p><strong>Purpose:</strong> Import health and fitness data from Apple devices</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Data Flow:</strong> Via Health Auto Export app (webhook) or native HealthKit (iOS app)</li>
                <li><strong>User Control:</strong> Users explicitly authorize which health metrics to share</li>
                <li><strong>Data Validation:</strong> All incoming data validated and sanitized</li>
                <li><strong>Encryption:</strong> Webhook endpoints protected with authentication tokens</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">7.4 Replit Authentication</h4>
              <p><strong>Purpose:</strong> User authentication and identity management</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Protocol:</strong> OpenID Connect (OIDC) / OAuth 2.0</li>
                <li><strong>Data Shared:</strong> User ID, email, name (as provided by Replit)</li>
                <li><strong>Security:</strong> Industry-standard authentication flow</li>
                <li><strong>Privacy:</strong> Replit Auth privacy policy applies to identity data</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 8: Security Incident Response */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              8. Security Incident Response
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">8.1 Breach Detection</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Monitoring:</strong> Continuous monitoring of system logs and access patterns</li>
                <li><strong>Alerting:</strong> Automated alerts for suspicious activities</li>
                <li><strong>Audit Review:</strong> Regular review of audit logs for anomalies</li>
                <li><strong>Vulnerability Scanning:</strong> Regular security assessments</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">8.2 Incident Response Plan</h4>
              <p>In the event of a security incident:</p>
              <ol className="list-decimal ml-6 mt-2 space-y-1">
                <li><strong>Containment:</strong> Immediate isolation of affected systems</li>
                <li><strong>Assessment:</strong> Determine scope and nature of breach</li>
                <li><strong>Mitigation:</strong> Implement fixes to prevent further exposure</li>
                <li><strong>Notification:</strong> Timely notification to affected users and authorities</li>
                <li><strong>Recovery:</strong> Restore systems to secure operational state</li>
                <li><strong>Post-Incident:</strong> Root cause analysis and preventive measures</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">8.3 Breach Notification</h4>
              <p>Compliance with notification requirements:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>HIPAA:</strong> Within 60 days of discovery</li>
                <li><strong>GDPR:</strong> Within 72 hours to supervisory authority</li>
                <li><strong>PIPEDA:</strong> As soon as feasible after determination</li>
                <li><strong>Australia Privacy Act:</strong> When serious data breach occurs</li>
                <li><strong>User Notification:</strong> Direct communication to affected users with details and mitigation steps</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">8.4 Security Contact</h4>
              <p>Report security vulnerabilities to: <a href="mailto:security@healthpilot.pro" className="text-primary hover:underline">security@healthpilot.pro</a></p>
              <p className="mt-2">We appreciate responsible disclosure and will respond within 48 hours.</p>
            </div>
          </CardContent>
        </Card>

        {/* Section 9: Technical Safeguards */}
        <Card>
          <CardHeader>
            <CardTitle>9. Technical Security Safeguards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">9.1 Input Validation</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Schema Validation:</strong> Zod schemas validate all user inputs</li>
                <li><strong>Type Safety:</strong> TypeScript ensures type correctness throughout the stack</li>
                <li><strong>File Upload Security:</strong> File type validation, size limits, virus scanning</li>
                <li><strong>SQL Injection Prevention:</strong> Parameterized queries via Drizzle ORM</li>
                <li><strong>XSS Prevention:</strong> React automatic escaping, Content Security Policy headers</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">9.2 Session Security</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Secure Cookies:</strong> HTTP-only, SameSite=Strict, Secure flag</li>
                <li><strong>CSRF Protection:</strong> Token-based CSRF prevention</li>
                <li><strong>Session Expiration:</strong> Automatic logout after inactivity</li>
                <li><strong>Token Refresh:</strong> Short-lived tokens with secure refresh mechanism</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">9.3 API Security</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Rate Limiting:</strong> Protection against abuse and DDoS</li>
                <li><strong>Authentication Required:</strong> All sensitive endpoints require authentication</li>
                <li><strong>CORS Policy:</strong> Restricted cross-origin requests</li>
                <li><strong>Request Validation:</strong> Schema validation on all API inputs</li>
                <li><strong>Error Handling:</strong> Secure error messages without information leakage</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">9.4 Infrastructure Security</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Hosting:</strong> Cloud infrastructure with built-in DDoS protection</li>
                <li><strong>Backups:</strong> Automated daily backups with encryption</li>
                <li><strong>Monitoring:</strong> Real-time system health and security monitoring</li>
                <li><strong>Updates:</strong> Regular security patches and dependency updates</li>
                <li><strong>Secrets Management:</strong> Environment-based secrets, never committed to code</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 10: Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle>10. Data Retention & Disposal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">10.1 Retention Periods</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Active User Data:</strong> Retained while account is active</li>
                <li><strong>Deleted Accounts:</strong> 30-day grace period, then permanent deletion</li>
                <li><strong>Audit Logs:</strong> 7 years for compliance</li>
                <li><strong>Backup Data:</strong> Retained for 90 days, then deleted</li>
                <li><strong>Session Data:</strong> Expired sessions cleared within 24 hours</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">10.2 Data Disposal</h4>
              <p>Secure deletion procedures:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Database Deletion:</strong> SQL DELETE operations with transaction logging</li>
                <li><strong>File Deletion:</strong> Secure file removal from storage systems</li>
                <li><strong>Backup Purging:</strong> Automated cleanup of aged backups</li>
                <li><strong>Third-Party Deletion:</strong> Requests to processors to delete user data</li>
                <li><strong>Verification:</strong> Confirmation of complete data removal</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>11. Privacy & Security Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Privacy Officer</p>
              <p>Email: <a href="mailto:privacy@healthpilot.pro" className="text-primary hover:underline">privacy@healthpilot.pro</a></p>
              <p className="text-xs mt-1">For privacy inquiries, data requests, and consent management</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Data Protection Officer (DPO) - EU Inquiries</p>
              <p>Email: <a href="mailto:dpo@healthpilot.pro" className="text-primary hover:underline">dpo@healthpilot.pro</a></p>
              <p className="text-xs mt-1">For GDPR-related questions and EU privacy matters</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Security Team</p>
              <p>Email: <a href="mailto:security@healthpilot.pro" className="text-primary hover:underline">security@healthpilot.pro</a></p>
              <p className="text-xs mt-1">For security vulnerabilities and incident reports</p>
            </div>
          </CardContent>
        </Card>

        {/* Appendix */}
        <Card>
          <CardHeader>
            <CardTitle>12. Document Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p><strong>Document Version:</strong> 1.0</p>
              <p><strong>Last Updated:</strong> October 17, 2025</p>
              <p><strong>Next Review Date:</strong> October 17, 2026</p>
              <p><strong>Review Frequency:</strong> Annual, or as needed for regulatory changes</p>
            </div>
            <div className="mt-4">
              <p className="font-semibold text-foreground">Additional Resources</p>
              <div className="space-y-1 mt-2">
                <a href="/privacy" className="text-primary hover:underline block">→ Privacy Policy</a>
                <a href="/privacy-dashboard" className="text-primary hover:underline block">→ Privacy Dashboard</a>
                <a href="/terms" className="text-primary hover:underline block">→ Terms of Service</a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
