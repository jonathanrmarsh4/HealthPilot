import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { MessageSquare, Zap, Heart, ThumbsUp, ThumbsDown, AlertCircle, Frown, Meh, Smile, Grin, HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WorkoutFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: string[];
  onSubmit: (feedback: WorkoutFeedback) => void;
}

export interface WorkoutFeedback {
  overallDifficulty: number;
  fatigueLevel: number;
  enjoymentRating: number;
  exercisesTooEasy: string[];
  exercisesTooHard: string[];
  painOrDiscomfort: string;
  feedbackNotes: string;
}

const difficultyOptions = [
  { value: "1", label: "Too Easy", description: "Barely any challenge" },
  { value: "2", label: "Easy", description: "Could do more" },
  { value: "3", label: "Just Right", description: "Perfect challenge" },
  { value: "4", label: "Challenging", description: "Pushed hard" },
  { value: "5", label: "Too Hard", description: "Struggled to complete" },
];

const fatigueOptions = [
  { value: "1", label: "Energized", description: "Feel great" },
  { value: "2", label: "Slightly Tired", description: "Good recovery" },
  { value: "3", label: "Moderately Fatigued", description: "Normal tiredness" },
  { value: "4", label: "Very Tired", description: "Need rest" },
  { value: "5", label: "Exhausted", description: "Completely drained" },
];

const enjoymentOptions = [
  { value: "1", label: "Not Enjoyable", icon: Frown },
  { value: "2", label: "Slightly Enjoyable", icon: Meh },
  { value: "3", label: "Moderately Enjoyable", icon: Smile },
  { value: "4", label: "Very Enjoyable", icon: Grin },
  { value: "5", label: "Loved It", icon: HeartHandshake },
];

export function WorkoutFeedbackModal({
  open,
  onOpenChange,
  exercises,
  onSubmit,
}: WorkoutFeedbackModalProps) {
  const [overallDifficulty, setOverallDifficulty] = useState<string>("3");
  const [fatigueLevel, setFatigueLevel] = useState<string>("3");
  const [enjoymentRating, setEnjoymentRating] = useState<string>("3");
  const [exercisesTooEasy, setExercisesTooEasy] = useState<string[]>([]);
  const [exercisesTooHard, setExercisesTooHard] = useState<string[]>([]);
  const [painOrDiscomfort, setPainOrDiscomfort] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setOverallDifficulty("3");
      setFatigueLevel("3");
      setEnjoymentRating("3");
      setExercisesTooEasy([]);
      setExercisesTooHard([]);
      setPainOrDiscomfort("");
      setFeedbackNotes("");
    }
  }, [open]);

  const toggleExerciseTooEasy = (exercise: string) => {
    if (exercisesTooEasy.includes(exercise)) {
      setExercisesTooEasy(exercisesTooEasy.filter(e => e !== exercise));
    } else {
      setExercisesTooEasy([...exercisesTooEasy, exercise]);
      setExercisesTooHard(exercisesTooHard.filter(e => e !== exercise));
    }
  };

  const toggleExerciseTooHard = (exercise: string) => {
    if (exercisesTooHard.includes(exercise)) {
      setExercisesTooHard(exercisesTooHard.filter(e => e !== exercise));
    } else {
      setExercisesTooHard([...exercisesTooHard, exercise]);
      setExercisesTooEasy(exercisesTooEasy.filter(e => e !== exercise));
    }
  };

  const handleSubmit = () => {
    onSubmit({
      overallDifficulty: parseInt(overallDifficulty),
      fatigueLevel: parseInt(fatigueLevel),
      enjoymentRating: parseInt(enjoymentRating),
      exercisesTooEasy,
      exercisesTooHard,
      painOrDiscomfort,
      feedbackNotes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            How was your workout?
          </DialogTitle>
          <DialogDescription>
            Your feedback helps us create better workouts for you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Difficulty */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Overall Difficulty
            </Label>
            <RadioGroup
              value={overallDifficulty}
              onValueChange={setOverallDifficulty}
              className="grid grid-cols-5 gap-2"
            >
              {difficultyOptions.map((option) => (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value}
                    id={`difficulty-${option.value}`}
                    className="peer sr-only"
                    data-testid={`radio-difficulty-${option.value}`}
                  />
                  <Label
                    htmlFor={`difficulty-${option.value}`}
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted hover-elevate active-elevate-2 p-3 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-[10px] text-muted-foreground text-center mt-1">{option.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Fatigue Level */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              How do you feel now?
            </Label>
            <RadioGroup
              value={fatigueLevel}
              onValueChange={setFatigueLevel}
              className="grid grid-cols-5 gap-2"
            >
              {fatigueOptions.map((option) => (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value}
                    id={`fatigue-${option.value}`}
                    className="peer sr-only"
                    data-testid={`radio-fatigue-${option.value}`}
                  />
                  <Label
                    htmlFor={`fatigue-${option.value}`}
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted hover-elevate active-elevate-2 p-3 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-[10px] text-muted-foreground text-center mt-1">{option.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Enjoyment Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Did you enjoy this workout?
            </Label>
            <RadioGroup
              value={enjoymentRating}
              onValueChange={setEnjoymentRating}
              className="grid grid-cols-5 gap-2"
            >
              {enjoymentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value} className="relative">
                    <RadioGroupItem
                      value={option.value}
                      id={`enjoyment-${option.value}`}
                      className="peer sr-only"
                      data-testid={`radio-enjoyment-${option.value}`}
                    />
                    <Label
                      htmlFor={`enjoyment-${option.value}`}
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted hover-elevate active-elevate-2 p-3 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-[10px] text-center">{option.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Exercise-Specific Feedback */}
          {exercises.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Exercise Feedback (Optional)
              </Label>
              <div className="space-y-2">
                {exercises.map((exercise) => (
                  <div
                    key={exercise}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30"
                    data-testid={`exercise-feedback-${exercise}`}
                  >
                    <span className="text-sm flex-1">{exercise}</span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={exercisesTooEasy.includes(exercise) ? "default" : "outline"}
                        onClick={() => toggleExerciseTooEasy(exercise)}
                        className="h-7 text-xs"
                        data-testid={`button-too-easy-${exercise}`}
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        Too Easy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={exercisesTooHard.includes(exercise) ? "default" : "outline"}
                        onClick={() => toggleExerciseTooHard(exercise)}
                        className="h-7 text-xs"
                        data-testid={`button-too-hard-${exercise}`}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Too Hard
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pain or Discomfort */}
          <div className="space-y-2">
            <Label htmlFor="pain" className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Any pain or discomfort? (Optional)
            </Label>
            <Textarea
              id="pain"
              placeholder="Describe any pain, soreness, or discomfort..."
              value={painOrDiscomfort}
              onChange={(e) => setPainOrDiscomfort(e.target.value)}
              rows={2}
              data-testid="textarea-pain"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any other feedback about this workout..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              rows={2}
              data-testid="textarea-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-skip-feedback"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            data-testid="button-submit-feedback"
          >
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
