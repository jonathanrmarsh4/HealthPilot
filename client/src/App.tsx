import { Switch, Route } from "wouter";
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
import Dashboard from "@/pages/Dashboard";
import HealthRecords from "@/pages/HealthRecords";
import Biomarkers from "@/pages/Biomarkers";
import Sleep from "@/pages/Sleep";
import MealPlans from "@/pages/MealPlans";
import Training from "@/pages/Training";
import AIInsights from "@/pages/AIInsights";
import AppleHealthSetup from "@/pages/AppleHealthSetup";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/records" component={HealthRecords} />
      <Route path="/biomarkers" component={Biomarkers} />
      <Route path="/sleep" component={Sleep} />
      <Route path="/meals" component={MealPlans} />
      <Route path="/training" component={Training} />
      <Route path="/insights" component={AIInsights} />
      <Route path="/chat" component={Chat} />
      <Route path="/profile" component={Profile} />
      <Route path="/apple-health" component={AppleHealthSetup} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <LocaleProvider>
      <TimezoneProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-2">
                  <LocaleSelector />
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto p-8">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TimezoneProvider>
    </LocaleProvider>
  );
}

function AppContent() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
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
