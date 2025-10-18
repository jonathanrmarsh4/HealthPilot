import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, Lock, Database, Activity, Brain, Calendar, 
  TrendingUp, CheckCircle, Star, Users, Zap, Sparkles,
  ArrowRight, Apple, Github, Twitter, Linkedin,
  Heart, Clock, Target
} from "lucide-react";
import digitalHumanImage from "@assets/stock_images/futuristic_digital_h_79a07a7b.jpg";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative isolate px-6 pt-24 pb-24 md:pb-40">
        {/* Gradient aura */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_70%_20%,rgba(0,224,198,0.15),transparent_60%)]" />
        
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Badge 
                variant="outline" 
                className="border-primary/30 bg-primary/5 text-primary px-4 py-1.5"
                data-testid="badge-hero-tag"
              >
                AI-Powered Health Intelligence
              </Badge>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-semibold leading-tight mb-6"
              data-testid="text-hero-headline"
            >
              Your Body, <span className="text-primary">Decoded</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-xl mb-8"
              data-testid="text-hero-subtitle"
            >
              Connect HealthKit, wearables, and blood work to get real-time insights, 
              adaptive training, and evidence-based nutrition powered by AI.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 mb-8"
            >
              <Button 
                size="lg"
                className="rounded-full px-8"
                onClick={() => setLocation("/pricing")}
                data-testid="button-start-free"
              >
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg"
                variant="outline" 
                className="rounded-full px-8 backdrop-blur-sm"
                onClick={() => setLocation("/security")}
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-6 opacity-70"
              data-testid="container-integrations"
            >
              <div className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                <span className="text-sm">Apple Health</span>
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
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
            data-testid="container-hero-image"
          >
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-4">
              <img
                src={digitalHumanImage}
                alt="Digital human body visualization"
                className="rounded-xl w-full h-auto"
              />
            </div>
            
            {/* Floating stats */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -left-4 top-1/4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-lg"
              data-testid="card-floating-stat-1"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">95% Readiness</div>
                  <div className="text-xs text-muted-foreground">Peak performance</div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -right-4 bottom-1/4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-lg"
              data-testid="card-floating-stat-2"
            >
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">AI Insights</div>
                  <div className="text-xs text-muted-foreground">Updated daily</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-20 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-how-it-works-title">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-how-it-works-subtitle">
              Three simple steps to unlock personalized health intelligence
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: Activity,
                title: "Sync Your Data",
                description: "Connect Apple Health, wearables, or manually enter biomarkers, workouts, and sleep data."
              },
              {
                step: "2",
                icon: Brain,
                title: "AI Analyzes",
                description: "Our AI processes your data using evidence-based standards (ACSM, NSCA, WHO) to identify patterns."
              },
              {
                step: "3",
                icon: Calendar,
                title: "Get Your Daily Plan",
                description: "Receive personalized training, nutrition, and recovery recommendations updated in real-time."
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                data-testid={`card-how-it-works-${idx}`}
              >
                <Card className="relative overflow-hidden hover-elevate">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <CardContent className="pt-8 pb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className="text-4xl font-bold text-muted-foreground/20">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-features-title">
              Powerful Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-subtitle">
              Everything you need to optimize your health and performance
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Brain,
                title: "AI Health Coach",
                description: "Chat with your personal AI coach for instant insights, recommendations, and answers to health questions.",
                features: ["Unlimited conversations", "Context-aware responses", "Voice chat support"]
              },
              {
                icon: Activity,
                title: "Biomarker Tracking",
                description: "Track unlimited biomarkers from blood work, wearables, and manual entries with trend analysis.",
                features: ["Custom reference ranges", "Trend detection", "AI pattern recognition"]
              },
              {
                icon: Target,
                title: "Adaptive Training",
                description: "Get evidence-based workout plans that adapt to your readiness, goals, and recovery status.",
                features: ["Progressive overload", "Auto-regulation", "Exercise alternatives"]
              },
              {
                icon: Sparkles,
                title: "AI Meal Plans",
                description: "Personalized nutrition plans generated from your goals, preferences, and biomarker data.",
                features: ["Macro optimization", "Recipe suggestions", "Shopping lists"]
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                data-testid={`card-feature-${idx}`}
              >
                <Card className="h-full backdrop-blur-sm bg-card/50 border-border/50 hover-elevate">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground mb-4">{feature.description}</p>
                        <ul className="space-y-2">
                          {feature.features.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>{item}</span>
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
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-6 py-20 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-testimonials-title">
              Trusted by Health Enthusiasts
            </h2>
            <p className="text-lg text-muted-foreground" data-testid="text-testimonials-subtitle">
              Real results from real people
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "Marathon Runner",
                content: "The AI training recommendations helped me achieve a new PR while avoiding overtraining. The readiness score is a game-changer.",
                rating: 5
              },
              {
                name: "Dr. Michael Torres",
                role: "Physician & Triathlete",
                content: "Finally, a platform that combines evidence-based science with practical application. The biomarker tracking is incredibly detailed.",
                rating: 5
              },
              {
                name: "Emma Watson",
                role: "Fitness Coach",
                content: "I recommend HealthPilot to all my clients. The meal plans and recovery insights have transformed their results.",
                rating: 5
              }
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                data-testid={`card-testimonial-${idx}`}
              >
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground" data-testid="text-pricing-subtitle">
              Choose the plan that fits your goals
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                description: "Perfect for getting started",
                features: [
                  "10 AI messages per day",
                  "Track up to 3 biomarkers",
                  "7 days of history",
                  "Basic training plans",
                  "Community support"
                ],
                cta: "Start Free",
                popular: false
              },
              {
                name: "Premium",
                price: "$19.99",
                period: "per month",
                description: "For serious health optimization",
                features: [
                  "Unlimited AI messages",
                  "Unlimited biomarker tracking",
                  "Full historical data",
                  "AI meal plans",
                  "Voice chat with AI coach",
                  "Apple Health sync",
                  "Biological age calculation",
                  "Priority support"
                ],
                cta: "Upgrade to Premium",
                popular: true
              }
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
                data-testid={`card-pricing-${idx}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1" data-testid="badge-popular">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <Card className={`h-full ${plan.popular ? 'border-primary/50 shadow-lg' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <div className="mb-2">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground ml-2">/{plan.period}</span>
                      </div>
                      <p className="text-muted-foreground">{plan.description}</p>
                    </div>
                    
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      className="w-full rounded-full"
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                      onClick={() => setLocation("/pricing")}
                      data-testid={`button-pricing-${idx}`}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & Trust Section */}
      <section className="px-6 py-20 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-trust-title">
              Your Privacy, Our Priority
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-trust-subtitle">
              Healthcare-grade security with international compliance standards
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              {
                icon: Shield,
                title: "International Compliance",
                description: "Fully compliant with HIPAA, GDPR, PIPEDA, and Australia Privacy Act requirements.",
                details: ["Protected Health Information safeguards", "EU data protection standards", "Canadian privacy requirements", "Australian data handling standards"]
              },
              {
                icon: Lock,
                title: "Bank-Level Encryption",
                description: "Your health data is protected with military-grade encryption at every layer.",
                details: ["AES-256 encryption at rest", "TLS 1.3 in transit", "OpenID Connect authentication", "Zero-trust architecture"]
              },
              {
                icon: Database,
                title: "Evidence-Based AI",
                description: "All recommendations align with leading health and fitness organizations.",
                details: ["ACSM exercise guidelines", "NSCA training standards", "WHO health protocols", "ADA, AHA, AND nutrition standards"]
              },
              {
                icon: Users,
                title: "Your Data, Your Control",
                description: "Complete transparency and control over your personal health information.",
                details: ["Export data anytime", "Delete on request", "Audit log access", "Granular permissions"]
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                data-testid={`card-trust-${idx}`}
              >
                <Card className="h-full backdrop-blur-sm bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                        <p className="text-muted-foreground mb-4">{item.description}</p>
                        <ul className="space-y-2">
                          {item.details.map((detail, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="w-1 h-1 rounded-full bg-primary" />
                              <span>{detail}</span>
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
          
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="outline" className="py-2 px-4">HIPAA Compliant</Badge>
            <Badge variant="outline" className="py-2 px-4">GDPR Compliant</Badge>
            <Badge variant="outline" className="py-2 px-4">PIPEDA Compliant</Badge>
            <Badge variant="outline" className="py-2 px-4">Australia Privacy Act</Badge>
            <Badge variant="outline" className="py-2 px-4">SOC 2 Type II</Badge>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl"
            data-testid="container-final-cta"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
            <Card className="relative border-primary/30">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-final-cta-title">
                  Ready to Decode Your Health?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-final-cta-subtitle">
                  Join thousands of users optimizing their health with AI-powered insights. 
                  Start your journey today—no credit card required.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button 
                    size="lg" 
                    className="rounded-full px-8"
                    onClick={() => setLocation("/pricing")}
                    data-testid="button-final-cta-start"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="rounded-full px-8"
                    onClick={() => setLocation("/security")}
                    data-testid="button-final-cta-security"
                  >
                    View Security Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                HealthPilot
              </h3>
              <p className="text-sm text-muted-foreground">
                AI-powered health intelligence for optimizing your well-being.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => setLocation("/pricing")} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-footer-features"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setLocation("/pricing")} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-footer-pricing"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setLocation("/security")} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-footer-security"
                  >
                    Security
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => setLocation("/privacy")} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-footer-privacy"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setLocation("/terms")} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-footer-terms"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex gap-3">
                <button 
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover-elevate"
                  aria-label="Twitter"
                  data-testid="button-footer-twitter"
                >
                  <Twitter className="h-4 w-4" />
                </button>
                <button 
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover-elevate"
                  aria-label="LinkedIn"
                  data-testid="button-footer-linkedin"
                >
                  <Linkedin className="h-4 w-4" />
                </button>
                <button 
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover-elevate"
                  aria-label="GitHub"
                  data-testid="button-footer-github"
                >
                  <Github className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p data-testid="text-footer-copyright">
              © 2025 HealthPilot. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
