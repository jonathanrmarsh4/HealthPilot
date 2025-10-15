import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
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
import { FloatingChat, FloatingChatTrigger } from "@/components/FloatingChat";
import Dashboard from "@/pages/Dashboard";
import HealthRecords from "@/pages/HealthRecords";
import Biomarkers from "@/pages/Biomarkers";
import Sleep from "@/pages/Sleep";
import MealPlans from "@/pages/MealPlans";
import NutritionProfile from "@/pages/NutritionProfile";
import Training from "@/pages/Training";
import ReadinessSettings from "@/pages/ReadinessSettings";
import FitnessProfile from "@/pages/FitnessProfile";
import AIInsights from "@/pages/AIInsights";
import Insights from "@/pages/Insights";
import Goals from "@/pages/Goals";
import Supplements from "@/pages/Supplements";
import BiologicalAge from "@/pages/BiologicalAge";
import AppleHealthSetup from "@/pages/AppleHealthSetup";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import AIAuditLog from "@/pages/AIAuditLog";
import Login from "@/pages/Login";
import Logout from "@/pages/Logout";
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
      <Route path="/supplements" component={Supplements} />
      <Route path="/insights" component={AIInsights} />
      <Route path="/data-insights" component={Insights} />
      <Route path="/goals" component={Goals} />
      <Route path="/biological-age" component={BiologicalAge} />
      <Route path="/chat" component={Chat} />
      <Route path="/profile" component={Profile} />
      <Route path="/apple-health" component={AppleHealthSetup} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/ai-audit" component={AIAuditLog} />
      <Route path="/logged-out" component={Logout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [location] = useLocation();
  const { shouldShowOnboarding, isLoading: onboardingLoading } = useOnboarding();
  
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
    "/insights": "AI Insights",
    "/data-insights": "Data Insights",
    "/goals": "Health Goals",
    "/biological-age": "Biological Age",
    "/chat": "Health Coach",
    "/profile": "Profile",
    "/apple-health": "Apple Health Setup",
    "/settings": "Settings",
    "/admin": "Admin Panel",
    "/admin/ai-audit": "AI Audit Log"
  };

  const currentPage = pageNames[location] || "Unknown Page";

  // Auto-open floating chat once on first login if onboarding not completed
  useEffect(() => {
    if (!onboardingLoading && shouldShowOnboarding && location !== "/chat" && !hasAutoOpened) {
      setIsChatOpen(true);
      setHasAutoOpened(true);
    }
  }, [onboardingLoading, shouldShowOnboarding, location, hasAutoOpened]);

  // Reset auto-open flag when onboarding is completed
  useEffect(() => {
    if (!shouldShowOnboarding) {
      setHasAutoOpened(false);
    }
  }, [shouldShowOnboarding]);

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
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
          <main className="flex-1 overflow-auto p-8">
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {location !== "/chat" && !isChatOpen && (
        <FloatingChatTrigger onClick={() => setIsChatOpen(true)} />
      )}
      
      <FloatingChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        currentPage={currentPage}
      />
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  return (
    <LocaleProvider>
      <TimezoneProvider>
        <OnboardingProvider>
          <AppLayout />
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

  // Check if on logged-out page
  const isLoggedOutPage = window.location.pathname === "/logged-out";

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
    return <Login />;
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
