import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface SleepScoreCardProps {
  score: number;
  totalMinutes: number;
  quality: string;
  bedtime?: Date | string;
  waketime?: Date | string;
  deepMinutes?: number;
  remMinutes?: number;
}

export function SleepScoreCard({ 
  score, 
  totalMinutes, 
  quality, 
  bedtime, 
  waketime,
  deepMinutes = 0,
  remMinutes = 0
}: SleepScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700", label: "Excellent" };
    if (score >= 60) return { bg: "bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700", label: "Good" };
    return { bg: "bg-red-500 hover:bg-red-600", label: "Poor" };
  };

  const scoreColor = getScoreColor(score);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const deepHours = Math.floor(deepMinutes / 60);
  const deepMins = deepMinutes % 60;
  const remHours = Math.floor(remMinutes / 60);
  const remMins = remMinutes % 60;

  const getScoreExplanation = () => {
    const parts = [];
    parts.push(`${hours}h ${minutes}m of sleep`);
    
    if (deepMinutes > 0) {
      parts.push(`${deepHours}h ${deepMins}m Deep sleep`);
    }
    
    if (remMinutes > 0) {
      parts.push(`${remHours}h ${remMins}m REM`);
    }
    
    return `Your score of ${score} reflects ${parts.join(', ')}.`;
  };

  return (
    <Card className="hover-elevate" data-testid="card-sleep-score">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Sleep Score
            </CardTitle>
            <CardDescription>Last night's sleep quality</CardDescription>
          </div>
          <Badge className={scoreColor.bg} data-testid="badge-sleep-quality">
            {scoreColor.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold" data-testid="text-sleep-score">{score}</span>
          <span className="text-2xl text-muted-foreground">/100</span>
        </div>

        <p className="text-sm text-muted-foreground" data-testid="text-score-explanation">
          {getScoreExplanation()}
        </p>

        {bedtime && waketime && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Bedtime</p>
                <p className="font-medium" data-testid="text-bedtime">
                  {format(new Date(bedtime), 'h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Wake Time</p>
                <p className="font-medium" data-testid="text-waketime">
                  {format(new Date(waketime), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
