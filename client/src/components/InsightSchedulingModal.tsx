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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, Dumbbell, Calendar as CalendarIcon, Repeat } from "lucide-react";
import { format } from "date-fns";

interface InsightSchedulingModalProps {
  insightId: string | null;
  onClose: () => void;
}

type FrequencyType = 'one_time' | 'daily' | 'after_workout' | '3x_week' | '5x_week' | 'custom';

export function InsightSchedulingModal({ insightId, onClose }: InsightSchedulingModalProps) {
  const [frequency, setFrequency] = useState<FrequencyType>('daily');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const { toast } = useToast();

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/insights/schedule', 'POST', {
        insightId,
        frequency,
        scheduledDates: frequency === 'custom' ? selectedDates.map(d => d.toISOString()) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/data-insights'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-insights'] });
      toast({
        title: "Scheduled successfully",
        description: "This activity has been added to your schedule",
      });
      onClose();
    },
  });

  const handleSchedule = () => {
    if (frequency === 'custom' && selectedDates.length === 0) {
      toast({
        title: "No dates selected",
        description: "Please select at least one date for custom scheduling",
        variant: "destructive",
      });
      return;
    }
    scheduleMutation.mutate();
  };

  return (
    <Dialog open={!!insightId} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-schedule-insight">
        <DialogHeader>
          <DialogTitle>Schedule Activity</DialogTitle>
          <DialogDescription>
            Choose how often you want this activity scheduled
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Frequency</Label>
            <RadioGroup value={frequency} onValueChange={(value) => setFrequency(value as FrequencyType)}>
              <div className="flex items-center space-x-2 p-3 rounded-md hover-elevate" data-testid="radio-one-time">
                <RadioGroupItem value="one_time" id="one_time" />
                <Label htmlFor="one_time" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CalendarIcon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">One-time</div>
                    <div className="text-xs text-muted-foreground">Schedule for a specific date</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md hover-elevate" data-testid="radio-daily">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Repeat className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Daily</div>
                    <div className="text-xs text-muted-foreground">Every day</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md hover-elevate" data-testid="radio-after-workout">
                <RadioGroupItem value="after_workout" id="after_workout" />
                <Label htmlFor="after_workout" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Dumbbell className="h-4 w-4" />
                  <div>
                    <div className="font-medium">After Workouts</div>
                    <div className="text-xs text-muted-foreground">Automatically scheduled after training sessions</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md hover-elevate" data-testid="radio-3x-week">
                <RadioGroupItem value="3x_week" id="3x_week" />
                <Label htmlFor="3x_week" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Clock className="h-4 w-4" />
                  <div>
                    <div className="font-medium">3x per week</div>
                    <div className="text-xs text-muted-foreground">Monday, Wednesday, Friday</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md hover-elevate" data-testid="radio-5x-week">
                <RadioGroupItem value="5x_week" id="5x_week" />
                <Label htmlFor="5x_week" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Clock className="h-4 w-4" />
                  <div>
                    <div className="font-medium">5x per week</div>
                    <div className="text-xs text-muted-foreground">Monday through Friday</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md hover-elevate" data-testid="radio-custom">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CalendarIcon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Custom dates</div>
                    <div className="text-xs text-muted-foreground">Pick specific dates</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {frequency === 'custom' && (
            <div className="space-y-3">
              <Label>Select Dates</Label>
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
                data-testid="calendar-custom-dates"
              />
              {selectedDates.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Selected: {selectedDates.map(d => format(d, 'MMM d')).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} data-testid="button-cancel-schedule">
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={scheduleMutation.isPending}
            data-testid="button-confirm-schedule"
          >
            {scheduleMutation.isPending ? "Scheduling..." : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
