import { useState } from "react";
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
import { CheckoutModal } from "@/components/CheckoutModal";
import { useTheme } from "@/components/ThemeProvider";
import type { LandingPageContent, LandingPageFeature, LandingPageTestimonial, LandingPagePricingPlan, LandingPageSocialLink } from "@shared/schema";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const [checkoutModal, setCheckoutModal] = useState<{ open: boolean; tier: string; tierName: string }>({
    open: false,
    tier: "",
    tierName: "",
  });
  
  const { data: pageData, isLoading, isError, error, refetch } = useQuery<{
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

  // Smart CTA handler based on plan type
  const handlePlanCTA = (ctaLink: string, planName: string) => {
    const lowerPlanName = planName.toLowerCase();
    
    // Premium tier - open checkout modal
    if (lowerPlanName.includes("premium")) {
      setCheckoutModal({ open: true, tier: "premium", tierName: "Premium" });
      return;
    }
    
    // Enterprise tier - contact sales
    if (lowerPlanName.includes("enterprise")) {
      window.location.href = "mailto:sales@nuvitaelabs.com?subject=Enterprise Inquiry";
      return;
    }
    
    // Free tier or default - redirect to provided link
    window.location.href = ctaLink;
  };

  if (isLoading) {
    return (
      <div className={`premium-theme ${theme === 'dark' ? 'dark' : ''} min-h-screen bg-background flex items-center justify-center`}>
        <div className="text-hp-teal text-lg">Loading...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`premium-theme ${theme === 'dark' ? 'dark' : ''} min-h-screen bg-background flex items-center justify-center p-6`}>
        <Card className="hp-glass max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-hp-text mb-2">Unable to Load Page</h2>
            <p className="text-hp-text-dim mb-6">
              We're having trouble loading the landing page content. Please try again.
            </p>
            {error && (
              <p className="text-xs text-hp-text-dim/60 mb-6">
                Error: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            )}
            <Button
              onClick={() => refetch()}
              className="hp-btn-primary"
              data-testid="button-retry"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`premium-theme ${theme === 'dark' ? 'dark' : ''} min-h-screen bg-background`}>
      {/* === Hero Section === */}
      <section className="relative px-6 pt-28 md:pt-36 pb-20 md:pb-36">
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(60% 40% at 70% 25%, rgba(255,124,119,0.15) 0%, rgba(229,138,201,0.15) 45%, rgba(0,207,207,0.15) 100%)'
        }} />
        
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 items-center relative z-10">
          {/* Left: Copy / CTA */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-semibold mb-6 tracking-tight"
              style={{
                background: 'linear-gradient(90deg, var(--hp-coral) 0%, var(--hp-pink) 50%, var(--hp-teal) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 40px rgba(0,207,207,0.3)'
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
                  className="hp-chip"
                >
                  {content.heroBadgeText}
                </Badge>
              </motion.div>
            )}

            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="text-4xl md:text-6xl font-semibold leading-tight mb-6 tracking-tight text-hp-text"
            >
              {content?.heroSubtitle || "Your Body, Decoded"}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="text-lg text-hp-text-dim max-w-xl mb-8"
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
                className="hp-btn-primary rounded-full px-8"
                onClick={() => window.location.href = content?.heroCtaPrimaryLink || "/api/login"}
                data-testid="button-cta-primary"
              >
                {content?.heroCtaPrimary || "Start Free"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                className="hp-btn-ghost rounded-full px-8"
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
              className="flex items-center gap-6 text-hp-text-dim"
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
            {/* Premium gradient glow behind image */}
            <div className="absolute -inset-6 -z-10 rounded-[28px] opacity-70 blur-2xl" style={{
              background: 'radial-gradient(40% 30% at 70% 20%, rgba(0,207,207,0.25) 0%, rgba(229,138,201,0.20) 50%, transparent 100%)'
            }} />
            
            <div className="hp-glass rounded-[22px] p-4">
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
              className="absolute -left-4 top-1/4 hp-tile rounded-xl p-4 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-hp-teal" />
                <div>
                  <div className="font-semibold text-hp-text">95% Readiness</div>
                  <div className="text-xs text-hp-text-dim">Peak performance</div>
                </div>
              </div>
            </motion.div>

            {/* Floating stat - AI Insights */}
            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -right-4 bottom-1/4 hp-tile rounded-xl p-4 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-hp-pink" />
                <div>
                  <div className="font-semibold text-hp-text">AI Insights</div>
                  <div className="text-xs text-hp-text-dim">Updated daily</div>
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
              <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-hp-text">
                {content?.howItWorksTitle || "How It Works"}
              </h2>
              {content?.howItWorksSubtitle && (
                <p className="text-hp-text-dim mt-3 max-w-2xl">
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
                  <Card className="hp-glass h-full hover-elevate">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-hp-teal/20 to-hp-pink/20 text-hp-teal">
                          {getIcon(item.icon)}
                        </div>
                        <h3 className="font-semibold text-hp-text">{item.title}</h3>
                      </div>
                      <p className="text-sm text-hp-text-dim">{item.description}</p>
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
                className="hp-glass hover-elevate"
                data-testid={`card-feature-${i}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-hp-coral/20 to-hp-pink/20 text-hp-coral">{getIcon(f.icon)}</div>
                    <h3 className="font-semibold text-hp-text">{f.title}</h3>
                  </div>
                  <p className="text-sm text-hp-text-dim">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* === Medical & Scientific Standards === */}
      <section className="relative px-6 py-16 md:py-24" style={{
        background: 'linear-gradient(180deg, transparent, rgba(0,207,207,0.05) 50%, transparent)'
      }}>
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10 md:mb-14">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="hp-chip inline-flex mb-4"
            >
              <Award className="h-4 w-4" />
              <span className="font-medium">Evidence-Based Platform</span>
            </motion.div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-hp-text">
              Built on <span style={{
                background: 'linear-gradient(90deg, var(--hp-teal), var(--hp-pink))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Medical Standards</span>
            </h2>
            <p className="text-hp-text-dim mt-3 max-w-2xl mx-auto">
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
                <Card className="hp-glass h-full hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-hp-teal/20 to-hp-pink/20 text-hp-teal">{standard.icon}</div>
                      <div>
                        <h3 className="font-semibold text-hp-text">{standard.org}</h3>
                        <p className="text-xs text-hp-text-dim/70">{standard.fullName}</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {standard.standards.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-hp-text-dim">
                          <CheckCircle className="h-3.5 w-3.5 text-hp-teal mt-0.5 flex-shrink-0" />
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
            <Card className="hp-glass inline-block">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-hp-teal" />
                  <p className="text-sm text-hp-text-dim">
                    <strong className="text-hp-text">Transparent Citations:</strong> All AI recommendations include evidence references
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
              className="hp-chip inline-flex mb-4"
            >
              <Shield className="h-4 w-4" />
              <span className="font-medium">Healthcare-Grade Security</span>
            </motion.div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-hp-text">
              Your Privacy, <span style={{
                background: 'linear-gradient(90deg, var(--hp-coral), var(--hp-pink))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Our Priority</span>
            </h2>
            <p className="text-hp-text-dim mt-3 max-w-2xl mx-auto">
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
                <Card className="hp-glass h-full hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-hp-coral/20 to-hp-pink/20 text-hp-coral flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-hp-text mb-1">{item.title}</h3>
                        <p className="text-sm text-hp-text-dim mb-3">{item.description}</p>
                        <ul className="space-y-2">
                          {item.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-hp-text-dim">
                              <div className="w-1 h-1 rounded-full bg-hp-teal mt-1.5 flex-shrink-0" />
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
              <Badge key={i} className="hp-chip py-2 px-4">
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
            <Card className="hp-glass">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-hp-text-dim leading-relaxed">
                  <strong className="text-hp-text">Privacy Commitment:</strong> HealthPilot never sells your data to third parties. 
                  You maintain complete control through our Privacy Dashboard, where you can view all data access, 
                  manage consents, export your information, and request account deletion at any time. All health data 
                  operations are logged in our comprehensive audit trail for full transparency.
                </p>
                <Button
                  className="hp-btn-ghost mt-4"
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
              <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-hp-text">
                {content?.testimonialsTitle || "Built for Everyone"}
              </h2>
              {content?.testimonialsSubtitle && (
                <p className="text-hp-text-dim mt-3 max-w-2xl">
                  {content.testimonialsSubtitle}
                </p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial, i) => (
                <Card key={testimonial.id} className="hp-glass hover-elevate" data-testid={`card-testimonial-${i}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {testimonial.photoUrl ? (
                        <img src={testimonial.photoUrl} alt={testimonial.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-hp-teal/20 to-hp-pink/20 flex items-center justify-center">
                          <span className="text-hp-teal font-semibold text-sm">
                            {testimonial.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-hp-text" data-testid={`text-testimonial-name-${i}`}>{testimonial.name}</div>
                        <div className="text-xs text-hp-text-dim">{testimonial.role}</div>
                        {testimonial.company && (
                          <div className="text-xs text-hp-text-dim/70">{testimonial.company}</div>
                        )}
                      </div>
                      {testimonial.rating && (
                        <div className="flex items-center gap-1 text-hp-teal">
                          {[...Array(testimonial.rating)].map((_, s) => (
                            <Star key={s} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-hp-text-dim" data-testid={`text-testimonial-quote-${i}`}>
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
              <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-hp-text">
                {content?.pricingTitle || "Simple Pricing"}
              </h2>
              {content?.pricingSubtitle && (
                <p className="text-hp-text-dim mt-3 max-w-xl mx-auto">
                  {content.pricingSubtitle}
                </p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {pricingPlans.map((plan, i) => (
                <Card 
                  key={plan.id} 
                  className={plan.highlighted === 1 
                    ? "hp-glass hover-elevate" 
                    : "hp-glass hover-elevate"
                  }
                  style={plan.highlighted === 1 ? {
                    boxShadow: '0 0 24px rgba(0,207,207,0.25)',
                    border: '1px solid rgba(0,207,207,0.3)'
                  } : undefined}
                  data-testid={`card-pricing-${i}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-hp-text" data-testid={`text-plan-name-${i}`}>{plan.name}</h3>
                      <span className="text-2xl font-semibold text-hp-text" data-testid={`text-plan-price-${i}`}>{plan.price}</span>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-hp-text-dim mb-4">{plan.description}</p>
                    )}
                    <ul className="space-y-2 text-sm text-hp-text-dim mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-hp-teal" /> {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={plan.highlighted === 1 
                        ? "hp-btn-primary w-full rounded-full"
                        : "hp-btn-ghost w-full rounded-full"
                      }
                      onClick={() => handlePlanCTA(plan.ctaLink, plan.name)}
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
          <div className="pointer-events-none absolute inset-0" style={{
            background: 'radial-gradient(40% 35% at 50% 20%, rgba(0,207,207,0.18) 0%, rgba(229,138,201,0.12) 50%, transparent 100%)'
          }} />
          <h3 className="text-3xl md:text-5xl font-semibold tracking-tight text-hp-text relative z-10">
            Your Health, <span style={{
              background: 'linear-gradient(90deg, var(--hp-coral), var(--hp-pink), var(--hp-teal))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Optimized by AI</span>
          </h3>
          <p className="text-hp-text-dim mt-4 max-w-2xl mx-auto relative z-10">
            Start your journey today and see measurable improvement in 30 days.
          </p>
          <Button
            size="lg"
            className="hp-btn-primary mt-8 rounded-full px-10 relative z-10"
            onClick={() => window.location.href = "/api/login"}
          >
            Launch HealthPilot
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="text-xs text-hp-text-dim/70 mt-3 relative z-10">No credit card required. Cancel anytime.</div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="px-6 pb-12">
        <div className="mx-auto max-w-6xl border-t border-hp-border pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-hp-text-dim">
            <div>© {new Date().getFullYear()} HealthPilot by Nuvitae Labs</div>
            <nav className="flex gap-6">
              <button onClick={() => setLocation("/security")} className="hover:text-hp-text transition-colors">About</button>
              <button onClick={() => setLocation("/terms")} className="hover:text-hp-text transition-colors">Terms</button>
              <button onClick={() => setLocation("/privacy")} className="hover:text-hp-text transition-colors">Privacy</button>
              <button onClick={() => setLocation("/security")} className="hover:text-hp-text transition-colors">Support</button>
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
                    className="text-hp-text-dim hover:text-hp-teal transition-colors"
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

      {/* Checkout Modal */}
      {checkoutModal.tier === "premium" && (
        <CheckoutModal
          open={checkoutModal.open}
          onOpenChange={(open) => setCheckoutModal({ ...checkoutModal, open })}
          tier="premium"
          tierName="Premium"
        />
      )}
    </div>
  );
}
