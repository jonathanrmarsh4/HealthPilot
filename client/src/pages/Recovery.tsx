import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecoveryProtocols } from "@/components/RecoveryProtocols";
import { RecommendationCalendar } from "@/components/RecommendationCalendar";
import { MuscleRecoveryGrid } from "@/components/MuscleRecoveryGrid";
import { RecoveryTimelineChart } from "@/components/RecoveryTimelineChart";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles, HeartPulse, Activity, TrendingUp, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RecoveryState, TimelineEvent } from "@/types/recovery";

interface ReadinessScore {
  overall: number;
  factors: {
    sleep: { score: number; weight: number };
    hrv: { score: number; weight: number };
    restingHR: { score: number; weight: number };
    workloadRecovery: { score: number; weight: number };
  };
}

interface RecoverySession {
  id: string;
  userId: string;
  day: string;
  workoutType: string;
  sessionType: string;
  duration: number;
  intensity: string;
  description?: string;
  exercises: any[];
  isOptional: number;
  coreProgram: number;
  scheduledFor: string;
  completed: number;
  completedAt?: string;
  createdAt: string;
}

export default function Recovery() {
  const { toast } = useToast();
  
  const { data: readinessScore, isLoading } = useQuery<ReadinessScore>({
    queryKey: ["/api/training/readiness"],
  });

  const { data: scheduledSessions = [], isLoading: isLoadingSessions } = useQuery<RecoverySession[]>({
    queryKey: ["/api/recovery/scheduled"],
  });

  const { data: recoveryState, isLoading: isLoadingRecoveryState } = useQuery<RecoveryState>({
    queryKey: ["/api/recovery/state"],
  });

  const { data: recoveryTimelineData, isLoading: isLoadingTimeline } = useQuery<{ events: TimelineEvent[], currentState: any }>({
    queryKey: ["/api/recovery/timeline"],
    queryFn: async () => {
      const response = await fetch("/api/recovery/timeline?days=7");
      if (!response.ok) throw new Error("Failed to fetch recovery timeline");
      return response.json();
    },
  });
  
  const recoveryTimeline = recoveryTimelineData?.events || [];

  const rescheduleSessionMutation = useMutation({
    mutationFn: async ({ sessionId, newDate }: { sessionId: string | number; newDate: Date }) => {
      return await apiRequest('PATCH', `/api/training-schedules/${sessionId}/schedule`, {
        scheduledFor: newDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recovery/scheduled'] });
      toast({
        title: "Session rescheduled",
        description: "Your recovery session has been moved to the new date.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule session",
        variant: "destructive",
      });
    },
  });

  const handleCompleteSession = async (id: string | number) => {
    await apiRequest('PATCH', `/api/training-schedules/${id}/complete`, { completed: true });
    queryClient.invalidateQueries({ queryKey: ['/api/recovery/scheduled'] });
  };

  const handleDeleteSession = async (id: string | number) => {
    // Mark session as completed, which removes it from the scheduled view
    // The API filters out completed sessions when fetching scheduled recovery
    await apiRequest('PATCH', `/api/training-schedules/${id}/complete`, { completed: true });
    queryClient.invalidateQueries({ queryKey: ['/api/recovery/scheduled'] });
  };

  const recoveryScore = readinessScore?.factors.workloadRecovery.score ?? 0;
  const overallReadiness = readinessScore?.overall ?? 0;

  const getRecoveryStatus = (score: number) => {
    if (score >= 80) return { text: "Excellent", color: "text-green-600 dark:text-green-400" };
    if (score >= 60) return { text: "Good", color: "text-blue-600 dark:text-blue-400" };
    if (score >= 40) return { text: "Moderate", color: "text-yellow-600 dark:text-yellow-400" };
    return { text: "Low", color: "text-red-600 dark:text-red-400" };
  };

  const status = getRecoveryStatus(recoveryScore);

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6" data-testid="page-recovery">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HeartPulse className="h-8 w-8 text-primary" />
          Recovery
        </h1>
        <p className="text-muted-foreground">
          Monitor your recovery status and follow personalized protocols to optimize your health
        </p>
      </div>

      {/* Recovery Status Overview */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card data-testid="card-recovery-status-loading">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Recovery Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
          <Card data-testid="card-readiness-overview-loading">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Overall Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card data-testid="card-recovery-status">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Recovery Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recovery Score</span>
                  <span className={`font-semibold ${status.color}`} data-testid="text-recovery-score">
                    {Math.round(recoveryScore)}/100
                  </span>
                </div>
                <Progress value={recoveryScore} className="h-2" data-testid="progress-recovery" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm">Status</span>
                <span className={`font-medium ${status.color}`} data-testid="text-recovery-status">
                  {status.text}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-readiness-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Overall Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Readiness Score</span>
                  <span className="font-semibold" data-testid="text-readiness-score">
                    {Math.round(overallReadiness)}/100
                  </span>
                </div>
                <Progress value={overallReadiness} className="h-2" data-testid="progress-readiness" />
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                asChild
                data-testid="button-view-full-readiness"
              >
                <Link href="/training">View Full Readiness Details</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Muscle Group Recovery */}
      <Card data-testid="card-muscle-group-recovery">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Muscle Group Recovery
          </CardTitle>
          <CardDescription>
            Track recovery status for each major muscle group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MuscleRecoveryGrid 
            muscleGroups={recoveryState?.muscleGroups || {
              chest: 0,
              back: 0,
              legs: 0,
              shoulders: 0,
              arms: 0,
              core: 0,
            }}
            isLoading={isLoadingRecoveryState}
          />
        </CardContent>
      </Card>

      {/* Recovery Timeline */}
      <Card data-testid="card-recovery-timeline">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recovery Timeline (7 Days)
          </CardTitle>
          <CardDescription>
            Your systemic recovery trend over the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecoveryTimelineChart 
            timeline={recoveryTimeline}
            isLoading={isLoadingTimeline}
          />
        </CardContent>
      </Card>

      {/* Recovery Protocols */}
      <RecoveryProtocols />

      {/* Recovery Calendar */}
      <div className="mt-6">
        <RecommendationCalendar
          recommendations={scheduledSessions.map(session => ({
            id: session.id,
            title: session.workoutType,
            scheduledAt: session.scheduledFor,
            type: 'recommendation' as const,
            description: session.description,
            category: session.sessionType,
            duration: session.duration,
          }))}
          onReschedule={(sessionId, newDate) => {
            rescheduleSessionMutation.mutate({ sessionId, newDate });
          }}
          onComplete={handleCompleteSession}
          onDelete={handleDeleteSession}
        />
      </div>

      {/* Quick Tips */}
      <Card data-testid="card-recovery-tips">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recovery Quick Tips
          </CardTitle>
          <CardDescription>
            Simple ways to enhance your recovery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Prioritize 7-9 hours of quality sleep each night</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Stay hydrated throughout the day (aim for 8+ glasses)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Include active recovery (light walking, stretching) on rest days</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Practice stress management techniques (meditation, deep breathing)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Consume adequate protein and nutrients to support tissue repair</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
