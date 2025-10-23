import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingDown, Minus, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

type SymptomEvent = {
  id: string;
  userId: string;
  name: string;
  episodeId: string;
  status: "new" | "ongoing" | "resolved";
  severity: number | null;
  trend: "better" | "worse" | "same" | null;
  context: string[];
  startedAt: string;
  recordedAt: string;
};

export function SymptomTile() {
  const { toast } = useToast();

  const { data: activeEpisodes, isLoading } = useQuery<SymptomEvent[]>({
    queryKey: ["/api/symptoms/active"],
  });

  const updateTrendMutation = useMutation({
    mutationFn: async ({ episodeId, trend }: { episodeId: string; trend: "better" | "worse" | "same" }) => {
      const now = new Date().toISOString();
      const episode = activeEpisodes?.find(e => e.episodeId === episodeId);
      
      if (!episode) throw new Error("Episode not found");
      
      const response = await apiRequest("POST", "/api/symptoms/events", {
        name: episode.name,
        episodeId,
        status: "ongoing",
        severity: episode.severity,
        trend,
        context: episode.context,
        notes: null,
        signals: null,
        startedAt: episode.startedAt,
        recordedAt: now,
        endedAt: null,
        source: "user",
        version: 1,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/active"] });
      toast({
        title: "Symptom updated",
        description: "Trend has been recorded.",
      });
    },
  });

  const resolveEpisodeMutation = useMutation({
    mutationFn: async (episodeId: string) => {
      const response = await apiRequest("PATCH", `/api/symptoms/episodes/${episodeId}/resolve`, {
        endedAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/active"] });
      toast({
        title: "Symptom resolved",
        description: "The symptom has been marked as resolved.",
      });
    },
  });

  const getSeverityColor = (severity: number | null) => {
    if (severity === null) return "bg-muted";
    if (severity <= 3) return "bg-green-500";
    if (severity <= 6) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Symptoms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Symptoms
          </CardTitle>
          <Link href="/symptoms">
            <Button variant="ghost" size="sm" data-testid="button-view-all-symptoms">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!activeEpisodes || activeEpisodes.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No active symptoms</p>
            <Link href="/symptoms">
              <Button variant="outline" size="sm" className="mt-3" data-testid="button-track-symptom">
                Track a Symptom
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeEpisodes.slice(0, 3).map((episode) => (
              <div
                key={episode.id}
                className="p-3 rounded-md border bg-card"
                data-testid={`symptom-episode-${episode.episodeId}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{episode.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(episode.startedAt), { addSuffix: true })}
                    </p>
                  </div>
                  {episode.severity !== null && (
                    <Badge variant="outline" className="flex items-center gap-1 ml-2">
                      <div className={`h-2 w-2 rounded-full ${getSeverityColor(episode.severity)}`} />
                      <span className="text-xs">{episode.severity}/10</span>
                    </Badge>
                  )}
                </div>

                <div className="flex gap-1 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateTrendMutation.mutate({ episodeId: episode.episodeId, trend: "better" })}
                    disabled={updateTrendMutation.isPending}
                    data-testid={`button-tile-better-${episode.episodeId}`}
                  >
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Better
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateTrendMutation.mutate({ episodeId: episode.episodeId, trend: "same" })}
                    disabled={updateTrendMutation.isPending}
                    data-testid={`button-tile-same-${episode.episodeId}`}
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    Same
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateTrendMutation.mutate({ episodeId: episode.episodeId, trend: "worse" })}
                    disabled={updateTrendMutation.isPending}
                    data-testid={`button-tile-worse-${episode.episodeId}`}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Worse
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2 text-xs"
                    onClick={() => resolveEpisodeMutation.mutate(episode.episodeId)}
                    disabled={resolveEpisodeMutation.isPending}
                    data-testid={`button-tile-resolve-${episode.episodeId}`}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                </div>
              </div>
            ))}

            {activeEpisodes.length > 3 && (
              <Link href="/symptoms">
                <Button variant="outline" size="sm" className="w-full" data-testid="button-see-more-symptoms">
                  See {activeEpisodes.length - 3} more...
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
