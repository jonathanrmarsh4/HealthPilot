import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export function DataInputForm() {
  const [date, setDate] = useState<Date>(new Date());
  const [metric, setMetric] = useState<string>("");
  const [value, setValue] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting data:", { metric, value, date });
    setMetric("");
    setValue("");
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
                <SelectItem value="weight">Weight</SelectItem>
                <SelectItem value="blood-glucose">Blood Glucose</SelectItem>
                <SelectItem value="blood-pressure">Blood Pressure</SelectItem>
                <SelectItem value="heart-rate">Heart Rate</SelectItem>
                <SelectItem value="sleep">Sleep Duration</SelectItem>
                <SelectItem value="steps">Steps</SelectItem>
                <SelectItem value="exercise">Exercise Duration</SelectItem>
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
            disabled={!metric || !value}
            data-testid="button-submit-data"
          >
            Log Data
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
