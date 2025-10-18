import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, AlertCircle, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface MuscleGroupData {
  muscleGroup: string;
  lastTrained: string | null;
  timesTrainedInPeriod: number;
  totalSets: number;
  totalVolume: number;
}

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
  glutes: "Glutes",
  calves: "Calves",
};

const ALL_MUSCLE_GROUPS = ["chest", "back", "legs", "shoulders", "arms", "core", "glutes", "calves"];

function getTrainingStatus(timesTrainedInPeriod: number): {
  status: "undertrained" | "optimal" | "overtrained";
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: any;
} {
  if (timesTrainedInPeriod === 0) {
    return {
      status: "undertrained",
      label: "Not Trained",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      icon: AlertCircle,
    };
  }
  if (timesTrainedInPeriod === 1) {
    return {
      status: "undertrained",
      label: "Undertrained",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      icon: TrendingUp,
    };
  }
  if (timesTrainedInPeriod === 2 || timesTrainedInPeriod === 3) {
    return {
      status: "optimal",
      label: "Optimal",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      icon: Check,
    };
  }
  return {
    status: "overtrained",
    label: "High Frequency",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    icon: Activity,
  };
}

export function MuscleGroupHeatmap() {
  const { data: frequencyData, isLoading, isError, error } = useQuery<MuscleGroupData[]>({
    queryKey: ["/api/analytics/muscle-group-frequency"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/muscle-group-frequency?daysBack=14");
      if (!res.ok) throw new Error("Failed to fetch muscle group frequency");
      return res.json();
    },
  });

  const muscleGroupMap = new Map<string, MuscleGroupData>();
  frequencyData?.forEach((data) => {
    muscleGroupMap.set(data.muscleGroup, data);
  });

  const muscleGroupsWithStatus = ALL_MUSCLE_GROUPS.map((group) => {
    const data = muscleGroupMap.get(group);
    return {
      group,
      label: MUSCLE_GROUP_LABELS[group],
      timesTrainedInPeriod: data?.timesTrainedInPeriod || 0,
      lastTrained: data?.lastTrained,
      totalSets: data?.totalSets || 0,
      totalVolume: data?.totalVolume || 0,
      ...getTrainingStatus(data?.timesTrainedInPeriod || 0),
    };
  });

  const stats = {
    undertrained: muscleGroupsWithStatus.filter((m) => m.status === "undertrained").length,
    optimal: muscleGroupsWithStatus.filter((m) => m.status === "optimal").length,
    overtrained: muscleGroupsWithStatus.filter((m) => m.status === "overtrained").length,
  };

  return (
    <Card data-testid="card-muscle-group-heatmap">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Muscle Group Training Balance</CardTitle>
        </div>
        <CardDescription>
          Training frequency over the last 14 days • ACSM recommends 2-3x per week per muscle group
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-8" data-testid="error-muscle-group-frequency">
            <p className="text-sm text-muted-foreground mb-2">
              Unable to load muscle group frequency data
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Unknown error occurred"}
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="flex gap-2 flex-wrap">
              {stats.optimal > 0 && (
                <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" data-testid="badge-optimal-count">
                  <Check className="h-3 w-3 mr-1" />
                  {stats.optimal} Optimal
                </Badge>
              )}
              {stats.undertrained > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" data-testid="badge-undertrained-count">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.undertrained} Undertrained
                </Badge>
              )}
              {stats.overtrained > 0 && (
                <Badge variant="outline" className="bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400" data-testid="badge-overtrained-count">
                  <Activity className="h-3 w-3 mr-1" />
                  {stats.overtrained} High Frequency
                </Badge>
              )}
            </div>

            {/* Muscle Group Grid */}
            <div className="grid gap-3">
              {muscleGroupsWithStatus.map((muscle) => {
                const Icon = muscle.icon;
                return (
                  <div
                    key={muscle.group}
                    className={`p-3 rounded-md border ${muscle.bgColor} ${muscle.borderColor}`}
                    data-testid={`muscle-group-${muscle.group}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${muscle.color}`} />
                        <span className="font-medium text-sm">{muscle.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs font-mono" data-testid={`frequency-${muscle.group}`}>
                          {muscle.timesTrainedInPeriod}x
                        </Badge>
                        <span className={`text-xs font-medium ${muscle.color}`} data-testid={`status-${muscle.group}`}>
                          {muscle.label}
                        </span>
                      </div>
                    </div>
                    {muscle.lastTrained && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                        <span>
                          Last trained: {formatDistanceToNow(new Date(muscle.lastTrained), { addSuffix: true })}
                        </span>
                        <span>{muscle.totalSets} sets</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Training Status Guide</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-green-500/20 border border-green-500/30" />
                  <span className="text-muted-foreground">2-3x per week (optimal)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-orange-500/20 border border-orange-500/30" />
                  <span className="text-muted-foreground">&gt;3x per week (high frequency)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-amber-500/20 border border-amber-500/30" />
                  <span className="text-muted-foreground">1x per week (undertrained)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-red-500/20 border border-red-500/30" />
                  <span className="text-muted-foreground">0x per week (not trained)</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
