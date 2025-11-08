import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {  Loader2, ArrowLeft, Sparkles, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export default function StartWorkout() {
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<{ timezone?: string }>({
    queryKey: ["/api/profile"],
  });

  const timezone = user?.timezone || "America/New_York";
  const today = format(toZonedTime(new Date(), timezone), "yyyy-MM-dd");

  interface WorkoutBlock {
    name: string;
    sets?: number;
    reps?: string;
    weight?: string;
    notes?: string;
    [key: string]: unknown;
  }

  const { data: workout, isLoading, error, status } = useQuery<{
    id: number;
    workoutData?: {
      sessionType?: string;
      estimatedDuration?: number;
      blocks?: WorkoutBlock[];
    };
  }>({
    queryKey: ["/api/training/generated-workout", today],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading workout...</p>
      </div>
    );
  }
  
  // Handle error state (404 when no workout exists)
  const hasWorkout = !error && status === "success" && workout;

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation("/training")}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Training
      </Button>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Quick Workout Start</h1>
        <p className="text-muted-foreground">
          Jump straight into today&apos;s training session
        </p>
      </div>

      {hasWorkout ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Today&apos;s Workout Ready
            </CardTitle>
            <CardDescription>
              {workout.workoutData?.sessionType || "Training Session"} • {" "}
              {workout.workoutData?.estimatedDuration || "45"} min
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your workout has been generated and is ready to go.
              </p>
              {workout.workoutData?.blocks && (
                <p className="text-sm">
                  <strong>{workout.workoutData.blocks.length}</strong> exercise blocks
                </p>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => setLocation(`/workout/${workout.id}`)}
              data-testid="button-start-workout"
            >
              <Dumbbell className="h-5 w-5 mr-2" />
              Start Workout
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Today&apos;s Workout
            </CardTitle>
            <CardDescription>
              No workout generated yet for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              size="lg"
              onClick={() => setLocation("/training")}
              data-testid="button-generate-workout"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Generate Workout
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
