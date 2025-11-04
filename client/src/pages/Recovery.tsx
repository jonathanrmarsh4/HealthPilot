import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecoveryProtocols } from "@/components/RecoveryProtocols";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, HeartPulse, Activity, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

interface ReadinessScore {
  overall: number;
  factors: {
    sleep: { score: number; weight: number };
    hrv: { score: number; weight: number };
    restingHR: { score: number; weight: number };
    workloadRecovery: { score: number; weight: number };
  };
}

export default function Recovery() {
  const { data: readinessScore, isLoading } = useQuery<ReadinessScore>({
    queryKey: ["/api/readiness/score"],
  });

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

      {/* Recovery Protocols */}
      <RecoveryProtocols />

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
