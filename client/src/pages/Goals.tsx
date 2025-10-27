import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Target,
  Plus,
  Trash2,
  Calendar,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { GoalForm } from "@/components/goals/GoalForm";
import { getMetric } from "@/lib/metrics/registry";

interface Goal {
  id: string;
  userId: string;
  metricType: string;
  targetValue: number | null;
  targetValueData?: any;
  currentValue: number | null;
  currentValueData?: any;
  startValue: number | null;
  startValueData?: any;
  deadline: string;
  unit: string;
  status: "active" | "completed" | "overdue";
  createdByAI: number;
  createdAt: string;
}

export default function Goals() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/goals", data);
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
    mutationFn: async (data: any & { id: string }) => {
      const { id, ...payload } = data;
      const res = await apiRequest("PATCH", `/api/goals/${id}`, payload);
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

  const handleFormSubmit = (data: any) => {
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

  const getValue = (goal: Goal, field: "targetValue" | "currentValue" | "startValue") => {
    const dataField = `${field}Data` as keyof Goal;
    const simpleField = field as keyof Goal;
    const dataValue = goal[dataField];
    const simpleValue = goal[simpleField];
    
    // Return complex value if exists, otherwise simple value
    return dataValue !== null && dataValue !== undefined ? dataValue : simpleValue;
  };

  const calculateProgress = (goal: Goal): number => {
    const currentValue = getValue(goal, "currentValue");
    const startValue = getValue(goal, "startValue");
    const targetValue = getValue(goal, "targetValue");

    if (currentValue === null || startValue === null) return 0;

    // For complex values (pairs, multi), use first field for progress
    const extractNumeric = (val: any): number | null => {
      if (typeof val === "number") return val;
      if (typeof val === "object" && val !== null) {
        const firstKey = Object.keys(val)[0];
        return firstKey ? Number(val[firstKey]) : null;
      }
      return null;
    };

    const current = extractNumeric(currentValue);
    const start = extractNumeric(startValue);
    const target = extractNumeric(targetValue);

    if (current === null || start === null || target === null) return 0;

    // Handle edge case where start equals target
    if (start === target) return 100;

    // Get metric to determine if it's a decrease or increase goal
    const metric = getMetric(goal.metricType);
    // Most health metrics are decrease goals (lower is better)
    const isDecreaseGoal = ["blood-pressure", "blood-glucose", "cholesterol", "weight", "body-fat-percentage", "heart-rate"].includes(goal.metricType);

    if (isDecreaseGoal && start > target) {
      const totalChange = start - target;
      const currentChange = start - current;
      const progress = (currentChange / totalChange) * 100;
      return Math.min(Math.max(progress, 0), 100);
    } else if (!isDecreaseGoal && start < target) {
      const totalChange = target - start;
      const currentChange = current - start;
      const progress = (currentChange / totalChange) * 100;
      return Math.min(Math.max(progress, 0), 100);
    }

    return 0;
  };

  const getMetricLabel = (metricType: string) => {
    const metric = getMetric(metricType);
    return metric?.label || metricType;
  };

  const getMetricUnit = (metricType: string) => {
    const metric = getMetric(metricType);
    return metric?.unit || "";
  };

  const formatValue = (value: any, metricType: string): string => {
    const metric = getMetric(metricType);
    
    if (value === null || value === undefined) return "—";
    
    if (typeof value === "number") {
      const decimals = metric?.format?.decimals ?? 1;
      return value.toFixed(decimals);
    }
    
    if (typeof value === "object" && value !== null) {
      // Format pair values (e.g., blood pressure)
      if (value.systolic !== undefined && value.diastolic !== undefined) {
        return `${value.systolic}/${value.diastolic}`;
      }
      // Format multi values
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${val}`)
        .join(", ");
    }
    
    return String(value);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-goals">
              <Target className="h-8 w-8" />
              Health Goals
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your health and fitness progress
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              asChild
              className="gap-2"
              data-testid="button-ai-suggestions"
            >
              <Link href="/chat?context=goals">
                <Sparkles className="h-4 w-4" />
                AI Suggestions
              </Link>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-create-goal">
                  <Plus className="h-4 w-4" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingGoal ? "Edit Goal" : "Create New Goal"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingGoal
                      ? "Update your health goal"
                      : "Set a new health goal to track your progress"}
                  </DialogDescription>
                </DialogHeader>
                <GoalForm
                  goal={editingGoal}
                  onSubmit={handleFormSubmit}
                  isPending={createMutation.isPending || updateMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Goals List */}
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : goals && goals.length > 0 ? (
          <div className="grid gap-4">
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              return (
                <Card key={goal.id} className="overflow-hidden" data-testid={`card-goal-${goal.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(goal.status)}
                          <CardTitle className="text-lg" data-testid={`title-goal-${goal.id}`}>
                            {getMetricLabel(goal.metricType)}
                          </CardTitle>
                          {getStatusBadge(goal.status)}
                          {goal.createdByAI === 1 && (
                            <Badge variant="outline" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              AI
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          Deadline: {format(new Date(goal.deadline), "MMM dd, yyyy")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(goal)}
                          data-testid={`button-edit-goal-${goal.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(goal.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-goal-${goal.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium" data-testid={`progress-${goal.id}`}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Values */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Start</div>
                        <div className="font-medium" data-testid={`start-value-${goal.id}`}>
                          {formatValue(getValue(goal, "startValue"), goal.metricType)} {getMetricUnit(goal.metricType)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Current</div>
                        <div className="font-medium" data-testid={`current-value-${goal.id}`}>
                          {formatValue(getValue(goal, "currentValue"), goal.metricType)} {getMetricUnit(goal.metricType)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Target</div>
                        <div className="font-medium text-chart-3" data-testid={`target-value-${goal.id}`}>
                          {formatValue(getValue(goal, "targetValue"), goal.metricType)} {getMetricUnit(goal.metricType)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Target className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Set your first health goal to start tracking your progress. The AI can also suggest goals based on your health data.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-goal">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/chat?context=goals">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Ask AI for Help
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
