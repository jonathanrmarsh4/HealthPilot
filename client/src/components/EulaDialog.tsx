import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface EulaDialogProps {
  open: boolean;
  onAccept: () => void;
  isAccepting?: boolean;
}

export function EulaDialog({ open, onAccept, isAccepting = false }: EulaDialogProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  const checkIfAtBottom = (element: HTMLDivElement) => {
    const isAtBottom =
      Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;
    console.log("Scroll check:", { 
      scrollHeight: element.scrollHeight, 
      scrollTop: element.scrollTop, 
      clientHeight: element.clientHeight,
      isAtBottom 
    });
    if (isAtBottom && !hasScrolledToBottom) {
      console.log("Setting hasScrolledToBottom to true");
      setHasScrolledToBottom(true);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    checkIfAtBottom(e.target as HTMLDivElement);
  };

  const canAccept = hasScrolledToBottom && hasAgreed;
  
  console.log("EULA Dialog state:", { hasScrolledToBottom, hasAgreed, canAccept });
  
  const handleAccept = () => {
    console.log("EULA Accept button clicked", { canAccept, hasScrolledToBottom, hasAgreed });
    onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">End User License Agreement (EULA)</DialogTitle>
          <DialogDescription>
            Please read and accept the terms before using HealthPilot
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto border rounded-md p-4 touch-pan-y"
          onScroll={handleScroll}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-4 text-sm pr-4">
            <div>
              <p className="font-semibold mb-2">
                Last Updated: 1/08/2025<br />
                Effective Date: 1/08/2025<br />
                Owner: Nuvitae Labs ("we," "us," "our")<br />
                Product: HealthPilot – AI-Driven Health, Fitness and Longevity Application ("the App")
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
              <p>
                By downloading, accessing, or using the App, you ("the User") agree to be bound by this End User Licence Agreement ("Agreement"). If you do not agree, do not use the App. We may update or amend this Agreement at any time. Continued use after such changes constitutes acceptance of the revised terms.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Licence Grant</h3>
              <p>
                We grant you a non-exclusive, non-transferable, revocable licence to use the App for personal, non-commercial purposes, subject to this Agreement. You must not copy, distribute, modify, reverse engineer, or exploit any part of the App or its content.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Subscription and Payment</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>The App offers both free and paid subscription tiers.</li>
                <li>Subscription fees are billed monthly or annually, depending on your selection at sign-up.</li>
                <li>All payments are processed through secure third-party providers. You authorise recurring charges until you cancel your subscription.</li>
                <li>Prices and plans may change at our discretion with prior notice.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Account Registration</h3>
              <p className="mb-2">To use certain features, you must create an account. You agree to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide accurate and complete information,</li>
                <li>Keep your credentials secure, and</li>
                <li>Accept full responsibility for all activity under your account.</li>
              </ul>
              <p className="mt-2">
                We reserve the right to suspend or terminate accounts for misuse or breach of this Agreement.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5. Use of AI and Health Data</h3>
              <p className="mb-2">The App analyses personal information, including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Uploaded blood work and medical results,</li>
                <li>Data from connected wearables (e.g., Apple HealthKit, Fitbit, etc.), and</li>
                <li>Other health-related inputs.</li>
              </ul>
              <p className="mt-2 mb-2">
                The App uses artificial intelligence to generate insights, recommendations, and a biological-age assessment. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Outputs are AI-generated and not medical advice,</li>
                <li>The App does not diagnose, treat, or prevent disease, and</li>
                <li>You should always consult a qualified medical professional before acting on any recommendation.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">6. Data Collection and Privacy</h3>
              <p className="mb-2">
                We collect and store certain personal information as described in our Privacy Policy. Key points:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Health data and other information are stored securely and encrypted.</li>
                <li>We may use anonymised or aggregated data for analytics, research, or to train AI models.</li>
                <li>We do not sell identifiable personal data to third parties.</li>
                <li>By using the App, you consent to the processing and storage of your data in accordance with applicable laws (including the Australian Privacy Act 1988 (Cth), GDPR, and similar international laws where relevant).</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">7. Intellectual Property</h3>
              <p>
                All intellectual property rights in the App, algorithms, software, and related materials are and remain the exclusive property of Nuvitae Labs. You may not use our trademarks, trade names, or branding without written consent.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">8. User Responsibilities</h3>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the App for any unlawful purpose or in violation of any local, national, or international law;</li>
                <li>Attempt to gain unauthorised access to the App or its servers;</li>
                <li>Input false or misleading data; or</li>
                <li>Resell, sublicense, or make the App available to others in violation of this Agreement.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">9. Disclaimers</h3>
              <p className="mb-2">To the maximum extent permitted by law:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>The App is provided "as is" and "as available."</li>
                <li>We make no warranties that the App will be error-free, uninterrupted, or that results will be accurate or reliable.</li>
                <li>Any reliance on AI-generated recommendations is at your own risk.</li>
                <li>The App is intended for informational and educational purposes only and not a substitute for professional medical advice, diagnosis, or treatment.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">10. Limitation of Liability</h3>
              <p className="mb-2">To the fullest extent permitted by law:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>We are not liable for any indirect, incidental, consequential, or punitive damages, including loss of data, health outcomes, profits, or business interruption.</li>
                <li>Our total liability for any claim arising from or relating to this Agreement shall not exceed the total amount you paid for the App in the preceding 12-month period.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">11. Termination</h3>
              <p>
                We may suspend or terminate your access without notice if you breach this Agreement or misuse the App. Upon termination, your right to use the App immediately ceases. Sections 7, 9, 10, and 13 will survive termination.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">12. Third-Party Services</h3>
              <p>
                The App may integrate or interact with third-party services such as Apple HealthKit, Google Fit, or other APIs. We are not responsible for third-party terms, data practices, or service availability.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">13. Governing Law and Jurisdiction</h3>
              <p>
                This Agreement is governed by the laws of Western Australia. You agree to submit to the exclusive jurisdiction of the courts of Western Australia to resolve any disputes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">14. Severability</h3>
              <p>
                If any provision of this Agreement is found invalid or unenforceable, the remaining provisions will remain in full effect.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">15. Entire Agreement</h3>
              <p>
                This Agreement, together with the Privacy Policy, constitutes the entire understanding between you and Nuvitae Labs regarding your use of HealthPilot and supersedes all prior agreements or communications.
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Contact Information</h3>
              <p>
                If you have questions about this Agreement, please contact:<br />
                Nuvitae Labs<br />
                Email: support@nuvitaelabs.com<br />
                Website: nuvitaelabs.com<br />
                Location: Perth, Western Australia
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="agree"
            checked={hasAgreed}
            onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
            data-testid="checkbox-eula-agree"
            disabled={!hasScrolledToBottom}
          />
          <label
            htmlFor="agree"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I have read and agree to the End User License Agreement
            {!hasScrolledToBottom && (
              <span className="text-muted-foreground ml-1">(scroll to bottom first)</span>
            )}
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            onClick={handleAccept}
            disabled={!canAccept || isAccepting}
            data-testid="button-accept-eula"
            className="w-full sm:w-auto"
          >
            {isAccepting ? "Accepting..." : "Accept and Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
