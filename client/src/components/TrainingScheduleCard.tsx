import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Zap, CheckCircle2, Flame, Snowflake, Calendar, Info } from "lucide-react";
import { format } from "date-fns";
import { ExerciseDetailsModal } from "@/components/ExerciseDetailsModal";

interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
}

// Exercise Item Component with Info Button
function ExerciseItem({ exercise, muscleGroups, idx }: { exercise: Exercise; muscleGroups: string[]; idx: number }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div
        className="rounded-md bg-muted/50 px-3 py-2"
        data-testid={`exercise-item-${idx}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{exercise.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5" data-testid={`muscle-groups-${idx}`}>
              {muscleGroups.join(' • ')}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs text-muted-foreground">
              {exercise.sets && exercise.reps && `${exercise.sets}x${exercise.reps}`}
              {exercise.duration}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={() => setShowDetails(true)}
              data-testid={`button-exercise-info-${idx}`}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <ExerciseDetailsModal
        exerciseName={exercise.name}
        open={showDetails}
        onClose={() => setShowDetails(false)}
      />
    </>
  );
}

// Muscle group classification helper
function getExerciseMuscleGroups(exerciseName: string): string[] {
  const nameLower = exerciseName.toLowerCase();
  
  // Chest exercises
  if (nameLower.includes('bench press') || nameLower.includes('chest press') || 
      nameLower.includes('chest fly') || nameLower.includes('pec fly') || 
      nameLower.includes('cable crossover') || nameLower.includes('push-up') || 
      nameLower.includes('pushup') || nameLower.includes('push up')) {
    return ['Chest'];
  }
  
  // Back exercises
  if (nameLower.includes('pull-up') || nameLower.includes('pullup') || 
      nameLower.includes('chin-up') || nameLower.includes('chinup') ||
      nameLower.includes('row') || nameLower.includes('lat pulldown') || 
      nameLower.includes('lat pull') || nameLower.includes('pullover')) {
    return ['Back'];
  }
  if (nameLower.includes('deadlift')) {
    return ['Back', 'Legs'];
  }
  
  // Leg exercises
  if (nameLower.includes('squat') || nameLower.includes('leg press')) {
    return ['Legs', 'Glutes'];
  }
  if (nameLower.includes('leg curl') || nameLower.includes('leg extension') || 
      nameLower.includes('lunge') || nameLower.includes('step-up')) {
    return ['Legs'];
  }
  if (nameLower.includes('calf raise') || nameLower.includes('calf press')) {
    return ['Calves'];
  }
  
  // Shoulder exercises
  if (nameLower.includes('shoulder press') || nameLower.includes('military press') ||
      nameLower.includes('overhead press') || nameLower.includes('lateral raise') ||
      nameLower.includes('front raise') || nameLower.includes('rear delt')) {
    return ['Shoulders'];
  }
  
  // Arm exercises
  if (nameLower.includes('bicep curl') || nameLower.includes('hammer curl') || 
      nameLower.includes('preacher curl')) {
    return ['Arms'];
  }
  if (nameLower.includes('tricep') || nameLower.includes('skull crusher') || 
      nameLower.includes('close grip')) {
    return ['Arms'];
  }
  if (nameLower.includes('dip') && !nameLower.includes('hip')) {
    return ['Chest', 'Arms'];
  }
  
  // Core exercises
  if (nameLower.includes('plank') || nameLower.includes('crunch') || 
      nameLower.includes('sit-up') || nameLower.includes('ab') || 
      nameLower.includes('core') || nameLower.includes('russian twist') ||
      nameLower.includes('hanging leg raise')) {
    return ['Core'];
  }
  
  // Glute-specific exercises
  if (nameLower.includes('hip thrust') || nameLower.includes('glute bridge') || 
      nameLower.includes('kickback')) {
    return ['Glutes'];
  }
  
  // Cardio exercises
  if (nameLower.includes('run') || nameLower.includes('cycle') || 
      nameLower.includes('bike') || nameLower.includes('rowing') || 
      nameLower.includes('swim') || nameLower.includes('elliptical') || 
      nameLower.includes('walk')) {
    return ['Cardio'];
  }
  
  // Flexibility
  if (nameLower.includes('stretch') || nameLower.includes('yoga') || 
      nameLower.includes('mobility')) {
    return ['Flexibility'];
  }
  
  // Default
  return ['Full Body'];
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
              {/* Use exercise.name as stable key to prevent React misbinding during re-renders */}
              {exercises.map((exercise, idx) => {
                const muscleGroups = getExerciseMuscleGroups(exercise.name);
                return (
                  <ExerciseItem 
                    key={exercise.name} 
                    exercise={exercise} 
                    muscleGroups={muscleGroups} 
                    idx={idx}
                  />
                );
              })}
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
