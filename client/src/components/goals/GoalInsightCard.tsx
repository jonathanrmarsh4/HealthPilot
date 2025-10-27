import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Activity,
  Calendar,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { PlanDetailsDialog } from "./PlanDetailsDialog";
import { useQuery } from "@tanstack/react-query";

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

interface Goal {
  id: string;
  userId: string;
  canonicalGoalType?: string;
  inputText?: string;
  goalEntitiesJson?: any;
  targetDate?: string | null;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  createdByAI: number;
  createdAt: string;
  
  // Legacy fields
  metricType?: string;
  targetValue?: number | null;
  currentValue?: number | null;
  deadline?: string;
  unit?: string;
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

interface GoalInsightCardProps {
  goal: Goal;
  metrics?: GoalMetric[];
  milestones?: GoalMilestone[];
  safetyWarnings?: string[];
  onClick?: () => void;
  compact?: boolean;
}

export function GoalInsightCard({ 
  goal, 
  metrics = [], 
  milestones = [],
  safetyWarnings = [],
  onClick,
  compact = false
}: GoalInsightCardProps) {
  const isV2Goal = !!goal.canonicalGoalType;
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  // Fetch plans when dialog opens
  const { data: plans = [] } = useQuery<GoalPlan[]>({
    queryKey: ['/api/goals', goal.id, 'plans'],
    enabled: showPlanDialog && isV2Goal,
  });

  // Calculate overall progress
  const calculateProgress = () => {
    if (isV2Goal && metrics.length > 0) {
      // Weighted average of metric progress using priority (1=highest weight)
      let totalWeight = 0;
      let weightedProgress = 0;
      
      metrics.forEach((m) => {
        // Parse string values to numbers
        const current = m.currentValue ? parseFloat(m.currentValue) : null;
        const target = m.targetValue ? parseFloat(m.targetValue) : null;
        const baseline = m.baselineValue ? parseFloat(m.baselineValue) : null;
        
        // Skip metrics with missing values
        if (current === null || target === null) return;
        
        // Calculate progress based on direction from schema
        let metricProgress = 0;
        
        if (m.direction === 'decrease') {
          // For decrease metrics: progress = (baseline - current) / (baseline - target)
          const start = baseline ?? current; // Use baseline if available, otherwise current
          const totalChange = start - target;
          const currentChange = start - current;
          metricProgress = totalChange > 0 ? (currentChange / totalChange) * 100 : 0;
        } else if (m.direction === 'increase') {
          // For increase metrics: progress = (current - baseline) / (target - baseline)
          const start = baseline ?? 0; // Use baseline if available, otherwise 0
          const totalChange = target - start;
          const currentChange = current - start;
          metricProgress = totalChange > 0 ? (currentChange / totalChange) * 100 : 0;
        } else if (m.direction === 'achieve') {
          // For achievement metrics: either 0% or 100%
          metricProgress = current >= target ? 100 : 0;
        } else if (m.direction === 'maintain') {
          // For maintain metrics: check if within acceptable range (±10%)
          const tolerance = target * 0.1;
          metricProgress = Math.abs(current - target) <= tolerance ? 100 : 0;
        }
        
        // Clamp between 0-100
        metricProgress = Math.min(Math.max(metricProgress, 0), 100);
        
        // Only add weight for metrics that contribute to progress
        const weight = Math.max(1, Math.min(3, 4 - m.priority)); // Clamp priority to 1-3, giving weights 3-1
        totalWeight += weight;
        weightedProgress += (metricProgress * weight);
      });
      
      return totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
    }
    
    // Legacy goal progress (simple ratio, doesn't handle direction properly)
    if (goal.currentValue !== null && goal.currentValue !== undefined && 
        goal.targetValue !== null && goal.targetValue !== undefined) {
      return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
    }
    
    return 0;
  };

  const progress = calculateProgress();

  // Get goal type display
  const getGoalTypeDisplay = () => {
    if (!isV2Goal) return goal.metricType?.replace(/_/g, ' ').toUpperCase();
    
    const typeMap: Record<string, { label: string; icon: typeof Target }> = {
      endurance_event: { label: 'Endurance Event', icon: Activity },
      body_comp: { label: 'Body Composition', icon: TrendingUp },
      strength: { label: 'Strength', icon: Target },
      health_marker: { label: 'Health Marker', icon: Activity },
      habit: { label: 'Habit', icon: CheckCircle2 },
      hybrid: { label: 'Multi-Goal', icon: Target },
    };
    
    return typeMap[goal.canonicalGoalType || '']?.label || goal.canonicalGoalType;
  };

  // Get next milestone
  const nextMilestone = milestones
    .filter(m => m.status === 'pending' || m.status === 'in_progress')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const hasRisks = safetyWarnings.length > 0;

  if (compact) {
    return (
      <Card 
        className="hover-elevate cursor-pointer transition-all" 
        onClick={onClick}
        data-testid={`goal-card-${goal.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs" data-testid={`goal-type-${goal.id}`}>
                  {getGoalTypeDisplay()}
                </Badge>
                {hasRisks && (
                  <AlertTriangle className="h-4 w-4 text-destructive" data-testid={`goal-risk-${goal.id}`} />
                )}
              </div>
              <p className="font-medium text-sm line-clamp-1" data-testid={`goal-title-${goal.id}`}>
                {isV2Goal ? goal.inputText : `${goal.metricType} Goal`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={progress} className="h-1.5" data-testid={`goal-progress-${goal.id}`} />
                <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`goal-progress-text-${goal.id}`}>
                  {progress}%
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="hover-elevate cursor-pointer transition-all" 
      onClick={onClick}
      data-testid={`goal-card-${goal.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" data-testid={`goal-type-${goal.id}`}>
                {getGoalTypeDisplay()}
              </Badge>
              {goal.status === 'active' && (
                <Badge variant="secondary" data-testid={`goal-status-${goal.id}`}>Active</Badge>
              )}
              {hasRisks && (
                <Badge variant="destructive" className="gap-1" data-testid={`goal-risk-badge-${goal.id}`}>
                  <AlertTriangle className="h-3 w-3" />
                  Risk Alert
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl line-clamp-2" data-testid={`goal-title-${goal.id}`}>
              {isV2Goal ? goal.inputText : `Reach ${goal.targetValue} ${goal.unit}`}
            </CardTitle>
            {goal.targetDate && (
              <CardDescription className="flex items-center gap-1 mt-2" data-testid={`goal-deadline-${goal.id}`}>
                <Calendar className="h-3 w-3" />
                Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}
              </CardDescription>
            )}
          </div>
          
          {/* Progress Ring */}
          <div className="flex flex-col items-center" data-testid={`goal-progress-ring-${goal.id}`}>
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                  className="text-primary transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold" data-testid={`goal-progress-pct-${goal.id}`}>
                  {progress}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        {isV2Goal && metrics.length > 0 && (
          <div className="space-y-2" data-testid={`goal-metrics-${goal.id}`}>
            <h4 className="text-sm font-medium">Key Metrics</h4>
            <div className="grid grid-cols-2 gap-2">
              {metrics.slice(0, 4).map((metric) => {
                const current = metric.currentValue ? parseFloat(metric.currentValue).toFixed(1) : '--';
                const target = metric.targetValue ? parseFloat(metric.targetValue).toFixed(1) : '?';
                return (
                  <div 
                    key={metric.id} 
                    className="flex flex-col p-2 rounded-md bg-muted/50"
                    data-testid={`metric-${metric.metricKey}-${goal.id}`}
                  >
                    <span className="text-xs text-muted-foreground">
                      {metric.label}
                    </span>
                    <span className="text-sm font-medium">
                      {current} / {target} {metric.unit || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Milestone */}
        {nextMilestone && (
          <div className="space-y-2" data-testid={`goal-next-milestone-${goal.id}`}>
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Next Milestone
            </h4>
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium" data-testid={`milestone-title-${nextMilestone.id}`}>
                  {nextMilestone.title}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`milestone-date-${nextMilestone.id}`}>
                  Due {format(new Date(nextMilestone.dueDate), 'MMM d')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Risk Alerts */}
        {hasRisks && (
          <div className="space-y-2" data-testid={`goal-risks-${goal.id}`}>
            <h4 className="text-sm font-medium text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Safety Alerts
            </h4>
            <div className="space-y-1">
              {safetyWarnings.slice(0, 2).map((warning, idx) => (
                <p key={idx} className="text-xs text-muted-foreground" data-testid={`risk-warning-${idx}-${goal.id}`}>
                  • {warning}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* View Details Button */}
        <Button 
          variant="ghost" 
          className="w-full justify-between" 
          size="sm"
          onClick={() => setShowPlanDialog(true)}
          data-testid={`button-view-details-${goal.id}`}
        >
          View Full Plan
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>

      {/* Plan Details Dialog */}
      {isV2Goal && (
        <PlanDetailsDialog
          open={showPlanDialog}
          onOpenChange={setShowPlanDialog}
          goalTitle={goal.inputText || goal.canonicalGoalType || 'Goal Details'}
          metrics={metrics}
          milestones={milestones}
          plans={plans}
        />
      )}
    </Card>
  );
}
