import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Activity, Brain, Calendar,
  TrendingUp, CheckCircle, Star, ArrowRight, Apple, Heart, Target, Zap, Sparkles,
  Lock, FileCheck, Database, Eye, Award
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import digitalHumanImage from "@assets/IMG_0088_1760794249248.png";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { LandingPageContent, LandingPageFeature, LandingPageTestimonial, LandingPagePricingPlan, LandingPageSocialLink } from "@shared/schema";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  
  const { data: pageData, isLoading } = useQuery<{
    content: LandingPageContent | null;
    features: LandingPageFeature[];
    testimonials: LandingPageTestimonial[];
    pricingPlans: LandingPagePricingPlan[];
    socialLinks: LandingPageSocialLink[];
  }>({
    queryKey: ["/api/landing-page"],
  });
  
  const content = pageData?.content;
  const howItWorksFeatures = pageData?.features?.filter(f => f.section === 'how_it_works' && f.visible === 1) || [];
  const mainFeatures = pageData?.features?.filter(f => f.section === 'main' && f.visible === 1) || [];
  const testimonials = pageData?.testimonials?.filter(t => t.visible === 1) || [];
  const pricingPlans = pageData?.pricingPlans?.filter(p => p.visible === 1) || [];
  const socialLinks = pageData?.socialLinks?.filter(s => s.visible === 1) || [];
  
  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Activity className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center">
        <div className="text-[#00E0C6] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1F]">
      {/* === Hero Section === */}
      <section className="relative px-6 pt-28 md:pt-36 pb-20 md:pb-36">
        {/* Subtle cyan glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_70%_25%,rgba(0,224,198,0.15),transparent_60%)]" />
        
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 items-center relative z-10">
          {/* Left: Copy / CTA */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-semibold mb-6 tracking-tight bg-gradient-to-r from-white to-[#00E0C6] bg-clip-text text-transparent"
              style={{
                textShadow: "0 0 40px rgba(0, 224, 198, 0.3)",
              }}
              data-testid="text-brand-title"
            >
              {content?.heroTitle || "HealthPilot"}
            </motion.h1>

            {content?.heroBadgeText && (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="mb-4"
              >
                <Badge
                  variant="outline"
                  className="border-[#00E0C6]/30 bg-[#00E0C6]/5 text-[#00E0C6] px-4 py-1.5"
                >
                  {content.heroBadgeText}
                </Badge>
              </motion.div>
            )}

            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="text-4xl md:text-6xl font-semibold leading-tight mb-6 tracking-tight text-white"
            >
              {content?.heroSubtitle || "Your Body, Decoded"}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="text-lg text-gray-400 max-w-xl mb-8"
            >
              {content?.heroDescription || "Connect HealthKit, wearables, and blood work to get real-time insights, adaptive training, and evidence-based nutrition powered by AI."}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="flex flex-wrap gap-3 mb-8"
            >
              <Button
                size="lg"
                className="rounded-full px-8 bg-[#00E0C6] text-[#0A0F1F] hover:bg-[#00E0C6]/90 shadow-[0_0_24px_rgba(0,224,198,0.35)] hover:shadow-[0_0_36px_rgba(0,224,198,0.55)] transition-shadow"
                onClick={() => window.location.href = content?.heroCtaPrimaryLink || "/api/login"}
                data-testid="button-cta-primary"
              >
                {content?.heroCtaPrimary || "Start Free"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 border-[#00E0C6]/30 text-[#00E0C6] hover:bg-[#00E0C6]/10"
                onClick={() => setLocation(content?.heroCtaSecondaryLink || "/security")}
                data-testid="button-cta-secondary"
              >
                {content?.heroCtaSecondary || "Watch Demo"}
              </Button>
            </motion.div>

            {/* Logos */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-6 text-gray-500"
            >
              <div className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                <span className="text-sm">HealthKit</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <span className="text-sm">Garmin</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                <span className="text-sm">Oura</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Digital Person */}
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12 }}
            className="relative"
          >
            {/* Cyan glow behind image */}
            <div className="absolute -inset-6 -z-10 rounded-[28px] opacity-70 blur-2xl bg-[radial-gradient(40%_30%_at_70%_20%,rgba(0,224,198,0.25),transparent_60%)]" />
            
            <div className="rounded-[22px] border border-white/10 bg-white/5 backdrop-blur-xl p-4">
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={digitalHumanImage}
                  alt="Digital human body visualization"
                  className="w-full h-auto rounded-xl"
                />
              </div>
            </div>

            {/* Floating stat - Readiness */}
            <motion.div
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="absolute -left-4 top-1/4 bg-[#1A2332]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#00E0C6]" />
                <div>
                  <div className="font-semibold text-white">95% Readiness</div>
                  <div className="text-xs text-gray-400">Peak performance</div>
                </div>
              </div>
            </motion.div>

            {/* Floating stat - AI Insights */}
            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -right-4 bottom-1/4 bg-[#1A2332]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#00E0C6]" />
                <div>
                  <div className="font-semibold text-white">AI Insights</div>
                  <div className="text-xs text-gray-400">Updated daily</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* === How It Works === */}
      {content?.howItWorksVisible === 1 && (
        <section className="relative px-6 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 md:mb-14">
              <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-white">
                {content?.howItWorksTitle || "How It Works"}
              </h2>
              {content?.howItWorksSubtitle && (
                <p className="text-gray-400 mt-3 max-w-2xl">
                  {content.howItWorksSubtitle}
                </p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {howItWorksFeatures.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: 0.06 * i }}
                >
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-[#00E0C6]/10 text-[#00E0C6]">
                          {getIcon(item.icon)}
                        </div>
                        <h3 className="font-semibold text-white">{item.title}</h3>
                      </div>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === Features === */}
      {content?.featuresVisible === 1 && mainFeatures.length > 0 && (
        <section className="relative px-6 py-16 md:py-24">
          <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-6">
            {mainFeatures.map((f, i) => (
              <Card
                key={f.id}
                className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-colors"
                data-testid={`card-feature-${i}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[#00E0C6]/10 text-[#00E0C6]">{getIcon(f.icon)}</div>
                    <h3 className="font-semibold text-white">{f.title}</h3>
                  </div>
                  <p className="text-sm text-gray-400">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* === Medical & Scientific Standards === */}
      <section className="relative px-6 py-16 md:py-24 bg-gradient-to-b from-transparent via-[#00E0C6]/5 to-transparent">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10 md:mb-14">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-[#00E0C6]/10 border border-[#00E0C6]/30 rounded-full px-4 py-1.5 mb-4"
            >
              <Award className="h-4 w-4 text-[#00E0C6]" />
              <span className="text-sm text-[#00E0C6] font-medium">Evidence-Based Platform</span>
            </motion.div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-white">
              Built on <span className="text-[#00E0C6]">Medical Standards</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-2xl mx-auto">
              Every recommendation is grounded in peer-reviewed research and clinical guidelines from leading health organizations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Activity className="h-5 w-5" />,
                org: "ACSM",
                fullName: "American College of Sports Medicine",
                standards: ["Exercise prescription", "HR max caps", "Screening guidelines", "Cardiovascular safety"]
              },
              {
                icon: <Zap className="h-5 w-5" />,
                org: "NSCA",
                fullName: "National Strength & Conditioning Association",
                standards: ["Progressive overload", "Periodization", "Volume/intensity limits", "Training frequency"]
              },
              {
                icon: <Heart className="h-5 w-5" />,
                org: "WHO",
                fullName: "World Health Organization",
                standards: ["Physical activity guidelines", "Minimum rest days", "Health protocols", "Recovery standards"]
              },
              {
                icon: <Apple className="h-5 w-5" />,
                org: "ADA",
                fullName: "American Diabetes Association",
                standards: ["Dietary guidelines", "Carbohydrate recommendations", "Blood sugar management", "Nutritional timing"]
              },
              {
                icon: <Target className="h-5 w-5" />,
                org: "AND",
                fullName: "Academy of Nutrition and Dietetics",
                standards: ["Macro recommendations", "Nutrient timing", "Performance nutrition", "Evidence-based diets"]
              },
              {
                icon: <Heart className="h-5 w-5" />,
                org: "AHA",
                fullName: "American Heart Association",
                standards: ["Cardiovascular health", "Blood pressure thresholds", "Heart rate zones", "Cardiac safety"]
              },
            ].map((standard, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: 0.05 * i }}
              >
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-[#00E0C6]/10 text-[#00E0C6]">{standard.icon}</div>
                      <div>
                        <h3 className="font-semibold text-white">{standard.org}</h3>
                        <p className="text-xs text-gray-500">{standard.fullName}</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {standard.standards.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-400">
                          <CheckCircle className="h-3.5 w-3.5 text-[#00E0C6] mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 inline-block">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-[#00E0C6]" />
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">Transparent Citations:</strong> All AI recommendations include evidence references
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* === Privacy & Security === */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10 md:mb-14">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-[#00E0C6]/10 border border-[#00E0C6]/30 rounded-full px-4 py-1.5 mb-4"
            >
              <Shield className="h-4 w-4 text-[#00E0C6]" />
              <span className="text-sm text-[#00E0C6] font-medium">Healthcare-Grade Security</span>
            </motion.div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-white">
              Your Privacy, <span className="text-[#00E0C6]">Our Priority</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-2xl mx-auto">
              Full international compliance with the world's strictest health data protection standards.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              {
                icon: <Shield className="h-5 w-5" />,
                title: "International Compliance",
                description: "Fully compliant with HIPAA, GDPR, PIPEDA, and Australia Privacy Act requirements.",
                features: [
                  "Protected Health Information (PHI) safeguards",
                  "EU data protection standards (GDPR)",
                  "Canadian privacy requirements (PIPEDA)",
                  "Australian data handling standards"
                ]
              },
              {
                icon: <Lock className="h-5 w-5" />,
                title: "Military-Grade Encryption",
                description: "Your health data is protected with bank-level security at every layer.",
                features: [
                  "AES-256 encryption at rest",
                  "TLS 1.3 encryption in transit",
                  "OpenID Connect authentication",
                  "Zero-trust security architecture"
                ]
              },
              {
                icon: <Eye className="h-5 w-5" />,
                title: "Complete Transparency",
                description: "Full visibility and control over your personal health information.",
                features: [
                  "Granular consent management",
                  "Comprehensive audit logging",
                  "Real-time access tracking",
                  "Privacy dashboard for data control"
                ]
              },
              {
                icon: <Database className="h-5 w-5" />,
                title: "Your Data, Your Rules",
                description: "You maintain complete ownership and control of your health data.",
                features: [
                  "Export your data anytime (JSON format)",
                  "30-day account deletion grace period",
                  "Right to be forgotten compliance",
                  "No third-party data selling, ever"
                ]
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: 0.05 * i }}
              >
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-2 rounded-lg bg-[#00E0C6]/10 text-[#00E0C6] flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                        <ul className="space-y-2">
                          {item.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-400">
                              <div className="w-1 h-1 rounded-full bg-[#00E0C6] mt-1.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Compliance Badges */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-3"
          >
            {["HIPAA Compliant", "GDPR Compliant", "PIPEDA Compliant", "Australia Privacy Act", "SOC 2 Type II"].map((badge, i) => (
              <Badge key={i} variant="outline" className="py-2 px-4 border-white/20 text-gray-300 bg-white/5">
                {badge}
              </Badge>
            ))}
          </motion.div>

          {/* Additional Privacy Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 max-w-3xl mx-auto"
          >
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-gray-300 leading-relaxed">
                  <strong className="text-white">Privacy Commitment:</strong> HealthPilot never sells your data to third parties. 
                  You maintain complete control through our Privacy Dashboard, where you can view all data access, 
                  manage consents, export your information, and request account deletion at any time. All health data 
                  operations are logged in our comprehensive audit trail for full transparency.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 border-[#00E0C6]/30 text-[#00E0C6] hover:bg-[#00E0C6]/10"
                  onClick={() => setLocation("/privacy")}
                >
                  Read Full Privacy Policy
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* === Testimonials === */}
      {content?.testimonialsVisible === 1 && testimonials.length > 0 && (
        <section className="relative px-6 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 md:mb-14">
              <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-white">
                {content?.testimonialsTitle || "Built for Everyone"}
              </h2>
              {content?.testimonialsSubtitle && (
                <p className="text-gray-400 mt-3 max-w-2xl">
                  {content.testimonialsSubtitle}
                </p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial, i) => (
                <Card key={testimonial.id} className="bg-white/5 backdrop-blur-xl border-white/10" data-testid={`card-testimonial-${i}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {testimonial.photoUrl ? (
                        <img src={testimonial.photoUrl} alt={testimonial.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#00E0C6]/15 flex items-center justify-center">
                          <span className="text-[#00E0C6] font-semibold text-sm">
                            {testimonial.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-white" data-testid={`text-testimonial-name-${i}`}>{testimonial.name}</div>
                        <div className="text-xs text-gray-400">{testimonial.role}</div>
                        {testimonial.company && (
                          <div className="text-xs text-gray-500">{testimonial.company}</div>
                        )}
                      </div>
                      {testimonial.rating && (
                        <div className="flex items-center gap-1 text-[#00E0C6]">
                          {[...Array(testimonial.rating)].map((_, s) => (
                            <Star key={s} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-300" data-testid={`text-testimonial-quote-${i}`}>
                      "{testimonial.quote}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === Pricing === */}
      {content?.pricingVisible === 1 && pricingPlans.length > 0 && (
        <section className="relative px-6 pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 md:mb-14 text-center">
              <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-white">
                {content?.pricingTitle || "Simple Pricing"}
              </h2>
              {content?.pricingSubtitle && (
                <p className="text-gray-400 mt-3 max-w-xl mx-auto">
                  {content.pricingSubtitle}
                </p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {pricingPlans.map((plan, i) => (
                <Card 
                  key={plan.id} 
                  className={plan.highlighted === 1 
                    ? "bg-white/5 backdrop-blur-xl border border-[#00E0C6]/30 shadow-[0_0_24px_rgba(0,224,198,0.25)]" 
                    : "bg-white/5 backdrop-blur-xl border-white/10"
                  }
                  data-testid={`card-pricing-${i}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white" data-testid={`text-plan-name-${i}`}>{plan.name}</h3>
                      <span className="text-2xl font-semibold text-white" data-testid={`text-plan-price-${i}`}>{plan.price}</span>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                    )}
                    <ul className="space-y-2 text-sm text-gray-300 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-[#00E0C6]" /> {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={plan.highlighted === 1 
                        ? "w-full rounded-full bg-[#00E0C6] text-[#0A0F1F] hover:bg-[#00E0C6]/90 shadow-[0_0_24px_rgba(0,224,198,0.35)] hover:shadow-[0_0_36px_rgba(0,224,198,0.55)]"
                        : "w-full rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/20"
                      }
                      onClick={() => window.location.href = plan.ctaLink}
                      data-testid={`button-plan-cta-${i}`}
                    >
                      {plan.ctaText}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === Final CTA === */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_35%_at_50%_20%,rgba(0,224,198,0.18),transparent_60%)]" />
          <h3 className="text-3xl md:text-5xl font-semibold tracking-tight text-white relative z-10">
            Your Health, <span className="text-[#00E0C6]">Optimized by AI</span>
          </h3>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto relative z-10">
            Start your journey today and see measurable improvement in 30 days.
          </p>
          <Button
            size="lg"
            className="mt-8 rounded-full px-10 bg-[#00E0C6] text-[#0A0F1F] hover:bg-[#00E0C6]/90 shadow-[0_0_24px_rgba(0,224,198,0.35)] hover:shadow-[0_0_36px_rgba(0,224,198,0.55)] relative z-10"
            onClick={() => window.location.href = "/api/login"}
          >
            Launch HealthPilot
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="text-xs text-gray-500 mt-3 relative z-10">No credit card required. Cancel anytime.</div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="px-6 pb-12">
        <div className="mx-auto max-w-6xl border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div>© {new Date().getFullYear()} HealthPilot by Nuvitae Labs</div>
            <nav className="flex gap-6">
              <button onClick={() => setLocation("/security")} className="hover:text-white transition-colors">About</button>
              <button onClick={() => setLocation("/terms")} className="hover:text-white transition-colors">Terms</button>
              <button onClick={() => setLocation("/privacy")} className="hover:text-white transition-colors">Privacy</button>
              <button onClick={() => setLocation("/security")} className="hover:text-white transition-colors">Support</button>
            </nav>
          </div>
          {socialLinks.length > 0 && (
            <div className="flex justify-center gap-4 mt-6">
              {socialLinks.map((link) => {
                const IconComponent = getIcon(link.icon);
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-[#00E0C6] transition-colors"
                    aria-label={link.platform}
                    data-testid={`link-social-${link.platform.toLowerCase()}`}
                  >
                    {IconComponent}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
