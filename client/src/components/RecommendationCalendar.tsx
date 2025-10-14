import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ScheduledRecommendation {
  id: string | number;
  title: string;
  scheduledAt: string;
}

interface RecommendationCalendarProps {
  recommendations: ScheduledRecommendation[];
  onDateClick?: (date: Date) => void;
  onReschedule?: (recommendationId: string | number, newDate: Date) => void;
}

export function RecommendationCalendar({ recommendations, onDateClick, onReschedule }: RecommendationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("week");
  const [selectedRecommendation, setSelectedRecommendation] = useState<ScheduledRecommendation | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);

  const getRecommendationsForDate = (date: Date) => {
    return recommendations.filter(rec => 
      isSameDay(parseISO(rec.scheduledAt), date)
    );
  };

  const handleRecommendationClick = (rec: ScheduledRecommendation) => {
    setSelectedRecommendation(rec);
  };

  const handleDateClick = (date: Date) => {
    if (selectedRecommendation) {
      setTargetDate(date);
      setRescheduleDialogOpen(true);
    } else {
      onDateClick?.(date);
    }
  };

  const confirmReschedule = () => {
    if (selectedRecommendation && targetDate && onReschedule) {
      onReschedule(selectedRecommendation.id, targetDate);
      setSelectedRecommendation(null);
      setTargetDate(null);
      setRescheduleDialogOpen(false);
    }
  };

  const cancelReschedule = () => {
    setSelectedRecommendation(null);
    setTargetDate(null);
    setRescheduleDialogOpen(false);
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    // Day labels for mobile
    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayRecommendations = getRecommendationsForDate(currentDay);
        const isCurrentMonth = isSameMonth(currentDay, monthStart);
        const isToday = isSameDay(currentDay, new Date());

        days.push(
          <div
            key={currentDay.toString()}
            className={cn(
              "min-h-16 sm:min-h-20 p-1 sm:p-2 border border-border/50 relative",
              !isCurrentMonth && "bg-muted/20 text-muted-foreground",
              isToday && "bg-primary/5",
              "hover-elevate cursor-pointer active-elevate-2"
            )}
            onClick={() => handleDateClick(currentDay)}
            data-testid={`calendar-day-${format(currentDay, "yyyy-MM-dd")}`}
          >
            <div className={cn(
              "text-xs sm:text-sm font-medium mb-1",
              isToday && "text-primary font-bold"
            )}>
              {format(currentDay, "d")}
            </div>
            {dayRecommendations.length > 0 && (
              <div className="space-y-0.5 sm:space-y-1">
                {dayRecommendations.map(rec => (
                  <div
                    key={rec.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecommendationClick(rec);
                    }}
                    className={cn(
                      "text-[10px] sm:text-xs p-0.5 sm:p-1 rounded flex items-center gap-1 truncate",
                      selectedRecommendation?.id === rec.id 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "bg-primary/20 text-primary",
                      "hover-elevate active-elevate-2"
                    )}
                    data-testid={`calendar-recommendation-${rec.id}`}
                  >
                    <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 flex-shrink-0" />
                    <span className="truncate">{rec.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="space-y-0">
        {/* Day headers - hide on mobile, show abbreviated labels */}
        <div className="grid grid-cols-7 border-b border-border pb-1 mb-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="text-center text-xs sm:text-sm font-medium text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayRecommendations = getRecommendationsForDate(day);
      const isToday = isSameDay(day, new Date());

      days.push(
        <div
          key={day.toString()}
          className={cn(
            "flex-1 min-w-[80px] min-h-28 sm:min-h-32 p-2 sm:p-3 border border-border/50",
            isToday && "bg-primary/5",
            "hover-elevate cursor-pointer active-elevate-2"
          )}
          onClick={() => handleDateClick(day)}
          data-testid={`week-day-${format(day, "yyyy-MM-dd")}`}
        >
          <div className="flex flex-col gap-1 sm:gap-2">
            <div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                {format(day, "EEE")}
              </div>
              <div className={cn(
                "text-base sm:text-lg font-bold",
                isToday && "text-primary"
              )}>
                {format(day, "d")}
              </div>
            </div>
            {dayRecommendations.length > 0 && (
              <div className="space-y-1 sm:space-y-2">
                {dayRecommendations.map(rec => (
                  <div
                    key={rec.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecommendationClick(rec);
                    }}
                    className={cn(
                      "text-xs sm:text-sm p-1 sm:p-2 rounded flex items-center gap-1 sm:gap-2",
                      selectedRecommendation?.id === rec.id 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "bg-primary/20 text-primary",
                      "hover-elevate active-elevate-2"
                    )}
                    data-testid={`calendar-recommendation-${rec.id}`}
                  >
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="line-clamp-2">{rec.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="flex min-w-max px-2 sm:px-0">
          {days}
        </div>
      </div>
    );
  };

  const handlePrevious = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Scheduled Recommendations</span>
              <span className="sm:hidden">Schedule</span>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleToday}
              data-testid="button-today"
            >
              Today
            </Button>
          </div>
          
          {selectedRecommendation && (
            <div className="p-2 sm:p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MoveRight className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">
                  Moving: {selectedRecommendation.title}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={cancelReschedule}
                data-testid="button-cancel-reschedule"
              >
                Cancel
              </Button>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                data-testid="button-previous"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
              <div className="min-w-32 sm:min-w-40 text-center text-sm sm:text-base font-semibold">
                {view === "month" 
                  ? format(currentDate, "MMM yyyy")
                  : `Week of ${format(startOfWeek(currentDate), "MMM d")}`
                }
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                data-testid="button-next"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>

            <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")}>
              <TabsList data-testid="tabs-view" className="h-8 sm:h-9">
                <TabsTrigger value="week" data-testid="tab-week" className="text-xs sm:text-sm">Week</TabsTrigger>
                <TabsTrigger value="month" data-testid="tab-month" className="text-xs sm:text-sm">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {view === "month" ? renderMonthView() : renderWeekView()}
        </CardContent>
      </Card>

      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent data-testid="dialog-reschedule">
          <DialogHeader>
            <DialogTitle>Reschedule Workout</DialogTitle>
            <DialogDescription>
              Move "{selectedRecommendation?.title}" to {targetDate && format(targetDate, "MMMM d, yyyy")}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelReschedule} data-testid="button-cancel-reschedule-dialog">
              Cancel
            </Button>
            <Button onClick={confirmReschedule} data-testid="button-confirm-reschedule">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
