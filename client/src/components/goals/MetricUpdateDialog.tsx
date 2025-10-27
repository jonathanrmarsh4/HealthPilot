import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MetricUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  metric: {
    id: string;
    label: string;
    unit: string | null;
    currentValue: string | null;
    targetValue: string | null;
    direction: 'increase' | 'decrease' | 'maintain' | 'achieve';
  };
  onSuccess?: () => void;
}

export function MetricUpdateDialog({
  open,
  onOpenChange,
  goalId,
  metric,
  onSuccess,
}: MetricUpdateDialogProps) {
  const [value, setValue] = useState(metric.currentValue || "");
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (currentValue: string) => {
      const res = await apiRequest(
        "PATCH",
        `/api/goals/${goalId}/metrics/${metric.id}`,
        { currentValue: parseFloat(currentValue) }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Metric updated",
        description: `${metric.label} has been updated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/goals", goalId, "metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      onOpenChange(false);
      setValue("");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update metric",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      toast({
        title: "Empty value",
        description: "Please enter a value",
        variant: "destructive",
      });
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-metric-update">
        <DialogHeader>
          <DialogTitle>Update {metric.label}</DialogTitle>
          <DialogDescription>
            Enter your current {metric.label.toLowerCase()} value
            {metric.targetValue && ` (target: ${metric.targetValue}${metric.unit ? ` ${metric.unit}` : ""})`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">
                Current Value {metric.unit && `(${metric.unit})`}
              </Label>
              <Input
                id="value"
                type="number"
                step="any"
                placeholder={metric.currentValue || "Enter value"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                data-testid="input-metric-value"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save"
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
