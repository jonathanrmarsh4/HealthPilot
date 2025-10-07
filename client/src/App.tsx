import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

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
      <Route path="/apple-health" component={AppleHealthSetup} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
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
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
