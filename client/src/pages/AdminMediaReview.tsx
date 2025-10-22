import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Dumbbell, Target, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { searchExerciseDBCandidates, type Candidate } from "@/lib/exercisedb";

interface MediaLog {
  id: number;
  hpExerciseId: string;
  hpName: string;
  target: string;
  bodyPart: string;
  equipment: string | null;
  reason: string;
  score: number;
  candidateCount: number;
  chosenId: string | null;
  chosenName: string | null;
}

export default function AdminMediaReview() {
  const [items, setItems] = useState<MediaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingItems();
  }, []);

  async function loadPendingItems() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/media-logs?reason=LOW_CONFIDENCE&limit=200');
      const data = await response.json();
      setItems(data.logs || []);
    } catch (error) {
      console.error('Failed to load media logs:', error);
      toast({
        title: "Error",
        description: "Failed to load pending media reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleChoose(logId: number, hpId: string, chosenId: string | null) {
    try {
      await fetch('/api/admin/media-logs/' + logId + '/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus: 'approved',
          approvedExternalId: chosenId,
        }),
      });

      // Remove from list
      setItems(prev => prev.filter(x => x.id !== logId));

      toast({
        title: "Success",
        description: chosenId ? "Match approved" : "Marked as no match",
      });
    } catch (error) {
      console.error('Failed to approve match:', error);
      toast({
        title: "Error",
        description: "Failed to save your decision",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6" data-testid="media-review-loading">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="media-review-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Exercise Media Review</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve exercise-to-GIF matches with low confidence scores
        </p>
        <div className="mt-4 flex items-center gap-4">
          <Badge variant="secondary" data-testid="pending-count">
            {items.length} Pending
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPendingItems}
            data-testid="button-refresh"
          >
            Refresh
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-muted-foreground">No pending media reviews at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6" data-testid="review-items">
          {items.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              onChoose={(chosenId) => handleChoose(item.id, item.hpExerciseId, chosenId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  item,
  onChoose,
}: {
  item: MediaLog;
  onChoose: (chosenId: string | null) => void;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCandidates();
  }, [item.hpName]);

  async function loadCandidates() {
    try {
      setLoading(true);
      const results = await searchExerciseDBCandidates(item.hpName);
      setCandidates(results);
    } catch (error) {
      console.error('Failed to load candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card data-testid={`review-card-${item.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Dumbbell className="h-5 w-5" />
          {item.hpName}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            {item.target}
          </div>
          <span>•</span>
          <div>{item.bodyPart}</div>
          {item.equipment && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {item.equipment}
              </div>
            </>
          )}
          <span>•</span>
          <Badge variant={item.score >= 6 ? "default" : "secondary"}>
            Score: {item.score}/10
          </Badge>
          <span>•</span>
          <Badge variant="outline">
            {item.candidateCount} candidates
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid sm:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {candidates.slice(0, 8).map((c) => (
              <button
                key={c.id}
                className="border rounded-lg p-3 text-left hover-elevate active-elevate-2 transition-all"
                onClick={() => onChoose(c.id)}
                data-testid={`candidate-${c.id}`}
              >
                <div className="text-sm font-medium mb-1 line-clamp-2">{c.name}</div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {c.target}
                  </div>
                  <div>{c.bodyPart}</div>
                  {c.equipment && (
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {c.equipment}
                    </div>
                  )}
                </div>
                {c.gifUrl && (
                  <img
                    src={c.gifUrl}
                    alt={c.name}
                    className="mt-2 w-full h-32 object-contain rounded bg-muted"
                    loading="lazy"
                  />
                )}
              </button>
            ))}
            <button
              className="border rounded-lg p-3 text-left hover-elevate active-elevate-2 transition-all flex items-center justify-center"
              onClick={() => onChoose(null)}
              data-testid="button-no-match"
            >
              <div className="text-center">
                <XCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <div className="text-sm font-medium">None Match</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Skip this exercise
                </div>
              </div>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
