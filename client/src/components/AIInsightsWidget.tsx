import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Activity, Brain, AlertTriangle, X, RefreshCw, Target, ThumbsUp, ThumbsDown, Calendar, Trophy } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightSchedulingModal } from "./InsightSchedulingModal";
import { motion, AnimatePresence } from "framer-motion";

type InsightType = "daily_summary" | "pattern" | "correlation" | "trend" | "alert" | "goal_progress";
type InsightCategory = "sleep" | "activity" | "nutrition" | "biomarkers" | "overall" | "goals";
type InsightPriority = "high" | "medium" | "low";

interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  category: InsightCategory;
  priority: InsightPriority;
  insightData?: {
    metrics?: string[];
    values?: string[];
    comparison?: string;
    recommendation?: string;
  };
  actionable: number;
  insightType: string; // "comment" or "actionable"
  dismissed: number;
  createdAt: string;
  relevantDate: string;
}

const insightIcons = {
  daily_summary: Brain,
  pattern: Activity,
  correlation: TrendingUp,
  trend: TrendingUp,
  alert: AlertTriangle,
  goal_progress: Target,
};

const priorityColors = {
  high: "bg-destructive text-white",
  medium: "bg-warning text-white",
  low: "bg-muted text-muted-foreground",
};

const categoryColors = {
  sleep: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  activity: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  nutrition: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  biomarkers: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  overall: "bg-chart-4 text-white",
  goals: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
};

export function AIInsightsWidget() {
  const { toast } = useToast();
  const [schedulingInsightId, setSchedulingInsightId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [previousInsightCount, setPreviousInsightCount] = useState<number | null>(null);

  const { data: insights, isLoading } = useQuery<Insight[]>({
    queryKey: ['/api/insights/daily'],
  });

  // Check if user just cleared all insights
  useEffect(() => {
    if (!isLoading && insights) {
      const currentCount = insights.length;
      
      // If we had insights before and now we have 0, show celebration
      if (previousInsightCount !== null && previousInsightCount > 0 && currentCount === 0) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
      
      setPreviousInsightCount(currentCount);
    }
  }, [insights, isLoading, previousInsightCount]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/insights/generate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insights/daily'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
      toast({
        title: "Insights Generated",
        description: "Your daily health insights have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate insights",
        variant: "destructive",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ insightId, feedback }: { insightId: string; feedback: 'thumbs_up' | 'thumbs_down' }) => {
      const response = await apiRequest('POST', '/api/insights/feedback', {
        insightId,
        feedback,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insights/daily'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record feedback",
        variant: "destructive",
      });
    },
  });

  const createSupplementMutation = useMutation({
    mutationFn: async (supplementData: any) => {
      const response = await apiRequest('POST', '/api/supplements', supplementData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reminders/today'] });
      toast({
        title: "Supplement Added!",
        description: "The recommended supplement has been added to your supplements page.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add supplement",
        variant: "destructive",
      });
    },
  });

  // Detect if insight is a supplement recommendation and extract details
  const detectAndExtractSupplement = (insight: Insight): { isSupplementRecommendation: boolean; supplementData?: any } => {
    // Safely get text from all available fields
    const title = insight.title || '';
    const description = insight.description || '';
    const recommendation = insight.insightData?.recommendation || '';
    const text = `${title} ${description} ${recommendation}`.toLowerCase();
    
    // Keywords that indicate supplement recommendation
    const supplementKeywords = ['supplement', 'vitamin', 'mineral', 'omega', 'magnesium', 'calcium', 
                                 'zinc', 'iron', 'b12', 'vitamin d', 'vitamin c', 'take', 'dosage', 'mg', 'iu'];
    
    const isSupplementRecommendation = supplementKeywords.some(keyword => text.includes(keyword));
    
    if (!isSupplementRecommendation) {
      return { isSupplementRecommendation: false };
    }

    // Try to extract supplement details using patterns
    // Prefer recommendation text, fallback to description
    const recommendationText = recommendation || description || title;
    
    // Common patterns: "Take X mg", "X supplement", "vitamin X", etc.
    let name = '';
    let dosage = '';
    let frequency = 'daily'; // Default to daily
    
    // Extract supplement name (look for vitamin/mineral/supplement names)
    const namePatterns = [
      /(?:vitamin|mineral|omega|take)\s+([a-z0-9\s-]+?)(?:\s+(?:supplement|daily|mg|iu|mcg))/i,
      /([a-z]+(?:\s+[a-z]+)?)\s+supplement/i,
      /consider\s+([a-z\s]+?)(?:\s+(?:supplement|for|to))/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = recommendationText.match(pattern);
      if (match && match[1]) {
        name = match[1].trim();
        break;
      }
    }
    
    // Extract dosage
    const dosagePattern = /(\d+(?:\.\d+)?)\s*(mg|iu|mcg|g)/i;
    const dosageMatch = recommendationText.match(dosagePattern);
    if (dosageMatch) {
      dosage = `${dosageMatch[1]}${dosageMatch[2].toLowerCase()}`;
    }
    
    // Extract frequency
    if (text.includes('twice daily') || text.includes('2x daily')) {
      frequency = 'twice_daily';
    } else if (text.includes('once daily') || text.includes('daily')) {
      frequency = 'daily';
    }
    
    // If we couldn't extract a name, use a fallback from the title
    if (!name && title) {
      name = title.replace(/consider\s+/i, '').replace(/supplement.*$/i, '').trim();
    }

    return {
      isSupplementRecommendation: true,
      supplementData: {
        name: name || 'Recommended Supplement',
        dosage: dosage || 'As recommended',
        frequency,
        reason: recommendationText,
        active: 1
      }
    };
  };

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/insights/${id}/dismiss`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insights/daily'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-ai-insights">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Health Insights
            </CardTitle>
            <CardDescription>Personalized intelligence from your health data</CardDescription>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasInsights = insights && insights.length > 0;

  return (
    <Card data-testid="card-ai-insights">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Health Insights
          </CardTitle>
          <CardDescription>Personalized intelligence from your health data</CardDescription>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          data-testid="button-generate-insights"
        >
          <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="text-center py-8 space-y-4 mb-4"
            >
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1],
                }}
                transition={{ duration: 0.5 }}
              >
                <Trophy className="h-16 w-16 mx-auto text-primary" />
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold text-primary mb-1">All Caught Up!</h3>
                <p className="text-sm text-muted-foreground">
                  You've tackled all your health insights. Great work!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {!hasInsights ? (
          <div className="text-center py-8 space-y-4">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                No insights yet. Generate AI-powered insights from your health data.
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                data-testid="button-generate-first-insights"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Insights
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              const Icon = insightIcons[insight.type] || Brain;
              return (
                <div
                  key={insight.id}
                  className="relative group border rounded-lg p-4 space-y-2 hover-elevate"
                  data-testid={`insight-${insight.id}`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => dismissMutation.mutate(insight.id)}
                    data-testid={`button-dismiss-${insight.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <div className="flex items-start gap-3 pr-8">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm" data-testid={`text-insight-title-${insight.id}`}>
                          {insight.title}
                        </h3>
                        <Badge className={categoryColors[insight.category] || categoryColors.overall} data-testid={`badge-category-${insight.id}`}>
                          {insight.category}
                        </Badge>
                        {insight.priority === 'high' && (
                          <Badge className={priorityColors.high} data-testid={`badge-priority-${insight.id}`}>
                            High Priority
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-insight-description-${insight.id}`}>
                        {insight.description}
                      </p>
                      {insight.insightData?.recommendation && (
                        <div className="bg-muted/50 rounded-md p-3 mt-2">
                          <p className="text-xs font-medium text-primary mb-1">💡 Action</p>
                          <p className="text-sm" data-testid={`text-insight-recommendation-${insight.id}`}>
                            {insight.insightData.recommendation}
                          </p>
                        </div>
                      )}
                      
                      {/* Feedback Buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => {
                            feedbackMutation.mutate({ 
                              insightId: insight.id, 
                              feedback: 'thumbs_up' 
                            });
                            
                            // Check if it's a supplement recommendation
                            const { isSupplementRecommendation, supplementData } = detectAndExtractSupplement(insight);
                            
                            if (isSupplementRecommendation && supplementData) {
                              // Create supplement and dismiss
                              createSupplementMutation.mutate(supplementData);
                              dismissMutation.mutate(insight.id);
                            } else if (insight.insightType === 'actionable') {
                              // If it's actionable (not supplement), open scheduling modal
                              setSchedulingInsightId(insight.id);
                            } else {
                              // Dismiss comment insights on thumbs up
                              dismissMutation.mutate(insight.id);
                            }
                          }}
                          disabled={feedbackMutation.isPending || createSupplementMutation.isPending}
                          data-testid={`button-thumbs-up-${insight.id}`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          {(() => {
                            const { isSupplementRecommendation } = detectAndExtractSupplement(insight);
                            if (isSupplementRecommendation) return 'Add Supplement';
                            if (insight.insightType === 'actionable') return 'Schedule';
                            return 'Helpful';
                          })()}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => {
                            feedbackMutation.mutate({ 
                              insightId: insight.id, 
                              feedback: 'thumbs_down' 
                            });
                            // Thumbs down always dismisses permanently
                            dismissMutation.mutate(insight.id);
                          }}
                          disabled={feedbackMutation.isPending}
                          data-testid={`button-thumbs-down-${insight.id}`}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Not helpful
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      
      {/* Scheduling Modal */}
      <InsightSchedulingModal
        insightId={schedulingInsightId}
        onClose={() => setSchedulingInsightId(null)}
      />
    </Card>
  );
}
