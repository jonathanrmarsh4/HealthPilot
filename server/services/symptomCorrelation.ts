import { storage } from '../storage';
import { SymptomEvent } from '@shared/schema';

/**
 * Symptom Correlation Service
 * 
 * Correlates symptom data with objective health signals (sleep, HRV, BP, activity, medications)
 * to generate AI-powered insights with safety guardrails and non-diagnostic language.
 * 
 * Implements 6 correlation rules aligned with evidence-based patterns.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SymptomEpisodeView {
  episodeId: string;
  name: string;
  lastSeverity: number;
  lastTrend: 'better' | 'worse' | 'same' | null;
  sparkline: number[]; // 7-day severity history
  active: boolean;
  lastEventAt: string;
  context: string[];
  notes: string | null;
}

export interface HealthSignals {
  sleep: {
    totalHours: number | null;
    remMinutes: number | null;
    deepMinutes: number | null;
    sleepScore: number | null;
    remZScore: number | null; // Z-score relative to user baseline
  };
  hrv: {
    value: number | null;
    zscore: number | null; // Z-score relative to user baseline
  };
  bp: {
    systolicAvg: number | null;
    diastolicAvg: number | null;
  };
  activity: {
    workoutWithinHours: number | null; // Hours since last workout, null if none
  };
  meds: {
    changedWithinHours: number | null; // Hours since medication change, null if none
  };
}

export interface FeatureSet {
  symptomSeverityDelta: number; // Change from yesterday
  symptomHigh: boolean; // Severity >= 6
  symptomWorsening: boolean; // Trend='worse' OR delta >= 1
  sleepLow: boolean; // < 6h OR rem_z < -1
  hrvLow: boolean; // z < -1
  bpHigh: boolean; // Systolic >= 135 OR diastolic >= 85
  trainingRecent: boolean; // Workout within 3h
  medChangeRecent: boolean; // Med change within 72h
}

export interface CorrelationRule {
  id: string;
  when: (symptom: SymptomEpisodeView, features: FeatureSet) => boolean;
  explanation: string;
  baseConfidence: number;
  confidenceBoosts: Array<{
    condition: (symptom: SymptomEpisodeView, features: FeatureSet) => boolean;
    boost: number;
  }>;
}

export interface CorrelationHit {
  ruleId: string;
  explanation: string;
  confidence: number;
}

export interface SymptomInsightData {
  symptom: SymptomEpisodeView;
  features: FeatureSet;
  rulesHit: CorrelationHit[];
  priority: number;
  signals: HealthSignals;
}

// ============================================================================
// Canonicalization & Normalization
// ============================================================================

const SYMPTOM_SYNONYMS: Record<string, string> = {
  'head pressure': 'headache',
  'tired': 'fatigue',
  'low energy': 'fatigue',
  'reflux': 'indigestion',
  'doms': 'muscle soreness',
  'sore muscles': 'muscle soreness',
};

const CONTEXT_MAPPING: Record<string, string> = {
  'after_workout': 'exercise_related',
  'poor_sleep': 'sleep_related',
  'stress_high': 'stress_related',
  'new_med': 'medication_related',
  'travel_shift': 'circadian_disruption',
  'after_meal': 'postprandial',
};

/**
 * Canonicalize symptom name (lowercase, trim, apply synonyms)
 */
export function canonicalizeSymptomName(name: string): string {
  const normalized = name.toLowerCase().trim();
  return SYMPTOM_SYNONYMS[normalized] || normalized;
}

/**
 * Map context tags to semantic categories
 */
export function mapContextTags(context: string[]): string[] {
  return context.map(tag => CONTEXT_MAPPING[tag] || tag);
}

// ============================================================================
// Feature Engineering
// ============================================================================

/**
 * Calculate feature set from symptom and health signals
 */
export function calculateFeatures(
  symptom: SymptomEpisodeView,
  previousSeverity: number | null,
  signals: HealthSignals
): FeatureSet {
  const delta = previousSeverity !== null ? symptom.lastSeverity - previousSeverity : 0;
  
  return {
    symptomSeverityDelta: delta,
    symptomHigh: symptom.lastSeverity >= 6,
    symptomWorsening: symptom.lastTrend === 'worse' || delta >= 1,
    sleepLow: (signals.sleep.totalHours !== null && signals.sleep.totalHours < 6) || 
              (signals.sleep.remZScore !== null && signals.sleep.remZScore < -1),
    hrvLow: signals.hrv.zscore !== null && signals.hrv.zscore < -1,
    bpHigh: (signals.bp.systolicAvg !== null && signals.bp.systolicAvg >= 135) ||
            (signals.bp.diastolicAvg !== null && signals.bp.diastolicAvg >= 85),
    trainingRecent: signals.activity.workoutWithinHours !== null && signals.activity.workoutWithinHours <= 3,
    medChangeRecent: signals.meds.changedWithinHours !== null && signals.meds.changedWithinHours <= 72,
  };
}

// ============================================================================
// Correlation Rules
// ============================================================================

const MECHANICAL_SYMPTOMS = ['muscle soreness', 'back pain', 'joint pain', 'knee pain', 'shoulder pain', 'neck pain'];
const DIGESTIVE_SYMPTOMS = ['nausea', 'bloating', 'reflux', 'indigestion', 'diarrhea', 'stomach pain'];
const CARDIOVASCULAR_SYMPTOMS = ['headache', 'dizziness', 'palpitations'];
const MEDICATION_SYMPTOMS = ['headache', 'dizziness', 'nausea', 'fatigue', 'palpitations'];

export const CORRELATION_RULES: CorrelationRule[] = [
  {
    id: 'symptom_sleep_link',
    when: (symptom, features) => features.symptomWorsening && features.sleepLow,
    explanation: 'Worsening symptoms commonly correlate with insufficient or low-quality sleep.',
    baseConfidence: 0.6,
    confidenceBoosts: [
      { condition: (s, f) => f.sleepLow && f.hrvLow, boost: 0.2 },
      { condition: (s, f) => s.context.includes('poor_sleep'), boost: 0.15 },
    ],
  },
  {
    id: 'symptom_hrv_stress_link',
    when: (symptom, features) => features.symptomWorsening && features.hrvLow,
    explanation: 'Low HRV suggests poor recovery or elevated stress.',
    baseConfidence: 0.6,
    confidenceBoosts: [
      { condition: (s, f) => f.sleepLow, boost: 0.15 },
      { condition: (s, f) => f.bpHigh, boost: 0.1 },
      { condition: (s, f) => s.context.includes('stress_high'), boost: 0.1 },
    ],
  },
  {
    id: 'symptom_workout_link',
    when: (symptom, features) => {
      const canonicalName = canonicalizeSymptomName(symptom.name);
      return MECHANICAL_SYMPTOMS.includes(canonicalName) && features.trainingRecent;
    },
    explanation: 'Mechanical load from a recent workout is a likely contributor.',
    baseConfidence: 0.7,
    confidenceBoosts: [
      { condition: (s, f) => s.context.includes('after_workout'), boost: 0.1 },
    ],
  },
  {
    id: 'symptom_postprandial_link',
    when: (symptom, features) => {
      const canonicalName = canonicalizeSymptomName(symptom.name);
      return DIGESTIVE_SYMPTOMS.includes(canonicalName) && symptom.context.includes('after_meal');
    },
    explanation: 'Temporal proximity to meals suggests a digestive trigger.',
    baseConfidence: 0.7,
    confidenceBoosts: [],
  },
  {
    id: 'symptom_med_change_link',
    when: (symptom, features) => {
      const canonicalName = canonicalizeSymptomName(symptom.name);
      const hasMedContext = symptom.context.includes('new_med');
      const isMedSymptom = MEDICATION_SYMPTOMS.includes(canonicalName);
      return features.medChangeRecent && (hasMedContext || isMedSymptom);
    },
    explanation: 'New or changed medication temporally associated with onset/worsening.',
    baseConfidence: 0.65,
    confidenceBoosts: [
      { condition: (s, f) => s.lastSeverity >= 6, boost: 0.1 },
    ],
  },
  {
    id: 'symptom_bp_link',
    when: (symptom, features) => {
      const canonicalName = canonicalizeSymptomName(symptom.name);
      return CARDIOVASCULAR_SYMPTOMS.includes(canonicalName) && features.bpHigh;
    },
    explanation: 'Elevated blood pressure can contribute to these symptoms.',
    baseConfidence: 0.65,
    confidenceBoosts: [
      { condition: (s, f) => s.lastSeverity >= 7, boost: 0.15 },
    ],
  },
];

/**
 * Evaluate all correlation rules for a symptom
 */
export function evaluateCorrelationRules(
  symptom: SymptomEpisodeView,
  features: FeatureSet
): CorrelationHit[] {
  const hits: CorrelationHit[] = [];

  for (const rule of CORRELATION_RULES) {
    if (rule.when(symptom, features)) {
      let confidence = rule.baseConfidence;
      
      // Apply conditional boosts
      for (const boost of rule.confidenceBoosts) {
        if (boost.condition(symptom, features)) {
          confidence += boost.boost;
        }
      }
      
      // Cap at 0.95
      confidence = Math.min(confidence, 0.95);
      
      hits.push({
        ruleId: rule.id,
        explanation: rule.explanation,
        confidence,
      });
    }
  }

  return hits;
}

// ============================================================================
// Priority Scoring
// ============================================================================

/**
 * Calculate priority score for a symptom insight
 * priority = (severity_norm * 0.6) + (worsening? 0.25 : 0) + (safety_flag? 0.4 : 0) + (multi_correlation? 0.15 : 0)
 */
export function calculatePriority(
  symptom: SymptomEpisodeView,
  features: FeatureSet,
  rulesHit: CorrelationHit[]
): number {
  const severityNorm = symptom.lastSeverity / 10;
  const worseningBonus = features.symptomWorsening ? 0.25 : 0;
  const safetyBonus = checkSafetyFlag(symptom) ? 0.4 : 0;
  const multiCorrelationBonus = rulesHit.length > 1 ? 0.15 : 0;
  
  return severityNorm * 0.6 + worseningBonus + safetyBonus + multiCorrelationBonus;
}

/**
 * Check for safety/red flags requiring urgent attention
 */
export function checkSafetyFlag(symptom: SymptomEpisodeView): boolean {
  const canonicalName = canonicalizeSymptomName(symptom.name);
  const urgentSymptoms = [
    'chest pain',
    'severe shortness of breath',
    'one-sided weakness',
    'fainting',
    'severe headache',
  ];
  
  const isUrgent = urgentSymptoms.some(s => canonicalName.includes(s));
  const severeCritical = symptom.lastSeverity >= 9 && symptom.lastTrend === 'worse';
  
  return isUrgent || severeCritical;
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch health signals for the last 24 hours
 */
export async function fetchHealthSignals(
  userId: string,
  timezone: string = 'Australia/Perth'
): Promise<HealthSignals> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Default empty signals
  const signals: HealthSignals = {
    sleep: {
      totalHours: null,
      remMinutes: null,
      deepMinutes: null,
      sleepScore: null,
      remZScore: null,
    },
    hrv: {
      value: null,
      zscore: null,
    },
    bp: {
      systolicAvg: null,
      diastolicAvg: null,
    },
    activity: {
      workoutWithinHours: null,
    },
    meds: {
      changedWithinHours: null,
    },
  };

  try {
    // Sleep data
    const latestSleep = await storage.getLatestSleepSession(userId);
    if (latestSleep && new Date(latestSleep.asleepAt) >= oneDayAgo) {
      signals.sleep.totalHours = latestSleep.totalSleepTime ? latestSleep.totalSleepTime / 60 : null;
      signals.sleep.remMinutes = latestSleep.remSleepTime || null;
      signals.sleep.deepMinutes = latestSleep.deepSleepTime || null;
      signals.sleep.sleepScore = latestSleep.sleepScoreV2 || null;
      // TODO: Calculate REM z-score from baseline
    }

    // HRV data
    const hrvMetrics = await storage.getDailyMetrics(userId, 'hrv_rmssd', oneDayAgo, now);
    if (hrvMetrics.length > 0) {
      signals.hrv.value = hrvMetrics[0].value;
      // TODO: Calculate HRV z-score from baseline
    }

    // BP data
    const systolicMetrics = await storage.getBiomarkersByTimeRange(userId, 'blood_pressure_systolic', oneDayAgo, now);
    const diastolicMetrics = await storage.getBiomarkersByTimeRange(userId, 'blood_pressure_diastolic', oneDayAgo, now);
    
    if (systolicMetrics.length > 0) {
      const avg = systolicMetrics.reduce((sum, b) => sum + b.value, 0) / systolicMetrics.length;
      signals.bp.systolicAvg = avg;
    }
    if (diastolicMetrics.length > 0) {
      const avg = diastolicMetrics.reduce((sum, b) => sum + b.value, 0) / diastolicMetrics.length;
      signals.bp.diastolicAvg = avg;
    }

    // Activity data - find most recent workout
    const workouts = await storage.getWorkouts(userId);
    if (workouts.length > 0) {
      const latestWorkout = workouts[0];
      const workoutDate = new Date(latestWorkout.date);
      if (workoutDate >= oneDayAgo) {
        const hoursSince = (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60);
        signals.activity.workoutWithinHours = hoursSince;
      }
    }

    // Medication changes
    // TODO: Implement medication tracking if available
    
  } catch (error) {
    console.error('[SymptomCorrelation] Error fetching health signals:', error);
    // Continue with partial data - don't block on missing signals
  }

  return signals;
}

/**
 * Convert raw symptom events into episode view format
 */
export async function buildEpisodeViews(
  userId: string,
  from: Date,
  to: Date
): Promise<SymptomEpisodeView[]> {
  const activeEpisodes = await storage.getActiveSymptomEpisodes(userId);
  const episodeViews: SymptomEpisodeView[] = [];

  for (const episode of activeEpisodes) {
    // Get all events for this episode to build sparkline
    const allEvents = await storage.getSymptomEpisodeEvents(userId, episode.episodeId);
    
    // Build 7-day sparkline (severity over time)
    const sparkline: number[] = new Array(7).fill(0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    allEvents
      .filter(e => new Date(e.recordedAt) >= sevenDaysAgo && e.severity !== null)
      .forEach((e, idx) => {
        const dayIndex = Math.floor((Date.now() - new Date(e.recordedAt).getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < 7 && e.severity !== null) {
          sparkline[6 - dayIndex] = e.severity;
        }
      });

    episodeViews.push({
      episodeId: episode.episodeId,
      name: canonicalizeSymptomName(episode.name),
      lastSeverity: episode.severity || 0,
      lastTrend: episode.trend,
      sparkline,
      active: episode.status !== 'resolved',
      lastEventAt: episode.recordedAt,
      context: episode.context || [],
      notes: episode.notes,
    });
  }

  return episodeViews;
}
