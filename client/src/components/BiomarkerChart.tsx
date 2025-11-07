import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, parseISO } from "date-fns";

interface BiomarkerChartProps {
  title: string;
  description?: string;
  data: Array<{ date: string; value: number; target?: number }>;
  unit: string;
  color?: string;
  domain?: [number, number];
  referenceRange?: {
    low: number;
    high: number;
  };
}

export function BiomarkerChart({ 
  title, 
  description, 
  data, 
  unit,
  color = "hsl(var(--chart-1))",
  domain,
  referenceRange
}: BiomarkerChartProps) {
  const formatXAxis = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'MMM');
    } catch {
      return dateStr;
    }
  };

  return (
    <Card data-testid={`chart-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex flex-col gap-1">
          {description && <CardDescription>{description}</CardDescription>}
          {referenceRange && (
            <CardDescription data-testid={`reference-range-${title.toLowerCase().replace(/\s/g, "-")}`}>
              Reference range: {referenceRange.low.toFixed(1)} - {referenceRange.high.toFixed(1)} {unit}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="date" 
                className="text-xs text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={formatXAxis}
              />
              <YAxis 
                className="text-xs text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                label={{ value: unit, angle: -90, position: 'insideLeft', fill: "hsl(var(--muted-foreground))" }}
                domain={domain}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              {data.some(d => d.target) && (
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="hsl(var(--chart-4))" 
                  strokeDasharray="5 5"
                  dot={false}
                  name="Target"
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
                name={title}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
