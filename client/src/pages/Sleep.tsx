import { useQuery } from "@tanstack/react-query";
import { SleepScoreCard } from "@/components/SleepScoreCard";
import { SleepStagesChart } from "@/components/SleepStagesChart";
import { SleepTrendGraph } from "@/components/SleepTrendGraph";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { TileManager, TileConfig } from "@/components/TileManager";

interface SleepStats {
  hasData: boolean;
  sleepScore: number;
  totalSleepMinutes: number;
  quality: string;
  lastNight: {
    bedtime: string;
    waketime: string;
    totalMinutes: number;
    awakeMinutes: number;
    lightMinutes: number;
    deepMinutes: number;
    remMinutes: number;
    sleepScore: number;
  } | null;
}

interface SleepSession {
  id: string;
  bedtime: string;
  waketime: string;
  totalMinutes: number;
  awakeMinutes: number;
  lightMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  sleepScore?: number;
}

export default function Sleep() {
  const { data: stats, isLoading: statsLoading } = useQuery<SleepStats>({
    queryKey: ["/api/sleep/stats"],
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<SleepSession[]>({
    queryKey: ["/api/sleep/sessions?days=90"],
  });

  if (statsLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Sleep Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your sleep patterns
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats?.hasData) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Sleep Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your sleep patterns
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Sleep Data Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connect your Apple HealthKit data using the Health Auto Export app to start tracking your sleep patterns.
              Visit the <a href="/apple-health" className="text-primary hover:underline">Apple Health</a> setup page to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { lastNight } = stats;

  // Define tiles for the Sleep page
  const tiles: TileConfig[] = [
    {
      id: "sleep-score",
      title: "Sleep Score",
      description: "Your sleep quality score and duration",
      renderTile: () => lastNight ? (
        <SleepScoreCard
          score={lastNight.sleepScore}
          totalMinutes={lastNight.totalMinutes}
          quality={stats.quality}
          bedtime={lastNight.bedtime}
          waketime={lastNight.waketime}
          deepMinutes={lastNight.deepMinutes}
          remMinutes={lastNight.remMinutes}
        />
      ) : null
    },
    {
      id: "sleep-stages",
      title: "Sleep Stages",
      description: "Breakdown of sleep phases",
      renderTile: () => lastNight ? (
        <SleepStagesChart
          awakeMinutes={lastNight.awakeMinutes}
          lightMinutes={lastNight.lightMinutes}
          deepMinutes={lastNight.deepMinutes}
          remMinutes={lastNight.remMinutes}
          totalMinutes={lastNight.totalMinutes}
        />
      ) : null
    },
    {
      id: "sleep-trends",
      title: "Sleep Trends",
      description: "90-day sleep pattern analysis",
      renderTile: () => {
        if (sessionsLoading) {
          return (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          );
        }
        
        if (sessions && sessions.length > 0) {
          return <SleepTrendGraph sessions={sessions} />;
        }
        
        return (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Not enough sleep data to show trends. Keep tracking your sleep to see patterns over time.
            </CardContent>
          </Card>
        );
      }
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Sleep Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track and analyze your sleep patterns
        </p>
      </div>

      <TileManager
        page="sleep"
        tiles={tiles}
        defaultVisible={["sleep-score", "sleep-stages", "sleep-trends"]}
      />
    </div>
  );
}
