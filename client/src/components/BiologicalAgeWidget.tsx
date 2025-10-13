import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dna, TrendingDown, TrendingUp, Upload, ArrowRight } from "lucide-react";
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
          <Skeleton className="h-32 w-full" />
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
    <Card data-testid="widget-biological-age">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Biological Age</CardTitle>
        <Dna className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {canCalculate ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold" data-testid="value-biological-age-widget">
                {phenoAge}
              </div>
              <span className="text-sm text-muted-foreground">years</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {isYounger ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium" data-testid="message-younger-widget">
                    {ageDiffAbs.toFixed(1)} years younger
                  </span>
                </>
              ) : ageDifference > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-orange-600 dark:text-orange-400 font-medium" data-testid="message-older-widget">
                    {ageDiffAbs.toFixed(1)} years older
                  </span>
                </>
              ) : (
                <span className="text-blue-600 dark:text-blue-400 font-medium" data-testid="message-equal-widget">
                  {phenoAge} years (matches age)
                </span>
              )}
            </div>

            <div className="pt-2 border-t">
              <Link href="/biological-age">
                <Button variant="outline" size="sm" className="w-full" data-testid="button-view-biological-age">
                  View Details
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground" data-testid="message-incomplete-widget">
              Upload blood work to calculate your biological age
            </p>
            <p className="text-xs text-muted-foreground">
              Missing {missingBiomarkers.length} biomarker{missingBiomarkers.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2 pt-2 border-t">
              <Link href="/records">
                <Button variant="outline" size="sm" className="flex-1" data-testid="button-upload-bloodwork-widget">
                  <Upload className="w-3 h-3 mr-2" />
                  Upload
                </Button>
              </Link>
              <Link href="/biological-age">
                <Button variant="outline" size="sm" className="flex-1" data-testid="button-learn-more-widget">
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
