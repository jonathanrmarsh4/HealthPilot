import { TrainingScheduleCard } from "@/components/TrainingScheduleCard";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { TrainingSchedule } from "@shared/schema";

export default function Training() {
  const { toast } = useToast();
  
  const { data: workouts, isLoading } = useQuery<TrainingSchedule[]>({
    queryKey: ["/api/training-schedules"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/training-schedules/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-schedules"] });
      toast({
        title: "Success",
        description: "New training schedule generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate training schedule",
        variant: "destructive",
      });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/training-schedules/${id}/complete`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-schedules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workout status",
        variant: "destructive",
      });
    },
  });

  const handleToggleComplete = (id: string, currentCompleted: boolean) => {
    toggleCompleteMutation.mutate({ id, completed: !currentCompleted });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Training Schedule</h1>
          <p className="text-muted-foreground mt-2">
            Personalized workout programs based on your fitness level and goals
          </p>
        </div>
        <Button 
          onClick={() => generateMutation.mutate()} 
          disabled={generateMutation.isPending}
          data-testid="button-generate-training"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate New Schedule
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workouts && workouts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <TrainingScheduleCard 
              key={workout.id} 
              id={workout.id}
              day={workout.day}
              workoutType={workout.workoutType}
              duration={workout.duration}
              intensity={workout.intensity as "Low" | "Moderate" | "High"}
              exercises={workout.exercises as any[]}
              completed={workout.completed === 1}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No training schedule available. Click "Generate New Schedule" to create a personalized workout plan.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
