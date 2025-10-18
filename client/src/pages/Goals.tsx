OKimport { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Trash2, Calendar, Edit2, CheckCircle2, AlertCircle, Clock, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const goalFormSchema = z.object({
  metricType: z.string().min(1, "Metric type is required"),
  targetValue: z.coerce.number().gt(0, "Target value must be greater than 0"),
  startValue: z.coerce.number().min(0, "Start value must be 0 or greater").optional(),
  currentValue: z.coerce.number().min(0, "Current value must be 0 or greater").optional(),
  deadline: z.string().min(1, "Deadline is required"),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface Goal {
  id: string;
  userId: string;
  metricType: string;
  targetValue: number;
  currentValue: number | null;
  startValue: number | null;
  deadline: string;
  status: "active" | "completed" | "overdue";
  createdByAI: number;
  createdAt: string;
}

const METRIC_OPTIONS = [
  { value: "weight", label: "Weight", unit: "kg", decreaseGoal: true },
  { value: "lean-body-mass", label: "Lean Body Mass", unit: "kg", decreaseGoal: false },
  { value: "body-fat-percentage", label: "Body Fat %", unit: "%", decreaseGoal: true },
  { value: "heart-rate", label: "Resting Heart Rate", unit: "bpm", decreaseGoal: true },
  { value: "blood-pressure", label: "Blood Pressure", unit: "mmHg", decreaseGoal: true },
  { value: "blood-glucose", label: "Blood Glucose", unit: "mg/dL", decreaseGoal: true },
  { value: "cholesterol", label: "Cholesterol", unit: "mg/dL", decreaseGoal: true },
  { value: "steps", label: "Daily Steps", unit: "steps", decreaseGoal: false },
  { value: "sleep-hours", label: "Sleep Hours", unit: "hours", decreaseGoal: false },
];

export default function Goals() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      metricType: "",
      targetValue: 0,
      startValue: undefined,
      currentValue: undefined,
      deadline: "",
    },
  });

  // Watch for metric type changes to auto-populate values
  const selectedMetricType = form.watch("metricType");
  
  useEffect(() => {
    // Only auto-populate when creating a new goal (not editing)
    if (!editingGoal && selectedMetricType) {
      // Fetch latest biomarker value for this metric type
      fetch(`/api/biomarkers/latest/${selectedMetricType}`)
        .then(res => {
          if (!res.ok) {
            // No biomarker data available, clear fields for manual entry
            form.setValue("startValue", undefined);
            form.setValue("currentValue", undefined);
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (data?.value !== undefined) {
            // Auto-populate both start and current values with latest biomarker
            form.setValue("startValue", data.value);
            form.setValue("currentValue", data.value);
          } else if (data === null) {
            // Already cleared above, no action needed
          }
        })
        .catch(() => {
          // Handle errors - clear fields for manual entry
          form.setValue("startValue", undefined);
          form.setValue("currentValue", undefined);
        });
    }
  }, [selectedMetricType, editingGoal, form]);

  // Reset form when editing goal changes
  useEffect(() => {
    if (editingGoal) {
      form.reset({
        metricType: editingGoal.metricType,
        targetValue: editingGoal.targetValue,
        startValue: editingGoal.startValue ?? undefined,
        currentValue: editingGoal.currentValue ?? undefined,
        deadline: format(new Date(editingGoal.deadline), "yyyy-MM-dd"),
      });
    } else {
      form.reset({
        metricType: "",
        targetValue: 0,
        startValue: undefined,
        currentValue: undefined,
        deadline: "",
      });
    }
  }, [editingGoal, form]);

  const createMutation = useMutation({
    mutationFn: async (data: GoalFormValues) => {
      const res = await apiRequest("POST", "/api/goals", {
        metricType: data.metricType,
        targetValue: data.targetValue,
        startValue: data.startValue,
        currentValue: data.currentValue,
        deadline: data.deadline,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Success",
        description: "Goal created successfully!",
      });
      setIsDialogOpen(false);
      setEditingGoal(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create goal",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GoalFormValues & { id: string }) => {
      const res = await apiRequest("PATCH", `/api/goals/${data.id}`, {
        metricType: data.metricType,
        targetValue: data.targetValue,
        startValue: data.startValue,
        currentValue: data.currentValue,
        deadline: data.deadline,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Success",
        description: "Goal updated successfully!",
      });
      setIsDialogOpen(false);
      setEditingGoal(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update goal",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/goals/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Success",
        description: "Goal deleted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GoalFormValues) => {
    if (editingGoal) {
      updateMutation.mutate({ ...data, id: editingGoal.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditClick = (goal: Goal) => {
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingGoal(null);
      form.reset();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-chart-3 text-white",
      completed: "bg-chart-4 text-white",
      overdue: "bg-chart-1 text-white",
    };
    return <Badge className={variants[status] || ""}>{status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-chart-4" />;
      case "overdue":
        return <AlertCircle className="h-5 w-5 text-chart-1" />;
      default:
        return <Clock className="h-5 w-5 text-chart-3" />;
    }
  };

  const calculateProgress = (goal: Goal): number => {
    if (goal.currentValue === null || goal.startValue === null) return 0;
    
    // Handle edge case where start equals target (goal already achieved)
    if (goal.startValue === goal.targetValue) return 100;
    
    const metricConfig = METRIC_OPTIONS.find(m => m.value === goal.metricType);
    const isDecreaseGoal = metricConfig?.decreaseGoal || false;
    
    // For decrease goals (weight loss, lower cholesterol, etc.)
    if (isDecreaseGoal) {
      // If startValue > target, we want to decrease
      if (goal.startValue > goal.targetValue) {
        const totalChange = goal.startValue - goal.targetValue;
        const currentChange = goal.startValue - goal.currentValue;
        const progress = (currentChange / totalChange) * 100;
        return Math.min(Math.max(progress, 0), 100);
      }
    }
    
    // For increase goals (more steps, better sleep, etc.)
    else {
      // If startValue < target, we want to increase
      if (goal.startValue < goal.targetValue) {
        const totalChange = goal.targetValue - goal.startValue;
        const currentChange = goal.currentValue - goal.startValue;
        const progress = (currentChange / totalChange) * 100;
        return Math.min(Math.max(progress, 0), 100);
      }
    }
    
    return 0;
  };

  const getMetricLabel = (metricType: string) => {
    return METRIC_OPTIONS.find(m => m.value === metricType)?.label || metricType;
  };

  const getMetricUnit = (metricType: string) => {
    return METRIC_OPTIONS.find(m => m.value === metricType)?.unit || "";
  };

  const activeGoals = goals?.filter(g => g.status === "active") || [];
  const completedGoals = goals?.filter(g => g.status === "completed") || [];
  const overdueGoals = goals?.filter(g => g.status === "overdue") || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Health Goals</h1>
          <p className="text-muted-foreground mt-2">
            Let AI help you set personalized health goals, or create them manually
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/chat">
            <Button className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 no-default-hover-elevate" data-testid="button-chat-ai">
              <Sparkles className="mr-2 h-4 w-4" />
              Chat with AI
            </Button>
          </Link>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-create-goal">
                <Plus className="mr-2 h-4 w-4" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
              <DialogDescription>
                Set a target value and deadline for your health metric
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="metricType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metric Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-metric-type">
                            <SelectValue placeholder="Select a metric" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {METRIC_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Enter target value"
                          {...field}
                          data-testid="input-target"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Value (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Enter starting baseline"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-start"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Enter current value"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-current"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-deadline"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                    data-testid="button-cancel-goal"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-goal"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingGoal ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      editingGoal ? "Update Goal" : "Create Goal"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-chart-3" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeGoals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-chart-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedGoals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-chart-1" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overdueGoals.length}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-6">Your Goals</h2>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : goals && goals.length > 0 ? (
          <div className="grid gap-4">
            {goals.map((goal) => (
              <Card key={goal.id} data-testid={`card-goal-${goal.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(goal.status)}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold">{getMetricLabel(goal.metricType)}</h3>
                              {goal.createdByAI === 1 && (
                                <Badge className="bg-gradient-to-r from-purple-600 to-purple-500 text-white border-0" data-testid={`badge-ai-${goal.id}`}>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Target: {goal.targetValue} {getMetricUnit(goal.metricType)}
                              {goal.startValue !== null && ` (from ${goal.startValue} ${getMetricUnit(goal.metricType)})`}
                            </p>
                          </div>
                          {getStatusBadge(goal.status)}
                        </div>

                        {goal.currentValue !== null && goal.startValue !== null && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium" data-testid={`text-progress-${goal.id}`}>
                                {goal.currentValue} / {goal.targetValue} {getMetricUnit(goal.metricType)} ({calculateProgress(goal).toFixed(0)}%)
                              </span>
                            </div>
                            <Progress value={calculateProgress(goal)} className="h-2" />
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Deadline: {format(new Date(goal.deadline), "MMM dd, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(goal)}
                        data-testid={`button-edit-${goal.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(goal.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${goal.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Goals Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your health journey by creating your first goal
              </p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-goal">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
