import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, XCircle, CheckCircle2, Target, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

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

export function SmartFuelTile() {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: guidance, isLoading, error } = useQuery<SmartFuelGuidance>({
    queryKey: ["/api/smartfuel/guidance/current"],
    retry: false,
  });

  const generateGuidanceMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/smartfuel/guidance/generate");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smartfuel/guidance/current"] });
      setIsGenerating(false);
    },
    onError: (_error) => {
      console.error('[SmartFuel] Mutation onError', _error);
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateGuidanceMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card data-testid="widget-smartfuel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            SmartFuel™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !guidance) {
    return (
      <Card data-testid="widget-smartfuel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            SmartFuel™
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Precision Nutrition Guidance</p>
            <p className="text-sm text-muted-foreground">
              Get evidence-based nutrition advice tailored to your biomarkers, health goals, and preferences.
            </p>
          </div>
          <Button 
            variant="default" 
            size="sm" 
            className="w-full" 
            onClick={handleGenerate}
            disabled={isGenerating}
            data-testid="button-generate-smartfuel"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Guidance
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const topAvoid = guidance.avoid.filter(a => a.priority === 'high').slice(0, 3);
  const topInclude = guidance.include.filter(i => i.priority === 'high').slice(0, 3);

  return (
    <Card data-testid="widget-smartfuel">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            SmartFuel™
          </div>
          <div className="flex items-center gap-2">
            {guidance.themes.slice(0, 2).map((theme, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs" data-testid={`badge-theme-${idx}`}>
                {theme}
              </Badge>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-overview">
            {guidance.overview}
          </p>
        </div>

        {topAvoid.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <h4 className="text-sm font-medium">Prioritize Limiting</h4>
            </div>
            <div className="space-y-1.5">
              {topAvoid.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/50"
                  data-testid={`avoid-item-${idx}`}
                >
                  <span className="text-destructive mt-0.5">•</span>
                  <div className="flex-1">
                    <span className="font-medium">{item.item}</span>
                    <span className="text-muted-foreground"> - {item.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topInclude.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <h4 className="text-sm font-medium">Prioritize Including</h4>
            </div>
            <div className="space-y-1.5">
              {topInclude.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/50"
                  data-testid={`include-item-${idx}`}
                >
                  <span className="text-green-600 mt-0.5">•</span>
                  <div className="flex-1">
                    <span className="font-medium">{item.item}</span>
                    <span className="text-muted-foreground"> - {item.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(guidance.targets || {}).length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
            <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground" data-testid="text-tip">
              {guidance.tip}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Link href="/smartfuel" className="flex-1">
            <Button variant="outline" size="sm" className="w-full" data-testid="button-view-full-guidance">
              View Full Guidance <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleGenerate}
            disabled={isGenerating}
            data-testid="button-refresh-guidance"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
