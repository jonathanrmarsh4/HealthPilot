import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { getMetric, type MetricDef, listMetricsByCategory } from "@/lib/metrics/registry";
import { prefillForMetric } from "@/lib/metrics/prefill";
import { GoalFieldRenderer } from "./GoalFieldRenderer";

// Base schema for form - will be extended dynamically
const baseGoalFormSchema = z.object({
  metricType: z.string().min(1, "Metric type is required"),
  deadline: z.string().min(1, "Deadline is required"),
});

interface Goal {
  id: string;
  metricType: string;
  targetValue: number | null;
  targetValueData?: Record<string, number | string> | null;
  currentValue: number | null;
  currentValueData?: Record<string, number | string> | null;
  startValue: number | null;
  startValueData?: Record<string, number | string> | null;
  deadline: string;
  unit: string;
  status: string;
  createdByAI: number;
  createdAt: string;
}

interface GoalFormData {
  metricType: string;
  deadline: string;
  targetValue?: number | Record<string, number>;
  currentValue?: number | Record<string, number>;
  startValue?: number | Record<string, number>;
  [key: string]: unknown;
}

interface GoalFormProps {
  goal?: Goal | null;
  onSubmit: (data: GoalFormData) => void;
  isPending?: boolean;
}

export function GoalForm({ goal, onSubmit, isPending = false }: GoalFormProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricDef | null>(null);
  const [prefillNote, setPrefillNote] = useState<string | null>(null);
  const [isLoadingPrefill, setIsLoadingPrefill] = useState(false);

  // Get all metrics organized by category
  const metricsByCategory = listMetricsByCategory();

  // Build dynamic schema based on selected metric
  const buildFormSchema = (metric: MetricDef | null) => {
    if (!metric) return baseGoalFormSchema;

    const valueSchemaForField = (fieldName: string, isRequired: boolean) => {
      if (metric.valueSchema === "single") {
        const baseSchema = z
          .number({
            required_error: `${metric.label} is required`,
            invalid_type_error: `${metric.label} must be a number`,
          })
          .min(metric.validation?.min ?? 0)
          .max(metric.validation?.max ?? 999999);
        
        return isRequired ? baseSchema : baseSchema.optional();
      } else if (metric.valueSchema === "pair" && metric.fields) {
        const pairShape: Record<string, z.ZodNumber> = {};
        Object.keys(metric.fields).forEach((key) => {
          const fieldDef = metric.fields![key];
          pairShape[key] = z
            .number({
              required_error: `${fieldDef.label} is required`,
              invalid_type_error: `${fieldDef.label} must be a number`,
            })
            .min(fieldDef.min ?? 0)
            .max(fieldDef.max ?? 999999);
        });
        const pairSchema = z.object(pairShape);
        return isRequired ? pairSchema : pairSchema.optional();
      } else if (metric.valueSchema === "multi" && metric.fields) {
        const multiShape: Record<string, z.ZodNumber> = {};
        Object.keys(metric.fields).forEach((key) => {
          const fieldDef = metric.fields![key];
          multiShape[key] = z
            .number({
              required_error: `${fieldDef.label} is required`,
              invalid_type_error: `${fieldDef.label} must be a number`,
            })
            .min(fieldDef.min ?? 0)
            .max(fieldDef.max ?? 999999);
        });
        const multiSchema = z.object(multiShape);
        return isRequired ? multiSchema : multiSchema.optional();
      }
      return isRequired ? z.any() : z.any().optional();
    };

    return baseGoalFormSchema.extend({
      targetValue: valueSchemaForField("targetValue", true), // Target is REQUIRED
      currentValue: valueSchemaForField("currentValue", false), // Current is optional
      startValue: valueSchemaForField("startValue", false), // Start is optional
    });
  };

  const formSchema = buildFormSchema(selectedMetric);
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      metricType: goal?.metricType || "",
      deadline: goal?.deadline ? format(new Date(goal.deadline), "yyyy-MM-dd") : "",
    } as FormValues,
  });

  const metricType = form.watch("metricType");

  // Handle metric selection
  useEffect(() => {
    if (metricType) {
      const metric = getMetric(metricType);
      setSelectedMetric(metric || null);
    } else {
      setSelectedMetric(null);
    }
  }, [metricType]);

  // Auto-prefill when metric changes (only for new goals)
  useEffect(() => {
    if (!goal && selectedMetric) {
      setIsLoadingPrefill(true);
      setPrefillNote(null);

      prefillForMetric(selectedMetric.id)
        .then((result) => {
          if (result.current !== undefined) {
            form.setValue("currentValue", result.current as any);
          }
          if (result.starting !== undefined) {
            form.setValue("startValue", result.starting);
          }
          if (result.note) {
            setPrefillNote(result.note);
          }
        })
        .catch((_error) => {
          console.error("Prefill error:", _error);
          setPrefillNote("Failed to load previous data");
        })
        .finally(() => {
          setIsLoadingPrefill(false);
        });
    }
  }, [selectedMetric, goal, form]);

  // Load existing goal data
  useEffect(() => {
    if (goal) {
      const metric = getMetric(goal.metricType);
      if (metric) {
        // Load target value
        if (metric.valueSchema === "single") {
          form.setValue("targetValue", goal.targetValue ?? goal.targetValueData);
          form.setValue("currentValue", goal.currentValue ?? goal.currentValueData);
          form.setValue("startValue", goal.startValue ?? goal.startValueData);
        } else {
          form.setValue("targetValue", goal.targetValueData ?? goal.targetValue);
          form.setValue("currentValue", goal.currentValueData ?? goal.currentValue);
          form.setValue("startValue", goal.startValueData ?? goal.startValue);
        }
      }
    }
  }, [goal, form]);

  const handleSubmit = (data: FormValues) => {
    if (!selectedMetric) return;

    // Critical validation: ensure target value is provided
    if (data.targetValue === undefined || data.targetValue === null) {
      console.error("Target value is required but was not provided");
      return;
    }

    // Serialize values based on metric schema
    const serializeValue = (value: number | Record<string, number> | undefined) => {
      if (value === undefined || value === null) return { simple: null, data: null };
      if (selectedMetric.valueSchema === "single") {
        return { simple: Number(value), data: null };
      } else {
        return { simple: null, data: value };
      }
    };

    const target = serializeValue(data.targetValue);
    const current = serializeValue(data.currentValue);
    const start = serializeValue(data.startValue);

    // Double-check that target was serialized properly
    if (target.simple === null && target.data === null) {
      console.error("Failed to serialize target value");
      return;
    }

    onSubmit({
      metricType: data.metricType,
      targetValue: target.simple,
      targetValueData: target.data,
      currentValue: current.simple,
      currentValueData: current.data,
      startValue: start.simple,
      startValueData: start.data,
      deadline: data.deadline,
      unit: selectedMetric.unit || "",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Metric Type Selection */}
        <FormField
          control={form.control}
          name="metricType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Health Metric</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!!goal}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-metric-type">
                    <SelectValue placeholder="Select a metric to track" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(metricsByCategory).map(([category, metrics]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                        {category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      {metrics.map((metric) => (
                        <SelectItem
                          key={metric.id}
                          value={metric.id}
                          data-testid={`option-metric-${metric.id}`}
                        >
                          {metric.label} {metric.unit ? `(${metric.unit})` : ""}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Show loading state while prefilling */}
        {isLoadingPrefill && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Loading your previous data...</AlertDescription>
          </Alert>
        )}

        {/* Show prefill note if no data found */}
        {prefillNote && !isLoadingPrefill && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{prefillNote}</AlertDescription>
          </Alert>
        )}

        {/* Dynamic value fields based on selected metric */}
        {selectedMetric && (
          <>
            {/* Target Value */}
            <div>
              <FormLabel className="text-base">Target Value</FormLabel>
              <FormDescription className="mb-2">
                Your goal for {selectedMetric.label.toLowerCase()}
              </FormDescription>
              <GoalFieldRenderer
                metric={selectedMetric}
                form={form}
                fieldPrefix="targetValue"
                showLabels={false}
              />
            </div>

            {/* Current Value */}
            <div>
              <FormLabel className="text-base">Current Value (Optional)</FormLabel>
              <FormDescription className="mb-2">
                Your current {selectedMetric.label.toLowerCase()}
              </FormDescription>
              <GoalFieldRenderer
                metric={selectedMetric}
                form={form}
                fieldPrefix="currentValue"
                showLabels={false}
              />
            </div>

            {/* Starting Value */}
            <div>
              <FormLabel className="text-base">Starting Value (Optional)</FormLabel>
              <FormDescription className="mb-2">
                Your baseline when starting this goal
              </FormDescription>
              <GoalFieldRenderer
                metric={selectedMetric}
                form={form}
                fieldPrefix="startValue"
                showLabels={false}
              />
            </div>
          </>
        )}

        {/* Deadline */}
        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deadline</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  min={format(new Date(), "yyyy-MM-dd")}
                  data-testid="input-deadline"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={isPending || !selectedMetric}
            data-testid="button-submit-goal"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {goal ? "Update Goal" : "Create Goal"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
