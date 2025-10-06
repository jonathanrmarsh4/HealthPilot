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
import { useLocale } from "@/contexts/LocaleContext";
import { unitConfigs, convertValue, type MetricType } from "@/lib/unitConversions";

const storageUnits: Record<string, string> = {
  "weight": "lbs",
  "blood-glucose": "mg/dL",
  "blood-pressure": "mmHg",
  "heart-rate": "bpm",
  "cholesterol": "mg/dL",
  "sleep": "hours",
  "steps": "steps",
  "exercise": "minutes",
};

export function DataInputForm() {
  const { toast } = useToast();
  const { unitSystem } = useLocale();
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

    const metricType = metric as MetricType;
    const config = unitConfigs[metricType];
    const currentUnit = config[unitSystem].unit;
    const storageUnit = storageUnits[metric];
    
    let numericValue = parseFloat(value);

    if (isNaN(numericValue)) {
      toast({
        title: "Error",
        description: "Please enter a valid numeric value",
        variant: "destructive",
      });
      return;
    }

    if (currentUnit !== storageUnit) {
      numericValue = convertValue(numericValue, metricType, currentUnit, storageUnit);
    }

    createBiomarkerMutation.mutate({
      type: metric,
      value: numericValue,
      unit: storageUnit,
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
                <SelectItem value="weight">{unitConfigs.weight[unitSystem].label}</SelectItem>
                <SelectItem value="blood-glucose">{unitConfigs["blood-glucose"][unitSystem].label}</SelectItem>
                <SelectItem value="blood-pressure">{unitConfigs["blood-pressure"][unitSystem].label}</SelectItem>
                <SelectItem value="heart-rate">{unitConfigs["heart-rate"][unitSystem].label}</SelectItem>
                <SelectItem value="cholesterol">{unitConfigs.cholesterol[unitSystem].label}</SelectItem>
                <SelectItem value="sleep">{unitConfigs.sleep[unitSystem].label}</SelectItem>
                <SelectItem value="steps">{unitConfigs.steps[unitSystem].label}</SelectItem>
                <SelectItem value="exercise">{unitConfigs.exercise[unitSystem].label}</SelectItem>
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
