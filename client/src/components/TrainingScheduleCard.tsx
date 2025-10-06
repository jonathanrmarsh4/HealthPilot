import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Zap, CheckCircle2 } from "lucide-react";

interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
}

interface TrainingScheduleCardProps {
  id?: string;
  day: string;
  workoutType: string;
  duration: number;
  intensity: "Low" | "Moderate" | "High";
  exercises: Exercise[];
  completed?: boolean;
  onToggleComplete?: (id: string, currentCompleted: boolean) => void;
}

const intensityConfig = {
  Low: "bg-chart-4/10 text-chart-4",
  Moderate: "bg-chart-5/10 text-chart-5",
  High: "bg-destructive/10 text-destructive",
};

export function TrainingScheduleCard({
  id,
  day,
  workoutType,
  duration,
  intensity,
  exercises,
  completed = false,
  onToggleComplete,
}: TrainingScheduleCardProps) {
  const handleToggle = () => {
    if (id && onToggleComplete) {
      onToggleComplete(id, completed);
    }
  };

  return (
    <Card 
      className={completed ? "border-chart-4 bg-chart-4/5" : ""}
      data-testid={`card-training-${day.toLowerCase()}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{day}</Badge>
              <Badge className={intensityConfig[intensity]}>
                {intensity}
              </Badge>
              {completed && (
                <Badge className="bg-chart-4 text-white">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{workoutType}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono font-semibold">{duration}</span>
            <span className="text-muted-foreground">min</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-chart-5" />
            <span className="text-muted-foreground">{exercises.length} exercises</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Exercises</div>
          <div className="space-y-1">
            {exercises.map((exercise, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
              >
                <span className="font-medium">{exercise.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {exercise.sets && exercise.reps && `${exercise.sets}x${exercise.reps}`}
                  {exercise.duration}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Button
          variant={completed ? "outline" : "default"}
          className="w-full"
          size="sm"
          onClick={handleToggle}
          data-testid="button-toggle-completion"
        >
          {completed ? "Mark as Incomplete" : "Mark as Complete"}
        </Button>
      </CardContent>
    </Card>
  );
}
