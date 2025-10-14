import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  id: number;
  title: string;
  description: string;
  scheduledAt: string | null;
  category: string;
}

interface ScheduledRecommendationsCardProps {
  recommendations: Recommendation[];
}

export function ScheduledRecommendationsCard({ recommendations }: ScheduledRecommendationsCardProps) {
  const { toast } = useToast();

  const completeMutation = useMutation({
    mutationFn: async (recommendationId: number) => {
      return apiRequest("PATCH", `/api/recommendations/${recommendationId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations/today"] });
      toast({
        title: "Workout completed!",
        description: "Great job completing your scheduled workout.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Your Scheduled Recommendations
              </CardTitle>
              <CardDescription>
                Workouts you scheduled for today
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(), "MMM d")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec) => (
          <Card key={rec.id} data-testid={`scheduled-recommendation-${rec.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{rec.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {rec.description}
                  </CardDescription>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => completeMutation.mutate(rec.id)}
                  disabled={completeMutation.isPending}
                  data-testid={`button-complete-${rec.id}`}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Complete
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
