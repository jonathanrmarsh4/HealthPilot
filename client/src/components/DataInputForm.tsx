import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const metricConfig: Record<string, { unit: string; type: string }> = {
  "weight": { unit: "lbs", type: "weight" },
  "blood-glucose": { unit: "mg/dL", type: "blood-glucose" },
  "blood-pressure": { unit: "mmHg", type: "blood-pressure" },
  "heart-rate": { unit: "bpm", type: "heart-rate" },
  "cholesterol": { unit: "mg/dL", type: "cholesterol" },
  "sleep": { unit: "hours", type: "sleep" },
  "steps": { unit: "steps", type: "steps" },
  "exercise": { unit: "minutes", type: "exercise" },
};

export function DataInputForm() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [metric, setMetric] = useState<string>("");
  const [value, setValue] = useState<string>("");

  const createBiomarkerMutation = useMutation({
    mutationFn: async (data: { type: string; value: number; unit: string; recordedAt: Date; source: string; userId: string }) => {
      const res = await apiRequest("POST", "/api/biomarkers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/biomarkers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/biomarkers/chart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Biomarker data logged successfully!",
      });
      setMetric("");
      setValue("");
      setDate(new Date());
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log biomarker data",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!metric || !value) return;

    const config = metricConfig[metric];
    const numericValue = parseFloat(value);

    if (isNaN(numericValue)) {
      toast({
        title: "Error",
        description: "Please enter a valid numeric value",
        variant: "destructive",
      });
      return;
    }

    createBiomarkerMutation.mutate({
      type: config.type,
      value: numericValue,
      unit: config.unit,
      recordedAt: date,
      source: "manual",
      userId: "user-1",
    });
  };

  return (
    <Card data-testid="card-data-input">
      <CardHeader>
        <CardTitle>Log Health Data</CardTitle>
        <CardDescription>
          Manually enter your health metrics, fitness data, or biomarker readings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="metric">Metric Type</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger id="metric" data-testid="select-metric">
                <SelectValue placeholder="Select a metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Weight (lbs)</SelectItem>
                <SelectItem value="blood-glucose">Blood Glucose (mg/dL)</SelectItem>
                <SelectItem value="blood-pressure">Blood Pressure (mmHg)</SelectItem>
                <SelectItem value="heart-rate">Heart Rate (bpm)</SelectItem>
                <SelectItem value="cholesterol">Cholesterol (mg/dL)</SelectItem>
                <SelectItem value="sleep">Sleep Duration (hours)</SelectItem>
                <SelectItem value="steps">Steps</SelectItem>
                <SelectItem value="exercise">Exercise Duration (min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              type="text"
              placeholder="Enter value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              data-testid="input-value"
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="button-date-picker"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!metric || !value || createBiomarkerMutation.isPending}
            data-testid="button-submit-data"
          >
            {createBiomarkerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging...
              </>
            ) : (
              "Log Data"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
