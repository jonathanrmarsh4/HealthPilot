import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Dumbbell,
  Apple,
  Pill
} from "lucide-react";
import { format } from "date-fns";

interface GoalMetric {
  id: string;
  goalId: string;
  metricKey: string;
  label: string;
  targetValue: string | null;
  unit: string | null;
  source: string;
  direction: 'increase' | 'decrease' | 'maintain' | 'achieve';
  baselineValue: string | null;
  currentValue: string | null;
  confidence: number | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'achieved' | 'skipped';
  progressPct: number;
}

interface GoalPlan {
  id: string;
  goalId: string;
  planType: 'training' | 'nutrition' | 'supplement' | 'habit' | 'recovery';
  frequencyPerWeek: number | null;
  contentJson: any;
  generatedBy: 'ai' | 'user' | 'template';
  createdAt: string;
  updatedAt: string;
}

interface PlanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalTitle: string;
  metrics: GoalMetric[];
  milestones: GoalMilestone[];
  plans: GoalPlan[];
}

export function PlanDetailsDialog({
  open,
  onOpenChange,
  goalTitle,
  metrics,
  milestones,
  plans
}: PlanDetailsDialogProps) {
  const getPlanIcon = (type: string) => {
    switch (type) {
      case 'training': return <Dumbbell className="h-4 w-4" />;
      case 'nutrition': return <Apple className="h-4 w-4" />;
      case 'supplement': return <Pill className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const calculateMetricProgress = (metric: GoalMetric) => {
    const current = metric.currentValue ? parseFloat(metric.currentValue) : null;
    const target = metric.targetValue ? parseFloat(metric.targetValue) : null;
    const baseline = metric.baselineValue ? parseFloat(metric.baselineValue) : null;

    if (current === null || target === null) return 0;

    let progress = 0;
    if (metric.direction === 'decrease') {
      const start = baseline ?? current;
      const totalChange = start - target;
      const currentChange = start - current;
      progress = totalChange > 0 ? (currentChange / totalChange) * 100 : 0;
    } else if (metric.direction === 'increase') {
      const start = baseline ?? 0;
      const totalChange = target - start;
      const currentChange = current - start;
      progress = totalChange > 0 ? (currentChange / totalChange) * 100 : 0;
    } else if (metric.direction === 'achieve') {
      progress = current >= target ? 100 : 0;
    } else if (metric.direction === 'maintain') {
      const tolerance = target * 0.1;
      progress = Math.abs(current - target) <= tolerance ? 100 : 0;
    }

    return Math.min(Math.max(progress, 0), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-plan-details">
        <DialogHeader>
          <DialogTitle className="text-2xl">{goalTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metrics Section */}
          {metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.map((metric) => {
                  const progress = calculateMetricProgress(metric);
                  return (
                    <div key={metric.id} className="space-y-2" data-testid={`metric-detail-${metric.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{metric.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Source: {metric.source} • Priority: {metric.priority}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {metric.currentValue || '--'} / {metric.targetValue} {metric.unit}
                        </Badge>
                      </div>
                      <Progress value={progress} className="h-2" data-testid={`progress-${metric.id}`} />
                      <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Milestones Section */}
          {milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      data-testid={`milestone-detail-${milestone.id}`}
                    >
                      {getStatusIcon(milestone.status)}
                      <div className="flex-1">
                        <p className="font-medium">{milestone.title}</p>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {milestone.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {milestone.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plans Section */}
          {plans.length > 0 && (
            <div className="space-y-4">
              {plans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 capitalize">
                      {getPlanIcon(plan.planType)}
                      {plan.planType} Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.frequencyPerWeek && (
                      <p className="text-sm">
                        <span className="font-medium">Frequency:</span> {plan.frequencyPerWeek}x per week
                      </p>
                    )}

                    {/* Training Plan Details */}
                    {plan.planType === 'training' && plan.contentJson?.weekly_structure && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Weekly Structure:</p>
                        <div className="grid gap-2">
                          {Object.entries(plan.contentJson.weekly_structure).map(([day, workout]: [string, any]) => (
                            <div key={day} className="p-2 rounded-md bg-muted/50 text-sm">
                              <span className="font-medium capitalize">{day}:</span>{' '}
                              {workout.type === 'rest' ? (
                                <span className="text-muted-foreground">Rest Day</span>
                              ) : (
                                <span>{workout.description || workout.type}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nutrition Plan Details */}
                    {plan.planType === 'nutrition' && plan.contentJson?.daily_targets && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Daily Targets:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.entries(plan.contentJson.daily_targets).map(([key, value]: [string, any]) => (
                            <div key={key} className="p-2 rounded-md bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground capitalize">{key}</p>
                              <p className="font-medium">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Safety Notes */}
                    {(plan.contentJson?.safety_notes || plan.contentJson?.safety_warnings) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          Safety Guidelines
                        </div>
                        <div className="space-y-1">
                          {[...(plan.contentJson.safety_notes || []), ...(plan.contentJson.safety_warnings || [])].map((note, idx) => (
                            <p key={idx} className="text-sm text-muted-foreground">
                              • {note}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {metrics.length === 0 && milestones.length === 0 && plans.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No plan details available yet</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
