import OpenAI from 'openai';
import { SymptomInsightData, CorrelationHit, checkSafetyFlag, SymptomEpisodeView, FeatureSet, HealthSignals } from './symptomCorrelation';

/**
 * Symptom Insight Generation Service
 * 
 * Generates human-readable, non-diagnostic insights from symptom correlations.
 * Implements strict safety guardrails and tentative phrasing.
 */

const openai = new OpenAI({ 
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface GeneratedSymptomInsight {
  category: 'Symptoms';
  title: string;
  description: string;
  recommendations: string[];
  confidence: number;
  sourceSignals: string[];
  score: number;
  severity: 'normal' | 'notable' | 'significant' | 'critical';
  escalation?: boolean; // True if urgent medical attention may be needed
}

// ============================================================================
// System Prompt with Safety Guardrails
// ============================================================================

const SYSTEM_PROMPT = `You are HealthPilot's symptom analysis assistant. Your role is to help users understand possible connections between their symptoms and objective health data (sleep, HRV, blood pressure, activity, medications).

**CRITICAL SAFETY GUARDRAILS:**
1. NEVER provide medical diagnoses
2. ALWAYS use tentative language: "possible contributor", "may be associated", "consider", "might indicate"
3. NEVER claim certainty about medical conditions
4. For urgent symptoms (chest pain, severe headache, one-sided weakness, etc.), ALWAYS recommend seeking medical attention
5. Focus on lifestyle factors and general wellness advice
6. Encourage users to discuss persistent or concerning symptoms with their healthcare provider

**Your output must be:**
- Clear, concise, and empathetic
- Focused on actionable lifestyle recommendations
- Evidence-based but non-diagnostic
- Sensitive to the user's experience

**Format your response as JSON with:**
{
  "title": "Short, empathetic title (e.g., 'Headache getting worse')",
  "subtitle": "Severity X/10 with trend emoji • Context tags",
  "pattern": "One sentence describing the temporal pattern observed",
  "contributors": ["List of 1-3 possible contributing factors from correlations"],
  "recommendations": ["1-3 specific, actionable suggestions"],
  "watchouts": "Any important safety notes or when to seek medical help (optional)"
}`;

// ============================================================================
// Action Library
// ============================================================================

const ACTION_LIBRARY = {
  general: [
    'Stay well-hydrated with water and balanced electrolytes today',
    'Prioritize 7–9 hours of sleep with a consistent bedtime',
    'Consider light active recovery (walking, gentle stretching) instead of intense training',
    'Practice deep breathing or mindfulness for 5–10 minutes to help manage stress',
    'If symptoms persist or worsen, discuss with your healthcare provider',
  ],
  digestive: [
    'Try smaller, simpler meals today and avoid known trigger foods',
    'Avoid lying down within 2–3 hours after eating',
    'Stay hydrated with water throughout the day',
    'Consider keeping a food diary to identify potential triggers',
  ],
  soreness: [
    'Apply gentle mobility work and tissue care (heat/ice as preferred)',
    'Ensure adequate protein intake (1.6-2.2g per kg body weight)',
    'Allow 24-48 hours between training the same muscle groups',
    'Consider foam rolling or light stretching',
  ],
  sleep: [
    'Aim for consistent sleep and wake times, even on weekends',
    'Create a wind-down routine 30-60 minutes before bed',
    'Keep your bedroom cool (60-67°F/15-19°C) and dark',
    'Avoid screens and bright lights 1-2 hours before sleep',
  ],
  stress: [
    'Practice 5-10 minutes of deep breathing or meditation',
    'Take short breaks throughout the day to reset',
    'Consider journaling to process thoughts and feelings',
    'Engage in gentle physical activity like walking or yoga',
  ],
};

// ============================================================================
// Insight Generation
// ============================================================================

/**
 * Generate AI-powered insight from symptom correlation data
 */
export async function generateSymptomInsight(
  insightData: SymptomInsightData
): Promise<GeneratedSymptomInsight | null> {
  const { symptom, features, rulesHit, priority, signals } = insightData;

  // Check for safety flags
  const isSafetyFlag = checkSafetyFlag(symptom);
  
  // If high priority or safety flag, generate insight
  if (priority < 0.3 && !isSafetyFlag) {
    return null; // Skip low-priority insights
  }

  // Build prompt for GPT-4o
  const prompt = buildSymptomInsightPrompt(symptom, features, rulesHit, signals);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);

    // Determine severity
    let severity: 'normal' | 'notable' | 'significant' | 'critical' = 'normal';
    if (isSafetyFlag || symptom.lastSeverity >= 9) {
      severity = 'critical';
    } else if (symptom.lastSeverity >= 7 || features.symptomWorsening) {
      severity = 'significant';
    } else if (symptom.lastSeverity >= 5 || rulesHit.length > 1) {
      severity = 'notable';
    }

    // Calculate average confidence from all rule hits
    const avgConfidence = rulesHit.length > 0
      ? rulesHit.reduce((sum, hit) => sum + hit.confidence, 0) / rulesHit.length
      : 0.5;

    // Determine source signals
    const sourceSignals = ['symptoms'];
    if (rulesHit.some(h => h.ruleId === 'symptom_sleep_link')) sourceSignals.push('sleep');
    if (rulesHit.some(h => h.ruleId === 'symptom_hrv_stress_link')) sourceSignals.push('hrv');
    if (rulesHit.some(h => h.ruleId === 'symptom_bp_link')) sourceSignals.push('bp');
    if (rulesHit.some(h => h.ruleId === 'symptom_workout_link')) sourceSignals.push('activity');
    if (rulesHit.some(h => h.ruleId === 'symptom_med_change_link')) sourceSignals.push('meds');

    return {
      category: 'Symptoms',
      title: parsed.title,
      description: `${parsed.subtitle}\n\n${parsed.pattern}\n\nPossible contributors: ${parsed.contributors.join(', ')}.`,
      recommendations: parsed.recommendations || selectRecommendations(symptom, rulesHit),
      confidence: avgConfidence,
      sourceSignals,
      score: Math.round(priority * 100),
      severity,
      escalation: isSafetyFlag,
    };
  } catch (error) {
    console.error('[SymptomInsightGeneration] Error generating insight:', error);
    
    // Fallback to template-based insight if AI fails
    return generateFallbackInsight(symptom, features, rulesHit, priority, isSafetyFlag);
  }
}

/**
 * Build prompt for GPT-4o
 */
function buildSymptomInsightPrompt(
  symptom: SymptomEpisodeView,
  features: FeatureSet,
  rulesHit: CorrelationHit[],
  signals: HealthSignals
): string {
  const trendEmoji = symptom.lastTrend === 'worse' ? '📈' 
    : symptom.lastTrend === 'better' ? '📉' 
    : '➡️';

  let signalSummary = '';
  if (features.sleepLow) {
    signalSummary += `\n- Sleep: ${signals.sleep.totalHours?.toFixed(1) || 'N/A'}h (low quality or insufficient)`;
  }
  if (features.hrvLow) {
    signalSummary += `\n- HRV: Low (z-score < -1, suggesting poor recovery or stress)`;
  }
  if (features.bpHigh) {
    signalSummary += `\n- Blood Pressure: Elevated (${signals.bp.systolicAvg?.toFixed(0)}/${signals.bp.diastolicAvg?.toFixed(0)} mmHg)`;
  }
  if (features.trainingRecent) {
    signalSummary += `\n- Recent workout: ${signals.activity.workoutWithinHours?.toFixed(1)}h ago`;
  }
  if (features.medChangeRecent) {
    signalSummary += `\n- Medication change: Within last ${(signals.meds.changedWithinHours! / 24).toFixed(0)} days`;
  }

  const correlations = rulesHit.map(hit => 
    `- ${hit.explanation} (confidence: ${(hit.confidence * 100).toFixed(0)}%)`
  ).join('\n');

  return `The user has reported experiencing "${symptom.name}" with the following details:

**Symptom Details:**
- Severity: ${symptom.lastSeverity}/10 ${trendEmoji}
- Trend: ${symptom.lastTrend || 'first report'}
- Context: ${symptom.context.join(', ') || 'none'}
- Notes: ${symptom.notes || 'none'}

**Objective Health Signals (last 24h):${signalSummary || '\n- No significant correlations detected'}

**Detected Correlations:**
${correlations || 'None detected'}

Generate a supportive, non-diagnostic insight that:
1. Acknowledges the symptom and its severity/trend
2. Explains possible contributing factors based on the correlations
3. Provides 1-3 specific, actionable recommendations
4. Uses tentative language ("possible", "may be associated", "consider")
5. Recommends medical consultation if appropriate (severity >= 7, worsening, or urgent symptoms)

Return as JSON with fields: title, subtitle, pattern, contributors (array), recommendations (array), watchouts (optional).`;
}

/**
 * Select appropriate recommendations based on symptom and correlations
 */
function selectRecommendations(
  symptom: SymptomEpisodeView,
  rulesHit: CorrelationHit[]
): string[] {
  const recommendations: string[] = [];
  const canonicalName = symptom.name.toLowerCase();

  // Priority 1: Rule-specific recommendations
  for (const hit of rulesHit) {
    if (hit.ruleId === 'symptom_sleep_link') {
      recommendations.push(...ACTION_LIBRARY.sleep.slice(0, 2));
    } else if (hit.ruleId === 'symptom_hrv_stress_link') {
      recommendations.push(...ACTION_LIBRARY.stress.slice(0, 2));
    } else if (hit.ruleId === 'symptom_workout_link') {
      recommendations.push(...ACTION_LIBRARY.soreness.slice(0, 2));
    } else if (hit.ruleId === 'symptom_postprandial_link') {
      recommendations.push(...ACTION_LIBRARY.digestive.slice(0, 2));
    }
  }

  // Priority 2: Symptom-type specific
  if (canonicalName.includes('nausea') || canonicalName.includes('bloating') || canonicalName.includes('indigestion')) {
    recommendations.push(...ACTION_LIBRARY.digestive.slice(0, 1));
  }
  if (canonicalName.includes('soreness') || canonicalName.includes('pain')) {
    recommendations.push(...ACTION_LIBRARY.soreness.slice(0, 1));
  }

  // Priority 3: General recommendations
  recommendations.push(...ACTION_LIBRARY.general.slice(0, 2));

  // Deduplicate and limit to 3
  return [...new Set(recommendations)].slice(0, 3);
}

/**
 * Generate fallback template-based insight if AI fails
 */
function generateFallbackInsight(
  symptom: SymptomEpisodeView,
  features: FeatureSet,
  rulesHit: CorrelationHit[],
  priority: number,
  isSafetyFlag: boolean
): GeneratedSymptomInsight {
  const trendText = symptom.lastTrend === 'worse' ? 'getting worse' 
    : symptom.lastTrend === 'better' ? 'improving' 
    : 'ongoing';

  const contributors = rulesHit.map(hit => hit.explanation.split('.')[0]).join(', ');

  return {
    category: 'Symptoms',
    title: `${symptom.name.charAt(0).toUpperCase() + symptom.name.slice(1)} ${trendText}`,
    description: `Severity ${symptom.lastSeverity}/10. ${contributors || 'Monitoring this symptom'}. ${isSafetyFlag ? 'This may require medical attention.' : ''}`,
    recommendations: selectRecommendations(symptom, rulesHit),
    confidence: rulesHit.length > 0 ? rulesHit[0].confidence : 0.5,
    sourceSignals: ['symptoms'],
    score: Math.round(priority * 100),
    severity: isSafetyFlag ? 'critical' : symptom.lastSeverity >= 7 ? 'significant' : 'notable',
    escalation: isSafetyFlag,
  };
}
