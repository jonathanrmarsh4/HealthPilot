import biomarkers from "./biomarkers.json";

export type SchemaKind = "single" | "pair" | "multi";
export type FieldRule = {
  label: string;
  min?: number;
  max?: number;
  integer?: boolean;
  decimals?: number;
};
export type MetricDef = {
  id: string;
  label: string;
  category: string;
  valueSchema: SchemaKind;
  fields?: Record<string, FieldRule>;
  unit?: string;
  validation?: FieldRule;
  prefill?: {
    sources?: string[];
    pick?: "latest" | "earliest";
    convert?: (raw: number) => number;
  };
  format?: { decimals?: number };
  isPanel?: boolean;
};

// Canonical units (metric/AU defaults)
const UNIT: Record<string, string> = {
  weight: "kg",
  "lean-body-mass": "kg",
  height: "cm",
  bmi: "kg/m²",
  "body-fat-percentage": "%",
  "waist-circumference": "cm",
  "blood-pressure": "mmHg",
  "heart-rate": "bpm",
  hrv: "ms",
  temperature: "°C",
  "respiratory-rate": "breaths/min",
  "oxygen-saturation": "%",
  steps: "steps",
  calories: "kcal",
  // Diabetes/Metabolic (metric)
  "blood-glucose": "mmol/L",
  "fasting-glucose": "mmol/L",
  hba1c: "%",
  insulin: "μIU/mL",
  // Lipids (metric)
  "ldl-cholesterol": "mmol/L",
  "hdl-cholesterol": "mmol/L",
  "total-cholesterol": "mmol/L",
  cholesterol: "mmol/L",
  triglycerides: "mmol/L",
  "vldl-cholesterol": "mmol/L",
  // Electrolytes
  sodium: "mmol/L",
  potassium: "mmol/L",
  chloride: "mmol/L",
  bicarbonate: "mmol/L",
  // Kidney
  creatinine: "μmol/L",
  bun: "mmol/L",
  urea: "mmol/L",
  egfr: "mL/min/1.73m²",
  // Liver
  alt: "U/L",
  ast: "U/L",
  alp: "U/L",
  bilirubin: "μmol/L",
  albumin: "g/L",
  ggt: "U/L",
  "total-protein": "g/L",
  globulin: "g/L",
  // Blood counts
  rbc: "M/μL",
  wbc: "K/μL",
  hemoglobin: "g/dL",
  hematocrit: "%",
  platelets: "K/μL",
  mcv: "fL",
  mch: "pg",
  mchc: "g/dL",
  rdw: "%",
  neutrophils: "%",
  lymphocytes: "%",
  monocytes: "%",
  eosinophils: "%",
  basophils: "%",
  // Thyroid
  tsh: "mIU/L",
  t3: "nmol/L",
  t4: "nmol/L",
  "free-t3": "pmol/L",
  "free-t4": "pmol/L",
  // Vitamins/Minerals
  "vitamin-d": "nmol/L",
  "vitamin-b12": "pmol/L",
  iron: "μmol/L",
  ferritin: "μg/L",
  calcium: "mmol/L",
  "corrected-calcium": "mmol/L",
  magnesium: "mmol/L",
  folate: "nmol/L",
  // Inflammation
  crp: "mg/L",
  esr: "mm/hr",
  // Hormones
  cortisol: "μg/dL",
  testosterone: "ng/dL",
  estrogen: "pg/mL",
  progesterone: "ng/mL",
  // Iron studies
  transferrin: "mg/dL",
  "transferrin-saturation": "%",
  // Other
  "uric-acid": "μmol/L",
  psa: "ng/mL",
  ldh: "U/L",
};

// Validation ranges for plausible values
const RANGE: Record<
  string,
  { min: number; max: number; decimals?: number; integer?: boolean }
> = {
  weight: { min: 20, max: 300, decimals: 1 },
  "lean-body-mass": { min: 20, max: 200, decimals: 1 },
  "body-fat-percentage": { min: 2, max: 60, decimals: 1 },
  height: { min: 100, max: 250, decimals: 0 },
  bmi: { min: 10, max: 60, decimals: 1 },
  "waist-circumference": { min: 40, max: 200, decimals: 1 },
  "blood-pressure_systolic": { min: 70, max: 250, integer: true },
  "blood-pressure_diastolic": { min: 40, max: 150, integer: true },
  "heart-rate": { min: 30, max: 220, integer: true },
  hrv: { min: 10, max: 200, integer: true },
  temperature: { min: 35, max: 42, decimals: 1 },
  "respiratory-rate": { min: 8, max: 40, integer: true },
  "oxygen-saturation": { min: 70, max: 100, integer: true },
  steps: { min: 0, max: 100000, integer: true },
  calories: { min: 0, max: 10000, integer: true },
  "fasting-glucose": { min: 2, max: 20, decimals: 1 },
  "blood-glucose": { min: 2, max: 30, decimals: 1 },
  hba1c: { min: 3, max: 15, decimals: 1 },
  insulin: { min: 0, max: 200, decimals: 1 },
  "ldl-cholesterol": { min: 0, max: 10, decimals: 1 },
  "hdl-cholesterol": { min: 0, max: 5, decimals: 1 },
  "total-cholesterol": { min: 0, max: 15, decimals: 1 },
  cholesterol: { min: 0, max: 15, decimals: 1 },
  triglycerides: { min: 0, max: 10, decimals: 1 },
  "vldl-cholesterol": { min: 0, max: 3, decimals: 1 },
  sodium: { min: 120, max: 160, integer: true },
  potassium: { min: 2, max: 7, decimals: 1 },
  chloride: { min: 80, max: 120, integer: true },
  bicarbonate: { min: 15, max: 35, integer: true },
  creatinine: { min: 30, max: 300, integer: true },
  urea: { min: 1, max: 30, decimals: 1 },
  egfr: { min: 10, max: 150, integer: true },
  alt: { min: 0, max: 500, integer: true },
  ast: { min: 0, max: 500, integer: true },
  alp: { min: 0, max: 500, integer: true },
  bilirubin: { min: 0, max: 100, integer: true },
  albumin: { min: 10, max: 70, integer: true },
  ggt: { min: 0, max: 500, integer: true },
  rbc: { min: 2, max: 8, decimals: 1 },
  wbc: { min: 1, max: 30, decimals: 1 },
  hemoglobin: { min: 5, max: 20, decimals: 1 },
  hematocrit: { min: 20, max: 70, decimals: 1 },
  platelets: { min: 50, max: 1000, integer: true },
  tsh: { min: 0, max: 20, decimals: 2 },
  "vitamin-d": { min: 10, max: 500, integer: true },
  "vitamin-b12": { min: 50, max: 2000, integer: true },
  iron: { min: 5, max: 50, integer: true },
  ferritin: { min: 10, max: 1000, integer: true },
  calcium: { min: 1.5, max: 3.5, decimals: 2 },
  magnesium: { min: 0.5, max: 1.5, decimals: 2 },
  crp: { min: 0, max: 100, decimals: 1 },
  testosterone: { min: 50, max: 2000, integer: true },
  cortisol: { min: 0, max: 50, decimals: 1 },
};

// Unit conversion helpers
const mgdlToMmolL = {
  glucose: 1 / 18.0,
  cholesterol: 1 / 38.67,
  triglycerides: 1 / 88.57,
};

// Exemplar metrics with explicit definitions
const exemplars: Record<string, MetricDef> = {
  weight: {
    id: "weight",
    label: "Weight",
    category: "vitals_body_metrics",
    valueSchema: "single",
    unit: "kg",
    validation: {
      label: "Weight",
      ...RANGE.weight,
    },
    prefill: { sources: ["weight"], pick: "latest" },
    format: { decimals: 1 },
  },
  "lean-body-mass": {
    id: "lean-body-mass",
    label: "Lean Body Mass",
    category: "vitals_body_metrics",
    valueSchema: "single",
    unit: "kg",
    validation: {
      label: "Lean Body Mass",
      ...RANGE["lean-body-mass"],
    },
    prefill: { sources: ["lean-body-mass"], pick: "latest" },
    format: { decimals: 1 },
  },
  "body-fat-percentage": {
    id: "body-fat-percentage",
    label: "Body Fat %",
    category: "vitals_body_metrics",
    valueSchema: "single",
    unit: "%",
    validation: {
      label: "Body Fat %",
      ...RANGE["body-fat-percentage"],
    },
    prefill: { sources: ["body-fat-percentage"], pick: "latest" },
    format: { decimals: 1 },
  },
  "blood-pressure": {
    id: "blood-pressure",
    label: "Blood Pressure",
    category: "vitals_body_metrics",
    valueSchema: "pair",
    unit: "mmHg",
    fields: {
      systolic: {
        label: "Systolic",
        ...RANGE["blood-pressure_systolic"],
      },
      diastolic: {
        label: "Diastolic",
        ...RANGE["blood-pressure_diastolic"],
      },
    },
    prefill: {
      sources: ["blood-pressure"],
      pick: "latest",
    },
    format: { decimals: 0 },
  },
  "heart-rate": {
    id: "heart-rate",
    label: "Resting Heart Rate",
    category: "vitals_body_metrics",
    valueSchema: "single",
    unit: "bpm",
    validation: {
      label: "Heart Rate",
      ...RANGE["heart-rate"],
    },
    prefill: { sources: ["heart-rate"], pick: "latest" },
    format: { decimals: 0 },
  },
  "fasting-glucose": {
    id: "fasting-glucose",
    label: "Fasting Glucose",
    category: "diabetes_metabolic",
    valueSchema: "single",
    unit: "mmol/L",
    validation: {
      label: "Fasting Glucose",
      ...RANGE["fasting-glucose"],
    },
    prefill: {
      sources: ["fasting-glucose", "blood-glucose"],
      pick: "latest",
      convert: (mgdl: number) => +(mgdl * mgdlToMmolL.glucose).toFixed(1),
    },
    format: { decimals: 1 },
  },
  "blood-glucose": {
    id: "blood-glucose",
    label: "Blood Glucose",
    category: "diabetes_metabolic",
    valueSchema: "single",
    unit: "mmol/L",
    validation: {
      label: "Blood Glucose",
      ...RANGE["blood-glucose"],
    },
    prefill: {
      sources: ["blood-glucose"],
      pick: "latest",
      convert: (mgdl: number) => +(mgdl * mgdlToMmolL.glucose).toFixed(1),
    },
    format: { decimals: 1 },
  },
  "ldl-cholesterol": {
    id: "ldl-cholesterol",
    label: "LDL Cholesterol",
    category: "lipid_panel",
    valueSchema: "single",
    unit: "mmol/L",
    validation: {
      label: "LDL Cholesterol",
      ...RANGE["ldl-cholesterol"],
    },
    prefill: {
      sources: ["ldl-cholesterol"],
      pick: "latest",
      convert: (mgdl: number) => +(mgdl * mgdlToMmolL.cholesterol).toFixed(1),
    },
    format: { decimals: 1 },
  },
  steps: {
    id: "steps",
    label: "Daily Steps",
    category: "vitals_body_metrics",
    valueSchema: "single",
    unit: "steps",
    validation: {
      label: "Steps",
      ...RANGE.steps,
    },
    prefill: { sources: ["steps"], pick: "latest" },
    format: { decimals: 0 },
  },
};

// Helper to convert kebab-case to Title Case
function titleCase(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Generate default definition for a metric
function defFor(id: string, category: string): MetricDef {
  if (exemplars[id]) return exemplars[id];
  const unit = UNIT[id] ?? "";
  const vr = RANGE[id];
  return {
    id,
    label: titleCase(id),
    category,
    valueSchema: "single",
    unit,
    validation: vr
      ? {
          label: titleCase(id),
          ...vr,
        }
      : undefined,
    prefill: { sources: [id], pick: "latest" },
    format: vr?.decimals !== undefined ? { decimals: vr.decimals } : undefined,
  };
}

// Build the full registry
const registry: Record<string, MetricDef> = { ...exemplars };
Object.entries(biomarkers.biomarkers).forEach(([category, ids]) => {
  (ids as string[]).forEach((id) => {
    if (!registry[id]) registry[id] = defFor(id, category);
  });
});

// Export helper functions
export function getMetric(id: string): MetricDef | undefined {
  return registry[id];
}

export function listMetrics(): MetricDef[] {
  return Object.values(registry);
}

export function listMetricsByCategory(): Record<string, MetricDef[]> {
  const byCategory: Record<string, MetricDef[]> = {};
  Object.values(registry).forEach((metric) => {
    if (!byCategory[metric.category]) {
      byCategory[metric.category] = [];
    }
    byCategory[metric.category].push(metric);
  });
  return byCategory;
}

export default registry;
