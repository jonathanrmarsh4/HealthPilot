import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, LucideIcon, ThumbsUp, ThumbsDown, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useMemo } from "react";
import { extractCitations, getStandardFullName } from "@/lib/citationUtils";

type Priority = "high" | "medium" | "low";

interface RecommendationCardProps {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  icon: LucideIcon;
  details?: string;
  actionLabel?: string;
  onAction?: () => void;
  onFeedback?: (feedback: "positive" | "negative") => void;
}

const priorityConfig = {
  high: {
    badge: "bg-destructive text-destructive-foreground",
    label: "High Priority",
  },
  medium: {
    badge: "bg-chart-5 text-white",
    label: "Medium",
  },
  low: {
    badge: "bg-chart-2 text-white",
    label: "Low",
  },
};

export function RecommendationCard({
  title,
  description,
  category,
  priority,
  icon: Icon,
  details,
  actionLabel = "Schedule Workout",
  onAction,
  onFeedback,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = priorityConfig[priority] || priorityConfig.medium; // Fallback to medium if invalid

  // Extract citations from description and details
  const citations = useMemo(() => {
    const allText = [description, details].filter(Boolean).join(' ');
    return extractCitations(allText);
  }, [description, details]);

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      console.log(`${actionLabel} triggered for: ${title}`);
    }
  };

  return (
    <Card className="hover-elevate" data-testid={`card-recommendation-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{title}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
              {citations.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-2">
                  <TooltipProvider>
                    {citations.map((citation, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className="text-xs gap-1 bg-primary/5 border-primary/20 hover:bg-primary/10"
                            data-testid={`badge-citation-${citation.standard.toLowerCase()}`}
                          >
                            <Shield className="h-3 w-3" />
                            {citation.standard}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-xs">
                            <strong>{getStandardFullName(citation.standard)}:</strong> {citation.text}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={config.badge}>{config.label}</Badge>
            {onFeedback && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onFeedback("positive")}
                  data-testid="button-feedback-positive"
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onFeedback("negative")}
                  data-testid="button-feedback-negative"
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      {(details || expanded) && (
        <CardContent className="space-y-4">
          {details && (
            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-sm text-foreground">{details}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleAction}
              data-testid={`button-${actionLabel.toLowerCase().replace(/\s/g, "-")}`}
            >
              {actionLabel}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            {details && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExpanded(!expanded)}
                data-testid="button-toggle-details"
              >
                {expanded ? "Show Less" : "Show More"}
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
