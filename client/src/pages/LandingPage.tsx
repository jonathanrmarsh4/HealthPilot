import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Activity, Brain, Calendar,
  TrendingUp, CheckCircle, Star, ArrowRight, Apple, Heart, Target, Zap, Sparkles
} from "lucide-react";
import digitalHumanImage from "@assets/IMG_0088_1760794249248.png";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0A0F1F]">
      {/* === Hero Section === */}
      <section className="relative px-6 pt-28 md:pt-36 pb-20 md:pb-36">
        {/* Subtle cyan glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_70%_25%,rgba(0,224,198,0.15),transparent_60%)]" />
        
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 items-center relative z-10">
          {/* Left: Copy / CTA */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Badge
                variant="outline"
                className="border-[#00E0C6]/30 bg-[#00E0C6]/5 text-[#00E0C6] px-4 py-1.5"
              >
                AI-Powered Health Intelligence
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="text-4xl md:text-6xl font-semibold leading-tight mb-6 tracking-tight text-white"
            >
              Your Body, <span className="text-[#00E0C6]">Decoded</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="text-lg text-gray-400 max-w-xl mb-8"
            >
              Connect HealthKit, wearables, and blood work to get real-time insights,
              adaptive training, and evidence-based nutrition powered by AI.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="flex flex-wrap gap-3 mb-8"
            >
              <Button
                size="lg"
                className="rounded-full px-8 bg-[#00E0C6] text-[#0A0F1F] hover:bg-[#00E0C6]/90 shadow-[0_0_24px_rgba(0,224,198,0.35)] hover:shadow-[0_0_36px_rgba(0,224,198,0.55)] transition-shadow"
                onClick={() => setLocation("/pricing")}
              >
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 border-[#00E0C6]/30 text-[#00E0C6] hover:bg-[#00E0C6]/10"
                onClick={() => setLocation("/security")}
              >
                Watch Demo
              </Button>
            </motion.div>

            {/* Logos */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.24 }}
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
      <section className="relative px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 md:mb-14">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-white">
              How It <span className="text-[#00E0C6]">Works</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-2xl">
              Three steps from data to daily action.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: <Activity className="h-5 w-5" />,
                title: "Sync Your Data",
                desc: "Connect HealthKit, wearables and blood results securely.",
              },
              {
                icon: <Brain className="h-5 w-5" />,
                title: "AI Analyzes You",
                desc: "Models translate signals into simple, actionable insights.",
              },
              {
                icon: <Calendar className="h-5 w-5" />,
                title: "Your Plan, Every Day",
                desc: "Adaptive training, meals and recovery—updated continuously.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: 0.06 * i }}
              >
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-[#00E0C6]/10 text-[#00E0C6]">{item.icon}</div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                    </div>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === Features === */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-6">
          {[
            {
              icon: <Target className="h-5 w-5" />,
              title: "Biomarker-Driven Training",
              desc: "Workouts that evolve with your body's data.",
            },
            {
              icon: <Zap className="h-5 w-5" />,
              title: "Adaptive Nutrition",
              desc: "Meal plans tuned for performance and longevity.",
            },
            {
              icon: <Sparkles className="h-5 w-5" />,
              title: "Smart Insights",
              desc: "From complex metrics to crystal-clear next steps.",
            },
            {
              icon: <Shield className="h-5 w-5" />,
              title: "Private & Secure",
              desc: "Encryption end-to-end. Your data, your rules.",
            },
          ].map((f, i) => (
            <Card
              key={i}
              className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#00E0C6]/10 text-[#00E0C6]">{f.icon}</div>
                  <h3 className="font-semibold text-white">{f.title}</h3>
                </div>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* === Testimonials === */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 md:mb-14">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-white">
              Built for <span className="text-[#00E0C6]">Everyone</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-2xl">
              Join thousands optimizing their health with AI.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-[#00E0C6]/15" />
                    <div className="flex-1">
                      <div className="font-semibold text-white">User {i}</div>
                      <div className="text-xs text-gray-400">Verified</div>
                    </div>
                    <div className="flex items-center gap-1 text-[#00E0C6]">
                      {[...Array(5)].map((_, s) => (
                        <Star key={s} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">
                    "HealthPilot turned confusing metrics into daily actions. I feel better,
                    lift more, and recover faster."
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* === Pricing === */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 md:mb-14 text-center">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-white">
              Simple <span className="text-[#00E0C6]">Pricing</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto">
              Start free. Upgrade any time.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Free</h3>
                  <span className="text-2xl font-semibold text-white">$0</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-300 mb-6">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#00E0C6]" /> Core dashboard</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#00E0C6]" /> HealthKit sync</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#00E0C6]" /> Basic insights</li>
                </ul>
                <Button className="w-full rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/20" onClick={() => setLocation("/pricing")}>
                  Try Free
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border border-[#00E0C6]/30 shadow-[0_0_24px_rgba(0,224,198,0.25)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Pro</h3>
                  <span className="text-2xl font-semibold text-white">$19/mo</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-300 mb-6">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#00E0C6]" /> AI coaching & training</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#00E0C6]" /> Blood work insights</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#00E0C6]" /> Adaptive nutrition</li>
                </ul>
                <Button
                  className="w-full rounded-full bg-[#00E0C6] text-[#0A0F1F] hover:bg-[#00E0C6]/90 shadow-[0_0_24px_rgba(0,224,198,0.35)] hover:shadow-[0_0_36px_rgba(0,224,198,0.55)]"
                  onClick={() => setLocation("/pricing")}
                >
                  Upgrade
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
            onClick={() => setLocation("/pricing")}
          >
            Launch HealthPilot
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="text-xs text-gray-500 mt-3 relative z-10">No credit card required. Cancel anytime.</div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="px-6 pb-12">
        <div className="mx-auto max-w-6xl border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>© {new Date().getFullYear()} HealthPilot by Jonathan Marsh</div>
          <nav className="flex gap-6">
            <button onClick={() => setLocation("/security")} className="hover:text-white transition-colors">About</button>
            <button onClick={() => setLocation("/terms")} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => setLocation("/privacy")} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => setLocation("/security")} className="hover:text-white transition-colors">Support</button>
          </nav>
        </div>
      </footer>
    </div>
  );
}
