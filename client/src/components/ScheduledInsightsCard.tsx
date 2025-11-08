import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScheduledInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  activityType: string;
  duration: number | null;
  frequency: string;
  contextTrigger: string | null;
  priority: string;
  status: string;
  scheduledDates: string[] | null;
}

export function ScheduledInsightsCard() {
  const { toast } = useToast();

  const { data: scheduledInsights, isLoading } = useQuery<ScheduledInsight[]>({
    queryKey: ['/api/scheduled-insights'],
  });

  const completeMutation = useMutation({
    mutationFn: async (insightId: string) => {
      const response = await apiRequest('POST', `/api/scheduled-insights/${insightId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-insights'] });
      toast({
        title: "Activity completed",
        description: "Great job staying consistent!",
      });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-scheduled-insights">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Scheduled Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Get insights scheduled for today
  const todaysInsights = scheduledInsights?.filter(insight => {
    if (insight.status !== 'scheduled' && insight.status !== 'active') return false;
    if (insight.contextTrigger === 'after_workout') return true;
    return insight.scheduledDates?.includes(today);
  }) || [];

  if (todaysInsights.length === 0) {
    return null;
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'recovery':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'wellness':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'nutrition':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    }
  };

  return (
    <Card data-testid="card-scheduled-insights">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Scheduled Activities for Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {todaysInsights.map((insight) => (
            <div
              key={insight.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover-elevate"
              data-testid={`scheduled-insight-${insight.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="text-sm font-medium" data-testid={`text-insight-title-${insight.id}`}>
                    {insight.title}
                  </h4>
                  <Badge className={getCategoryColor(insight.category)} variant="secondary">
                    {insight.category}
                  </Badge>
                  {insight.duration && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {insight.duration} min
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2" data-testid={`text-insight-desc-${insight.id}`}>
                  {insight.description}
                </p>
                {insight.contextTrigger === 'after_workout' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Recommended after your workout
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => completeMutation.mutate(insight.id)}
                disabled={completeMutation.isPending}
                data-testid={`button-complete-${insight.id}`}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
