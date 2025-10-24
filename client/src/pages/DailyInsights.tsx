import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Moon, Heart, TrendingUp, Apple, Calendar, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type InsightCategory = "sleep" | "recovery" | "performance" | "health";
type InsightSeverity = "normal" | "notable" | "significant" | "critical";

interface DailyHealthInsight {
  id: string;
  userId: string;
  date: string;
  category: InsightCategory;
  title: string;
  description: string;
  recommendation: string;
  score: number;
  status: string;
  metricName: string;
  metricValue: number;
  baselineValue: number | null;
  deviationPercent: number;
  severity: InsightSeverity;
  acknowledgedAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
}

interface InsightsHistoryResponse {
  startDate: string;
  endDate: string;
  insights: DailyHealthInsight[];
  total: number;
}

const categoryIcons = {
  sleep: Moon,
  recovery: Heart,
  performance: TrendingUp,
  health: Apple,
};

const categoryColors = {
  sleep: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  recovery: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  performance: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  health: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

const severityColors = {
  normal: "bg-muted text-muted-foreground",
  notable: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  significant: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  critical: "bg-destructive text-white",
};

export default function DailyInsights() {
  const [dateRange, setDateRange] = useState<7 | 14 | 30>(7);
  const { toast } = useToast();
  
  const endDate = startOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, dateRange));

  const { data: response, isLoading } = useQuery<InsightsHistoryResponse>({
    queryKey: ['/api/insights/history', { 
      start_date: format(startDate, 'yyyy-MM-dd'), 
      end_date: format(endDate, 'yyyy-MM-dd') 
    }],
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/insights/generate-v2");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/insights/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights/today'] });
      toast({
        title: "Insights Generated",
        description: `Successfully generated ${data.insightsGenerated || 0} insights for today.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate insights",
        variant: "destructive",
      });
    },
  });

  const insights = response?.insights || [];

  // Group insights by date
  const groupedInsights = insights.reduce((acc, insight) => {
    const date = insight.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(insight);
    return acc;
  }, {} as Record<string, DailyHealthInsight[]>);

  const dates = Object.keys(groupedInsights).sort((a, b) => b.localeCompare(a)); // Most recent first

  const stats = {
    total: insights.length,
    byCategory: insights.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    bySeverity: insights.reduce((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div className="flex gap-1">
          <Button
            variant={dateRange === 7 ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange(7)}
            data-testid="button-range-7"
          >
            7 days
          </Button>
          <Button
            variant={dateRange === 14 ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange(14)}
            data-testid="button-range-14"
          >
            14 days
          </Button>
          <Button
            variant={dateRange === 30 ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange(30)}
            data-testid="button-range-30"
          >
            30 days
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && insights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          {Object.entries(stats.byCategory).map(([category, count]) => {
            const Icon = categoryIcons[category as InsightCategory];
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Insights Timeline */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-lg font-medium mb-2">No insights in this time range</p>
            <p className="text-sm text-muted-foreground">
              The Daily Insights system analyzes your health metrics daily at 2:00 AM.<br />
              Insights will appear here when significant deviations from your baseline are detected.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {dates.map((date) => {
            const dateInsights = groupedInsights[date];
            const dateObj = new Date(date);
            
            return (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {format(dateObj, 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                  <CardDescription>
                    {dateInsights.length} {dateInsights.length === 1 ? 'insight' : 'insights'} detected
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dateInsights.map((insight) => {
                    const Icon = categoryIcons[insight.category];
                    
                    return (
                      <div
                        key={insight.id}
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`insight-${insight.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm">
                                {insight.title}
                              </h3>
                              <Badge className={categoryColors[insight.category]}>
                                {insight.category}
                              </Badge>
                              {insight.severity !== 'normal' && (
                                <Badge className={severityColors[insight.severity]}>
                                  {insight.severity}
                                </Badge>
                              )}
                              {insight.status === 'acknowledged' && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Acknowledged
                                </Badge>
                              )}
                              {insight.status === 'dismissed' && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Dismissed
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {insight.description}
                            </p>

                            {insight.recommendation && (
                              <div className="bg-primary/5 border border-primary/10 rounded-md p-3">
                                <p className="text-xs font-medium text-primary mb-1">💡 Recommendation</p>
                                <p className="text-sm">
                                  {insight.recommendation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
