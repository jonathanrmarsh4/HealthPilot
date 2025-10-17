import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Pill, Activity, Target, GripVertical, EyeOff, Eye } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";

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

interface ReminderPreferences {
  order: string[];
  hidden: string[];
}

const typeIcons = {
  'supplement': Pill,
  'exercise': Activity,
  'health_check': Target,
  'custom': Clock
};

function SortableReminderItem({ 
  reminder, 
  isHidden, 
  onToggleHidden,
  onToggleComplete,
  isCompleting
}: { 
  reminder: DailyReminder; 
  isHidden: boolean;
  onToggleHidden: (id: string) => void;
  onToggleComplete: (reminder: DailyReminder) => void;
  isCompleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: reminder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isHidden ? 0.4 : 1,
  };

  const IconComponent = typeIcons[reminder.type as keyof typeof typeIcons] || Clock;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
        reminder.completedToday 
          ? 'bg-muted/30 border-muted' 
          : isHidden
          ? 'border-dashed'
          : 'hover-elevate'
      }`}
      data-testid={`reminder-item-${reminder.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <Checkbox
        checked={reminder.completedToday}
        onCheckedChange={() => onToggleComplete(reminder)}
        disabled={reminder.completedToday || isCompleting}
        data-testid={`checkbox-reminder-${reminder.id}`}
      />
      
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <IconComponent className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className={`text-sm truncate ${reminder.completedToday ? 'line-through text-muted-foreground' : isHidden ? 'text-muted-foreground' : ''}`}>
          {reminder.title}
        </span>
        {reminder.streak > 0 && (
          <Badge variant="outline" className="ml-auto flex-shrink-0 text-xs px-1 py-0">
            🔥{reminder.streak}
          </Badge>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
        onClick={() => onToggleHidden(reminder.id)}
        data-testid={`button-toggle-visibility-${reminder.id}`}
      >
        {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </Button>
    </div>
  );
}

export function DailyRemindersWidget() {
  const { toast } = useToast();

  const { data: reminders = [], isLoading } = useQuery<DailyReminder[]>({
    queryKey: ["/api/daily-reminders/today"],
  });

  // Load preferences from dashboard preferences
  const { data: dashboardPrefs } = useQuery<{ reminderPreferences?: ReminderPreferences; visible?: string[]; order?: string[] }>({
    queryKey: ["/api/user/dashboard-preferences"],
  });

  const [preferences, setPreferences] = useState<ReminderPreferences>(() => {
    const stored = localStorage.getItem("reminder-preferences");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { order: [], hidden: [] };
      }
    }
    return { order: [], hidden: [] };
  });

  // Sync with server preferences
  useEffect(() => {
    if (dashboardPrefs?.reminderPreferences) {
      setPreferences(dashboardPrefs.reminderPreferences);
      localStorage.setItem("reminder-preferences", JSON.stringify(dashboardPrefs.reminderPreferences));
    }
  }, [dashboardPrefs]);

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPrefs: ReminderPreferences) => {
      // Merge with existing dashboard preferences to avoid overwriting visible/order
      const updatedPreferences = {
        ...(dashboardPrefs ?? {}), // Keep existing visible and order, default to empty object if undefined
        reminderPreferences: newPrefs
      };
      return await apiRequest("PATCH", "/api/user/dashboard-preferences", updatedPreferences);
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return await apiRequest("POST", `/api/daily-reminders/${reminderId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reminders/today"] });
      toast({ 
        title: "Completed!",
        description: "Keep up the great work 🎉"
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleToggleComplete = (reminder: DailyReminder) => {
    if (!reminder.completedToday) {
      markCompleteMutation.mutate(reminder.id);
    }
  };

  const handleToggleHidden = (reminderId: string) => {
    const newHidden = preferences.hidden.includes(reminderId)
      ? preferences.hidden.filter(id => id !== reminderId)
      : [...preferences.hidden, reminderId];
    
    const newPrefs = { ...preferences, hidden: newHidden };
    setPreferences(newPrefs);
    localStorage.setItem("reminder-preferences", JSON.stringify(newPrefs));
    updatePreferencesMutation.mutate(newPrefs);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedReminders.findIndex(r => r.id === active.id);
      const newIndex = orderedReminders.findIndex(r => r.id === over.id);
      
      const newOrder = arrayMove(orderedReminders, oldIndex, newIndex).map(r => r.id);
      const newPrefs = { ...preferences, order: newOrder };
      
      setPreferences(newPrefs);
      localStorage.setItem("reminder-preferences", JSON.stringify(newPrefs));
      updatePreferencesMutation.mutate(newPrefs);
    }
  };

  // Sort reminders by user preference
  const orderedReminders = [...reminders].sort((a, b) => {
    const aIndex = preferences.order.indexOf(a.id);
    const bIndex = preferences.order.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const visibleReminders = orderedReminders.filter(r => !preferences.hidden.includes(r.id));
  const completedCount = visibleReminders.filter(r => r.completedToday).length;
  const totalCount = visibleReminders.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Daily Checklist
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Daily Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No reminders yet. Add supplements to create daily reminders.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="widget-daily-reminders">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Daily Checklist
          </CardTitle>
          <div className="flex items-center gap-2">
            {allComplete && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                Complete!
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{totalCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedReminders.map(r => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {orderedReminders.map((reminder) => (
              <SortableReminderItem
                key={reminder.id}
                reminder={reminder}
                isHidden={preferences.hidden.includes(reminder.id)}
                onToggleHidden={handleToggleHidden}
                onToggleComplete={handleToggleComplete}
                isCompleting={markCompleteMutation.isPending}
              />
            ))}
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}
