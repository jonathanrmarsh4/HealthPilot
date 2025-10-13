import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dna, TrendingDown, TrendingUp, Upload, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";

interface BiologicalAgeData {
  phenoAge: number | null;
  chronologicalAge: number;
  ageDifference: number;
  canCalculate: boolean;
  missingBiomarkers: Array<{ key: string; name: string }>;
}

export function BiologicalAgeWidget() {
  const { data, isLoading } = useQuery<BiologicalAgeData>({
    queryKey: ["/api/biological-age"],
  });

  if (isLoading) {
    return (
      <Card data-testid="widget-biological-age-loading">
        <CardContent className="p-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { phenoAge, chronologicalAge, ageDifference, canCalculate, missingBiomarkers } = data;
  const isYounger = ageDifference < 0;
  const ageDiffAbs = Math.abs(ageDifference);

  return (
    <Card data-testid="widget-biological-age" className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Biological Age</CardTitle>
        <Badge variant="secondary" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          Premium
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {canCalculate ? (
          <>
            {/* Age Comparison Visual */}
            <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-xl p-6 border border-primary/20">
              <div className="flex items-center justify-between gap-4">
                {/* Biological Age - Prominent */}
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Your Biological Age
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent" data-testid="value-biological-age-widget">
                      {phenoAge}
                    </div>
                    <span className="text-lg text-muted-foreground">years</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-16 w-px bg-border" />

                {/* Chronological Age */}
                <div className="flex-1 text-right">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Calendar Age
                  </div>
                  <div className="flex items-baseline gap-2 justify-end">
                    <div className="text-3xl font-semibold text-muted-foreground/60">
                      {chronologicalAge}
                    </div>
                    <span className="text-sm text-muted-foreground">years</span>
                  </div>
                </div>
              </div>

              {/* DNA Icon - Decorative */}
              <div className="absolute -top-2 -right-2 opacity-10">
                <Dna className="h-24 w-24 text-primary" />
              </div>
            </div>
            
            {/* Age Difference Badge */}
            <div className="flex items-center justify-center">
              {isYounger ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                  <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-600 dark:text-green-400 font-semibold" data-testid="message-younger-widget">
                    {ageDiffAbs.toFixed(1)} years younger than your age
                  </span>
                </div>
              ) : ageDifference > 0 ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm text-orange-600 dark:text-orange-400 font-semibold" data-testid="message-older-widget">
                    {ageDiffAbs.toFixed(1)} years older than your age
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold" data-testid="message-equal-widget">
                    Matches your calendar age
                  </span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Link href="/biological-age">
              <Button variant="outline" size="sm" className="w-full" data-testid="button-view-biological-age">
                View Full Analysis
                <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </>
        ) : (
          <div className="space-y-4">
            {/* Missing Data State */}
            <div className="relative bg-muted/30 rounded-xl p-6 border border-dashed">
              <div className="text-center space-y-2">
                <Dna className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium" data-testid="message-incomplete-widget">
                  Upload blood work to unlock
                </p>
                <p className="text-xs text-muted-foreground">
                  Missing {missingBiomarkers.length} biomarker{missingBiomarkers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Link href="/records" className="flex-1">
                <Button variant="default" size="sm" className="w-full" data-testid="button-upload-bloodwork-widget">
                  <Upload className="w-3 h-3 mr-2" />
                  Upload
                </Button>
              </Link>
              <Link href="/biological-age" className="flex-1">
                <Button variant="outline" size="sm" className="w-full" data-testid="button-learn-more-widget">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
