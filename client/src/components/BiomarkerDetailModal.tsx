import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/contexts/LocaleContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { unitConfigs, convertValue } from "@/lib/unitConversions";
import { formatDate } from "@/lib/timezone";
import { BiomarkerConfig } from "@/lib/biomarkerConfig";

interface ChartDataPoint {
  date: string;
  value: number;
  unit: string;
}

interface BiomarkerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  config: BiomarkerConfig;
}

export function BiomarkerDetailModal({ open, onOpenChange, type, config }: BiomarkerDetailModalProps) {
  const { unitSystem } = useLocale();
  const { timezone } = useTimezone();

  const { data: chartData, isLoading } = useQuery<ChartDataPoint[]>({
    queryKey: [`/api/biomarkers/chart/${type}?days=${config.days}`],
    enabled: open, // Only fetch when modal is open
  });

  // Convert data if needed for this biomarker type
  const convertedData = chartData?.map(point => {
    const biomarkerConfig = unitConfigs[type as keyof typeof unitConfigs];
    if (biomarkerConfig && biomarkerConfig.imperial && biomarkerConfig.metric) {
      const storedUnit = point.unit;
      const targetUnit = biomarkerConfig[unitSystem].unit;
      
      if (storedUnit !== targetUnit) {
        return {
          ...point,
          value: convertValue(point.value, type as any, storedUnit, targetUnit),
          unit: targetUnit,
        };
      }
    }
    return point;
  });

  const displayUnit = unitConfigs[type as keyof typeof unitConfigs]?.[unitSystem]?.unit || chartData?.[0]?.unit || "";

  // Convert reference range to display units
  const getConvertedReferenceRange = () => {
    if (!config.referenceRange) return null;
    
    const biomarkerConfig = unitConfigs[type as keyof typeof unitConfigs];
    if (biomarkerConfig && biomarkerConfig.imperial && biomarkerConfig.metric) {
      const imperialUnit = biomarkerConfig.imperial.unit;
      const targetUnit = biomarkerConfig[unitSystem].unit;
      
      // Convert reference ranges from imperial to display unit if needed
      if (imperialUnit !== targetUnit) {
        return {
          low: convertValue(config.referenceRange.low, type as any, imperialUnit, targetUnit),
          high: convertValue(config.referenceRange.high, type as any, imperialUnit, targetUnit),
        };
      }
    }
    
    return config.referenceRange;
  };

  const convertedReferenceRange = getConvertedReferenceRange();

  // Format chart data for Recharts
  const formattedData = convertedData?.map(point => ({
    date: new Date(point.date).getTime(),
    displayDate: formatDate(point.date, timezone, 'MMM d, yyyy'),
    value: point.value,
  })) || [];

  // Generate dynamic X-axis ticks (monthly intervals)
  const getMonthlyTicks = () => {
    if (formattedData.length === 0) return [];
    
    const minDate = Math.min(...formattedData.map(d => d.date));
    const maxDate = Math.max(...formattedData.map(d => d.date));
    
    const ticks: number[] = [];
    const startDate = new Date(minDate);
    startDate.setDate(1); // First day of month
    
    let currentDate = startDate.getTime();
    while (currentDate <= maxDate) {
      ticks.push(currentDate);
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      currentDate = nextMonth.getTime();
    }
    
    return ticks;
  };

  const monthlyTicks = getMonthlyTicks();

  // Format tick labels
  const formatTick = (timestamp: number) => {
    const date = new Date(timestamp);
    return formatDate(date.toISOString(), timezone, 'MMM yyyy');
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold">{data.displayDate}</p>
          <p className="text-lg font-bold text-primary">
            {data.value.toFixed(config.decimals || 1)} {displayUnit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="dialog-biomarker-detail">
        <DialogHeader>
          <DialogTitle className="text-2xl">{config.title}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="h-96">
            <Skeleton className="w-full h-full" />
          </div>
        ) : formattedData.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            No data available for this biomarker
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  
                  {/* Reference Range Area */}
                  {convertedReferenceRange && (
                    <ReferenceArea
                      y1={convertedReferenceRange.low}
                      y2={convertedReferenceRange.high}
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.1}
                      strokeOpacity={0.3}
                      data-testid="reference-range-area"
                    />
                  )}

                  {/* Reference Range Lines */}
                  {convertedReferenceRange && (
                    <>
                      <ReferenceLine
                        y={convertedReferenceRange.high}
                        stroke="hsl(var(--chart-2))"
                        strokeDasharray="3 3"
                        label={{ value: 'High', position: 'right', fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <ReferenceLine
                        y={convertedReferenceRange.low}
                        stroke="hsl(var(--chart-2))"
                        strokeDasharray="3 3"
                        label={{ value: 'Low', position: 'right', fill: 'hsl(var(--muted-foreground))' }}
                      />
                    </>
                  )}

                  <XAxis
                    dataKey="date"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    ticks={monthlyTicks}
                    tickFormatter={formatTick}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    className="text-xs"
                  />
                  
                  <YAxis
                    label={{ value: displayUnit, angle: -90, position: 'insideLeft' }}
                    className="text-xs"
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={config.color}
                    strokeWidth={3}
                    dot={{ r: 5, fill: config.color, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                    activeDot={{ r: 7 }}
                    data-testid="biomarker-trend-line"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Data Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold" data-testid="text-data-points">{formattedData.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latest Value</p>
                <p className="text-2xl font-bold" data-testid="text-latest-value">
                  {formattedData[formattedData.length - 1]?.value.toFixed(config.decimals || 1)} {displayUnit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">First Test</p>
                <p className="text-sm font-medium" data-testid="text-first-test-date">
                  {formattedData[0]?.displayDate}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latest Test</p>
                <p className="text-sm font-medium" data-testid="text-latest-test-date">
                  {formattedData[formattedData.length - 1]?.displayDate}
                </p>
              </div>
            </div>

            {convertedReferenceRange && (
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm font-semibold mb-2">Reference Range</p>
                <p className="text-sm text-muted-foreground" data-testid="text-reference-range">
                  {convertedReferenceRange.low.toFixed(config.decimals || 1)} - {convertedReferenceRange.high.toFixed(config.decimals || 1)} {displayUnit}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
