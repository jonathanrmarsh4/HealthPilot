import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Activity, Footprints, TrendingUp, Dumbbell, Target } from "lucide-react";
import { MuscleGroup, getRecoveryColor } from "@/types/recovery";

interface MuscleRecoveryGridProps {
  muscleGroups: Record<MuscleGroup, number>;
  isLoading?: boolean;
}

const muscleGroupConfig: Record<MuscleGroup, { icon: typeof Heart; label: string }> = {
  chest: { icon: Heart, label: "Chest" },
  back: { icon: Activity, label: "Back" },
  legs: { icon: Footprints, label: "Legs" },
  shoulders: { icon: TrendingUp, label: "Shoulders" },
  arms: { icon: Dumbbell, label: "Arms" },
  core: { icon: Target, label: "Core" },
};

export function MuscleRecoveryGrid({ muscleGroups, isLoading }: MuscleRecoveryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="muscle-recovery-grid-loading">
        {Object.keys(muscleGroupConfig).map((group) => (
          <Card key={group} data-testid={`card-muscle-${group}-loading`}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="muscle-recovery-grid">
      {(Object.keys(muscleGroupConfig) as MuscleGroup[]).map((group) => {
        const config = muscleGroupConfig[group];
        const Icon = config.icon;
        const score = muscleGroups[group] || 0;
        const colorClass = getRecoveryColor(score);

        return (
          <Card key={group} data-testid={`card-muscle-${group}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Icon className={`h-6 w-6 ${colorClass}`} data-testid={`icon-muscle-${group}`} />
                <span className={`text-lg font-semibold ${colorClass}`} data-testid={`score-muscle-${group}`}>
                  {Math.round(score)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium" data-testid={`label-muscle-${group}`}>
                  {config.label}
                </p>
              </div>
              <Progress 
                value={score} 
                className="h-2" 
                data-testid={`progress-muscle-${group}`}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
