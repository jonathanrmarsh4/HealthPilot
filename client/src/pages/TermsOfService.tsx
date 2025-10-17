import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, CheckCircle } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Terms of Service</h1>
        </div>
        <p className="text-muted-foreground">
          Please read these Terms of Service carefully before using HealthPilot. 
          By accessing or using our service, you agree to be bound by these terms.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Last Updated: October 17, 2025 | Effective Date: October 17, 2025
        </p>
      </div>

      {/* Important Notice */}
      <Card className="mb-6 border-yellow-600/50 bg-yellow-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            Important Notice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">HealthPilot is not a substitute for professional medical advice, diagnosis, or treatment.</strong> Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or received through HealthPilot.
          </p>
          <p>
            The AI-powered insights and recommendations provided by HealthPilot are for informational and educational purposes only. They should not be considered medical advice and are not intended to replace consultation with qualified healthcare professionals.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Section 1: Acceptance of Terms */}
        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              By creating an account, accessing, or using HealthPilot (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you ("User," "you," or "your") and HealthPilot ("we," "us," or "our"). We reserve the right to modify these Terms at any time. If we make material changes, we will notify you via email or through a prominent notice in the application. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.
            </p>
            <p>
              You must be at least 18 years old to use HealthPilot. By using the Service, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms.
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Description of Service */}
        <Card>
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              HealthPilot is an AI-powered health tracking and wellness platform that provides:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Health data tracking and visualization (biomarkers, sleep, workouts)</li>
              <li>AI-generated personalized health insights and recommendations</li>
              <li>Training and workout planning with readiness-based adjustments</li>
              <li>Meal planning and nutrition recommendations</li>
              <li>Goal tracking and progress monitoring</li>
              <li>Integration with Apple Health and other health data sources</li>
              <li>Biological age estimation based on biomarker data</li>
              <li>AI-powered health coaching via chat interface</li>
            </ul>
            <p className="mt-3">
              The Service utilizes artificial intelligence (OpenAI GPT-4o) to analyze your health data and provide personalized recommendations. While we strive for accuracy, AI-generated content may contain errors or inconsistencies and should not be relied upon as medical advice.
            </p>
          </CardContent>
        </Card>

        {/* Section 3: Medical Disclaimer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              3. Medical Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">
              HealthPilot is NOT a medical device and does NOT provide medical advice, diagnosis, or treatment.
            </p>
            <p>
              The Service is designed for informational and educational purposes only. All content, including AI-generated insights, recommendations, and analysis, is provided "as is" without warranty of any kind, either express or implied.
            </p>
            <p>
              <strong className="text-foreground">You acknowledge and agree that:</strong>
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>HealthPilot does not replace professional medical consultation</li>
              <li>You should consult qualified healthcare professionals before making health decisions</li>
              <li>AI recommendations may not be suitable for your specific health condition</li>
              <li>You are responsible for verifying any health information with medical professionals</li>
              <li>Emergency medical situations require immediate professional medical attention, not use of this Service</li>
              <li>We are not liable for any health consequences resulting from use of the Service</li>
            </ul>
            <p className="mt-3 font-semibold text-foreground">
              IF YOU THINK YOU HAVE A MEDICAL EMERGENCY, CALL YOUR DOCTOR OR 911 IMMEDIATELY.
            </p>
          </CardContent>
        </Card>

        {/* Section 4: User Account */}
        <Card>
          <CardHeader>
            <CardTitle>4. User Account and Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">4.1 Account Creation</h4>
              <p>
                To use HealthPilot, you must create an account using a valid authentication method (Replit Auth with OpenID Connect). You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">4.2 Account Security</h4>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Not share your account credentials with others</li>
                <li>Take reasonable steps to prevent unauthorized access</li>
                <li>Log out of your account at the end of each session when using shared devices</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">4.3 Account Termination</h4>
              <p>
                We reserve the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any other reason at our sole discretion. You may delete your account at any time through the Privacy Dashboard. Upon account deletion, your data will be retained for 30 days (grace period) before permanent deletion.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Subscription and Payment */}
        <Card>
          <CardHeader>
            <CardTitle>5. Subscription Tiers and Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">5.1 Service Tiers</h4>
              <p>HealthPilot offers multiple subscription tiers:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Free Tier:</strong> Limited features with basic health tracking</li>
                <li><strong>Premium Tier:</strong> Full access to AI features, unlimited biomarkers, and advanced analytics</li>
                <li><strong>Enterprise Tier:</strong> Custom features and dedicated support</li>
              </ul>
              <p className="mt-2">
                Specific features, limitations, and pricing for each tier are detailed on our Pricing page and may change from time to time with advance notice.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">5.2 Payment Terms</h4>
              <ul className="list-disc ml-6 space-y-1">
                <li>Premium subscriptions are billed monthly or annually in advance</li>
                <li>All payments are processed securely through Stripe</li>
                <li>Subscription fees are non-refundable except as required by law</li>
                <li>You authorize us to charge your payment method on a recurring basis</li>
                <li>Prices may change with 30 days' advance notice to active subscribers</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">5.3 Cancellation and Refunds</h4>
              <p>
                You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period, and you will retain access to premium features until that time. No partial refunds are provided for unused portions of your subscription period, except as required by applicable law.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">5.4 Free Trial</h4>
              <p>
                We may offer free trials for premium features. At the end of the trial period, you will be automatically charged for the subscription unless you cancel before the trial ends. Trial terms and duration may vary and will be disclosed at the time of signup.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: User Data and Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>6. User Data and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">6.1 Data Collection and Use</h4>
              <p>
                By using HealthPilot, you consent to the collection, processing, and use of your health data as described in our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>. This includes:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Health records, biomarkers, sleep data, and workout information</li>
                <li>Data imported from third-party services (Apple Health, etc.)</li>
                <li>AI-generated insights and recommendations</li>
                <li>Chat conversations with the AI health coach</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">6.2 Data Accuracy</h4>
              <p>
                You are responsible for the accuracy and completeness of the health data you provide. We are not responsible for any consequences arising from inaccurate, incomplete, or outdated information.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">6.3 Data Security</h4>
              <p>
                We implement industry-standard security measures to protect your data, as detailed in our <a href="/security" className="text-primary hover:underline">Security & Privacy Whitepaper</a>. However, no system is completely secure, and we cannot guarantee absolute security.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">6.4 Third-Party Processing</h4>
              <p>
                We use third-party service providers (OpenAI for AI processing, Stripe for payments) to deliver the Service. By using HealthPilot, you consent to the limited sharing of your data with these processors as necessary to provide the Service, subject to strict confidentiality and data protection agreements.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 7: User Conduct */}
        <Card>
          <CardHeader>
            <CardTitle>7. Acceptable Use and Prohibited Conduct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              You agree to use HealthPilot only for lawful purposes and in accordance with these Terms. You agree NOT to:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Upload false, misleading, or fraudulent health data</li>
              <li>Attempt to gain unauthorized access to our systems or other user accounts</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use automated systems (bots, scrapers) to access the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Transmit viruses, malware, or other harmful code</li>
              <li>Harass, abuse, or harm other users or our staff</li>
              <li>Use the Service to provide medical advice to others</li>
              <li>Resell, redistribute, or commercially exploit the Service without permission</li>
              <li>Violate our rate limits or abuse API access</li>
            </ul>
            <p className="mt-3">
              Violation of these terms may result in immediate suspension or termination of your account without refund.
            </p>
          </CardContent>
        </Card>

        {/* Section 8: Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle>8. Intellectual Property Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">8.1 Our Intellectual Property</h4>
              <p>
                All content, features, functionality, software, design, graphics, and user interface of HealthPilot are owned by us or our licensors and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or exploit any part of the Service without our express written permission.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">8.2 Your Content</h4>
              <p>
                You retain ownership of all health data and content you upload to HealthPilot ("User Content"). By uploading User Content, you grant us a limited, worldwide, non-exclusive, royalty-free license to use, store, process, and display your User Content solely to provide the Service to you.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">8.3 AI-Generated Content</h4>
              <p>
                Insights, recommendations, and other content generated by our AI based on your data are provided to you for your personal use. You may not republish, redistribute, or commercially exploit AI-generated content without permission.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">8.4 Trademark</h4>
              <p>
                "HealthPilot" and our logo are trademarks. You may not use our trademarks without prior written consent.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 9: AI Disclaimer */}
        <Card>
          <CardHeader>
            <CardTitle>9. Artificial Intelligence Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              HealthPilot uses artificial intelligence (AI) technology to analyze health data and generate insights. You acknowledge and understand that:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li><strong>AI Limitations:</strong> AI-generated content may contain errors, inconsistencies, or inappropriate recommendations</li>
              <li><strong>No Guarantees:</strong> We do not guarantee the accuracy, completeness, or suitability of AI outputs</li>
              <li><strong>Evolving Technology:</strong> AI models are continuously updated and may produce different results over time</li>
              <li><strong>Human Oversight Required:</strong> Always verify AI recommendations with qualified professionals</li>
              <li><strong>Not Medical AI:</strong> Our AI is not a medical diagnosis system and lacks clinical validation</li>
              <li><strong>Bias Potential:</strong> AI systems may reflect biases in training data</li>
            </ul>
            <p className="mt-3">
              You use AI-generated insights at your own risk and should exercise independent judgment when making health decisions.
            </p>
          </CardContent>
        </Card>

        {/* Section 10: Disclaimers */}
        <Card>
          <CardHeader>
            <CardTitle>10. Disclaimers and Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">10.1 Service Availability</h4>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. We do not warrant that the Service will be uninterrupted, error-free, secure, or free from viruses or harmful components.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">10.2 Disclaimer of Warranties</h4>
              <p className="uppercase">
                TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES ABOUT THE ACCURACY, RELIABILITY, OR COMPLETENESS OF ANY CONTENT OR RECOMMENDATIONS.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">10.3 Limitation of Liability</h4>
              <p className="uppercase">
                IN NO EVENT SHALL HEALTHPILOT, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR HEALTH, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              <p className="mt-2 uppercase">
                OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">10.4 Health Disclaimer</h4>
              <p className="uppercase">
                WE ARE NOT RESPONSIBLE FOR ANY HEALTH CONSEQUENCES, INJURIES, OR DAMAGES RESULTING FROM YOUR USE OF THE SERVICE OR RELIANCE ON AI-GENERATED RECOMMENDATIONS. YOU ASSUME ALL RISKS ASSOCIATED WITH USE OF THE SERVICE.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 11: Indemnification */}
        <Card>
          <CardHeader>
            <CardTitle>11. Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              You agree to indemnify, defend, and hold harmless HealthPilot, its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising out of or related to:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Your use or misuse of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Any User Content you upload or submit</li>
              <li>Any health decisions made based on the Service</li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 12: Termination */}
        <Card>
          <CardHeader>
            <CardTitle>12. Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">12.1 Termination by You</h4>
              <p>
                You may terminate your account at any time through the Privacy Dashboard. Upon termination:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Your account enters a 30-day grace period</li>
                <li>You can cancel the deletion request within this period</li>
                <li>After 30 days, all your data is permanently deleted</li>
                <li>No refunds are provided for unused subscription time</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">12.2 Termination by Us</h4>
              <p>
                We may suspend or terminate your account immediately, without notice, for:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Violation of these Terms</li>
                <li>Fraudulent or illegal activity</li>
                <li>Abuse of the Service or our staff</li>
                <li>Non-payment of subscription fees</li>
                <li>Any other reason at our sole discretion</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">12.3 Effect of Termination</h4>
              <p>
                Upon termination, your right to use the Service immediately ceases. Provisions of these Terms that by their nature should survive termination will survive, including ownership provisions, warranty disclaimers, indemnification, and limitations of liability.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 13: Dispute Resolution */}
        <Card>
          <CardHeader>
            <CardTitle>13. Dispute Resolution and Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">13.1 Informal Resolution</h4>
              <p>
                Before filing a formal dispute, you agree to contact us at <a href="mailto:support@healthpilot.pro" className="text-primary hover:underline">support@healthpilot.pro</a> to attempt to resolve the issue informally. We will attempt to resolve disputes in good faith within 30 days.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">13.2 Arbitration</h4>
              <p>
                Any dispute arising from these Terms or your use of the Service will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except where prohibited by law. You waive your right to a jury trial and to participate in class actions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">13.3 Governing Law</h4>
              <p>
                These Terms are governed by and construed in accordance with the laws of the jurisdiction in which HealthPilot operates, without regard to conflict of law principles.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">13.4 Exceptions</h4>
              <p>
                Notwithstanding the arbitration provision, either party may seek injunctive or equitable relief in court for disputes related to intellectual property rights or unauthorized access to the Service.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 14: Miscellaneous */}
        <Card>
          <CardHeader>
            <CardTitle>14. Miscellaneous Provisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">14.1 Entire Agreement</h4>
              <p>
                These Terms, together with our Privacy Policy and any additional terms you agree to when using specific features, constitute the entire agreement between you and HealthPilot regarding the Service.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">14.2 Severability</h4>
              <p>
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">14.3 Waiver</h4>
              <p>
                Our failure to enforce any provision of these Terms does not constitute a waiver of that provision or our right to enforce it in the future.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">14.4 Assignment</h4>
              <p>
                You may not assign or transfer these Terms or your account to any third party without our written consent. We may assign these Terms without restriction.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">14.5 Force Majeure</h4>
              <p>
                We are not liable for any failure or delay in performance due to circumstances beyond our reasonable control, including natural disasters, war, terrorism, labor disputes, or internet failures.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">14.6 Export Compliance</h4>
              <p>
                You agree to comply with all applicable export and import laws and regulations in your use of the Service.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 15: Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>15. Modifications to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              We reserve the right to modify these Terms at any time. When we make material changes, we will:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Update the "Last Updated" date at the top of this page</li>
              <li>Notify you via email or through a prominent notice in the application</li>
              <li>Provide at least 30 days' notice for material changes affecting your rights</li>
            </ul>
            <p className="mt-3">
              Your continued use of the Service after the effective date of any modifications constitutes your acceptance of the updated Terms. If you do not agree to the modified Terms, you must stop using the Service and may terminate your account.
            </p>
            <p>
              We encourage you to review these Terms periodically to stay informed about your rights and obligations.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>16. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="mt-3">
              <p className="font-semibold text-foreground">General Inquiries</p>
              <p>Email: <a href="mailto:support@healthpilot.pro" className="text-primary hover:underline">support@healthpilot.pro</a></p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Legal Inquiries</p>
              <p>Email: <a href="mailto:legal@healthpilot.ai" className="text-primary hover:underline">legal@healthpilot.ai</a></p>
            </div>
            <div className="mt-4">
              <p className="font-semibold text-foreground">Additional Resources</p>
              <div className="space-y-1 mt-2">
                <a href="/privacy" className="text-primary hover:underline block">→ Privacy Policy</a>
                <a href="/security" className="text-primary hover:underline block">→ Security & Privacy Whitepaper</a>
                <a href="/privacy-dashboard" className="text-primary hover:underline block">→ Privacy Dashboard</a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acknowledgment */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Acknowledgment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              BY USING HEALTHPILOT, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
            </p>
            <p>
              You further acknowledge that HealthPilot is not a medical service, and you should consult healthcare professionals for medical advice, diagnosis, and treatment.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
        <p>© 2025 HealthPilot. All rights reserved.</p>
        <p className="mt-2">Last Updated: October 17, 2025</p>
      </div>
    </div>
  );
}
