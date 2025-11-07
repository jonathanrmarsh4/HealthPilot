import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { AlertCircle, Plus, ArrowRightLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

interface ScheduleRecommendationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendationTitle: string;
  onSchedule: (date: Date, action: "add" | "replace") => Promise<void>;
}

export function ScheduleRecommendationDialog({
  open,
  onOpenChange,
  recommendationTitle,
  onSchedule,
}: ScheduleRecommendationDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [scheduleAction, setScheduleAction] = useState<"add" | "replace">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async () => {
    if (!selectedDate) return;
    
    setIsSubmitting(true);
    try {
      await onSchedule(selectedDate, scheduleAction);
      onOpenChange(false);
      setSelectedDate(new Date());
      setScheduleAction("add");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-schedule-recommendation">
        <DialogHeader>
          <DialogTitle>Schedule Workout</DialogTitle>
          <DialogDescription>
            Choose when to add &quot;{recommendationTitle}&quot; to your training schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
              data-testid="calendar-schedule-date"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Scheduling Option</Label>
            <RadioGroup 
              value={scheduleAction} 
              onValueChange={(value) => setScheduleAction(value as "add" | "replace")}
              data-testid="radio-group-schedule-action"
            >
              <div className="flex items-start space-x-3 rounded-md border p-4 hover-elevate">
                <RadioGroupItem value="add" id="add" data-testid="radio-add" />
                <div className="flex-1">
                  <Label htmlFor="add" className="font-medium cursor-pointer flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add as Supplementary Activity
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Include this workout alongside your existing training plan for that day
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-md border p-4 hover-elevate">
                <RadioGroupItem value="replace" id="replace" data-testid="radio-replace" />
                <div className="flex-1">
                  <Label htmlFor="replace" className="font-medium cursor-pointer flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    Replace Optional Workout
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Swap this with an optional/recovery session (core workouts are protected)
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {scheduleAction === "replace" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will only replace optional or recovery sessions. Core training workouts essential to your goals are protected and cannot be replaced.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="button-cancel-schedule"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={!selectedDate || isSubmitting}
            data-testid="button-confirm-schedule"
          >
            {isSubmitting ? "Scheduling..." : `Schedule for ${selectedDate ? format(selectedDate, "MMM d") : "..."}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
