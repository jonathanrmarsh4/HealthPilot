import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Info } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface SleepStage {
  name: string;
  minutes: number;
  percentage: number;
  color: string;
  description: string;
}

interface SleepStagesChartProps {
  awakeMinutes: number;
  lightMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  totalMinutes: number;
}

export function SleepStagesChart({ 
  awakeMinutes, 
  lightMinutes, 
  deepMinutes, 
  remMinutes,
  totalMinutes
}: SleepStagesChartProps) {
  const stages: SleepStage[] = [
    {
      name: "Awake",
      minutes: awakeMinutes,
      percentage: totalMinutes > 0 ? (awakeMinutes / totalMinutes) * 100 : 0,
      color: "#ef4444",
      description: "Time spent awake during the night"
    },
    {
      name: "Light",
      minutes: lightMinutes,
      percentage: totalMinutes > 0 ? (lightMinutes / totalMinutes) * 100 : 0,
      color: "#60a5fa",
      description: "Light sleep - the transition between wakefulness and deeper sleep"
    },
    {
      name: "Deep",
      minutes: deepMinutes,
      percentage: totalMinutes > 0 ? (deepMinutes / totalMinutes) * 100 : 0,
      color: "#3b82f6",
      description: "Deep sleep - supports physical recovery and immune function"
    },
    {
      name: "REM",
      minutes: remMinutes,
      percentage: totalMinutes > 0 ? (remMinutes / totalMinutes) * 100 : 0,
      color: "#8b5cf6",
      description: "REM sleep - important for memory consolidation and learning"
    }
  ];

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <Card data-testid="card-sleep-stages">
      <CardHeader>
        <CardTitle>Sleep Stages</CardTitle>
        <CardDescription>Previous night's sleep breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="name" 
                className="text-xs text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                className="text-xs text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string, props: any) => [
                  `${formatTime(value)} (${props.payload.percentage.toFixed(0)}%)`,
                  props.payload.name
                ]}
              />
              <Bar dataKey="minutes" radius={[8, 8, 0, 0]}>
                {stages.map((stage, index) => (
                  <Cell key={`cell-${index}`} fill={stage.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {stages.map((stage) => (
            <div key={stage.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: stage.color }}
              />
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div className="flex items-center gap-1 cursor-help">
                    <span className="text-sm font-medium">{stage.name}</span>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">{stage.name} Sleep</h4>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Time: </span>
                        <span className="font-medium" data-testid={`text-${stage.name.toLowerCase()}-time`}>
                          {formatTime(stage.minutes)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Percent: </span>
                        <span className="font-medium">{stage.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
