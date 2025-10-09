import { RecommendationCard } from "@/components/RecommendationCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Apple, Dumbbell, AlertCircle, TrendingUp, Brain, Loader2, Waves } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Recommendation, HealthRecord, Biomarker } from "@shared/schema";

export default function AIInsights() {
  const { toast } = useToast();

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  const { data: healthRecords } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records"],
  });

  const { data: biomarkers } = useQuery<Biomarker[]>({
    queryKey: ["/api/biomarkers"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/recommendations/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Success",
        description: "New AI recommendations generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate recommendations",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/recommendations/${id}/dismiss`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss recommendation",
        variant: "destructive",
      });
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'biomarker':
        return AlertCircle;
      case 'nutrition':
        return Apple;
      case 'exercise':
        return Dumbbell;
      case 'lifestyle':
        return Brain;
      case 'alternative therapy':
        return Waves;
      default:
        return AlertCircle;
    }
  };

  const analyzedRecords = healthRecords?.filter(r => r.analyzedAt).length || 0;
  const trackedBiomarkers = biomarkers?.length || 0;
  const activeRecommendations = recommendations?.filter(r => r.dismissed === 0).length || 0;

  const healthScore = Math.min(100, Math.max(0, 
    50 + (analyzedRecords * 5) + (Math.min(trackedBiomarkers, 10) * 3) - (activeRecommendations * 2)
  ));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground mt-2">
            Personalized health recommendations powered by artificial intelligence
          </p>
        </div>
        <Button 
          onClick={() => generateMutation.mutate()} 
          disabled={generateMutation.isPending}
          data-testid="button-generate-insights"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Analysis Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Health Records</span>
              <Badge className="bg-chart-4 text-white">{analyzedRecords} Analyzed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Biomarkers</span>
              <Badge className="bg-chart-4 text-white">{trackedBiomarkers} Tracked</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recommendations</span>
              <Badge className="bg-chart-5 text-white">{activeRecommendations} Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-4" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-5xl font-bold tracking-tight">{healthScore}</div>
              <p className="text-sm text-muted-foreground">
                {healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : "Needs improvement"} health score based on your metrics
              </p>
              <div className="flex gap-2 mt-4">
                <Badge className="bg-chart-4/10 text-chart-4">
                  {healthScore >= 80 ? "Above average" : "Track more data"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {activeRecommendations > 0 
                ? "Your AI assistant has reviewed your latest health data and identified key areas for improvement."
                : "Add more health data to receive personalized AI-powered recommendations."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-6">Personalized Recommendations</h2>
        {recommendationsLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recommendations && recommendations.filter(r => r.dismissed === 0).length > 0 ? (
          <div className="grid gap-6">
            {recommendations.filter(r => r.dismissed === 0).map((rec) => (
              <RecommendationCard
                key={rec.id}
                title={rec.title}
                description={rec.description}
                category={rec.category}
                priority={rec.priority as "high" | "medium" | "low"}
                icon={getCategoryIcon(rec.category)}
                details={rec.details || ""}
                actionLabel={rec.actionLabel || "View Details"}
                onDismiss={() => dismissMutation.mutate(rec.id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No active recommendations. Click "Generate Insights" to get AI-powered health recommendations.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
