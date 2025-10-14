import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import type { Goal } from "@shared/schema";
import { useEffect, useState, useMemo } from "react";

export function GoalsSummaryWidget() {
  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const activeGoals = useMemo(() => goals?.filter(g => g.status === 'active') || [], [goals]);
  const [animatedWidths, setAnimatedWidths] = useState<number[]>([]);

  // Trigger animations when data loads or changes
  useEffect(() => {
    if (activeGoals.length > 0) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        const progressValues = activeGoals.slice(0, 3).map(goal => calculateProgress(goal));
        setAnimatedWidths(progressValues);
      }, 50);
      
      return () => clearTimeout(timeout);
    }
  }, [activeGoals]);

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

    // Determine if this is a decrease goal (want to go DOWN)
    const isDecreaseGoal = goal.metricType.toLowerCase().includes('weight') || 
                          goal.metricType.toLowerCase().includes('cholesterol') ||
                          goal.metricType.toLowerCase().includes('glucose') ||
                          goal.metricType.toLowerCase().includes('body fat');

    if (isDecreaseGoal) {
      // Decrease goals: start > target (e.g., weight 80kg -> 73kg)
      // Progress is based on how much we've decreased from start toward target
      if (current <= target) return 100; // Reached or exceeded target
      if (current >= start) return 0;     // No progress yet
      return Math.round(((start - current) / (start - target)) * 100);
    } else {
      // Increase goals: start < target (e.g., steps 5000 -> 10000)
      // Progress is based on how much we've increased from start toward target
      if (current >= target) return 100; // Reached or exceeded target
      if (current <= start) return 0;     // No progress yet
      return Math.round(((current - start) / (target - start)) * 100);
    }
  };

  // Complementary colors for different goal types
  const getGoalColor = (index: number, metricType: string) => {
    // Different color for each goal based on position and type
    const colorSets = [
      { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
      { bg: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
      { bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400' },
    ];
    
    return colorSets[index % colorSets.length];
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
        <div className="space-y-4">
          {activeGoals.slice(0, 3).map((goal, index) => {
            const progress = calculateProgress(goal);
            const isDecreaseGoal = isDecrease(goal.metricType);
            const colors = getGoalColor(index, goal.metricType);
            const animatedWidth = animatedWidths[index] ?? 0;
            
            return (
              <div key={goal.id} className="space-y-2" data-testid={`goal-item-${goal.id}`}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {isDecreaseGoal ? (
                      <TrendingDown className={`h-4 w-4 ${colors.text}`} />
                    ) : (
                      <TrendingUp className={`h-4 w-4 ${colors.text}`} />
                    )}
                    <span className="font-medium">{goal.metricType}</span>
                  </div>
                  <span className={`text-xs font-semibold ${colors.text}`} data-testid={`text-progress-${goal.id}`}>
                    {progress}%
                  </span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.bg} rounded-full transition-all duration-1000 ease-out`}
                    style={{
                      width: `${animatedWidth}%`,
                      transitionDelay: `${index * 150}ms`
                    }}
                    data-testid={`bar-progress-${goal.id}`}
                  />
                </div>
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
