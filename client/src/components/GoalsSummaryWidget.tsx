import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import type { Goal } from "@shared/schema";

export function GoalsSummaryWidget() {
  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const activeGoals = goals?.filter(g => g.status === 'active') || [];

  if (isLoading) {
    return (
      <Card data-testid="card-goals-summary">
        <CardHeader>
          <CardTitle>Active Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const calculateProgress = (goal: Goal) => {
    const start = goal.startValue ?? 0;
    const current = goal.currentValue ?? 0;
    const target = goal.targetValue;

    if (start === target) return 100;

    if (goal.metricType.toLowerCase().includes('weight') || 
        goal.metricType.toLowerCase().includes('cholesterol') ||
        goal.metricType.toLowerCase().includes('glucose') ||
        goal.metricType.toLowerCase().includes('body fat')) {
      // Decrease goals
      if (current <= target) return 100;
      if (current >= start) return 0;
      return Math.round(((start - current) / (start - target)) * 100);
    } else {
      // Increase goals
      if (current >= target) return 100;
      if (current <= start) return 0;
      return Math.round(((current - start) / (target - start)) * 100);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isDecrease = (metricType: string) => {
    return metricType.toLowerCase().includes('weight') || 
           metricType.toLowerCase().includes('cholesterol') ||
           metricType.toLowerCase().includes('glucose') ||
           metricType.toLowerCase().includes('body fat');
  };

  if (activeGoals.length === 0) {
    return (
      <Card data-testid="card-goals-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Active Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-muted-foreground">
            <p>No active goals set</p>
            <p className="text-sm mt-1">Set goals to track your health progress</p>
          </div>
          <Link href="/goals">
            <Button className="w-full" variant="outline" data-testid="button-create-goal">
              <Plus className="h-4 w-4 mr-2" />
              Create Goal
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-goals-summary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Active Goals
          </div>
          <Badge variant="secondary" data-testid="badge-goals-count">
            {activeGoals.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {activeGoals.slice(0, 3).map((goal) => {
            const progress = calculateProgress(goal);
            const isDecreaseGoal = isDecrease(goal.metricType);
            
            return (
              <div key={goal.id} className="space-y-2" data-testid={`goal-item-${goal.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isDecreaseGoal ? (
                      <TrendingDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{goal.metricType}</span>
                  </div>
                  <span className="text-xs text-muted-foreground" data-testid={`text-progress-${goal.id}`}>
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Current: {goal.currentValue} {goal.unit}</span>
                  <span>Target: {goal.targetValue} {goal.unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {activeGoals.length > 3 && (
          <div className="text-center pt-2">
            <Link href="/goals">
              <Button variant="ghost" size="sm" data-testid="button-view-all-goals">
                View all {activeGoals.length} goals
              </Button>
            </Link>
          </div>
        )}

        {activeGoals.length <= 3 && (
          <Link href="/goals">
            <Button className="w-full" variant="outline" size="sm" data-testid="button-manage-goals">
              <Target className="h-4 w-4 mr-2" />
              Manage Goals
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
