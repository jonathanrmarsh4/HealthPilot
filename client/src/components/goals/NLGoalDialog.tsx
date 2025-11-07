import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Send, Check, AlertCircle, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NLGoalDialogProps {
  onSuccess?: () => void;
}

interface ParsedGoal {
  canonicalGoalType: string;
  displayName: string;
  goalEntities: Record<string, any>;
  confidence: number;
  suggestedDeadline: string | null;
  riskFlags: string[];
}

interface Metric {
  metricKey: string;
  label: string;
  targetValue: string | null;
  unit: string | null;
  source: string;
  direction: 'increase' | 'decrease' | 'maintain' | 'achieve';
  baselineValue: string | null;
  currentValue: string | null;
  confidence: number | null;
  priority: number;
}

interface Milestone {
  title: string;
  description: string | null;
  dueDate: string;
}

interface ParseResponse {
  parsedGoal: ParsedGoal;
  suggestedMetrics: Metric[];
  suggestedMilestones: Milestone[];
  warnings: string[];
}

export function NLGoalDialog({ onSuccess }: NLGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [parsedData, setParsedData] = useState<ParseResponse | null>(null);
  const { toast } = useToast();

  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/goals/parse", { inputText: text });
      return res.json();
    },
    onSuccess: (data: ParseResponse) => {
      setParsedData(data);
      toast({
        title: "Goal parsed successfully",
        description: "Review the parsed goal below and click Create to confirm",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to parse goal",
        description: error.message || "Could not understand the goal. Try rephrasing.",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!parsedData) throw new Error("No parsed data");
      const res = await apiRequest("POST", "/api/goals/create-with-plan", {
        inputText,
        canonicalGoalType: parsedData.parsedGoal.canonicalGoalType,
        displayName: parsedData.parsedGoal.displayName,
        goalEntities: parsedData.parsedGoal.goalEntities,
        targetDate: parsedData.parsedGoal.suggestedDeadline,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Goal created!",
        description: "Your goal with metrics, milestones, and plan has been created",
      });
      setOpen(false);
      setInputText("");
      setParsedData(null);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create goal",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleParse = () => {
    if (!inputText.trim()) {
      toast({
        title: "Empty input",
        description: "Please describe your goal",
        variant: "destructive",
      });
      return;
    }
    parseMutation.mutate(inputText);
  };

  const handleCreate = () => {
    createMutation.mutate();
  };

  const handleClose = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setInputText("");
      setParsedData(null);
    }
  };

  const getGoalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      endurance_event: "Endurance Event",
      body_comp: "Body Composition",
      strength: "Strength",
      health_marker: "Health Marker",
      habit: "Habit Building",
      hybrid: "Hybrid Goal",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="default" data-testid="button-create-nl-goal">
          <Sparkles className="h-4 w-4" />
          Create with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goal with Natural Language</DialogTitle>
          <DialogDescription>
            Describe your goal in your own words, and AI will create a structured plan with metrics and milestones
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Section */}
          <div className="space-y-2">
            <Label htmlFor="goal-input">Describe your goal</Label>
            <Textarea
              id="goal-input"
              data-testid="input-goal-text"
              placeholder="e.g., Run the New York Marathon and finish under 4 hours"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={3}
              disabled={parseMutation.isPending || createMutation.isPending}
            />
            <p className="text-sm text-muted-foreground">
              Examples: &quot;Lose 10kg in 6 months&quot;, &quot;Run a marathon under 4 hours&quot;, &quot;Lower my cholesterol to 180 mg/dL&quot;
            </p>
          </div>

          {/* Parse Button */}
          {!parsedData && (
            <Button
              onClick={handleParse}
              disabled={parseMutation.isPending || !inputText.trim()}
              className="w-full gap-2"
              data-testid="button-parse-goal"
            >
              {parseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Analyze Goal
                </>
              )}
            </Button>
          )}

          {/* Parsed Goal Preview */}
          {parsedData && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Parsed Goal Preview</h3>
                <Badge variant="outline" className="gap-1">
                  <Check className="h-3 w-3" />
                  {Math.round(parsedData.parsedGoal.confidence * 100)}% Confidence
                </Badge>
              </div>

              {/* Goal Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Goal Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="text-sm">
                    {getGoalTypeLabel(parsedData.parsedGoal.canonicalGoalType)}
                  </Badge>
                  {parsedData.parsedGoal.suggestedDeadline && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Target date: {new Date(parsedData.parsedGoal.suggestedDeadline).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Metrics */}
              {parsedData.suggestedMetrics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Metrics to Track ({parsedData.suggestedMetrics.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {parsedData.suggestedMetrics.slice(0, 5).map((metric, idx) => {
                        const currentVal = metric.currentValue || metric.baselineValue;
                        const targetVal = metric.targetValue;
                        
                        // Determine direction icon
                        const DirectionIcon = metric.direction === 'increase' ? TrendingUp 
                          : metric.direction === 'decrease' ? TrendingDown 
                          : metric.direction === 'achieve' ? Target 
                          : Minus;
                        
                        // Determine confidence color
                        const confidenceColor = metric.confidence !== null && metric.confidence >= 0.8 
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : metric.confidence !== null && metric.confidence >= 0.5 
                          ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                          : "bg-orange-500/10 text-orange-700 dark:text-orange-400";
                        
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                            data-testid={`metric-preview-${idx}`}
                          >
                            <DirectionIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">{metric.label}</p>
                                {metric.priority === 1 && (
                                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                                )}
                              </div>
                              
                              {/* Current → Target progression */}
                              {currentVal && targetVal && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm text-muted-foreground">
                                    {parseFloat(currentVal).toFixed(1)} {metric.unit}
                                  </span>
                                  <span className="text-xs text-muted-foreground">→</span>
                                  <span className="text-sm font-medium text-primary">
                                    {parseFloat(targetVal).toFixed(1)} {metric.unit}
                                  </span>
                                </div>
                              )}
                              
                              {/* Only target (no current value) */}
                              {!currentVal && targetVal && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Target: <span className="font-medium text-primary">{parseFloat(targetVal).toFixed(1)} {metric.unit}</span>
                                </p>
                              )}
                              
                              {/* Source and confidence */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {metric.source === 'healthkit' && 'Apple Health'}
                                  {metric.source === 'oura' && 'Oura Ring'}
                                  {metric.source === 'whoop' && 'Whoop'}
                                  {metric.source === 'manual' && 'Manual Entry'}
                                  {metric.source === 'calculated' && 'Calculated'}
                                  {!['healthkit', 'oura', 'whoop', 'manual', 'calculated'].includes(metric.source) && metric.source}
                                </span>
                                {metric.confidence !== null && metric.confidence < 1 && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${confidenceColor} border-0`}
                                  >
                                    {Math.round(metric.confidence * 100)}% confidence
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Milestones */}
              {parsedData.suggestedMilestones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Milestones ({parsedData.suggestedMilestones.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {parsedData.suggestedMilestones.slice(0, 4).map((milestone, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                          data-testid={`milestone-preview-${idx}`}
                        >
                          <Check className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{milestone.title}</p>
                            {milestone.description && (
                              <p className="text-xs text-muted-foreground">{milestone.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {new Date(milestone.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warnings and Risk Flags */}
              {(parsedData.warnings.length > 0 || parsedData.parsedGoal.riskFlags.length > 0) && (
                <Card className="border-orange-500/50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Warnings & Safety Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {parsedData.warnings.map((warning, idx) => (
                        <li key={`warning-${idx}`} className="text-sm text-muted-foreground">
                          • {warning}
                        </li>
                      ))}
                      {parsedData.parsedGoal.riskFlags.map((risk, idx) => (
                        <li key={`risk-${idx}`} className="text-sm text-orange-600 font-medium">
                          ⚠ {risk}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setParsedData(null)}
                  className="flex-1"
                  data-testid="button-edit-goal"
                >
                  Edit Input
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex-1 gap-2"
                  data-testid="button-confirm-create"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create Goal
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
