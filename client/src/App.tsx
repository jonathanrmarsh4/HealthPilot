import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { LocaleSelector } from "@/components/LocaleSelector";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FloatingChat, FloatingChatTrigger, VoiceChatModal } from "@/components/FloatingChat";
import { useAuth } from "@/hooks/useAuth";
import { TimezoneDetector } from "@/components/TimezoneDetector";
import { EulaDialog } from "@/components/EulaDialog";
import Dashboard from "@/pages/Dashboard";
import HealthRecords from "@/pages/HealthRecords";
import Biomarkers from "@/pages/Biomarkers";
import Sleep from "@/pages/Sleep";
import MealPlans from "@/pages/MealPlans";
import NutritionProfile from "@/pages/NutritionProfile";
import Training from "@/pages/Training";
import ReadinessSettings from "@/pages/ReadinessSettings";
import FitnessProfile from "@/pages/FitnessProfile";
import WorkoutSession from "@/pages/WorkoutSession";
import InsightsHub from "@/pages/InsightsHub";
import Goals from "@/pages/Goals";
import Supplements from "@/pages/Supplements";
import BiologicalAge from "@/pages/BiologicalAge";
import AppleHealthSetup from "@/pages/AppleHealthSetup";
import Chat from "@/pages/Chat";
import VoiceChat from "@/pages/VoiceChat";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Billing from "@/pages/Billing";
import Pricing from "@/pages/Pricing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import PrivacyDashboard from "@/pages/PrivacyDashboard";
import SecurityWhitepaper from "@/pages/SecurityWhitepaper";
import TermsOfService from "@/pages/TermsOfService";
import Admin from "@/pages/Admin";
import AdminMealLibrary from "@/pages/AdminMealLibrary";
import AdminPromoCodes from "@/pages/AdminPromoCodes";
import AdminLandingPage from "@/pages/AdminLandingPage";
import AdminCostDashboard from "@/pages/AdminCostDashboard";
import AIAuditLog from "@/pages/AIAuditLog";
import Login from "@/pages/Login";
import Logout from "@/pages/Logout";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/not-found";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/records" component={HealthRecords} />
      <Route path="/biomarkers" component={Biomarkers} />
      <Route path="/sleep" component={Sleep} />
      <Route path="/meals" component={MealPlans} />
      <Route path="/meals/nutrition-profile" component={NutritionProfile} />
      <Route path="/training" component={Training} />
      <Route path="/training/readiness-settings" component={ReadinessSettings} />
      <Route path="/training/fitness-profile" component={FitnessProfile} />
      <Route path="/workout/:id" component={WorkoutSession} />
      <Route path="/supplements" component={Supplements} />
      <Route path="/insights" component={InsightsHub} />
      <Route path="/daily-insights" component={() => {
        const [, setLocation] = useLocation();
        setLocation('/insights?tab=daily');
        return null;
      }} />
      <Route path="/goals" component={Goals} />
      <Route path="/biological-age" component={BiologicalAge} />
      <Route path="/chat" component={Chat} />
      <Route path="/voice-chat" component={VoiceChat} />
      <Route path="/profile" component={Profile} />
      <Route path="/apple-health" component={AppleHealthSetup} />
      <Route path="/settings" component={Settings} />
      <Route path="/billing" component={Billing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/privacy-dashboard" component={PrivacyDashboard} />
      <Route path="/security" component={SecurityWhitepaper} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/meal-library" component={AdminMealLibrary} />
      <Route path="/admin/promo-codes" component={AdminPromoCodes} />
      <Route path="/admin/landing-page" component={AdminLandingPage} />
      <Route path="/admin/cost" component={AdminCostDashboard} />
      <Route path="/admin/ai-audit" component={AIAuditLog} />
      <Route path="/logged-out" component={Logout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [location] = useLocation();
  const { shouldShowOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { user } = useAuth();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const pageNames: Record<string, string> = {
    "/": "Dashboard",
    "/records": "Health Records",
    "/biomarkers": "Biomarkers",
    "/sleep": "Sleep Dashboard",
    "/meals": "Meal Plans",
    "/meals/nutrition-profile": "Nutrition Profile",
    "/training": "Training",
    "/supplements": "Supplement Stack",
    "/insights": "Insights Hub",
    "/daily-insights": "Insights Hub",
    "/goals": "Health Goals",
    "/biological-age": "Biological Age",
    "/chat": "Health Coach",
    "/voice-chat": "Voice Chat",
    "/profile": "Profile",
    "/apple-health": "Apple Health Setup",
    "/settings": "Settings",
    "/pricing": "Pricing",
    "/privacy": "Privacy Policy",
    "/privacy-dashboard": "Privacy & Data Control",
    "/security": "Security & Privacy Whitepaper",
    "/terms": "Terms of Service",
    "/admin": "Admin Panel",
    "/admin/meal-library": "Meal Library",
    "/admin/promo-codes": "Promo Codes",
    "/admin/ai-audit": "AI Audit Log"
  };

  const currentPage = pageNames[location] || "Unknown Page";

  // Invalidate all queries on navigation to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries();
  }, [location]);

  // Auto-open floating chat once on first login if onboarding not completed
  // Disabled: Users prefer to open chat manually via sparkle icon
  // useEffect(() => {
  //   if (!onboardingLoading && shouldShowOnboarding && location !== "/chat" && !hasAutoOpened) {
  //     setIsChatOpen(true);
  //     setHasAutoOpened(true);
  //   }
  // }, [onboardingLoading, shouldShowOnboarding, location, hasAutoOpened]);

  // Reset auto-open flag when onboarding is completed
  useEffect(() => {
    if (!shouldShowOnboarding) {
      setHasAutoOpened(false);
    }
  }, [shouldShowOnboarding]);

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <LocaleSelector />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {location !== "/chat" && !isChatOpen && !isVoiceChatOpen && (
        <FloatingChatTrigger 
          onClick={() => {
            const isPremium = user?.subscriptionTier === 'premium' || user?.subscriptionTier === 'enterprise';
            if (isPremium) {
              setIsVoiceChatOpen(true);
            } else {
              setIsChatOpen(true);
            }
          }} 
          subscriptionTier={user?.subscriptionTier || 'free'}
        />
      )}
      
      <FloatingChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        currentPage={currentPage}
      />
      
      <VoiceChatModal
        isOpen={isVoiceChatOpen}
        onClose={() => setIsVoiceChatOpen(false)}
      />
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  const { data: user } = useQuery<{ eulaAcceptedAt: string | null }>({
    queryKey: ["/api/profile"],
  });

  const acceptEulaMutation = useMutation({
    mutationFn: async () => {
      console.log("EULA mutation starting...");
      const result = await apiRequest("POST", "/api/user/accept-eula");
      console.log("EULA mutation completed", result);
      return result;
    },
    onSuccess: () => {
      console.log("EULA mutation onSuccess - updating cache");
      // Immediately update the cache to close the dialog
      queryClient.setQueryData(["/api/profile"], (oldData: any) => ({
        ...oldData,
        eulaAcceptedAt: new Date().toISOString(),
      }));
    },
    onError: (error) => {
      console.error("EULA mutation error:", error);
    },
  });

  // Development mode: EULA completely disabled during development
  const showEulaDialog = false; // Disabled for development - set to: user && !user.eulaAcceptedAt for production

  return (
    <LocaleProvider>
      <TimezoneProvider>
        <OnboardingProvider>
          <TimezoneDetector />
          <AppLayout />
          <EulaDialog
            open={showEulaDialog || false}
            onAccept={() => {
              console.log("EULA onAccept called");
              acceptEulaMutation.mutate();
            }}
            isAccepting={acceptEulaMutation.isPending}
          />
        </OnboardingProvider>
        <Toaster />
      </TimezoneProvider>
    </LocaleProvider>
  );
}

function AppContent() {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check current path
  const currentPath = window.location.pathname;
  const isLoggedOutPage = currentPath === "/logged-out";
  const isLoginPage = currentPath === "/login";
  
  // Public routes that don't require authentication
  const publicRoutes = ["/pricing", "/privacy", "/security", "/terms"];
  const isPublicRoute = publicRoutes.includes(currentPath);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isLoggedOutPage) {
    return <Logout />;
  }

  // Treat auth errors same as not logged in (Safari caching issues) 
  if (!user || isError) {
    // Show Login page if explicitly on /login route
    if (isLoginPage) {
      return <Login />;
    }
    // Show public route content if on a public route
    if (isPublicRoute) {
      return (
        <div className="min-h-screen">
          <Switch>
            <Route path="/pricing" component={Pricing} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/security" component={SecurityWhitepaper} />
            <Route path="/terms" component={TermsOfService} />
          </Switch>
        </div>
      );
    }
    // Show LandingPage for home page when not authenticated
    return <LandingPage />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
