import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Clock, Flame, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface TrainingSchedule {
  id: string;
  day: string;
  workoutType: string;
  duration: number;
  intensity: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rest: string;
  }>;
  completed: number;
}

interface ScheduledExercise {
  id: string;
  exerciseName: string;
  exerciseType: string;
  description: string;
  duration: number | null;
  frequency: string;
  status: string;
  scheduledDates: string[] | null;
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function NextWorkoutWidget() {
  const { data: schedules, isLoading: schedulesLoading } = useQuery<TrainingSchedule[]>({
    queryKey: ["/api/training-schedules"],
  });
  
  const { data: scheduledExercises, isLoading: exercisesLoading } = useQuery<ScheduledExercise[]>({
    queryKey: ["/api/exercise-recommendations"],
  });
  
  const isLoading = schedulesLoading || exercisesLoading;

  if (isLoading) {
    return (
      <Card data-testid="widget-next-workout">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Next Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <Card data-testid="widget-next-workout">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Next Workout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No training schedule yet. Start your fitness journey with a personalized plan.
          </p>
          <Link href="/chat">
            <Button variant="outline" size="sm" className="w-full" data-testid="button-create-training-plan">
              Create Training Plan →
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayIndex = DAYS_ORDER.indexOf(today);
  
  // Use local date format to match backend (YYYY-MM-DD in local timezone)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`;
  
  // Find next workout: either today (if not completed) or next upcoming day
  let nextWorkout = schedules.find(s => s.day === today && s.completed === 0);
  
  if (!nextWorkout) {
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7;
      const nextDay = DAYS_ORDER[nextDayIndex];
      nextWorkout = schedules.find(s => s.day === nextDay && s.completed === 0);
      if (nextWorkout) break;
    }
  }

  // If all workouts completed, show the first one as "up next"
  if (!nextWorkout && schedules.length > 0) {
    nextWorkout = schedules[0];
  }
  
  // Find AI-added exercises scheduled for today only (not all pending)
  const todayAiExercises = (scheduledExercises || []).filter(ex => {
    // Show only exercises explicitly scheduled for today
    if (ex.scheduledDates && ex.scheduledDates.includes(todayDateStr)) return true;
    
    // Or pending/scheduled exercises without specific dates (show as "for today")
    if ((ex.status === 'pending' || ex.status === 'scheduled') && !ex.scheduledDates) return true;
    
    return false;
  });

  if (!nextWorkout) {
    return (
      <Card data-testid="widget-next-workout">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Next Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No upcoming workouts scheduled</p>
        </CardContent>
      </Card>
    );
  }

  const intensityColor = {
    low: "secondary",
    moderate: "default",
    high: "destructive"
  }[nextWorkout.intensity.toLowerCase()] || "default";

  const isToday = nextWorkout.day === today;

  return (
    <Card data-testid="widget-next-workout">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Next Workout
          </div>
          {isToday && <Badge variant="default" className="text-xs">Today</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold" data-testid="text-workout-type">{nextWorkout.workoutType}</h3>
            <Badge variant={intensityColor as any} className="text-xs" data-testid="badge-workout-intensity">
              {nextWorkout.intensity}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-workout-day">{nextWorkout.day}</p>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span data-testid="text-workout-duration">{nextWorkout.duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="h-4 w-4" />
            <span data-testid="text-workout-exercises">{nextWorkout.exercises?.length || 0} exercises</span>
          </div>
        </div>

        {nextWorkout.exercises && nextWorkout.exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">First 2 Exercises:</p>
            {nextWorkout.exercises.slice(0, 2).map((exercise, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1" data-testid={`text-exercise-${idx}`}>{exercise.name}</span>
                <span className="text-muted-foreground ml-2" data-testid={`text-exercise-sets-${idx}`}>
                  {exercise.sets} × {exercise.reps}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {todayAiExercises.length > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">AI-Added Exercises:</p>
            </div>
            {todayAiExercises.slice(0, 2).map((exercise, idx) => (
              <div key={`ai-${idx}`} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1" data-testid={`text-ai-exercise-${idx}`}>{exercise.exerciseName}</span>
                {exercise.duration && (
                  <span className="text-muted-foreground ml-2" data-testid={`text-ai-exercise-duration-${idx}`}>
                    {exercise.duration} min
                  </span>
                )}
              </div>
            ))}
            {todayAiExercises.length > 2 && (
              <p className="text-xs text-muted-foreground">+{todayAiExercises.length - 2} more</p>
            )}
          </div>
        )}

        <Link href="/training">
          <Button variant="outline" size="sm" className="w-full" data-testid="button-view-full-schedule">
            View Full Schedule <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
