import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, XCircle, CheckCircle2, Target, TrendingUp, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SmartFuelGuidance {
  id: string;
  generatedAt: string;
  themes: string[];
  overview: string;
  avoid: Array<{ item: string; reason: string; priority: 'high' | 'medium' | 'low' }>;
  include: Array<{ item: string; reason: string; priority: 'high' | 'medium' | 'low' }>;
  targets: Record<string, string>;
  tip: string;
}

export default function SmartFuel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: guidance, isLoading, error } = useQuery<SmartFuelGuidance>({
    queryKey: ["/api/smartfuel/guidance/current"],
    retry: false,
  });

  const { data: history } = useQuery<Array<{ id: string; generatedAt: string; themes: string[]; overview: string; status: string }>>({
    queryKey: ["/api/smartfuel/guidance/history"],
    enabled: showHistory,
  });

  const generateGuidanceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/smartfuel/guidance:generate", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smartfuel/guidance/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/smartfuel/guidance/history"] });
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    console.log('🔄 handleGenerate called');
    console.log('Current isGenerating:', isGenerating);
    setIsGenerating(true);
    generateGuidanceMutation.mutate();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'High Priority';
      case 'medium': return 'Medium Priority';
      case 'low': return 'Low Priority';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              SmartFuel™
            </h1>
            <p className="text-muted-foreground">
              Precision Nutrition Guidance
            </p>
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !guidance) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-smartfuel">
              <Sparkles className="h-8 w-8 text-primary" />
              SmartFuel™
            </h1>
            <p className="text-muted-foreground">
              Precision Nutrition Guidance
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get Started with SmartFuel™</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                SmartFuel™ provides evidence-based nutrition guidance tailored to your:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Recent biomarker readings (cholesterol, glucose, blood pressure)</li>
                <li>Active health goals (weight management, cardiovascular health)</li>
                <li>Dietary preferences and restrictions</li>
              </ul>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Evidence-Based Recommendations</p>
                <p className="text-sm text-muted-foreground">
                  All guidance is derived from clinical research and nutrition science, 
                  not generic advice.
                </p>
              </div>
            </div>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
              size="lg"
              data-testid="button-generate-guidance"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Generating Your Guidance...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate My SmartFuel™ Guidance
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const highPriorityAvoid = guidance.avoid.filter(a => a.priority === 'high');
  const mediumPriorityAvoid = guidance.avoid.filter(a => a.priority === 'medium');
  const lowPriorityAvoid = guidance.avoid.filter(a => a.priority === 'low');

  const highPriorityInclude = guidance.include.filter(i => i.priority === 'high');
  const mediumPriorityInclude = guidance.include.filter(i => i.priority === 'medium');
  const lowPriorityInclude = guidance.include.filter(i => i.priority === 'low');

  console.log('SmartFuel render - isGenerating:', isGenerating, 'mutation pending:', generateGuidanceMutation.isPending);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-smartfuel">
            <Sparkles className="h-8 w-8 text-primary" />
            SmartFuel™
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Generated {format(new Date(guidance.generatedAt), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <Button 
          onClick={(e) => {
            console.log('🖱️ Button clicked!', e);
            handleGenerate();
          }}
          disabled={isGenerating}
          variant="outline"
          data-testid="button-refresh-guidance"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Guidance
            </>
          )}
        </Button>
      </div>

      {/* Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overview</span>
            <div className="flex gap-2">
              {guidance.themes.map((theme, idx) => (
                <Badge key={idx} variant="secondary" data-testid={`badge-theme-${idx}`}>
                  {theme}
                </Badge>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed" data-testid="text-overview">
            {guidance.overview}
          </p>
        </CardContent>
      </Card>

      {/* Avoid/Limit Section */}
      {guidance.avoid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Foods to Limit or Avoid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {highPriorityAvoid.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                  High Priority
                </h3>
                <div className="space-y-2">
                  {highPriorityAvoid.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20"
                      data-testid={`avoid-high-${idx}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mediumPriorityAvoid.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  Medium Priority
                </h3>
                <div className="space-y-2">
                  {mediumPriorityAvoid.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border bg-muted/30"
                      data-testid={`avoid-medium-${idx}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lowPriorityAvoid.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover-elevate p-2 rounded-md w-full">
                  <ChevronDown className="h-4 w-4" />
                  Show {lowPriorityAvoid.length} lower priority items
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-3">
                  {lowPriorityAvoid.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border bg-muted/20"
                      data-testid={`avoid-low-${idx}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* Include Section */}
      {guidance.include.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Foods to Prioritize
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {highPriorityInclude.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">
                  High Priority
                </h3>
                <div className="space-y-2">
                  {highPriorityInclude.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/20"
                      data-testid={`include-high-${idx}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mediumPriorityInclude.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  Medium Priority
                </h3>
                <div className="space-y-2">
                  {mediumPriorityInclude.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border bg-muted/30"
                      data-testid={`include-medium-${idx}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lowPriorityInclude.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover-elevate p-2 rounded-md w-full">
                  <ChevronDown className="h-4 w-4" />
                  Show {lowPriorityInclude.length} additional items
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-3">
                  {lowPriorityInclude.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border bg-muted/20"
                      data-testid={`include-low-${idx}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* Targets Section */}
      {Object.keys(guidance.targets || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Nutrition Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(guidance.targets).map(([key, value], idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
                  data-testid={`target-${idx}`}
                >
                  <span className="text-sm font-medium">{key}</span>
                  <Badge variant="outline">{value}</Badge>
                </div>
              ))}
              {guidance.tip && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 mt-4">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground" data-testid="text-tip">
                    {guidance.tip}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Section */}
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="hover-elevate cursor-pointer">
              <CardTitle className="flex items-center justify-between">
                <span>Guidance History</span>
                {showHistory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {history && history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((item, idx) => (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-lg border hover-elevate"
                      data-testid={`history-item-${idx}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {item.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.generatedAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.overview}</p>
                          <div className="flex gap-1 mt-2">
                            {item.themes.map((theme, themeIdx) => (
                              <Badge key={themeIdx} variant="outline" className="text-xs">
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No previous guidance available</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
