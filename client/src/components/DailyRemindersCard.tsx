import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Flame, Pill, Activity, Target } from "lucide-react";

interface DailyReminder {
  id: string;
  type: string;
  title: string;
  description: string | null;
  timeOfDay: string;
  linkedRecordId: string | null;
  streak: number;
  completedToday: boolean;
}

const timeLabels = {
  'morning': 'Morning',
  'afternoon': 'Afternoon',
  'evening': 'Evening',
  'anytime': 'Anytime'
};

const typeIcons = {
  'supplement': Pill,
  'exercise': Activity,
  'health_check': Target,
  'custom': Clock
};

export function DailyRemindersCard() {
  const { toast } = useToast();

  const { data: reminders = [], isLoading } = useQuery<DailyReminder[]>({
    queryKey: ["/api/daily-reminders/today"],
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return await apiRequest("POST", `/api/daily-reminders/${reminderId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reminders/today"] });
      toast({ 
        title: "Reminder completed!",
        description: "Keep up the great work 🎉"
      });
    },
  });

  const handleToggleComplete = (reminder: DailyReminder) => {
    if (!reminder.completedToday) {
      markCompleteMutation.mutate(reminder.id);
    }
  };

  const groupedReminders = reminders.reduce((acc, reminder) => {
    if (!acc[reminder.timeOfDay]) acc[reminder.timeOfDay] = [];
    acc[reminder.timeOfDay].push(reminder);
    return acc;
  }, {} as Record<string, DailyReminder[]>);

  const timeOrder = ['morning', 'afternoon', 'evening', 'anytime'];
  const completedCount = reminders.filter(r => r.completedToday).length;
  const totalCount = reminders.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Daily Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Daily Reminders
          </CardTitle>
          <CardDescription>Stay on track with daily health habits</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No reminders for today. Visit the Supplements page to add reminders.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-daily-reminders">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <CardTitle>Daily Reminders</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {allComplete && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                All Done!
              </Badge>
            )}
            <Badge variant="secondary">
              {completedCount}/{totalCount}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Complete your daily health habits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {timeOrder.map((time) => {
          const timeReminders = groupedReminders[time] || [];
          if (timeReminders.length === 0) return null;

          return (
            <div key={time} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {timeLabels[time as keyof typeof timeLabels]}
              </p>
              <div className="space-y-2">
                {timeReminders.map((reminder) => {
                  const IconComponent = typeIcons[reminder.type as keyof typeof typeIcons] || Clock;
                  
                  return (
                    <div
                      key={reminder.id}
                      className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                        reminder.completedToday 
                          ? 'bg-muted/50 border-muted' 
                          : 'hover-elevate'
                      }`}
                      data-testid={`reminder-item-${reminder.id}`}
                    >
                      <Checkbox
                        checked={reminder.completedToday}
                        onCheckedChange={() => handleToggleComplete(reminder)}
                        disabled={reminder.completedToday || markCompleteMutation.isPending}
                        className="mt-1"
                        data-testid={`checkbox-reminder-${reminder.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <IconComponent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <p className={`font-medium ${reminder.completedToday ? 'line-through text-muted-foreground' : ''}`}>
                            {reminder.title}
                          </p>
                          {reminder.streak > 0 && (
                            <Badge variant="outline" className="ml-auto flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              {reminder.streak}
                            </Badge>
                          )}
                        </div>
                        {reminder.description && (
                          <p className={`text-sm ${reminder.completedToday ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                            {reminder.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
