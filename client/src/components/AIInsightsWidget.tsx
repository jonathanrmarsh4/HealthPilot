import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Brain, Check, X, Heart, Moon, Apple, ArrowRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

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
  recommendationId: string | null;
  acknowledgedAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
}

interface InsightsResponse {
  date: string;
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

export function AIInsightsWidget() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: response, isLoading } = useQuery<InsightsResponse>({
    queryKey: ['/api/insights/today'],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'acknowledged' | 'dismissed' }) => {
      const res = await apiRequest('PATCH', `/api/insights/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insights/today'] });
      toast({
        title: "Insight Updated",
        description: "Your response has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update insight",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-ai-insights">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Daily Health Insights
            </CardTitle>
            <CardDescription>AI-powered analysis of your health trends</CardDescription>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const insights = response?.insights || [];
  const hasInsights = insights.length > 0;

  return (
    <Card data-testid="card-ai-insights">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Daily Health Insights
          </CardTitle>
          <CardDescription>AI-powered analysis of your health trends</CardDescription>
        </div>
        {hasInsights && (
          <Badge variant="secondary" data-testid="badge-insight-count">
            {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {!hasInsights ? (
          <div className="text-center py-12 space-y-4">
            <Brain className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                All clear today!
              </p>
              <p className="text-xs text-muted-foreground">
                No significant deviations detected in your health metrics. Keep up the great work!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {insights.map((insight, index) => {
                const Icon = categoryIcons[insight.category] || Brain;
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group border rounded-lg p-4 space-y-3 hover-elevate"
                    data-testid={`insight-${insight.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm" data-testid={`text-insight-title-${insight.id}`}>
                            {insight.title}
                          </h3>
                          <Badge className={categoryColors[insight.category]} data-testid={`badge-category-${insight.id}`}>
                            {insight.category}
                          </Badge>
                          {insight.severity !== 'normal' && (
                            <Badge className={severityColors[insight.severity]} data-testid={`badge-severity-${insight.id}`}>
                              {insight.severity}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Description with specific numbers */}
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-insight-description-${insight.id}`}>
                          {insight.description}
                        </p>

                        {/* Recommendation */}
                        {insight.recommendation && (
                          <div className="bg-primary/5 border border-primary/10 rounded-md p-3">
                            <p className="text-xs font-medium text-primary mb-1">💡 Recommendation</p>
                            <p className="text-sm" data-testid={`text-insight-recommendation-${insight.id}`}>
                              {insight.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {insight.recommendationId && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => setLocation('/insights?tab=ai-coach')}
                          data-testid={`button-view-recommendation-${insight.id}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                          View Action
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2 flex-1"
                        onClick={() => statusMutation.mutate({ id: insight.id, status: 'acknowledged' })}
                        disabled={statusMutation.isPending}
                        data-testid={`button-acknowledge-${insight.id}`}
                      >
                        <Check className="h-4 w-4" />
                        Got it
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => statusMutation.mutate({ id: insight.id, status: 'dismissed' })}
                        disabled={statusMutation.isPending}
                        data-testid={`button-dismiss-${insight.id}`}
                      >
                        <X className="h-4 w-4" />
                        Dismiss
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
