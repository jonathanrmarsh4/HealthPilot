import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface QuickStatsProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendDirection?: "up" | "down";
}

export function QuickStats({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection,
}: QuickStatsProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend && (
                <span
                  className={`text-xs font-medium ${
                    trendDirection === "up"
                      ? "text-chart-4"
                      : trendDirection === "down"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {trend}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
