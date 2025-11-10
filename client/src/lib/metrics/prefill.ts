import registry from "./registry";
import {
  getLatestMeasurement,
  getEarliestMeasurement,
} from "@/services/measurements";

type PrefillValue =
  | number
  | { systolic?: number; diastolic?: number }
  | Record<string, number>;

export type PrefillResult = {
  current?: PrefillValue;
  starting?: PrefillValue;
  unit?: string;
  note?: string;
};

type Measurement = {
  value?: unknown;
  [key: string]: unknown;
};

type PairValue = {
  systolic?: unknown;
  sys?: unknown;
  diastolic?: unknown;
  dia?: unknown;
  [key: string]: unknown;
};

export async function prefillForMetric(
  metricId: string,
  goalStartDate?: Date
): Promise<PrefillResult> {
  const def = registry[metricId];
  if (!def) return { note: "Unknown metric" };

  const latest = await getLatestMeasurement(metricId);
  const earliest = await getEarliestMeasurement(metricId, goalStartDate);

  const wrap = (raw: Measurement | null | undefined): PrefillValue | undefined => {
    if (!raw) return undefined;

    // Handle pair schema (e.g., blood pressure)
    if (def.valueSchema === "pair") {
      const value = raw.value ?? raw;
      if (typeof value === "object" && value !== null) {
        const pairValue = value as PairValue;
        const systolic = pairValue.systolic ?? pairValue.sys;
        const diastolic = pairValue.diastolic ?? pairValue.dia;
        return {
          systolic: coerce(systolic, def.fields?.systolic),
          diastolic: coerce(diastolic, def.fields?.diastolic),
        };
      }
      return undefined;
    }

    // Handle multi-field schema
    if (def.valueSchema === "multi") {
      const value = raw.value ?? raw;
      if (typeof value === "object" && value !== null) {
        const objValue = value as Record<string, unknown>;
        const result: Record<string, number> = {};
        Object.keys(def.fields ?? {}).forEach((key) => {
          if (objValue[key] !== undefined) {
            const coerced = coerce(objValue[key], def.fields?.[key]);
            if (coerced !== undefined) {
              result[key] = coerced;
            }
          }
        });
        return result;
      }
      return undefined;
    }

    // Handle single value schema
    let v: unknown = raw.value ?? raw;
    if (typeof v === "object" && v !== null) {
      // Extract numeric value from object
      const objValue = v as Record<string, unknown>;
      v = objValue.value ?? Object.values(objValue)[0];
    }

    // Apply conversion if specified
    if (typeof def.prefill?.convert === "function") {
      v = def.prefill.convert(v);
    }

    return coerce(v, def.validation);
  };

  const current = wrap(latest);
  const starting = wrap(earliest);
  const note = !current && !starting ? "No prior data found" : undefined;

  return { current, starting, unit: def.unit, note };
}

function coerce(
  v: any,
  rule?: { min?: number; max?: number; decimals?: number }
): number | undefined {
  if (v == null || Number.isNaN(Number(v))) return undefined;
  let n = Number(v);
  if (rule?.decimals != null) {
    n = +n.toFixed(rule.decimals);
  }
  return n;
}
