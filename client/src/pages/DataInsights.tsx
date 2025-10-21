import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, BarChart3, ArrowRight, Loader2, Brain } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, subWeeks, subMonths } from "date-fns";

const BIOMARKER_OPTIONS = [
  { value: "weight", label: "Weight" },
  { value: "heart-rate", label: "Heart Rate" },
  { value: "blood-glucose", label: "Blood Glucose" },
  { value: "blood-pressure", label: "Blood Pressure" },
  { value: "body-fat", label: "Body Fat %" },
  { value: "cholesterol", label: "Cholesterol" },
  { value: "steps", label: "Daily Steps" },
  { value: "calories", label: "Calories Burned" },
];

const TIMEFRAME_OPTIONS = [
  { value: "2", label: "2 Weeks" },
  { value: "4", label: "4 Weeks" },
  { value: "8", label: "8 Weeks" },
  { value: "12", label: "12 Weeks" },
];

const COMPARISON_PRESETS = [
  { label: "This Week vs Last Week", period1Days: 7, period2Days: 14 },
  { label: "Last 30 Days vs Previous 30", period1Days: 30, period2Days: 60 },
  { label: "This Month vs Last Month", period1Days: 30, period2Days: 60 },
  { label: "Last Quarter vs Previous", period1Days: 90, period2Days: 180 },
];

export default function DataInsights() {
  const { toast } = useToast();
  
  // Trend prediction state
  const [trendBiomarker, setTrendBiomarker] = useState("weight");
  const [trendTimeframe, setTrendTimeframe] = useState("4");
  const [trendPrediction, setTrendPrediction] = useState<any>(null);
  
  // Period comparison state
  const [comparisonMetric, setComparisonMetric] = useState("weight");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [comparison, setComparison] = useState<any>(null);

  const trendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/insights/trend-predictions", {
        biomarkerType: trendBiomarker,
        timeframeWeeks: parseInt(trendTimeframe),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTrendPrediction(data);
      toast({
        title: "Prediction Generated",
        description: "AI has analyzed your biomarker trends successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate prediction",
        variant: "destructive",
      });
    },
  });

  const comparisonMutation = useMutation({
    mutationFn: async () => {
      const preset = COMPARISON_PRESETS[selectedPreset];
      const now = new Date();
      
      const period1End = now;
      const period1Start = subDays(now, preset.period1Days);
      const period2End = subDays(now, preset.period1Days);
      const period2Start = subDays(now, preset.period2Days);

      const res = await apiRequest("POST", "/api/insights/period-comparison", {
        metricType: comparisonMetric,
        period1Start: period1Start.toISOString(),
        period1End: period1End.toISOString(),
        period2Start: period2Start.toISOString(),
        period2End: period2End.toISOString(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setComparison(data);
      toast({
        title: "Comparison Complete",
        description: "Period analysis has been generated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate comparison",
        variant: "destructive",
      });
    },
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-5 w-5 text-chart-4" />;
      case "decreasing":
        return <TrendingDown className="h-5 w-5 text-chart-1" />;
      default:
        return <BarChart3 className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: "bg-chart-4 text-white",
      medium: "bg-chart-3 text-white",
      low: "bg-muted text-muted-foreground",
    };
    return <Badge className={colors[confidence as keyof typeof colors] || ""}>{confidence}</Badge>;
  };

  const getChangeIcon = (direction: string) => {
    switch (direction) {
      case "improved":
        return <TrendingUp className="h-5 w-5 text-chart-4" />;
      case "declined":
        return <TrendingDown className="h-5 w-5 text-chart-1" />;
      default:
        return <ArrowRight className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="trends" data-testid="tab-trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trend Predictions
          </TabsTrigger>
          <TabsTrigger value="compare" data-testid="tab-compare">
            <Calendar className="h-4 w-4 mr-2" />
            Period Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Trend Prediction
              </CardTitle>
              <CardDescription>
                Analyze historical data to forecast future biomarker values
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Biomarker</label>
                  <Select value={trendBiomarker} onValueChange={setTrendBiomarker}>
                    <SelectTrigger data-testid="select-trend-biomarker">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BIOMARKER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Prediction Timeframe</label>
                  <Select value={trendTimeframe} onValueChange={setTrendTimeframe}>
                    <SelectTrigger data-testid="select-timeframe">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => trendMutation.mutate()}
                disabled={trendMutation.isPending}
                className="w-full md:w-auto"
                data-testid="button-generate-prediction"
              >
                {trendMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Generate Prediction
                  </>
                )}
              </Button>

              {trendPrediction && (
                <div className="mt-6 p-6 border rounded-lg space-y-4 bg-card">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {getTrendIcon(trendPrediction.trend)}
                      <div>
                        <p className="text-sm text-muted-foreground">Trend Direction</p>
                        <p className="text-lg font-semibold capitalize">{trendPrediction.trend}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <div className="mt-1">{getConfidenceBadge(trendPrediction.confidence)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Predicted Value</p>
                      <p className="text-2xl font-bold" data-testid="text-predicted-value">
                        {trendPrediction.predictedValue.toFixed(1)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Expected Range</p>
                      <p className="text-2xl font-bold" data-testid="text-predicted-range">
                        {trendPrediction.predictedRange.min.toFixed(1)} - {trendPrediction.predictedRange.max.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium mb-2">AI Insight</p>
                      <p className="text-sm text-muted-foreground">{trendPrediction.insight}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Recommendation</p>
                      <p className="text-sm text-muted-foreground">{trendPrediction.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Period Comparison
              </CardTitle>
              <CardDescription>
                Compare health metrics across different time periods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Metric</label>
                  <Select value={comparisonMetric} onValueChange={setComparisonMetric}>
                    <SelectTrigger data-testid="select-comparison-metric">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BIOMARKER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Comparison Period</label>
                  <Select value={selectedPreset.toString()} onValueChange={(v) => setSelectedPreset(parseInt(v))}>
                    <SelectTrigger data-testid="select-comparison-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPARISON_PRESETS.map((preset, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => comparisonMutation.mutate()}
                disabled={comparisonMutation.isPending}
                className="w-full md:w-auto"
                data-testid="button-generate-comparison"
              >
                {comparisonMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Compare Periods
                  </>
                )}
              </Button>

              {comparison && (
                <div className="mt-6 p-6 border rounded-lg space-y-6 bg-card">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-3">Recent Period</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Average</span>
                          <span className="font-semibold">{comparison.period1Summary.average.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Min - Max</span>
                          <span className="font-semibold">
                            {comparison.period1Summary.min.toFixed(1)} - {comparison.period1Summary.max.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Trend</span>
                          <Badge className="capitalize">{comparison.period1Summary.trend}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-3">Previous Period</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Average</span>
                          <span className="font-semibold">{comparison.period2Summary.average.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Min - Max</span>
                          <span className="font-semibold">
                            {comparison.period2Summary.min.toFixed(1)} - {comparison.period2Summary.max.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Trend</span>
                          <Badge className="capitalize">{comparison.period2Summary.trend}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-primary/5">
                    {getChangeIcon(comparison.change.direction)}
                    <div>
                      <p className="text-sm text-muted-foreground">Change</p>
                      <p className="text-2xl font-bold" data-testid="text-change-value">
                        {comparison.change.absolute > 0 ? '+' : ''}
                        {comparison.change.absolute.toFixed(1)} ({comparison.change.percentage.toFixed(1)}%)
                      </p>
                      <Badge className="mt-1 capitalize">{comparison.change.direction}</Badge>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium mb-2">Key Insights</p>
                      <ul className="space-y-2">
                        {comparison.insights.map((insight: string, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Recommendation</p>
                      <p className="text-sm text-muted-foreground">{comparison.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
