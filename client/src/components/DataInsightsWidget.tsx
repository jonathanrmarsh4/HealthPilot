import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Info, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Calendar } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsightSchedulingModal } from "./InsightSchedulingModal";

interface DataInsight {
  id?: string;
  type: 'positive' | 'negative' | 'neutral' | 'info';
  title: string;
  description: string;
  metric: string;
  category?: string;
  priority?: string;
  userFeedback?: 'thumbs_up' | 'thumbs_down' | null;
}

interface DataInsightsResponse {
  insights: DataInsight[];
}

export function DataInsightsWidget() {
  const [showAll, setShowAll] = useState(false);
  const [scheduleInsightId, setScheduleInsightId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { data: insightsData, isLoading } = useQuery<DataInsightsResponse>({
    queryKey: ["/api/dashboard/data-insights"],
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ insightId, feedback }: { insightId: string; feedback: 'thumbs_up' | 'thumbs_down' }) => {
      // Save feedback
      await apiRequest('POST', '/api/insights/feedback', { insightId, feedback });
      // Dismiss the insight after feedback
      await apiRequest('PATCH', `/api/insights/${insightId}/dismiss`);
      return { insightId, feedback };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/data-insights'] });
      toast({
        title: data.feedback === 'thumbs_up' ? "Thanks for your feedback!" : "Noted",
        description: data.feedback === 'thumbs_up' 
          ? "We'll show you more insights like this" 
          : "This insight has been dismissed",
      });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-data-insights" className="h-full">
        <CardHeader>
          <CardTitle>Data Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const insights = insightsData?.insights || [];

  if (insights.length === 0) {
    return (
      <Card data-testid="card-data-insights" className="h-full">
        <CardHeader>
          <CardTitle>Data Insights</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Start tracking health data to see insights
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />;
      case 'negative':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" />;
      case 'neutral':
        return <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'positive':
        return 'default';
      case 'negative':
        return 'destructive';
      case 'neutral':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Sort insights by type priority (negative > positive > neutral > info)
  const sortedInsights = [...insights].sort((a, b) => {
    const priority = { negative: 0, positive: 1, neutral: 2, info: 3 };
    return priority[a.type as keyof typeof priority] - priority[b.type as keyof typeof priority];
  });

  // Show only top 4 most relevant unless expanded
  const displayedInsights = showAll ? sortedInsights : sortedInsights.slice(0, 4);
  const hasMore = insights.length > 4;

  return (
    <>
      <Card data-testid="card-data-insights" className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Data Insights</span>
            <Badge variant="secondary" data-testid="badge-insights-count">
              {insights.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-3">
          <div className="space-y-3 flex-1">
            {displayedInsights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-md bg-muted/30 hover-elevate"
                data-testid={`insight-item-${index}`}
              >
                <div className="mt-0.5">{getIcon(insight.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium" data-testid={`text-insight-title-${index}`}>
                      {insight.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2" data-testid={`text-insight-desc-${index}`}>
                    {insight.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={insight.userFeedback === 'thumbs_up' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => insight.id && feedbackMutation.mutate({ insightId: insight.id, feedback: 'thumbs_up' })}
                      disabled={!insight.id || feedbackMutation.isPending}
                      data-testid={`button-thumbs-up-${index}`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={insight.userFeedback === 'thumbs_down' ? 'destructive' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => insight.id && feedbackMutation.mutate({ insightId: insight.id, feedback: 'thumbs_down' })}
                      disabled={!insight.id || feedbackMutation.isPending}
                      data-testid={`button-thumbs-down-${index}`}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                    <div className="flex-1" />
                    {insight.category && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => insight.id && setScheduleInsightId(insight.id)}
                        data-testid={`button-schedule-${index}`}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowAll(!showAll)}
              data-testid="button-show-more-insights"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show {insights.length - 4} More
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
      
      <InsightSchedulingModal
        insightId={scheduleInsightId}
        onClose={() => setScheduleInsightId(null)}
      />
    </>
  );
}
