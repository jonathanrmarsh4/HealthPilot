import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Zap, CheckCircle2, Flame, Snowflake, Calendar } from "lucide-react";
import { format } from "date-fns";

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
  sessionType?: string;
  duration: number;
  intensity: "Low" | "Moderate" | "High";
  exercises: Exercise[];
  isOptional?: boolean;
  scheduledFor?: string | Date | null;
  completed?: boolean;
  onToggleComplete?: (id: string, currentCompleted: boolean) => void;
  onSchedule?: (id: string, date: Date) => void;
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
  sessionType = "workout",
  duration,
  intensity,
  exercises,
  isOptional = false,
  scheduledFor,
  completed = false,
  onToggleComplete,
  onSchedule,
}: TrainingScheduleCardProps) {
  const handleToggle = () => {
    if (id && onToggleComplete) {
      onToggleComplete(id, completed);
    }
  };

  const handleScheduleToday = () => {
    if (id && onSchedule) {
      onSchedule(id, new Date());
    }
  };

  const isRecoverySession = sessionType === "sauna" || sessionType === "cold_plunge";
  const RecoveryIcon = sessionType === "sauna" ? Flame : Snowflake;
  const recoveryColor = sessionType === "sauna" ? "text-orange-500" : "text-blue-500";

  return (
    <Card 
      className={`${completed ? "border-chart-4 bg-chart-4/5" : ""} ${isRecoverySession ? "border-dashed" : ""}`}
      data-testid={`card-training-${day.toLowerCase()}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{day}</Badge>
              {isRecoverySession ? (
                <Badge className="bg-purple-500/10 text-purple-500">
                  <RecoveryIcon className="mr-1 h-3 w-3" />
                  Recovery
                </Badge>
              ) : (
                <Badge className={intensityConfig[intensity]}>
                  {intensity}
                </Badge>
              )}
              {isOptional && (
                <Badge variant="outline" className="text-muted-foreground">
                  Optional
                </Badge>
              )}
              {scheduledFor && (
                <Badge className="bg-primary/10 text-primary">
                  <Calendar className="mr-1 h-3 w-3" />
                  {format(new Date(scheduledFor), "MMM d")}
                </Badge>
              )}
              {completed && (
                <Badge className="bg-chart-4 text-white">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg flex items-center gap-2">
              {isRecoverySession && <RecoveryIcon className={`h-5 w-5 ${recoveryColor}`} />}
              {workoutType}
            </CardTitle>
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
          {!isRecoverySession && (
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-chart-5" />
              <span className="text-muted-foreground">{exercises.length} exercises</span>
            </div>
          )}
        </div>

        {!isRecoverySession && exercises.length > 0 && (
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
        )}

        <div className="flex gap-2">
          {isOptional && !scheduledFor && (
            <Button
              variant="outline"
              className="flex-1"
              size="sm"
              onClick={handleScheduleToday}
              data-testid="button-schedule-today"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule for Today
            </Button>
          )}
          <Button
            variant={completed ? "outline" : "default"}
            className="flex-1"
            size="sm"
            onClick={handleToggle}
            data-testid="button-toggle-completion"
          >
            {completed ? "Mark as Incomplete" : "Mark as Complete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
