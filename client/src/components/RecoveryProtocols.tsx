import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, Clock, Target, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface RecoveryProtocol {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  difficulty: string;
  benefits: string[];
  instructions: string;
  targetFactors: string[];
  tags: string[];
  userPreference?: 'upvote' | 'downvote' | 'neutral';
}

interface ProtocolCompletion {
  id: string;
  userId: string;
  protocolId: string;
  completedAt: string;
  date: string;
  context?: any;
}

interface RecoveryRecommendationsResponse {
  readinessScore: number;
  lowFactors: string[];
  recommendations: RecoveryProtocol[];
}

export function RecoveryProtocols() {
  const { toast } = useToast();
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);

  const { data: recommendations, isLoading } = useQuery<RecoveryRecommendationsResponse>({
    queryKey: ["/api/recovery-protocols/recommendations"],
  });

  // Get today's date for filtering completions
  const today = new Date().toISOString().split('T')[0];

  const { data: completions } = useQuery<ProtocolCompletion[]>({
    queryKey: ["/api/recovery-protocols/completions", today],
    queryFn: async () => {
      const res = await fetch(`/api/recovery-protocols/completions?date=${today}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch completions');
      return res.json();
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ protocolId, preference }: { protocolId: string; preference: string }) => {
      const res = await apiRequest("POST", `/api/recovery-protocols/${protocolId}/vote`, { preference });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recovery-protocols/recommendations"] });
      toast({
        title: "Preference saved",
        description: "Your recovery protocol preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save preference",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (protocolId: string) => {
      const res = await apiRequest("POST", `/api/recovery-protocols/${protocolId}/complete`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recovery-protocols/completions"] });
      toast({
        title: "Protocol completed! ✓",
        description: "Great work on your recovery!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark protocol as complete",
        variant: "destructive",
      });
    },
  });

  const handleVote = (protocolId: string, preference: 'upvote' | 'downvote', currentPreference?: string) => {
    // If clicking the same preference again, reset to neutral
    if (currentPreference === preference) {
      voteMutation.mutate({ protocolId, preference: 'neutral' });
    } else {
      voteMutation.mutate({ protocolId, preference });
    }
  };

  const handleComplete = (protocolId: string) => {
    completeMutation.mutate(protocolId);
  };

  const isCompletedToday = (protocolId: string): boolean => {
    return !!completions?.some(c => c.protocolId === protocolId);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'mobility': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      'mindfulness': 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      'cold_therapy': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
      'heat_therapy': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      'breathing': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      'nutrition': 'bg-green-500/10 text-green-700 dark:text-green-400',
      'sleep_hygiene': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    };
    return colors[category] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      'beginner': 'bg-green-500/10 text-green-700 dark:text-green-400',
      'intermediate': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      'advanced': 'bg-red-500/10 text-red-700 dark:text-red-400',
    };
    return colors[difficulty] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  if (isLoading) {
    return (
      <Card data-testid="card-recovery-protocols-loading">
        <CardHeader>
          <CardTitle>Recovery Protocols</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.recommendations.length === 0) {
    const isExcellent = recommendations?.readinessScore >= 80;
    
    return (
      <Card data-testid="card-recovery-protocols-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recovery Protocols
          </CardTitle>
          <CardDescription>
            Personalized recovery recommendations based on your readiness score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {isExcellent ? (
              <>
                <p>Your readiness score is excellent! No specific recovery protocols recommended at this time.</p>
                <p className="text-sm mt-2">Keep up the great work! 🎉</p>
              </>
            ) : (
              <>
                <p>No recovery protocols available at this time.</p>
                <p className="text-sm mt-2">Check back later for personalized recommendations.</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-recovery-protocols">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recovery Protocols
        </CardTitle>
        <CardDescription>
          AI-recommended protocols to improve your readiness factors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.lowFactors.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Target className="h-4 w-4" />
            <span>Targeting: {recommendations.lowFactors.join(', ').replace('_', ' ')}</span>
          </div>
        )}

        <div className="space-y-4">
          {recommendations.recommendations.map((protocol) => (
            <div
              key={protocol.id}
              className="border rounded-lg p-4 space-y-3 hover-elevate"
              data-testid={`protocol-${protocol.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold" data-testid={`protocol-name-${protocol.id}`}>
                      {protocol.name}
                    </h3>
                    <Badge variant="secondary" className={getCategoryColor(protocol.category)}>
                      {protocol.category.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={getDifficultyColor(protocol.difficulty)}>
                      {protocol.difficulty}
                    </Badge>
                    {isCompletedToday(protocol.id) && (
                      <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed today
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">{protocol.description}</p>

                  {protocol.duration && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{protocol.duration} min</span>
                    </div>
                  )}

                  {expandedProtocol === protocol.id && (
                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <h4 className="font-medium mb-1">Instructions:</h4>
                        <p className="text-muted-foreground">{protocol.instructions}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Benefits:</h4>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                          {protocol.benefits.map((benefit, idx) => (
                            <li key={idx}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 items-center flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedProtocol(expandedProtocol === protocol.id ? null : protocol.id)}
                      data-testid={`button-expand-${protocol.id}`}
                    >
                      {expandedProtocol === protocol.id ? 'Show Less' : 'Show More'}
                    </Button>
                    {!isCompletedToday(protocol.id) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleComplete(protocol.id)}
                        disabled={completeMutation.isPending}
                        data-testid={`button-complete-${protocol.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="icon"
                    variant={protocol.userPreference === 'upvote' ? 'default' : 'outline'}
                    onClick={() => handleVote(protocol.id, 'upvote', protocol.userPreference)}
                    disabled={voteMutation.isPending}
                    data-testid={`button-upvote-${protocol.id}`}
                    title={protocol.userPreference === 'upvote' ? 'Click again to reset' : 'Upvote this protocol'}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={protocol.userPreference === 'downvote' ? 'destructive' : 'outline'}
                    onClick={() => handleVote(protocol.id, 'downvote', protocol.userPreference)}
                    disabled={voteMutation.isPending}
                    data-testid={`button-downvote-${protocol.id}`}
                    title={protocol.userPreference === 'downvote' ? 'Click again to reset' : 'Downvote this protocol'}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
