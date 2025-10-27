import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Calendar, ChevronRight, Clock, Target, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { useState } from "react";

interface GoalPlanContent {
  name: string;
  description: string;
  sessionsPerWeek: number;
  preferredDays: string[];
  constraints?: string[];
  progression: Array<{
    week: number;
    sessions: Array<{
      day: string;
      type: string;
      duration: number;
      structure: string;
      notes: string;
    }>;
  }>;
}

interface GoalPlan {
  id: string;
  goalId: string;
  planType: string;
  period: string;
  contentJson: GoalPlanContent;
  version: number;
  isActive: number;
  goalName: string;
  goalCategory: string;
  createdAt: string;
}

export function AITrainingPlanTile() {
  const [currentWeek, setCurrentWeek] = useState(1);

  const { data: plans, isLoading, isError, error } = useQuery<GoalPlan[]>({
    queryKey: ["/api/goals/plans"],
  });

  // Filter for active training plans
  const activePlans = plans?.filter(
    (plan) => plan.isActive === 1 && plan.planType === "training"
  );

  // Get the first active plan (in the future could support multiple)
  const primaryPlan = activePlans?.[0];

  // Get current week's sessions
  const currentWeekSessions = primaryPlan?.contentJson.progression?.find(
    (p) => p.week === currentWeek
  );

  // Map day names to dates for this week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const getDayDate = (dayName: string): Date => {
    const dayMap: { [key: string]: number } = {
      Monday: 0,      // Monday is day 0 (weekStart)
      Tuesday: 1,     // Tuesday is day 1
      Wednesday: 2,   // Wednesday is day 2
      Thursday: 3,    // Thursday is day 3
      Friday: 4,      // Friday is day 4
      Saturday: 5,    // Saturday is day 5
      Sunday: 6,      // Sunday is day 6
    };
    const daysFromMonday = dayMap[dayName] !== undefined ? dayMap[dayName] : 0;
    return addDays(weekStart, daysFromMonday);
  };

  if (isLoading) {
    return (
      <Card data-testid="card-ai-training-plan">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Your AI Training Plan</CardTitle>
          </div>
          <CardDescription>Loading your personalized training schedule...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card data-testid="card-ai-training-plan">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Your AI Training Plan</CardTitle>
          </div>
          <CardDescription>Error loading training plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-2">
              Failed to load your training plans
            </p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : 'Please try refreshing the page'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!primaryPlan) {
    return (
      <Card data-testid="card-ai-training-plan">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Your AI Training Plan</CardTitle>
          </div>
          <CardDescription>
            Create a goal using the AI Coach to get a personalized training plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              No active training plans yet. Start a conversation with the AI Coach on the Goals page to create your personalized plan.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalWeeks = primaryPlan.contentJson.progression?.length || 0;

  return (
    <Card data-testid="card-ai-training-plan">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="truncate">Your AI Training Plan</CardTitle>
          </div>
          <Badge variant="secondary" data-testid="badge-plan-status" className="flex-shrink-0">
            W{currentWeek}/{totalWeeks}
          </Badge>
        </div>
        <CardDescription className="truncate">
          {primaryPlan.contentJson.name} • {primaryPlan.goalName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan overview */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground mb-2">
            {primaryPlan.contentJson.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>{primaryPlan.contentJson.sessionsPerWeek}x/week</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 flex-shrink-0" />
              <span className="line-clamp-1">{primaryPlan.contentJson.preferredDays.join(", ")}</span>
            </div>
          </div>
        </div>

        {/* Week navigation */}
        {totalWeeks > 1 && (
          <div className="flex items-center justify-between gap-2 pb-2 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
              disabled={currentWeek === 1}
              data-testid="button-previous-week"
              className="flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Previous</span>
            </Button>
            <span className="text-sm font-medium whitespace-nowrap">
              Week {currentWeek} of {totalWeeks}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(Math.min(totalWeeks, currentWeek + 1))}
              disabled={currentWeek === totalWeeks}
              data-testid="button-next-week"
              className="flex-shrink-0"
            >
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="h-4 w-4 md:ml-1" />
            </Button>
          </div>
        )}

        {/* Weekly sessions */}
        <div className="space-y-3">
          {currentWeekSessions?.sessions.map((session, idx) => {
            const sessionDate = getDayDate(session.day);
            const isToday = isSameDay(sessionDate, new Date());

            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  isToday
                    ? "bg-primary/5 border-primary/30"
                    : "bg-card border-border"
                }`}
                data-testid={`session-${session.day.toLowerCase()}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium">
                        {session.day}
                      </h4>
                      {isToday && (
                        <Badge variant="default" className="flex-shrink-0">
                          Today
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(sessionDate, "MMM d")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    <span className="whitespace-nowrap">{session.duration} min</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="text-xs">
                    {session.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                  <p className="text-sm">{session.structure}</p>
                  {session.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      💡 {session.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Constraints notice */}
        {primaryPlan.contentJson.constraints && primaryPlan.contentJson.constraints.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs font-medium mb-1">Accommodating:</p>
            <p className="text-xs text-muted-foreground">
              {primaryPlan.contentJson.constraints.join(", ")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
