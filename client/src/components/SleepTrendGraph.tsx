import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { useState } from "react";

interface SleepSession {
  bedtime: string;
  totalMinutes: number;
  sleepScore?: number;
  deepMinutes?: number;
  remMinutes?: number;
}

interface SleepTrendGraphProps {
  sessions: SleepSession[];
  metric?: 'score' | 'duration' | 'deep' | 'rem';
}

export function SleepTrendGraph({ sessions, metric = 'score' }: SleepTrendGraphProps) {
  const [selectedMetric, setSelectedMetric] = useState<'score' | 'duration' | 'deep' | 'rem'>(metric);
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7);

  const getFilteredSessions = () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    return sessions.filter(s => new Date(s.bedtime) >= cutoffDate);
  };

  const filteredSessions = getFilteredSessions();

  const chartData = filteredSessions.map(session => {
    const date = new Date(session.bedtime);
    let value = 0;
    
    switch (selectedMetric) {
      case 'score':
        value = session.sleepScore || 0;
        break;
      case 'duration':
        value = session.totalMinutes / 60; // Convert to hours
        break;
      case 'deep':
        value = (session.deepMinutes || 0) / 60;
        break;
      case 'rem':
        value = (session.remMinutes || 0) / 60;
        break;
    }
    
    return {
      date: format(date, 'MMM dd'),
      value,
      fullDate: date,
    };
  }).sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

  const average = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length 
    : 0;

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'score': return 'Sleep Score';
      case 'duration': return 'Hours';
      case 'deep': return 'Deep Sleep (hrs)';
      case 'rem': return 'REM Sleep (hrs)';
    }
  };

  const getMetricColor = () => {
    switch (selectedMetric) {
      case 'score': return 'hsl(var(--chart-1))';
      case 'duration': return 'hsl(var(--chart-2))';
      case 'deep': return 'hsl(var(--chart-3))';
      case 'rem': return 'hsl(var(--chart-4))';
    }
  };

  return (
    <Card data-testid="card-sleep-trend">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle>Sleep Quality Trend</CardTitle>
            <CardDescription>Track your sleep patterns over time</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              <Button
                variant={timeRange === 7 ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(7)}
                data-testid="button-7-days"
              >
                7 days
              </Button>
              <Button
                variant={timeRange === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(30)}
                data-testid="button-30-days"
              >
                30 days
              </Button>
              <Button
                variant={timeRange === 90 ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(90)}
                data-testid="button-90-days"
              >
                90 days
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={selectedMetric === 'score' ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMetric('score')}
            data-testid="button-metric-score"
          >
            Sleep Score
          </Button>
          <Button
            variant={selectedMetric === 'duration' ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMetric('duration')}
            data-testid="button-metric-duration"
          >
            Duration
          </Button>
          <Button
            variant={selectedMetric === 'deep' ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMetric('deep')}
            data-testid="button-metric-deep"
          >
            Deep Sleep
          </Button>
          <Button
            variant={selectedMetric === 'rem' ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMetric('rem')}
            data-testid="button-metric-rem"
          >
            REM Sleep
          </Button>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="date" 
                className="text-xs text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                className="text-xs text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft', fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [
                  selectedMetric === 'score' ? value.toFixed(0) : value.toFixed(1),
                  getMetricLabel()
                ]}
              />
              <ReferenceLine 
                y={average} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: `Avg: ${average.toFixed(1)}`, position: 'right', fill: "hsl(var(--muted-foreground))" }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={getMetricColor()} 
                strokeWidth={2}
                dot={{ fill: getMetricColor(), r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Average {getMetricLabel()}: </span>
            {selectedMetric === 'score' ? average.toFixed(0) : `${average.toFixed(1)} hours`}
            {chartData.length > 0 && ` (${chartData.length} ${chartData.length === 1 ? 'night' : 'nights'})`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
