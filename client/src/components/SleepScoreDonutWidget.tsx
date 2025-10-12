import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Moon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

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

export function SleepScoreDonutWidget() {
  const { data: sleepStats, isLoading } = useQuery<SleepStats>({
    queryKey: ["/api/sleep/stats"],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-sleep-score">
        <CardHeader>
          <CardTitle>Sleep Score</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!sleepStats?.hasData || !sleepStats.lastNight) {
    return (
      <Card data-testid="card-sleep-score">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Sleep Score
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          No sleep data available
        </CardContent>
      </Card>
    );
  }

  const { lastNight } = sleepStats;
  const totalMinutes = lastNight.totalMinutes;
  
  const sleepData = [
    { 
      name: 'Deep', 
      value: lastNight.deepMinutes, 
      color: '#3b82f6',
      percentage: totalMinutes > 0 ? Math.round((lastNight.deepMinutes / totalMinutes) * 100) : 0
    },
    { 
      name: 'REM', 
      value: lastNight.remMinutes, 
      color: '#8b5cf6',
      percentage: totalMinutes > 0 ? Math.round((lastNight.remMinutes / totalMinutes) * 100) : 0
    },
    { 
      name: 'Light', 
      value: lastNight.lightMinutes, 
      color: '#06b6d4',
      percentage: totalMinutes > 0 ? Math.round((lastNight.lightMinutes / totalMinutes) * 100) : 0
    },
    { 
      name: 'Awake', 
      value: lastNight.awakeMinutes, 
      color: '#f59e0b',
      percentage: totalMinutes > 0 ? Math.round((lastNight.awakeMinutes / totalMinutes) * 100) : 0
    },
  ].filter(item => item.value > 0);

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const renderCustomLabel = (entry: any) => {
    return `${entry.name}: ${entry.percentage}%`;
  };

  return (
    <Card data-testid="card-sleep-score">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Sleep Score
          </div>
          <Badge variant={getScoreBadgeVariant(lastNight.sleepScore)} data-testid="badge-sleep-quality">
            {sleepStats.quality}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={sleepData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {sleepData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <text
                x="50%"
                y="45%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-3xl font-bold"
                data-testid="text-sleep-score"
              >
                {lastNight.sleepScore}
              </text>
              <text
                x="50%"
                y="60%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
              >
                out of 100
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Sleep</span>
            <span className="font-semibold" data-testid="text-total-sleep">
              {hours}h {minutes}m
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-2">
            {sleepData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium ml-auto" data-testid={`text-${item.name.toLowerCase()}-percentage`}>
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
