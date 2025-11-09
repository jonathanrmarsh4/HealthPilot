import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PremiumThemeProvider } from "@/components/PremiumThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { NotificationBadge } from "@/components/NotificationBadge";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { ChatProvider, useChat } from "@/contexts/ChatContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FloatingChat, FloatingChatTrigger, VoiceChatModal } from "@/components/FloatingChat";
import { useAuth } from "@/hooks/useAuth";
import { TimezoneDetector } from "@/components/TimezoneDetector";
import { EulaDialog } from "@/components/EulaDialog";
import { HealthKitOnboarding } from "@/components/HealthKitOnboarding";
import { getPlatform } from "@/mobile/MobileBootstrap";
import { useSwipeToOpenSidebar } from "@/hooks/useSwipeToOpenSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileNav from "@/components/MobileNav";
import { Link } from "wouter";
import Dashboard from "@/pages/Dashboard";
import HealthRecords from "@/pages/HealthRecords";
import Biomarkers from "@/pages/Biomarkers";
import Sleep from "@/pages/Sleep";
import MealPlans from "@/pages/MealPlans";
import NutritionProfile from "@/pages/NutritionProfile";
import SmartFuel from "@/pages/SmartFuel";
import Training from "@/pages/Training";
import Recovery from "@/pages/Recovery";
import ReadinessSettings from "@/pages/ReadinessSettings";
import FitnessProfile from "@/pages/FitnessProfile";
import WorkoutSession from "@/pages/WorkoutSession";
import InsightsHub from "@/pages/InsightsHub";
import Goals from "@/pages/Goals";
import Supplements from "@/pages/Supplements";
import Symptoms from "@/pages/Symptoms";
import NewSymptom from "@/pages/NewSymptom";
import BiologicalAge from "@/pages/BiologicalAge";
import AppleHealthSetup from "@/pages/AppleHealthSetup";
import StartWorkout from "@/pages/StartWorkout";
import Notifications from "@/pages/Notifications";
import Chat from "@/pages/Chat";
import VoiceChat from "@/pages/VoiceChat";
import VoiceChatSimple from "@/pages/VoiceChatSimple";
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
import OAuthSuccess from "@/pages/OAuthSuccess";
import MobileAuthRedirect from "@/pages/MobileAuthRedirect";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/not-found";
import { NativeDiagnostics } from "@/mobile/features/diagnostics/NativeDiagnostics";
import HealthKitDiagnostics from "@/pages/HealthKitDiagnostics";
import DiagnosticPage from "@/pages/DiagnosticPage";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from "@/mobile/MobileBootstrap";
import SafariData from "@/lib/safariData";
import { initializeDeepLinkHandling } from "@/lib/notifications/deeplink";
import { oneSignalClient } from "@/lib/notifications/onesignal";

function DailyInsightsRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation('/insights?tab=daily');
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/records" component={HealthRecords} />
      <Route path="/biomarkers" component={Biomarkers} />
      <Route path="/sleep" component={Sleep} />
      <Route path="/meals" component={MealPlans} />
      <Route path="/meals/nutrition-profile" component={NutritionProfile} />
      <Route path="/smartfuel" component={SmartFuel} />
      <Route path="/training" component={Training} />
      <Route path="/training/start" component={StartWorkout} />
      <Route path="/recovery" component={Recovery} />
      <Route path="/training/readiness-settings" component={ReadinessSettings} />
      <Route path="/training/fitness-profile" component={FitnessProfile} />
      <Route path="/workout/:id" component={WorkoutSession} />
      <Route path="/supplements" component={Supplements} />
      <Route path="/symptoms" component={Symptoms} />
      <Route path="/symptoms/new" component={NewSymptom} />
      <Route path="/insights" component={InsightsHub} />
      <Route path="/daily-insights" component={DailyInsightsRedirect} />
      <Route path="/goals" component={Goals} />
      <Route path="/biological-age" component={BiologicalAge} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/chat" component={Chat} />
      <Route path="/voice-chat" component={VoiceChat} />
      <Route path="/voice-chat-simple" component={VoiceChatSimple} />
      <Route path="/diagnostics" component={DiagnosticPage} />
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
      <Route path="/mobile-diagnostics" component={NativeDiagnostics} />
      <Route path="/healthkit-diagnostics" component={HealthKitDiagnostics} />
      <Route path="/mobile-auth-redirect" component={MobileAuthRedirect} />
      <Route path="/logged-out" component={Logout} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Component to handle swipe gestures inside SidebarProvider context
function SidebarContentWrapper({ 
  children, 
  currentPage, 
  location 
}: { 
  children: React.ReactNode; 
  currentPage: string;
  location: string;
}) {
  const { isChatOpen, isVoiceChatOpen, setIsChatOpen, setIsVoiceChatOpen, chatContext } = useChat();
  const { user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Add context-aware swipe-to-open functionality for mobile
  // Dashboard: swipe opens sidebar
  // Other pages: swipe acts as "back" navigation
  useSwipeToOpenSidebar({
    onSwipeRight: () => {
      // Extract path without query params (e.g., '/?utm=...' -> '/')
      const path = location.split('?')[0];
      
      if (path === '/') {
        // On dashboard (with or without query params), open the sidebar
        setOpenMobile(true);
      } else {
        // On other pages, navigate back if there's history
        // Otherwise go to dashboard (handles deep-linked detail pages)
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // No history - navigate to dashboard
          setLocation('/');
        }
      }
    },
  });

  return (
    <>
      <div className="flex min-h-dvh w-full bg-background">
        {/* Desktop-only sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        
        <div className="flex flex-col flex-1">
          {/* Desktop-only header */}
          <header className="hidden md:flex items-center justify-between p-4 border-b border-border shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <NotificationBadge />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (isNativePlatform()) {
                    try {
                      try {
                        await SafariData.clearData();
                      } catch {}
                      await SecureStorage.remove('sessionToken');
                      await Preferences.remove({ key: 'deviceId' });
                      window.location.href = "/api/logout";
                    } catch (error) {
                      console.error('[Logout] Error clearing mobile session:', error);
                      window.location.href = "/api/logout";
                    }
                  } else {
                    window.location.href = "/api/logout";
                  }
                }}
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Mobile-only header */}
          <header className="md:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border px-4">
            <div 
              className="flex items-center justify-end gap-2"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
                paddingBottom: '0.5rem'
              }}
            >
              <NotificationBadge />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (isNativePlatform()) {
                    try {
                      try {
                        await SafariData.clearData();
                      } catch {}
                      await SecureStorage.remove('sessionToken');
                      await Preferences.remove({ key: 'deviceId' });
                      window.location.href = "/api/logout";
                    } catch (error) {
                      console.error('[Logout] Error:', error);
                      window.location.href = "/api/logout";
                    }
                  } else {
                    window.location.href = "/api/logout";
                  }
                }}
                data-testid="button-logout-mobile"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          
          {/* Main content */}
          <main 
            className="flex-1 md:p-6 lg:p-8 px-4 scrollbar-hide overflow-y-auto overflow-x-hidden"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
              paddingBottom: '6rem'
            }}
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Floating AI chat - visible on all devices */}
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
        context={chatContext}
      />
      
      <VoiceChatModal
        isOpen={isVoiceChatOpen}
        onClose={() => setIsVoiceChatOpen(false)}
        context={chatContext}
      />

      {isMobile && (
        <MobileNav
          isAdmin={user?.role === 'admin'}
          currentPath={location}
          navigate={setLocation}
          LinkComponent={Link}
        />
      )}
    </>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const { status: onboardingStatus, isLoading: onboardingLoading } = useOnboarding();
  
  // Show HealthKit onboarding ONLY for iOS users who haven't completed it
  // (Android and web users skip this)
  const shouldShowHealthKitOnboarding = getPlatform() === 'ios' && 
    onboardingStatus && 
    !onboardingStatus.healthKitSetupComplete;
  
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
    "/smartfuel": "SmartFuel™",
    "/training": "Training",
    "/recovery": "Recovery",
    "/supplements": "Supplement Stack",
    "/symptoms": "Symptoms Tracking",
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

  
  // Wait for onboarding status to load before deciding what to show
  // This prevents the dashboard from flashing before HealthKit onboarding
  // IMPORTANT: This must come AFTER all hooks to avoid React Hooks violations
  if (onboardingLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  // Show HealthKit onboarding screen if applicable (before main app)
  if (shouldShowHealthKitOnboarding) {
    return (
      <HealthKitOnboarding 
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
        }}
        onSkip={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
        }}
      />
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <SidebarContentWrapper currentPage={currentPage} location={location}>
        <Router />
      </SidebarContentWrapper>
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  const { data: user } = useQuery<{ id?: number; eulaAcceptedAt: string | null }>({
    queryKey: ["/api/profile"],
  });

  const acceptEulaMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/user/accept-eula");
      return result;
    },
    onSuccess: () => {
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

  // Initialize OneSignal when user is authenticated (iOS only)
  useEffect(() => {
    const initOneSignal = async () => {
      if (!user?.id || !Capacitor.isNativePlatform()) {
        return;
      }

      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      if (!appId) {
        console.warn('[App] VITE_ONESIGNAL_APP_ID not configured');
        return;
      }

      try {
        // Initialize OneSignal
        await oneSignalClient.init(appId);
        
        // Set external user ID for targeted notifications
        await oneSignalClient.setExternalUserId(user.id.toString());
      } catch (error) {
        console.error('[App] OneSignal initialization failed:', error);
      }
    };

    initOneSignal();

    // Cleanup on logout
    return () => {
      if (Capacitor.isNativePlatform()) {
        oneSignalClient.removeExternalUserId().catch(console.error);
      }
    };
  }, [user?.id]);

  // Development mode: EULA completely disabled during development
  const showEulaDialog = false; // Disabled for development - set to: user && !user.eulaAcceptedAt for production

  return (
    <LocaleProvider>
      <TimezoneProvider>
        <OnboardingProvider>
          <ChatProvider>
            <TimezoneDetector />
            <AppLayout />
            <EulaDialog
              open={showEulaDialog || false}
              onAccept={() => {
                acceptEulaMutation.mutate();
              }}
              isAccepting={acceptEulaMutation.isPending}
            />
          </ChatProvider>
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

  // Global deep link handler for mobile OAuth
  useEffect(() => {
    if (!isNativePlatform()) return;

    const handleAppUrlOpen = async (event: { url: string }) => {
      // Check if this is an auth callback
      if (event.url.startsWith('healthpilot://auth')) {
        try {
          const url = new URL(event.url);
          const token = url.searchParams.get('token');
          
          if (!token) {
            console.error('[App] No token in deep link');
            return;
          }
          
          // Exchange the one-time token for a long-lived session token
          const response = await apiRequest('/api/mobile-auth', {
            method: 'POST',
            body: JSON.stringify({ token }),
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            throw new Error('Failed to exchange token');
          }
          
          const data = await response.json();
          
          // Store the session token securely
          await SecureStorage.set('sessionToken', data.sessionToken);
          
          // Invalidate queries to fetch fresh data with new auth
          await queryClient.invalidateQueries();
          
          // Redirect to home
          window.location.href = '/';
        } catch (error) {
          console.error('[App] Error during token exchange:', error);
        }
      }
    };

    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen).then(listener => {
      // Store listener for cleanup
      return listener;
    });

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);

  // Initialize deep link handling for notifications, settings, etc.
  useEffect(() => {
    // Initialize deep link handling on native platforms (iOS/Android)
    // Runs in both development and production builds
    if (!Capacitor.isNativePlatform()) {
      return; // Skip on web
    }

    let cleanup: (() => void) | undefined;

    // Initialize and store cleanup function
    initializeDeepLinkHandling()
      .then(cleanupFn => {
        cleanup = cleanupFn;
      })
      .catch(error => {
        console.error('[App] Failed to initialize deep linking:', error);
      });

    // Return cleanup function for useEffect
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  // Check current path
  const currentPath = window.location.pathname;
  const isLoggedOutPage = currentPath === "/logged-out";
  const isLoginPage = currentPath === "/login";
  const isOAuthSuccessPage = currentPath === "/oauth-success";
  const isMobileAuthRedirectPage = currentPath === "/mobile-auth-redirect";
  
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

  if (isOAuthSuccessPage) {
    return <OAuthSuccess />;
  }

  if (isMobileAuthRedirectPage) {
    return <MobileAuthRedirect />;
  }

  // Treat auth errors same as not logged in (Safari caching issues) 
  if (!user || isError) {
    // Mobile apps: skip landing page, go straight to login
    if (isNativePlatform()) {
      return <Login />;
    }
    
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
    // Show LandingPage for web users when not authenticated
    return <LandingPage />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <PremiumThemeProvider>
            <AppContent />
          </PremiumThemeProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
