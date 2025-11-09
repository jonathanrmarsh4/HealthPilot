import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, TrendingUp, TrendingDown, Minus, CheckCircle2, Activity, Clock, RefreshCw, Heart, Moon, Brain, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type SymptomEvent = {
  id: string;
  userId: string;
  name: string;
  coding?: any;
  episodeId: string;
  status: "new" | "ongoing" | "resolved";
  severity: number | null;
  trend: "better" | "worse" | "same" | null;
  context: string[];
  notes: string | null;
  signals: any;
  startedAt: string;
  recordedAt: string;
  endedAt: string | null;
  source: string;
  version: number;
  createdAt: string;
};

type InsightCategory = "sleep" | "recovery" | "performance" | "health";
type InsightSeverity = "normal" | "notable" | "significant" | "critical";

interface DiagnosticCause {
  condition: string;
  confidence: number;
  evidence: string[];
  actions: string[];
}

interface InsightEvidence {
  currentValue?: number;
  baselineValue?: number;
  deviation?: number;
  recommendation?: string;
  // Comprehensive diagnostic assessment fields (for symptom insights)
  triageReason?: string;
  vitalsCollected?: string;
  biomarkersCollected?: string;
  possibleCauses?: DiagnosticCause[];
}

interface DailyHealthInsight {
  id: string;
  userId: string;
  date: string;
  category: InsightCategory;
  title: string;
  description: string;
  recommendation: string;
  score: number;
  status: string;
  metricName: string;
  metric: string;
  metricValue: number;
  baselineValue: number | null;
  deviationPercent: number;
  severity: InsightSeverity;
  recommendationId: string | null;
  acknowledgedAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
  evidence?: InsightEvidence;
}

interface InsightsResponse {
  date: string;
  insights: DailyHealthInsight[];
  total: number;
}

const categoryIcons = {
  sleep: Moon,
  recovery: Heart,
  performance: TrendingUp,
  health: Activity,
};

const categoryColors = {
  sleep: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  recovery: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  performance: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  health: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

const severityColors = {
  normal: "bg-muted text-muted-foreground",
  notable: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  significant: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  critical: "bg-destructive text-white",
};

const CONTEXT_SUGGESTIONS = [
  "after_workout",
  "poor_sleep",
  "stress_high",
  "before_meal",
  "after_meal",
  "morning",
  "evening",
  "weather_change",
  "dehydrated",
  "long_sitting",
];

const symptomFormSchema = z.object({
  name: z.string().min(1, "Symptom name is required"),
  severity: z.number().min(0).max(10),
  trend: z.enum(["better", "worse", "same"]).optional(),
  context: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

type SymptomFormData = z.infer<typeof symptomFormSchema>;

// Component to display comprehensive diagnostic assessment (for symptom insights)
function DiagnosticAssessment({ insight }: { insight: DailyHealthInsight }) {
  const evidence = insight.evidence;
  if (!evidence?.possibleCauses || evidence.possibleCauses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4" data-testid={`diagnostic-assessment-${insight.id}`}>
      {/* Triage Summary */}
      {evidence.triageReason && (
        <div className="border-l-4 border-l-amber-500 dark:border-l-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-r-md p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">Triage Reason</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{evidence.triageReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Vitals & Biomarkers Collected */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {evidence.vitalsCollected && (
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Vitals Collected</p>
            <p className="text-sm">{evidence.vitalsCollected}</p>
          </div>
        )}
        {evidence.biomarkersCollected && (
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Biomarkers Collected</p>
            <p className="text-sm">{evidence.biomarkersCollected}</p>
          </div>
        )}
      </div>

      {/* Possible Causes - Differential Diagnosis */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Possible Causes (Differential Diagnosis)</h4>
        {evidence.possibleCauses.map((cause, index) => (
          <DiagnosticCauseCard key={index} cause={cause} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}

// Component for each possible cause
function DiagnosticCauseCard({ cause, rank }: { cause: DiagnosticCause; rank: number }) {
  const [isExpanded, setIsExpanded] = useState(rank === 1); // First cause expanded by default

  return (
    <div className="border rounded-lg overflow-hidden" data-testid={`diagnostic-cause-${rank}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full" asChild>
          <button
            className="w-full flex items-center justify-between gap-3 p-3 bg-card hover-elevate text-left"
            data-testid={`button-toggle-cause-${rank}`}
          >
            <div className="flex-1 flex items-center gap-3">
              <Badge variant="outline" className="shrink-0 font-mono tabular-nums">
                {cause.confidence}%
              </Badge>
              <span className="font-medium text-sm">{cause.condition}</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3">
            {/* Evidence */}
            {cause.evidence.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Evidence</p>
                <ul className="space-y-1.5">
                  {cause.evidence.map((item, idx) => (
                    <li key={idx} className="text-sm flex gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            {cause.actions.length > 0 && (
              <div className="bg-primary/5 border border-primary/10 rounded-md p-3">
                <p className="text-xs font-semibold text-primary mb-2">💡 Recommended Actions</p>
                <ul className="space-y-1.5">
                  {cause.actions.map((action, idx) => (
                    <li key={idx} className="text-sm flex gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span className="flex-1">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function Symptoms() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);

  const { data: activeEpisodes, isLoading: activeLoading } = useQuery<SymptomEvent[]>({
    queryKey: ["/api/symptoms/active"],
  });

  const { data: allEvents } = useQuery<SymptomEvent[]>({
    queryKey: ["/api/symptoms/events"],
  });

  const { data: insightsResponse, isLoading: insightsLoading } = useQuery<InsightsResponse>({
    queryKey: ["/api/insights/today"],
  });

  const generateAssessmentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/insights/generate-v2");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights/today"] });
      toast({
        title: "AI Assessment Complete",
        description: `Generated ${data.insightsGenerated || 0} insights based on your symptoms and health data.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate assessment",
        variant: "destructive",
      });
    },
  });

  const form = useForm<SymptomFormData>({
    resolver: zodResolver(symptomFormSchema),
    defaultValues: {
      name: "",
      severity: 5,
      context: [],
      notes: "",
    },
  });

  const createSymptomMutation = useMutation({
    mutationFn: async (data: SymptomFormData) => {
      const now = new Date().toISOString();
      const episodeId = crypto.randomUUID();
      
      const response = await apiRequest("POST", "/api/symptoms/events", {
        name: data.name,
        episodeId,
        status: "new",
        severity: data.severity,
        trend: data.trend || null,
        context: data.context,
        notes: data.notes || null,
        signals: null,
        startedAt: now,
        recordedAt: now,
        endedAt: null,
        source: "user",
        version: 1,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/events"] });
      toast({
        title: "Symptom tracked",
        description: "Your symptom has been recorded successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
      setSelectedContexts([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to track symptom",
        variant: "destructive",
      });
    },
  });

  const updateTrendMutation = useMutation({
    mutationFn: async ({ episodeId, trend }: { episodeId: string; trend: "better" | "worse" | "same" }) => {
      const now = new Date().toISOString();
      const episode = activeEpisodes?.find(e => e.episodeId === episodeId);
      
      if (!episode) throw new Error("Episode not found");
      
      const response = await apiRequest("POST", "/api/symptoms/events", {
        name: episode.name,
        episodeId,
        status: "ongoing",
        severity: episode.severity,
        trend,
        context: episode.context,
        notes: null,
        signals: null,
        startedAt: episode.startedAt,
        recordedAt: now,
        endedAt: null,
        source: "user",
        version: 1,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/events"] });
      toast({
        title: "Symptom updated",
        description: "Trend has been recorded.",
      });
    },
  });

  const resolveEpisodeMutation = useMutation({
    mutationFn: async (episodeId: string) => {
      const response = await apiRequest("PATCH", `/api/symptoms/episodes/${episodeId}/resolve`, {
        endedAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/events"] });
      toast({
        title: "Symptom resolved",
        description: "The symptom has been marked as resolved.",
      });
    },
  });

  const onSubmit = (data: SymptomFormData) => {
    createSymptomMutation.mutate(data);
  };

  const toggleContext = (context: string) => {
    const newContexts = selectedContexts.includes(context)
      ? selectedContexts.filter(c => c !== context)
      : [...selectedContexts, context];
    
    setSelectedContexts(newContexts);
    form.setValue("context", newContexts);
  };

  const getSeverityColor = (severity: number | null) => {
    if (severity === null) return "bg-muted";
    if (severity <= 3) return "bg-green-500";
    if (severity <= 6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case "better": return <TrendingDown className="h-4 w-4 text-green-500" />;
      case "worse": return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "same": return <Minus className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const resolvedEvents = allEvents?.filter(e => e.status === "resolved") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Symptoms</h1>
          <p className="text-muted-foreground mt-1 md:mt-2">
            Track and monitor your health symptoms
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-symptom">
              <Plus className="h-4 w-4 mr-2" />
              Add Symptom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Track a Symptom</DialogTitle>
              <DialogDescription>
                Record a new symptom or health concern you&apos;re experiencing.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symptom Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., headache, nausea, fatigue"
                          data-testid="input-symptom-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity: {field.value}/10</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={10}
                          step={1}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          data-testid="slider-severity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="context"
                  render={() => (
                    <FormItem>
                      <FormLabel>Context (Optional)</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {CONTEXT_SUGGESTIONS.map((context) => (
                          <Badge
                            key={context}
                            variant={selectedContexts.includes(context) ? "default" : "outline"}
                            className="cursor-pointer hover-elevate active-elevate-2"
                            onClick={() => toggleContext(context)}
                            data-testid={`badge-context-${context}`}
                          >
                            {context.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Any additional details..."
                          rows={3}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSymptomMutation.isPending}
                    data-testid="button-submit-symptom"
                  >
                    {createSymptomMutation.isPending ? "Saving..." : "Track Symptom"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Episodes */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Active Symptoms
        </h2>

        {activeLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeEpisodes && activeEpisodes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activeEpisodes.map((episode) => (
              <Card key={episode.id} data-testid={`card-active-episode-${episode.episodeId}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg capitalize">{episode.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(episode.startedAt), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    {episode.severity !== null && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full ${getSeverityColor(episode.severity)}`} />
                        {episode.severity}/10
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {episode.trend && (
                    <div className="flex items-center gap-2">
                      {getTrendIcon(episode.trend)}
                      <span className="text-sm text-muted-foreground capitalize">{episode.trend}</span>
                    </div>
                  )}
                  
                  {episode.context && episode.context.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {episode.context.map((ctx, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {ctx.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTrendMutation.mutate({ episodeId: episode.episodeId, trend: "better" })}
                      disabled={updateTrendMutation.isPending}
                      data-testid={`button-better-${episode.episodeId}`}
                    >
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Better
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTrendMutation.mutate({ episodeId: episode.episodeId, trend: "same" })}
                      disabled={updateTrendMutation.isPending}
                      data-testid={`button-same-${episode.episodeId}`}
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      Same
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTrendMutation.mutate({ episodeId: episode.episodeId, trend: "worse" })}
                      disabled={updateTrendMutation.isPending}
                      data-testid={`button-worse-${episode.episodeId}`}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Worse
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => resolveEpisodeMutation.mutate(episode.episodeId)}
                      disabled={resolveEpisodeMutation.isPending}
                      data-testid={`button-resolve-${episode.episodeId}`}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No active symptoms</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click &quot;Add Symptom&quot; to start tracking
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Symptom Assessment */}
      {activeEpisodes && activeEpisodes.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Health Assessment</CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateAssessmentMutation.mutate()}
                disabled={generateAssessmentMutation.isPending}
                data-testid="button-generate-assessment"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${generateAssessmentMutation.isPending ? 'animate-spin' : ''}`} />
                {generateAssessmentMutation.isPending ? "Analyzing..." : "Get Assessment"}
              </Button>
            </div>
            <CardDescription>
              Get AI-powered insights correlating your symptoms with recent vitals, sleep, and biomarkers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insightsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : insightsResponse && insightsResponse.insights.length > 0 ? (
              <div className="space-y-3">
                {insightsResponse.insights.map((insight) => {
                  const Icon = categoryIcons[insight.category] || Brain;
                  return (
                    <div
                      key={insight.id}
                      className="relative border rounded-lg p-4 space-y-3 hover-elevate"
                      data-testid={`insight-${insight.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm">
                              {insight.title}
                            </h3>
                            <Badge className={categoryColors[insight.category]}>
                              {insight.category}
                            </Badge>
                            {insight.severity !== 'normal' && (
                              <Badge className={severityColors[insight.severity]}>
                                {insight.severity}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {insight.description}
                          </p>

                          {/* Comprehensive Diagnostic Assessment (for symptom insights) */}
                          {insight.evidence?.possibleCauses && insight.evidence.possibleCauses.length > 0 ? (
                            <DiagnosticAssessment insight={insight} />
                          ) : (
                            /* Standard recommendation (for non-symptom insights) */
                            insight.recommendation && (
                              <div className="bg-primary/5 border border-primary/10 rounded-md p-3">
                                <p className="text-xs font-medium text-primary mb-1">💡 Recommendation</p>
                                <p className="text-sm">
                                  {insight.recommendation}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground text-center mt-3">
                  These insights are also available in your Daily Insights widget
                </p>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No insights generated yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Click &quot;Get Assessment&quot; to analyze your symptoms
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {resolvedEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Resolved ({resolvedEvents.length})
          </h2>
          
          <div className="space-y-2">
            {resolvedEvents.slice(0, 5).map((event) => (
              <Card key={event.id} className="bg-muted/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{event.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.startedAt).toLocaleDateString()} - {event.endedAt && new Date(event.endedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
