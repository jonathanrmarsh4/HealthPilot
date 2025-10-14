export interface BiomarkerConfig {
  title: string;
  description: string;
  days: number;
  color: string;
  subsection?: string;
  decimals?: number;
  referenceRange?: {
    low: number;
    high: number;
    unit?: string; // Optional: specify which unit this range applies to
  };
  // Unit-aware reference ranges (preferred approach)
  referenceRanges?: {
    imperial?: { low: number; high: number; unit: string };
    metric?: { low: number; high: number; unit: string };
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
    biomarkers: ["blood-glucose", "fasting-glucose", "hba1c", "insulin", "vitamin-d", "vitamin-b12", "folate", "weight", "height", "bmi", "blood-pressure", "heart-rate", "hrv", "steps", "calories", "temperature", "oxygen-saturation", "psa"]
  }
};

export const biomarkerDisplayConfig: Record<string, BiomarkerConfig> = {
  // Lipid Panel - Unit-aware reference ranges
  "ldl-cholesterol": {
    title: "LDL Cholesterol",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRanges: {
      imperial: { low: 0, high: 100, unit: "mg/dL" }, // Optimal < 100 mg/dL
      metric: { low: 0, high: 2.6, unit: "mmol/L" }   // Optimal < 2.6 mmol/L
    }
  },
  "hdl-cholesterol": {
    title: "HDL Cholesterol",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRanges: {
      imperial: { low: 40, high: 60, unit: "mg/dL" }, // 40-60 mg/dL normal
      metric: { low: 1.0, high: 1.55, unit: "mmol/L" } // 1.0-1.55 mmol/L normal
    }
  },
  "total-cholesterol": {
    title: "Total Cholesterol",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRanges: {
      imperial: { low: 0, high: 200, unit: "mg/dL" }, // < 200 mg/dL desirable
      metric: { low: 0, high: 5.2, unit: "mmol/L" }   // < 5.2 mmol/L desirable
    }
  },
  "cholesterol": {
    title: "Total Cholesterol",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRanges: {
      imperial: { low: 0, high: 200, unit: "mg/dL" },
      metric: { low: 0, high: 5.2, unit: "mmol/L" }
    }
  },
  "triglycerides": {
    title: "Triglycerides",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRanges: {
      imperial: { low: 0, high: 150, unit: "mg/dL" }, // < 150 mg/dL normal
      metric: { low: 0, high: 1.7, unit: "mmol/L" }   // < 1.7 mmol/L normal
    }
  },
  "vldl-cholesterol": {
    title: "VLDL Cholesterol",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRanges: {
      imperial: { low: 2, high: 30, unit: "mg/dL" },
      metric: { low: 0.05, high: 0.78, unit: "mmol/L" }
    }
  },
  
  // Liver Function
  "alt": {
    title: "ALT (Liver Enzyme)",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 7, high: 56 } // 7-56 U/L
  },
  "ast": {
    title: "AST (Liver Enzyme)",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 10, high: 40 } // 10-40 U/L
  },
  "alp": {
    title: "Alkaline Phosphatase",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 44, high: 147 } // 44-147 U/L
  },
  "bilirubin": {
    title: "Bilirubin",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRanges: {
      imperial: { low: 0.1, high: 1.2, unit: "mg/dL" }, // 0.1-1.2 mg/dL
      metric: { low: 0, high: 20, unit: "μmol/L" }      // 0-20 μmol/L (Australian standard)
    }
  },
  "albumin": {
    title: "Albumin",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRanges: {
      imperial: { low: 3.5, high: 5.5, unit: "g/dL" }, // 3.5-5.5 g/dL
      metric: { low: 35, high: 55, unit: "g/L" }       // 35-55 g/L (Australian standard)
    }
  },
  "ggt": {
    title: "GGT",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 9, high: 48 } // 9-48 U/L
  },
  
  // Kidney Function
  "creatinine": {
    title: "Creatinine",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRanges: {
      imperial: { low: 0.7, high: 1.3, unit: "mg/dL" },  // 0.7-1.3 mg/dL
      metric: { low: 60, high: 110, unit: "μmol/L" }     // 60-110 μmol/L (Australian standard for men)
    }
  },
  "bun": {
    title: "BUN (Blood Urea Nitrogen)",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRanges: {
      imperial: { low: 7, high: 20, unit: "mg/dL" },  // 7-20 mg/dL
      metric: { low: 2.5, high: 7.1, unit: "mmol/L" } // 2.5-7.1 mmol/L (same as urea in Australia)
    }
  },
  "egfr": {
    title: "eGFR",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 90, high: 120 } // >90 mL/min/1.73m² is normal
  },
  "urea": {
    title: "Urea",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 2.5, high: 7.1 } // 2.5-7.1 mmol/L
  },
  
  // Blood Counts
  "rbc": {
    title: "Red Blood Cell Count",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 4.5, high: 5.9 } // 4.5-5.9 M/μL (men), 4.1-5.1 for women
  },
  "wbc": {
    title: "White Blood Cell Count",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 4.5, high: 11.0 } // 4.5-11.0 K/μL
  },
  "hemoglobin": {
    title: "Hemoglobin",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 13.5, high: 17.5 } // 13.5-17.5 g/dL (men), 12-16 for women
  },
  "hematocrit": {
    title: "Hematocrit",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 38.8, high: 50.0 } // 38.8-50% (men), 34.9-44.5% for women
  },
  "platelets": {
    title: "Platelet Count",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 150, high: 400 } // 150-400 K/μL
  },
  "mcv": {
    title: "MCV",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 80, high: 100 } // 80-100 fL
  },
  "mch": {
    title: "MCH",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 27, high: 33 } // 27-33 pg
  },
  "mchc": {
    title: "MCHC",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 32, high: 36 } // 32-36 g/dL
  },
  
  // Thyroid
  "tsh": {
    title: "TSH (Thyroid)",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 0.4, high: 4.0 } // 0.4-4.0 mIU/L (same globally)
  },
  "t3": {
    title: "T3",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRanges: {
      imperial: { low: 80, high: 200, unit: "ng/dL" },  // 80-200 ng/dL
      metric: { low: 1.2, high: 3.0, unit: "nmol/L" }   // 1.2-3.0 nmol/L (Australian standard)
    }
  },
  "t4": {
    title: "T4",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRanges: {
      imperial: { low: 5.0, high: 12.0, unit: "μg/dL" }, // 5.0-12.0 μg/dL
      metric: { low: 60, high: 150, unit: "nmol/L" }     // 60-150 nmol/L (Australian standard)
    }
  },
  "free-t3": {
    title: "Free T3",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRanges: {
      imperial: { low: 2.3, high: 4.2, unit: "pg/mL" }, // 2.3-4.2 pg/mL
      metric: { low: 3.5, high: 6.5, unit: "pmol/L" }   // 3.5-6.5 pmol/L (Australian standard)
    }
  },
  "free-t4": {
    title: "Free T4",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRanges: {
      imperial: { low: 0.8, high: 1.8, unit: "ng/dL" }, // 0.8-1.8 ng/dL
      metric: { low: 10, high: 23, unit: "pmol/L" }     // 10-23 pmol/L (Australian standard)
    }
  },
  
  // Diabetes (glucose in mg/dL or mmol/L, HbA1c in %)
  "hba1c": {
    title: "HbA1c",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 4, high: 5.6 } // < 5.7% normal (same in all countries)
  },
  "blood-glucose": {
    title: "Blood Glucose",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRanges: {
      imperial: { low: 70, high: 140, unit: "mg/dL" }, // 70-140 mg/dL
      metric: { low: 3.9, high: 7.8, unit: "mmol/L" }  // 3.9-7.8 mmol/L (Australian standard)
    }
  },
  "fasting-glucose": {
    title: "Fasting Glucose",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRanges: {
      imperial: { low: 70, high: 100, unit: "mg/dL" }, // 70-100 mg/dL
      metric: { low: 3.9, high: 5.6, unit: "mmol/L" }  // 3.9-5.6 mmol/L (Australian standard)
    }
  },
  "insulin": {
    title: "Insulin",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 2.6, high: 24.9 } // 2.6-24.9 μIU/mL fasting
  },
  
  // Vitamins & Minerals
  "vitamin-d": {
    title: "Vitamin D",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRanges: {
      imperial: { low: 30, high: 100, unit: "ng/mL" },  // 30-100 ng/mL
      metric: { low: 50, high: 250, unit: "nmol/L" }    // 50-250 nmol/L (Australian standard)
    }
  },
  "vitamin-b12": {
    title: "Vitamin B12",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRanges: {
      imperial: { low: 200, high: 900, unit: "pg/mL" }, // 200-900 pg/mL
      metric: { low: 150, high: 650, unit: "pmol/L" }   // 150-650 pmol/L (Australian standard)
    }
  },
  "iron": {
    title: "Iron",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRanges: {
      imperial: { low: 60, high: 170, unit: "μg/dL" }, // 60-170 μg/dL
      metric: { low: 10, high: 30, unit: "μmol/L" }    // 10-30 μmol/L (Australian standard)
    }
  },
  "ferritin": {
    title: "Ferritin",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRanges: {
      imperial: { low: 24, high: 336, unit: "ng/mL" }, // 24-336 ng/mL (men)
      metric: { low: 30, high: 300, unit: "μg/L" }     // 30-300 μg/L (Australian standard, men)
    }
  },
  "calcium": {
    title: "Calcium",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRanges: {
      imperial: { low: 8.5, high: 10.5, unit: "mg/dL" }, // 8.5-10.5 mg/dL
      metric: { low: 2.1, high: 2.6, unit: "mmol/L" }    // 2.1-2.6 mmol/L (Australian standard)
    }
  },
  "magnesium": {
    title: "Magnesium",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRanges: {
      imperial: { low: 1.7, high: 2.2, unit: "mg/dL" }, // 1.7-2.2 mg/dL
      metric: { low: 0.7, high: 1.0, unit: "mmol/L" }   // 0.7-1.0 mmol/L (Australian standard)
    }
  },
  "folate": {
    title: "Folate",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRanges: {
      imperial: { low: 2.7, high: 17.0, unit: "ng/mL" }, // 2.7-17.0 ng/mL
      metric: { low: 7, high: 45, unit: "nmol/L" }       // 7-45 nmol/L (Australian standard)
    }
  },
  
  // Inflammation
  "crp": {
    title: "C-Reactive Protein",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 0, high: 3.0 } // <3.0 mg/L is low risk
  },
  "esr": {
    title: "ESR",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 0, high: 20 } // 0-20 mm/hr (men), 0-30 for women
  },
  
  // Electrolytes
  "sodium": {
    title: "Sodium",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 136, high: 145 } // 136-145 mmol/L
  },
  "potassium": {
    title: "Potassium",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 3.5, high: 5.0 } // 3.5-5.0 mmol/L
  },
  "chloride": {
    title: "Chloride",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 98, high: 107 } // 98-107 mmol/L
  },
  "bicarbonate": {
    title: "Bicarbonate",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 22, high: 29 } // 22-29 mmol/L
  },
  
  // Vitals & Body Metrics
  "blood-pressure": {
    title: "Blood Pressure (Systolic)",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 90, high: 120 } // < 120 mmHg normal systolic
  },
  "heart-rate": {
    title: "Resting Heart Rate",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    decimals: 0,
    referenceRange: { low: 60, high: 100 } // 60-100 bpm normal resting
  },
  "hrv": {
    title: "HRV (Heart Rate Variability)",
    description: "Recovery & nervous system health",
    days: 730,
    color: "hsl(var(--chart-1))",
    decimals: 0,
    referenceRange: { low: 40, high: 100 } // 40-100 ms (SDNN), higher is better
  },
  "temperature": {
    title: "Body Temperature",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 97.0, high: 99.0 } // 97-99°F normal (stored in F)
  },
  "respiratory-rate": {
    title: "Respiratory Rate",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 12, high: 20 } // 12-20 breaths/min
  },
  "oxygen-saturation": {
    title: "Oxygen Saturation",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 95, high: 100 } // 95-100% normal
  },
  "weight": {
    title: "Body Weight",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    decimals: 1
    // No fixed range - varies by individual
  },
  "height": {
    title: "Height",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))"
    // No range needed
  },
  "bmi": {
    title: "Body Mass Index",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 18.5, high: 24.9 } // 18.5-24.9 normal BMI
  },
  "body-fat-percentage": {
    title: "Body Fat %",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))"
  },
  "waist-circumference": {
    title: "Waist Circumference",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))"
  },
  "steps": {
    title: "Daily Steps",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    decimals: 0
  },
  "calories": {
    title: "Active Calories",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    decimals: 0
  },
  
  // Other
  "uric-acid": {
    title: "Uric Acid",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRanges: {
      imperial: { low: 3.5, high: 7.2, unit: "mg/dL" },  // 3.5-7.2 mg/dL (men)
      metric: { low: 200, high: 430, unit: "μmol/L" }    // 200-430 μmol/L (Australian standard, men)
    }
  },
  "psa": {
    title: "PSA",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 0, high: 4.0 } // 0-4.0 ng/mL
  },
  "cortisol": {
    title: "Cortisol",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 6, high: 23 } // 6-23 μg/dL (morning)
  },
  "testosterone": {
    title: "Testosterone",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 300, high: 1000 } // 300-1000 ng/dL (men), 15-70 for women
  },
  "estrogen": {
    title: "Estrogen",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 15, high: 350 } // 15-350 pg/mL (varies with cycle)
  },
  "progesterone": {
    title: "Progesterone",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 0.1, high: 25 } // 0.1-25 ng/mL (varies with cycle)
  },
  "rdw": {
    title: "RDW",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 11.5, high: 14.5 } // 11.5-14.5%
  },
  "neutrophils": {
    title: "Neutrophils",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 40, high: 70 } // 40-70% (or 2.0-7.5 K/μL absolute)
  },
  "lymphocytes": {
    title: "Lymphocytes",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 20, high: 40 } // 20-40% (or 1.0-4.0 K/μL absolute)
  },
  "monocytes": {
    title: "Monocytes",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRange: { low: 2, high: 8 } // 2-8% (or 0.2-1.0 K/μL absolute)
  },
  "eosinophils": {
    title: "Eosinophils",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRange: { low: 1, high: 4 } // 1-4% (or 0.0-0.5 K/μL absolute)
  },
  "basophils": {
    title: "Basophils",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRange: { low: 0, high: 1 } // 0-1% (or 0.0-0.2 K/μL absolute)
  },
  "transferrin": {
    title: "Transferrin",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 200, high: 360 } // 200-360 mg/dL
  },
  "transferrin-saturation": {
    title: "Transferrin Saturation",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-5))",
    referenceRange: { low: 20, high: 50 } // 20-50%
  },
  "total-protein": {
    title: "Total Protein",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-1))",
    referenceRanges: {
      imperial: { low: 6.0, high: 8.3, unit: "g/dL" }, // 6.0-8.3 g/dL
      metric: { low: 60, high: 83, unit: "g/L" }       // 60-83 g/L (Australian standard)
    }
  },
  "globulin": {
    title: "Globulin",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-2))",
    referenceRanges: {
      imperial: { low: 2.0, high: 3.5, unit: "g/dL" }, // 2.0-3.5 g/dL
      metric: { low: 20, high: 35, unit: "g/L" }       // 20-35 g/L (Australian standard)
    }
  },
  "corrected-calcium": {
    title: "Corrected Calcium",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-3))",
    referenceRanges: {
      imperial: { low: 8.5, high: 10.5, unit: "mg/dL" }, // 8.5-10.5 mg/dL
      metric: { low: 2.1, high: 2.6, unit: "mmol/L" }    // 2.1-2.6 mmol/L (Australian standard)
    }
  },
  "ldh": {
    title: "LDH",
    description: "6-month trend",
    days: 730,
    color: "hsl(var(--chart-4))",
    referenceRange: { low: 140, high: 280 } // 140-280 U/L
  }
};
