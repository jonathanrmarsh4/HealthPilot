import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Info, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DataInsight {
  type: 'positive' | 'negative' | 'neutral' | 'info';
  title: string;
  description: string;
  metric: string;
}

interface DataInsightsResponse {
  insights: DataInsight[];
}

export function DataInsightsWidget() {
  const [showAll, setShowAll] = useState(false);
  
  const { data: insightsData, isLoading } = useQuery<DataInsightsResponse>({
    queryKey: ["/api/dashboard/data-insights"],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-data-insights" className="h-full">
        <CardHeader>
          <CardTitle>Data Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const insights = insightsData?.insights || [];

  if (insights.length === 0) {
    return (
      <Card data-testid="card-data-insights" className="h-full">
        <CardHeader>
          <CardTitle>Data Insights</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Start tracking health data to see insights
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />;
      case 'negative':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" />;
      case 'neutral':
        return <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'positive':
        return 'default';
      case 'negative':
        return 'destructive';
      case 'neutral':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Sort insights by type priority (negative > positive > neutral > info)
  const sortedInsights = [...insights].sort((a, b) => {
    const priority = { negative: 0, positive: 1, neutral: 2, info: 3 };
    return priority[a.type as keyof typeof priority] - priority[b.type as keyof typeof priority];
  });

  // Show only top 4 most relevant unless expanded
  const displayedInsights = showAll ? sortedInsights : sortedInsights.slice(0, 4);
  const hasMore = insights.length > 4;

  return (
    <Card data-testid="card-data-insights" className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Data Insights</span>
          <Badge variant="secondary" data-testid="badge-insights-count">
            {insights.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3">
        <div className="space-y-3 flex-1">
          {displayedInsights.map((insight, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-md bg-muted/30 hover-elevate"
              data-testid={`insight-item-${index}`}
            >
              <div className="mt-0.5">{getIcon(insight.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium" data-testid={`text-insight-title-${index}`}>
                    {insight.title}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground" data-testid={`text-insight-desc-${index}`}>
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
            data-testid="button-show-more-insights"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show {insights.length - 4} More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
