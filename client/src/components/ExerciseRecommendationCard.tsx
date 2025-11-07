import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Calendar as CalendarIcon, ChevronDown, ChevronUp, X, Check, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ScheduledExerciseRecommendation {
  id: number;
  exerciseName: string;
  exerciseType: string;
  description: string;
  sets?: number;
  reps?: string;
  duration?: string;
  frequency: string;
  scheduledDates: string[];
  isSupplementary: boolean;
  status: string;
  createdAt: string;
}

interface CalendarDayData {
  date: string;
  exercises: number;
  workouts: number;
  supplements: number;
}

interface ExerciseRecommendationCardProps {
  recommendation: ScheduledExerciseRecommendation;
  calendarData?: CalendarDayData[];
  onAutoSchedule: (id: number) => void;
  onManualSchedule: (id: number, dates: string[]) => void;
  onDecline: (id: number) => void;
  isScheduling?: boolean;
}

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  "3x_week": "3x per week",
  "5x_week": "5x per week",
  specific_day: "Specific days"
};

const exerciseTypeColors: Record<string, string> = {
  mobility: "bg-blue-500",
  stretching: "bg-green-500",
  core: "bg-purple-500",
  cardio: "bg-orange-500",
  recovery: "bg-teal-500"
};

export function ExerciseRecommendationCard({
  recommendation,
  calendarData = [],
  onAutoSchedule,
  onManualSchedule,
  onDecline,
  isScheduling = false
}: ExerciseRecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  const handleAutoSchedule = () => {
    onAutoSchedule(recommendation.id);
  };

  const handleManualSchedule = () => {
    if (selectedDates.length === 0) return;
    
    const dateStrings = selectedDates.map(date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    
    onManualSchedule(recommendation.id, dateStrings);
    setShowManualPicker(false);
    setSelectedDates([]);
  };

  const handleDecline = () => {
    onDecline(recommendation.id);
  };

  const getBusyLevel = (dateStr: string): { level: string; details: string } => {
    const dayData = calendarData.find(d => d.date === dateStr);
    if (!dayData) return { level: "free", details: "No conflicts" };
    
    const total = dayData.exercises + dayData.workouts + dayData.supplements;
    const items: string[] = [];
    
    if (dayData.workouts > 0) items.push(`${dayData.workouts} workout${dayData.workouts > 1 ? 's' : ''}`);
    if (dayData.exercises > 0) items.push(`${dayData.exercises} exercise${dayData.exercises > 1 ? 's' : ''}`);
    if (dayData.supplements > 0) items.push(`${dayData.supplements} supplement${dayData.supplements > 1 ? 's' : ''}`);
    
    if (total === 0) return { level: "free", details: "No conflicts" };
    if (total <= 2) return { level: "light", details: items.join(", ") };
    if (total <= 4) return { level: "moderate", details: items.join(", ") };
    return { level: "busy", details: items.join(", ") };
  };

  const modifiers = {
    selected: selectedDates,
    busy: calendarData
      .filter(d => {
        const { level } = getBusyLevel(d.date);
        return level === "busy";
      })
      .map(d => parseISO(d.date)),
    moderate: calendarData
      .filter(d => {
        const { level } = getBusyLevel(d.date);
        return level === "moderate";
      })
      .map(d => parseISO(d.date)),
    light: calendarData
      .filter(d => {
        const { level } = getBusyLevel(d.date);
        return level === "light";
      })
      .map(d => parseISO(d.date))
  };

  const modifiersClassNames = {
    selected: "bg-primary text-primary-foreground",
    busy: "bg-destructive/20 text-destructive",
    moderate: "bg-chart-5/20 text-chart-5",
    light: "bg-chart-2/20 text-chart-2"
  };

  const typeColor = exerciseTypeColors[recommendation.exerciseType] || "bg-gray-500";

  return (
    <>
      <Card className="hover-elevate" data-testid={`card-exercise-${recommendation.id}`}>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${typeColor}/10`}>
                <Activity className={`h-5 w-5 ${typeColor.replace('bg-', 'text-')}`} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base break-words">{recommendation.exerciseName}</CardTitle>
                  <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">
                    {recommendation.exerciseType}
                  </Badge>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {frequencyLabels[recommendation.frequency] || recommendation.frequency}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground break-words">{recommendation.description}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0"
                onClick={() => setExpanded(!expanded)}
                data-testid="button-expand-exercise"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-4">
            {(recommendation.sets || recommendation.reps || recommendation.duration) && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                {recommendation.sets && (
                  <div>
                    <span className="text-muted-foreground">Sets:</span>
                    <span className="ml-1 font-medium">{recommendation.sets}</span>
                  </div>
                )}
                {recommendation.reps && (
                  <div>
                    <span className="text-muted-foreground">Reps:</span>
                    <span className="ml-1 font-medium">{recommendation.reps}</span>
                  </div>
                )}
                {recommendation.duration && (
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-1 font-medium">{recommendation.duration}</span>
                  </div>
                )}
              </div>
            )}

            {recommendation.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleAutoSchedule}
                  disabled={isScheduling}
                  className="flex-1 min-w-[140px]"
                  data-testid="button-auto-schedule"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Auto-Schedule
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowManualPicker(true)}
                  disabled={isScheduling}
                  className="flex-1 min-w-[140px]"
                  data-testid="button-manual-schedule"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Pick Days
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDecline}
                  disabled={isScheduling}
                  data-testid="button-decline-exercise"
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            )}

            {recommendation.status === "scheduled" && recommendation.scheduledDates.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Scheduled for:</p>
                <div className="flex flex-wrap gap-2">
                  {recommendation.scheduledDates.map((date, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      <Check className="h-3 w-3" />
                      {format(parseISO(date), "MMM d")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {recommendation.status === "declined" && (
              <Badge variant="secondary" className="gap-1">
                <X className="h-3 w-3" />
                Declined
              </Badge>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={showManualPicker} onOpenChange={setShowManualPicker}>
        <DialogContent className="max-w-md" data-testid="dialog-manual-schedule">
          <DialogHeader>
            <DialogTitle>Pick Training Days</DialogTitle>
            <DialogDescription>
              Select which days you&apos;d like to do this exercise. Colored dates show existing commitments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2 text-xs flex-wrap">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-sm bg-chart-2/20 border border-chart-2"></div>
                      <span className="text-muted-foreground">Light</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>1-2 items scheduled</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-sm bg-chart-5/20 border border-chart-5"></div>
                      <span className="text-muted-foreground">Moderate</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>3-4 items scheduled</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-sm bg-destructive/20 border border-destructive"></div>
                      <span className="text-muted-foreground">Busy</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>5+ items scheduled</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => setSelectedDates(dates || [])}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
              data-testid="calendar-manual-schedule"
            />

            {selectedDates.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected days ({selectedDates.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.map((date, idx) => {
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const { level, details } = getBusyLevel(dateStr);
                    
                    return (
                      <TooltipProvider key={idx}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="gap-1">
                              {level !== "free" && <AlertCircle className="h-3 w-3" />}
                              {format(date, "MMM d")}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{details}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleManualSchedule}
                disabled={selectedDates.length === 0 || isScheduling}
                className="flex-1"
                data-testid="button-confirm-schedule"
              >
                Schedule {selectedDates.length} Day{selectedDates.length !== 1 ? 's' : ''}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowManualPicker(false);
                  setSelectedDates([]);
                }}
                data-testid="button-cancel-schedule"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
