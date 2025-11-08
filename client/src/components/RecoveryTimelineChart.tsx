import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineEvent } from "@/types/recovery";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceDot
} from "recharts";
import { format, parseISO } from "date-fns";

interface RecoveryTimelineChartProps {
  timeline: TimelineEvent[];
  isLoading?: boolean;
}

export function RecoveryTimelineChart({ timeline, isLoading }: RecoveryTimelineChartProps) {
  if (isLoading) {
    return (
      <div className="w-full h-80" data-testid="recovery-timeline-loading">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  const chartData = timeline.map((event) => ({
    date: format(parseISO(event.date), "MMM dd"),
    fullDate: event.date,
    score: Math.round(event.systemicScore),
    events: event.events || [],
  }));

  const CustomTooltip = ({ active, payload, label }: { 
    active?: boolean; 
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="p-3 shadow-lg">
          <CardContent className="p-0 space-y-2">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-sm">
              <span className="text-muted-foreground">Recovery Score: </span>
              <span className="font-semibold">{data.score}</span>
            </p>
            {data.events && data.events.length > 0 && (
              <div className="pt-2 border-t space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Events:</p>
                {data.events.map((event: { type?: string; name?: string; time?: string }, idx: number) => (
                  <p key={idx} className="text-xs">
                    <span className="capitalize">{event.type}: </span>
                    <span className="font-medium">{event.name}</span>
                    {event.time && <span className="text-muted-foreground"> at {event.time}</span>}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80" data-testid="recovery-timeline-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 100]} 
            className="text-xs"
            tick={{ fontSize: 12 }}
            label={{ value: 'Recovery Score', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name="Systemic Recovery"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          {chartData.map((item, index) => 
            item.events && item.events.length > 0 ? (
              <ReferenceDot
                key={index}
                x={item.date}
                y={item.score}
                r={6}
                fill="hsl(var(--destructive))"
                stroke="none"
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
