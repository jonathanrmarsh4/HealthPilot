export interface BiomarkerConfig {
  title: string;
  description: string;
  days: number;
  color: string;
  subsection?: string;
  referenceRange?: {
    low: number;
    high: number;
  };
}

export interface SubsectionConfig {
  title: string;
  biomarkers: string[];
}

export const subsections: Record<string, SubsectionConfig> = {
  "electrolytes-renal": {
    title: "Electrolytes / Renal Function",
    biomarkers: ["sodium", "potassium", "chloride", "bicarbonate", "urea", "creatinine", "egfr", "calcium", "corrected-calcium", "magnesium", "uric-acid"]
  },
  "liver-function": {
    title: "Liver Function",
    biomarkers: ["total-protein", "albumin", "alp", "bilirubin", "ggt", "ast", "alt", "globulin"]
  },
  "hormone-studies": {
    title: "Hormone Studies",
    biomarkers: ["progesterone", "cortisol"]
  },
  "haematology": {
    title: "General Haematology",
    biomarkers: ["hemoglobin", "rbc", "hematocrit", "mcv", "mch", "mchc", "rdw", "wbc", "neutrophils", "lymphocytes", "monocytes", "eosinophils", "basophils", "platelets"]
  },
  "lipid-studies": {
    title: "Lipid Studies",
    biomarkers: ["cholesterol", "total-cholesterol", "hdl-cholesterol", "ldl-cholesterol", "triglycerides", "vldl-cholesterol"]
  },
  "iron-studies": {
    title: "Iron Studies",
    biomarkers: ["iron", "transferrin", "transferrin-saturation", "ferritin"]
  },
  "biochemistry": {
    title: "Biochemistry",
    biomarkers: ["crp"]
  },
  "thyroid-function": {
    title: "Thyroid Function",
    biomarkers: ["free-t4", "tsh", "free-t3", "t3", "t4"]
  },
  "androgen-studies": {
    title: "Androgen Studies",
    biomarkers: ["testosterone", "estrogen"]
  },
  "other": {
    title: "Other",
    biomarkers: ["blood-glucose", "fasting-glucose", "hba1c", "insulin", "vitamin-d", "vitamin-b12", "folate", "weight", "height", "bmi", "blood-pressure", "heart-rate", "steps", "calories", "temperature", "oxygen-saturation", "psa"]
  }
};

export const biomarkerDisplayConfig: Record<string, BiomarkerConfig> = {
  // Lipid Panel (values in mg/dL)
  "ldl-cholesterol": {
    title: "LDL Cholesterol",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 0, high: 100 } // Optimal < 100 mg/dL
  },
  "hdl-cholesterol": {
    title: "HDL Cholesterol",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 40, high: 200 } // > 40 mg/dL for men, > 50 for women
  },
  "total-cholesterol": {
    title: "Total Cholesterol",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 0, high: 200 } // < 200 mg/dL desirable
  },
  "cholesterol": {
    title: "Total Cholesterol",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 0, high: 200 }
  },
  "triglycerides": {
    title: "Triglycerides",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 0, high: 150 } // < 150 mg/dL normal
  },
  "vldl-cholesterol": {
    title: "VLDL Cholesterol",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 2, high: 30 } // 2-30 mg/dL
  },
  
  // Liver Function
  "alt": {
    title: "ALT (Liver Enzyme)",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "ast": {
    title: "AST (Liver Enzyme)",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "alp": {
    title: "Alkaline Phosphatase",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  "bilirubin": {
    title: "Bilirubin",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "albumin": {
    title: "Albumin",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
  },
  "ggt": {
    title: "GGT",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  
  // Kidney Function
  "creatinine": {
    title: "Creatinine",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "bun": {
    title: "BUN (Blood Urea Nitrogen)",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  "egfr": {
    title: "eGFR",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "urea": {
    title: "Urea",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
  },
  
  // Blood Counts
  "rbc": {
    title: "Red Blood Cell Count",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "wbc": {
    title: "White Blood Cell Count",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "hemoglobin": {
    title: "Hemoglobin",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  "hematocrit": {
    title: "Hematocrit",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "platelets": {
    title: "Platelet Count",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
  },
  "mcv": {
    title: "MCV",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "mch": {
    title: "MCH",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "mchc": {
    title: "MCHC",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  
  // Thyroid
  "tsh": {
    title: "TSH (Thyroid)",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "t3": {
    title: "T3",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
  },
  "t4": {
    title: "T4",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "free-t3": {
    title: "Free T3",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "free-t4": {
    title: "Free T4",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  
  // Diabetes (glucose in mg/dL, HbA1c in %)
  "hba1c": {
    title: "HbA1c",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 4, high: 5.6 } // < 5.7% normal
  },
  "blood-glucose": {
    title: "Blood Glucose",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 70, high: 140 } // 70-140 mg/dL normal random
  },
  "fasting-glucose": {
    title: "Fasting Glucose",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 70, high: 100 } // 70-100 mg/dL normal fasting
  },
  "insulin": {
    title: "Insulin",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 2.6, high: 24.9 } // 2.6-24.9 μIU/mL fasting
  },
  
  // Vitamins & Minerals
  "vitamin-d": {
    title: "Vitamin D",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "vitamin-b12": {
    title: "Vitamin B12",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  "iron": {
    title: "Iron",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "ferritin": {
    title: "Ferritin",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
  },
  "calcium": {
    title: "Calcium",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "magnesium": {
    title: "Magnesium",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "folate": {
    title: "Folate",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  
  // Inflammation
  "crp": {
    title: "C-Reactive Protein",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "esr": {
    title: "ESR",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
  },
  
  // Electrolytes
  "sodium": {
    title: "Sodium",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "potassium": {
    title: "Potassium",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "chloride": {
    title: "Chloride",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  "bicarbonate": {
    title: "Bicarbonate",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  
  // Vitals & Body Metrics
  "blood-pressure": {
    title: "Blood Pressure (Systolic)",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 90, high: 120 } // < 120 mmHg normal systolic
  },
  "heart-rate": {
    title: "Resting Heart Rate",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 60, high: 100 } // 60-100 bpm normal resting
  },
  "temperature": {
    title: "Body Temperature",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 97.0, high: 99.0 } // 97-99°F normal (stored in F)
  },
  "respiratory-rate": {
    title: "Respiratory Rate",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 12, high: 20 } // 12-20 breaths/min
  },
  "oxygen-saturation": {
    title: "Oxygen Saturation",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 95, high: 100 } // 95-100% normal
  },
  "weight": {
    title: "Body Weight",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
    // No fixed range - varies by individual
  },
  "height": {
    title: "Height",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
    // No range needed
  },
  "bmi": {
    title: "Body Mass Index",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 18.5, high: 24.9 } // 18.5-24.9 normal BMI
  },
  "body-fat-percentage": {
    title: "Body Fat %",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "waist-circumference": {
    title: "Waist Circumference",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "steps": {
    title: "Daily Steps",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "calories": {
    title: "Active Calories",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  
  // Other
  "uric-acid": {
    title: "Uric Acid",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "psa": {
    title: "PSA",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  "cortisol": {
    title: "Cortisol",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "testosterone": {
    title: "Testosterone",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
  },
  "estrogen": {
    title: "Estrogen",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "progesterone": {
    title: "Progesterone",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "rdw": {
    title: "RDW",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  "neutrophils": {
    title: "Neutrophils",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "lymphocytes": {
    title: "Lymphocytes",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
  },
  "monocytes": {
    title: "Monocytes",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "eosinophils": {
    title: "Eosinophils",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "basophils": {
    title: "Basophils",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  "transferrin": {
    title: "Transferrin",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  },
  "transferrin-saturation": {
    title: "Transferrin Saturation",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-5))"
  },
  "total-protein": {
    title: "Total Protein",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "globulin": {
    title: "Globulin",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-2))"
  },
  "corrected-calcium": {
    title: "Corrected Calcium",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-3))"
  },
  "ldh": {
    title: "LDH",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-4))"
  }
};
