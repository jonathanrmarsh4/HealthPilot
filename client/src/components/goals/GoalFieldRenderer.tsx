import { type MetricDef } from "@/lib/metrics/registry";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { type UseFormReturn } from "react-hook-form";

interface GoalFieldRendererProps {
  metric: MetricDef;
  form: UseFormReturn<any>;
  fieldPrefix?: string;
  showLabels?: boolean;
}

export function GoalFieldRenderer({
  metric,
  form,
  fieldPrefix = "",
  showLabels = true,
}: GoalFieldRendererProps) {
  // Single value field (e.g., weight, glucose)
  if (metric.valueSchema === "single") {
    return (
      <FormField
        control={form.control}
        name={fieldPrefix}
        render={({ field }) => (
          <FormItem>
            {showLabels && (
              <FormLabel>
                {metric.label} {metric.unit ? `(${metric.unit})` : ""}
              </FormLabel>
            )}
            <FormControl>
              <Input
                type="number"
                placeholder={`Enter ${metric.label.toLowerCase()}`}
                step={
                  metric.validation?.integer
                    ? "1"
                    : metric.format?.decimals
                      ? Math.pow(10, -metric.format.decimals).toString()
                      : "0.1"
                }
                min={metric.validation?.min}
                max={metric.validation?.max}
                {...field}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === "" ? undefined : Number(value));
                }}
                value={field.value ?? ""}
                data-testid={`input-${fieldPrefix}`}
              />
            </FormControl>
            {metric.validation && (
              <FormDescription className="text-xs">
                Range: {metric.validation.min} - {metric.validation.max}{" "}
                {metric.unit}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Pair value field (e.g., blood pressure)
  if (metric.valueSchema === "pair" && metric.fields) {
    const fieldKeys = Object.keys(metric.fields);
    return (
      <div className="space-y-3">
        {showLabels && (
          <FormLabel>
            {metric.label} {metric.unit ? `(${metric.unit})` : ""}
          </FormLabel>
        )}
        <div className="grid grid-cols-2 gap-3">
          {fieldKeys.map((key) => {
            const fieldDef = metric.fields![key];
            return (
              <FormField
                key={key}
                control={form.control}
                name={`${fieldPrefix}.${key}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{fieldDef.label}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={fieldDef.label}
                        step={fieldDef.integer ? "1" : "0.1"}
                        min={fieldDef.min}
                        max={fieldDef.max}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(
                            value === "" ? undefined : Number(value)
                          );
                        }}
                        value={field.value ?? ""}
                        data-testid={`input-${fieldPrefix}-${key}`}
                      />
                    </FormControl>
                    {fieldDef.min !== undefined && fieldDef.max !== undefined && (
                      <FormDescription className="text-xs">
                        {fieldDef.min}-{fieldDef.max}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Multi-field (future: lipid panel, etc.)
  if (metric.valueSchema === "multi" && metric.fields) {
    const fieldKeys = Object.keys(metric.fields);
    return (
      <div className="space-y-3">
        {showLabels && (
          <FormLabel>
            {metric.label} {metric.unit ? `(${metric.unit})` : ""}
          </FormLabel>
        )}
        <div className="grid grid-cols-1 gap-3">
          {fieldKeys.map((key) => {
            const fieldDef = metric.fields![key];
            return (
              <FormField
                key={key}
                control={form.control}
                name={`${fieldPrefix}.${key}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{fieldDef.label}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={fieldDef.label}
                        step={fieldDef.integer ? "1" : "0.1"}
                        min={fieldDef.min}
                        max={fieldDef.max}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(
                            value === "" ? undefined : Number(value)
                          );
                        }}
                        value={field.value ?? ""}
                        data-testid={`input-${fieldPrefix}-${key}`}
                      />
                    </FormControl>
                    {fieldDef.min !== undefined && fieldDef.max !== undefined && (
                      <FormDescription className="text-xs">
                        {fieldDef.min}-{fieldDef.max}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback for unknown schema
  return (
    <div className="text-sm text-muted-foreground">
      Unsupported metric schema: {metric.valueSchema}
    </div>
  );
}
