import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, Clock, Target, Sparkles, CheckCircle2, CalendarPlus } from "lucide-react";
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
  aiReasoning?: string;
  suggestedTiming?: string;
  suggestedFrequency?: string;
  suggestedTimeOfDay?: string;
  confidence?: number;
  priority?: number;
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
  overallStrategy?: string;
  keyInsights?: string[];
  aiPowered?: boolean;
}

export function RecoveryProtocols() {
  const { toast } = useToast();
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [schedulingProtocol, setSchedulingProtocol] = useState<RecoveryProtocol | null>(null);
  
  // Advanced scheduling state
  const [scheduleFrequency, setScheduleFrequency] = useState<'once' | 'daily' | 'weekly'>('once');
  const [scheduleTime, setScheduleTime] = useState<string>('10:00');
  const [selectedWeekDays, setSelectedWeekDays] = useState<string[]>([]);

  const { data: recommendations, isLoading } = useQuery<RecoveryRecommendationsResponse>({
    queryKey: ["/api/recovery-protocols/recommendations"],
  });

  // Get today's date for filtering completions
  const today = new Date().toISOString().split('T')[0];

  const { data: completions } = useQuery<ProtocolCompletion[]>({
    queryKey: [`/api/recovery-protocols/completions?date=${today}`],
  });

  const voteMutation = useMutation({
    mutationFn: async ({ protocolId, preference }: { protocolId: string; preference: string }) => {
      const res = await apiRequest("POST", `/api/recovery-protocols/${protocolId}/vote`, { preference });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      // Immediately refetch recommendations to remove the protocol from the list
      queryClient.invalidateQueries({ queryKey: ["/api/recovery-protocols/recommendations"] });
      
      const action = variables.preference === 'upvote' ? 'positive feedback recorded' : 
                     variables.preference === 'downvote' ? 'will suggest less often' :
                     'preference removed';
      
      toast({
        title: "Feedback received",
        description: `Your ${action}. This protocol has been removed from today's suggestions.`,
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

  const handleVote = (protocolId: string, preference: 'upvote' | 'downvote') => {
    // Always set the preference (upvote or downvote)
    // This will remove the protocol from recommendations list
    voteMutation.mutate({ protocolId, preference });
  };

  const scheduleSessionMutation = useMutation({
    mutationFn: async ({ 
      protocolId, 
      protocolName, 
      duration, 
      frequency, 
      weekDays, 
      timeOfDay, 
      scheduledFor,
      category
    }: { 
      protocolId: string;
      protocolName: string; 
      duration: number; 
      frequency: 'once' | 'daily' | 'weekly';
      weekDays?: string[];
      timeOfDay: string;
      scheduledFor: Date;
      category: string;
    }) => {
      // For recurring patterns, create a pattern entry
      if (frequency !== 'once') {
        const response = await apiRequest('POST', '/api/recovery/schedule-pattern', {
          protocolId,
          protocolName,
          frequency,
          weekDays: weekDays || [],
          timeOfDay,
          duration,
        });
        return response.json();
      } else {
        // For one-time schedules, create a single session
        const sessionTypeMap: Record<string, string> = {
          'heat_therapy': 'sauna',
          'cold_therapy': 'cold_plunge',
          'cold_therapy_ice_bath': 'cold_plunge',
          'mobility': 'stretching',
          'breathing': 'stretching',
          'mindfulness': 'stretching',
          'nutrition': 'stretching',
          'sleep_hygiene': 'stretching',
          'massage': 'massage',
          'foam_rolling': 'foam_rolling',
        };
        
        const sessionType = sessionTypeMap[category] || 'stretching';
        
        const response = await apiRequest('POST', '/api/recovery/schedule', {
          sessionType,
          duration,
          scheduledFor: scheduledFor.toISOString(),
          description: `${protocolName} session`,
        });
        return response.json();
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/recovery/scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recovery-protocols/recommendations'] });
      const message = variables.frequency === 'once' 
        ? "Recovery session added to your calendar."
        : `Recurring ${variables.frequency} pattern created!`;
      toast({
        title: "Session scheduled!",
        description: message,
      });
      setSchedulingProtocol(null);
      setScheduleFrequency('once');
      setSelectedWeekDays([]);
      setScheduleTime('10:00');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule session",
        variant: "destructive",
      });
    },
  });

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
    <>
      <Card data-testid="card-recovery-protocols">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recovery Protocols
            {recommendations.aiPowered && (
              <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                AI-Powered
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {recommendations.aiPowered 
              ? 'AI-recommended protocols based on your unique recovery needs. Complete or schedule them to your calendar.'
              : 'Recommended protocols to improve your readiness factors. Complete or schedule them to your calendar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Strategy */}
          {recommendations.overallStrategy && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Recovery Strategy
              </h4>
              <p className="text-sm text-muted-foreground">{recommendations.overallStrategy}</p>
            </div>
          )}

          {/* Key Insights */}
          {recommendations.keyInsights && recommendations.keyInsights.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Key Insights:</h4>
              <ul className="space-y-1">
                {recommendations.keyInsights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.lowFactors.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Target className="h-4 w-4" />
              <span>Targeting: {recommendations.lowFactors.join(', ').replace(/_/g, ' ')}</span>
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
                        {protocol.aiReasoning && (
                          <div className="p-3 rounded bg-primary/5 border border-primary/20">
                            <h4 className="font-medium mb-1 flex items-center gap-2">
                              <Sparkles className="h-3 w-3 text-primary" />
                              AI Recommendation
                            </h4>
                            <p className="text-muted-foreground">{protocol.aiReasoning}</p>
                            {protocol.suggestedTiming && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <span className="font-medium">Best time:</span> {protocol.suggestedTiming}
                              </p>
                            )}
                          </div>
                        )}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSchedulingProtocol(protocol)}
                        data-testid={`button-schedule-${protocol.id}`}
                      >
                        <CalendarPlus className="h-4 w-4 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleVote(protocol.id, 'upvote')}
                      disabled={voteMutation.isPending}
                      data-testid={`button-upvote-${protocol.id}`}
                      title="Good suggestion - won't schedule now"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleVote(protocol.id, 'downvote')}
                      disabled={voteMutation.isPending}
                      data-testid={`button-downvote-${protocol.id}`}
                      title="Don't suggest this again"
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
      
      {/* Advanced Scheduling Dialog */}
      {schedulingProtocol && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Schedule Recovery Session</CardTitle>
              <CardDescription>
                Set up &quot;{schedulingProtocol.name}&quot; in your calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Suggestions */}
              {schedulingProtocol.suggestedFrequency && (
                <div className="p-3 rounded bg-primary/5 border border-primary/20">
                  <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    AI Recommendation
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><span className="font-medium">Frequency:</span> {schedulingProtocol.suggestedFrequency}</p>
                    {schedulingProtocol.suggestedTimeOfDay && (
                      <p><span className="font-medium">Best time:</span> {schedulingProtocol.suggestedTimeOfDay}</p>
                    )}
                    {schedulingProtocol.aiReasoning && (
                      <p className="mt-2">{schedulingProtocol.aiReasoning}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Frequency Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Frequency</label>
                <div className="flex gap-2 flex-wrap">
                  {(['once', 'daily', 'weekly'] as const).map((freq) => (
                    <Button
                      key={freq}
                      variant={scheduleFrequency === freq ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setScheduleFrequency(freq)}
                      data-testid={`button-frequency-${freq}`}
                    >
                      {freq === 'once' ? 'One-time' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Week Day Selector (only for weekly) */}
              {scheduleFrequency === 'weekly' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Which days?</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <Button
                        key={day}
                        variant={selectedWeekDays.includes(day) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedWeekDays(prev =>
                            prev.includes(day)
                              ? prev.filter(d => d !== day)
                              : [...prev, day]
                          );
                        }}
                        data-testid={`button-day-${day.toLowerCase()}`}
                      >
                        {day.substring(0, 3)}
                      </Button>
                    ))}
                  </div>
                  {selectedWeekDays.length === 0 && (
                    <p className="text-sm text-muted-foreground">Select at least one day</p>
                  )}
                </div>
              )}
              
              {/* Time Picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  data-testid="input-schedule-time"
                />
              </div>
              
              {/* Duration */}
              <div>
                <label className="text-sm font-medium">Duration</label>
                <p className="text-sm text-muted-foreground">{schedulingProtocol.duration} minutes</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSchedulingProtocol(null);
                    setScheduleFrequency('once');
                    setSelectedWeekDays([]);
                    setScheduleTime('10:00');
                  }}
                  data-testid="button-cancel-schedule"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Validation
                    if (scheduleFrequency === 'weekly' && selectedWeekDays.length === 0) {
                      toast({
                        title: "Select days",
                        description: "Please select at least one day for weekly schedule",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Create schedule
                    const [hours, minutes] = scheduleTime.split(':').map(Number);
                    const scheduledDate = new Date();
                    if (scheduleFrequency === 'once') {
                      scheduledDate.setDate(scheduledDate.getDate() + 1); // Tomorrow
                    }
                    scheduledDate.setHours(hours, minutes, 0, 0);
                    
                    scheduleSessionMutation.mutate({
                      protocolId: schedulingProtocol.id,
                      protocolName: schedulingProtocol.name,
                      duration: schedulingProtocol.duration,
                      frequency: scheduleFrequency,
                      weekDays: scheduleFrequency === 'weekly' ? selectedWeekDays : undefined,
                      timeOfDay: scheduleTime,
                      scheduledFor: scheduledDate,
                      category: schedulingProtocol.category,
                    });
                  }}
                  disabled={scheduleSessionMutation.isPending}
                  data-testid="button-confirm-schedule"
                >
                  {scheduleSessionMutation.isPending ? 'Scheduling...' : 'Schedule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
