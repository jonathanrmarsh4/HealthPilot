import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Heart, TrendingUp, Calendar } from "lucide-react";
import { useLocation } from "wouter";

// Import existing page components
import DailyInsights from "./DailyInsights";
import AIInsights from "./AIInsights";
import DataInsights from "./DataInsights";

type TabValue = "daily" | "ai-coach" | "trend-analysis";

export default function InsightsHub() {
  const [location, setLocation] = useLocation();
  
  // Parse tab from URL query params or default to "daily"
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = (urlParams.get("tab") as TabValue) || "daily";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  // Sync activeTab with URL query parameter changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = (params.get("tab") as TabValue) || "daily";
    setActiveTab(tabFromUrl);
  }, [location]); // Re-run when location changes

  const handleTabChange = (value: string) => {
    const newTab = value as TabValue;
    setActiveTab(newTab);
    
    // Update URL without full page reload
    const newUrl = `/insights?tab=${newTab}`;
    window.history.pushState({}, '', newUrl);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Insights Hub</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          AI-powered health analysis, recommendations, and trend predictions
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="daily" data-testid="tab-daily-insights" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Daily Health</span>
            <span className="sm:hidden">Daily</span>
          </TabsTrigger>
          <TabsTrigger value="ai-coach" data-testid="tab-ai-coach" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Coach</span>
            <span className="sm:hidden">Coach</span>
          </TabsTrigger>
          <TabsTrigger value="trend-analysis" data-testid="tab-trend-analysis" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Trend Analysis</span>
            <span className="sm:hidden">Trends</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          <DailyInsights />
        </TabsContent>

        <TabsContent value="ai-coach" className="space-y-6">
          <AIInsights />
        </TabsContent>

        <TabsContent value="trend-analysis" className="space-y-6">
          <DataInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
}
