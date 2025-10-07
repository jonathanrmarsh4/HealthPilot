export type MetricType = "weight" | "blood-glucose" | "blood-pressure" | "heart-rate" | "cholesterol" | "sleep" | "steps" | "exercise" | "height" | "temperature";

export interface UnitConfig {
  imperial: {
    unit: string;
    label: string;
  };
  metric: {
    unit: string;
    label: string;
  };
}

export const unitConfigs: Record<MetricType, UnitConfig> = {
  weight: {
    imperial: { unit: "lbs", label: "Weight (lbs)" },
    metric: { unit: "kg", label: "Weight (kg)" },
  },
  height: {
    imperial: { unit: "in", label: "Height (in)" },
    metric: { unit: "cm", label: "Height (cm)" },
  },
  "blood-glucose": {
    imperial: { unit: "mg/dL", label: "Blood Glucose (mg/dL)" },
    metric: { unit: "mmol/L", label: "Blood Glucose (mmol/L)" },
  },
  "blood-pressure": {
    imperial: { unit: "mmHg", label: "Blood Pressure (mmHg)" },
    metric: { unit: "mmHg", label: "Blood Pressure (mmHg)" },
  },
  "heart-rate": {
    imperial: { unit: "bpm", label: "Heart Rate (bpm)" },
    metric: { unit: "bpm", label: "Heart Rate (bpm)" },
  },
  cholesterol: {
    imperial: { unit: "mg/dL", label: "Cholesterol (mg/dL)" },
    metric: { unit: "mmol/L", label: "Cholesterol (mmol/L)" },
  },
  sleep: {
    imperial: { unit: "hours", label: "Sleep Duration (hours)" },
    metric: { unit: "hours", label: "Sleep Duration (hours)" },
  },
  steps: {
    imperial: { unit: "steps", label: "Steps" },
    metric: { unit: "steps", label: "Steps" },
  },
  exercise: {
    imperial: { unit: "minutes", label: "Exercise Duration (min)" },
    metric: { unit: "minutes", label: "Exercise Duration (min)" },
  },
  temperature: {
    imperial: { unit: "°F", label: "Temperature (°F)" },
    metric: { unit: "°C", label: "Temperature (°C)" },
  },
};

export function convertToMetric(value: number, type: MetricType, fromUnit: string): number {
  const config = unitConfigs[type];
  
  if (fromUnit === config.metric.unit) {
    return value;
  }
  
  switch (type) {
    case "weight":
      return fromUnit === "lbs" ? value * 0.453592 : value;
    case "height":
      return fromUnit === "in" ? value * 2.54 : value;
    case "blood-glucose":
      return fromUnit === "mg/dL" ? value / 18.018 : value;
    case "cholesterol":
      return fromUnit === "mg/dL" ? value / 38.67 : value;
    case "temperature":
      return fromUnit === "°F" ? (value - 32) * 5/9 : value;
    default:
      return value;
  }
}

export function convertFromMetric(value: number, type: MetricType, toUnit: string): number {
  const config = unitConfigs[type];
  
  if (toUnit === config.metric.unit) {
    return value;
  }
  
  switch (type) {
    case "weight":
      return toUnit === "lbs" ? value / 0.453592 : value;
    case "height":
      return toUnit === "in" ? value / 2.54 : value;
    case "blood-glucose":
      return toUnit === "mg/dL" ? value * 18.018 : value;
    case "cholesterol":
      return toUnit === "mg/dL" ? value * 38.67 : value;
    case "temperature":
      return toUnit === "°F" ? (value * 9/5) + 32 : value;
    default:
      return value;
  }
}

export function convertValue(
  value: number,
  type: MetricType,
  fromUnit: string,
  toUnit: string
): number {
  if (fromUnit === toUnit) {
    return value;
  }
  
  const metricValue = convertToMetric(value, type, fromUnit);
  return convertFromMetric(metricValue, type, toUnit);
}

export function formatValue(value: number, type: MetricType): string {
  switch (type) {
    case "weight":
    case "height":
      return value.toFixed(1);
    case "blood-glucose":
    case "cholesterol":
      return value.toFixed(1);
    case "temperature":
      return value.toFixed(1);
    case "blood-pressure":
    case "heart-rate":
    case "steps":
    case "exercise":
      return Math.round(value).toString();
    case "sleep":
      return value.toFixed(1);
    default:
      return value.toString();
  }
}
