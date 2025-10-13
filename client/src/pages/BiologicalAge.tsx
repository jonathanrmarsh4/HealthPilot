import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Upload, TrendingDown, TrendingUp, Activity } from "lucide-react";
import { Link } from "wouter";

interface BiologicalAgeData {
  phenoAge: number;
  chronologicalAge: number;
  ageDifference: number;
  missingBiomarkers: Array<{
    key: string;
    name: string;
    unit: string;
    source: string;
  }>;
  availableBiomarkers: Array<{
    key: string;
    name: string;
    unit: string;
    value: number;
  }>;
  canCalculate: boolean;
}

export default function BiologicalAge() {
  const { data, isLoading, error } = useQuery<BiologicalAgeData>({
    queryKey: ["/api/biological-age"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive" data-testid="error-biological-age">
          <AlertDescription>
            {(error as any).message || "Failed to load biological age data"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { phenoAge, chronologicalAge, ageDifference, missingBiomarkers, availableBiomarkers, canCalculate } = data;

  // Determine age status
  const isYounger = ageDifference < 0;
  const ageDiffAbs = Math.abs(ageDifference);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="title-biological-age">Biological Age</h1>
        <p className="text-muted-foreground mt-1">
          Track your biological age using the PhenoAge algorithm
        </p>
      </div>

      {/* Main Age Display */}
      {canCalculate ? (
        <Card className="border-2" data-testid="card-biological-age-result">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-sm text-muted-foreground">Your Biological Age</CardTitle>
            <div className="flex items-baseline justify-center gap-3 mt-2">
              <span className="text-6xl font-bold text-primary" data-testid="value-biological-age">
                {phenoAge}
              </span>
              <span className="text-2xl text-muted-foreground">years</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comparison */}
            <div className="flex items-center justify-center gap-2 p-4 bg-muted/50 rounded-lg">
              {isYounger ? (
                <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : ageDifference > 0 ? (
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              ) : (
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              )}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Chronological Age</p>
                <p className="text-2xl font-semibold" data-testid="value-chronological-age">{chronologicalAge} years</p>
              </div>
            </div>

            {/* Age Difference Message */}
            <div className="text-center">
              {isYounger ? (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900" data-testid="message-younger">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    Your biological age is {ageDiffAbs.toFixed(1)} years younger than your chronological age
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Great work! Your lifestyle choices are keeping you biologically younger.
                  </p>
                </div>
              ) : ageDifference > 0 ? (
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900" data-testid="message-older">
                  <p className="text-orange-800 dark:text-orange-200 font-medium">
                    Your biological age is {ageDiffAbs.toFixed(1)} years older than your chronological age
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Focus on lifestyle improvements to reduce your biological age.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900" data-testid="message-equal">
                  <p className="text-blue-800 dark:text-blue-200 font-medium">
                    Your biological age is {phenoAge} years, matching your chronological age
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    You're aging at a normal rate. Optimize your health to reduce biological age.
                  </p>
                </div>
              )}
            </div>

            {/* About PhenoAge */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              <p>
                PhenoAge uses 9 blood biomarkers to estimate biological age and mortality risk.
                Based on research by Levine et al. (2018).
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Incomplete Data Message */
        <Card className="border-2 border-dashed" data-testid="card-incomplete-data">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Biological Age Not Yet Available</CardTitle>
            <CardDescription>
              Upload blood work to calculate your biological age
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              We need {missingBiomarkers.length} more biomarker{missingBiomarkers.length !== 1 ? 's' : ''} to calculate your biological age.
            </p>
            <Link href="/records">
              <Button size="lg" data-testid="button-upload-records">
                <Upload className="w-4 h-4 mr-2" />
                Upload Blood Work
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Biomarker Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Required Biomarkers ({availableBiomarkers.length}/9)
          </CardTitle>
          <CardDescription>
            PhenoAge requires 9 biomarkers from standard blood tests (CBC + CMP)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {/* Available Biomarkers */}
            {availableBiomarkers.map((biomarker) => (
              <div
                key={biomarker.key}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                data-testid={`biomarker-available-${biomarker.key}`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{biomarker.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {biomarker.value} {biomarker.unit}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Collected</Badge>
              </div>
            ))}

            {/* Missing Biomarkers */}
            {missingBiomarkers.map((biomarker) => (
              <div
                key={biomarker.key}
                className="flex items-center justify-between p-3 border-2 border-dashed rounded-lg"
                data-testid={`biomarker-missing-${biomarker.key}`}
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium text-muted-foreground">{biomarker.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Found in: {biomarker.source}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">Missing</Badge>
              </div>
            ))}
          </div>

          {missingBiomarkers.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                How to get missing biomarkers:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Request CBC (Complete Blood Count) and CMP (Comprehensive Metabolic Panel) from your doctor</li>
                <li>Upload your lab results to HealthPilot</li>
                <li>Our AI will automatically extract all biomarker values</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Feature Notice */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Premium Feature</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Biological Age tracking will be a premium feature when HealthPilot launches.
                Track changes over time and get personalized recommendations to reduce your biological age.
              </p>
              <Badge variant="outline" className="bg-background">
                Coming Soon: Historical Trends & Insights
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
