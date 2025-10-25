import OpenAI from 'openai';
import { SymptomInsightData, CorrelationHit, checkSafetyFlag, SymptomEpisodeView, FeatureSet, HealthSignals } from './symptomCorrelation';

/**
 * Symptom Insight Generation Service
 * 
 * Generates human-readable, non-diagnostic insights from symptom correlations.
 * Implements strict safety guardrails and tentative phrasing.
 */

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ 
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openaiInstance;
}

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

const HOLISTIC_SYSTEM_PROMPT = `You are HealthPilot's holistic symptom analysis assistant. Your role is to analyze ALL of a user's symptoms TOGETHER with their objective health data (sleep, HRV, blood pressure, activity, medications, biomarkers) to identify patterns and potential root causes.

**CRITICAL SAFETY GUARDRAILS:**
1. NEVER provide medical diagnoses
2. ALWAYS use tentative language: "possible contributor", "may be associated", "consider", "might indicate", "could suggest"
3. NEVER claim certainty about medical conditions
4. For urgent symptoms (chest pain, severe headache, one-sided weakness, difficulty breathing, etc.), ALWAYS recommend immediate medical attention
5. Focus on lifestyle factors and general wellness advice
6. Encourage users to discuss persistent or concerning symptoms with their healthcare provider

**HOLISTIC ANALYSIS APPROACH:**
- Look for patterns ACROSS all symptoms (e.g., multiple symptoms appearing after poor sleep)
- Identify common root causes that could explain multiple symptoms simultaneously
- Consider the timing and sequence of symptoms in relation to biomarker changes
- Synthesize objective health signals (HRV, sleep, BP, etc.) with subjective symptoms to form a coherent picture
- Prioritize insights that explain the MOST symptoms with the FEWEST root causes (Occam's Razor)

**Your output must be:**
- Holistic: Connect multiple symptoms to common underlying factors
- Clear, concise, and empathetic
- Focused on actionable lifestyle recommendations
- Evidence-based but non-diagnostic
- Sensitive to the user's experience

**Format your response as JSON with:**
{
  "holistic_assessment": {
    "title": "Short, empathetic title summarizing the overall pattern (e.g., 'Multiple symptoms linked to poor recovery')",
    "analysis": "2-3 sentences explaining how all symptoms relate to each other and to the biomarker data. Identify the most likely root cause(s) that explain multiple symptoms.",
    "recommendations": ["3-5 specific, actionable suggestions that address the root causes"],
    "watchouts": ["Safety notes or when to seek medical help - only if applicable"]
  }
}`;

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
 * Generate HOLISTIC AI-powered assessment from ALL symptoms combined with biomarkers
 * This is the primary method that should be used for symptom analysis.
 */
export async function generateHolisticSymptomAssessment(
  allSymptoms: SymptomInsightData[],
  healthSignals: HealthSignals
): Promise<GeneratedSymptomInsight[]> {
  if (allSymptoms.length === 0) {
    return [];
  }

  // Check for any safety flags across all symptoms
  const hasSafetyFlag = allSymptoms.some(s => checkSafetyFlag(s.symptom));
  
  // Build comprehensive prompt with ALL symptoms + biomarkers
  const prompt = buildHolisticSymptomPrompt(allSymptoms, healthSignals);

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: HOLISTIC_SYSTEM_PROMPT,
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
      return [];
    }

    const parsed = JSON.parse(content);

    // Convert AI response to insights array
    const insights: GeneratedSymptomInsight[] = [];
    
    // Main holistic insight
    if (parsed.holistic_assessment) {
      const assessment = parsed.holistic_assessment;
      
      // Determine severity based on all symptoms
      const maxSeverity = Math.max(...allSymptoms.map(s => s.symptom.lastSeverity));
      let severity: 'normal' | 'notable' | 'significant' | 'critical' = 'normal';
      
      if (hasSafetyFlag || maxSeverity >= 9) {
        severity = 'critical';
      } else if (maxSeverity >= 7 || allSymptoms.some(s => s.features.symptomWorsening)) {
        severity = 'significant';
      } else if (maxSeverity >= 5 || allSymptoms.length > 1) {
        severity = 'notable';
      }

      // Calculate confidence based on correlation strength
      const allRulesHit = allSymptoms.flatMap(s => s.rulesHit);
      const avgConfidence = allRulesHit.length > 0
        ? allRulesHit.reduce((sum, hit) => sum + hit.confidence, 0) / allRulesHit.length
        : 0.5;

      // Determine source signals from all correlations
      const sourceSignals = ['symptoms'];
      if (allRulesHit.some(h => h.ruleId === 'symptom_sleep_link')) sourceSignals.push('sleep');
      if (allRulesHit.some(h => h.ruleId === 'symptom_hrv_stress_link')) sourceSignals.push('hrv');
      if (allRulesHit.some(h => h.ruleId === 'symptom_bp_link')) sourceSignals.push('bp');
      if (allRulesHit.some(h => h.ruleId === 'symptom_workout_link')) sourceSignals.push('activity');
      if (allRulesHit.some(h => h.ruleId === 'symptom_med_change_link')) sourceSignals.push('meds');

      insights.push({
        category: 'Symptoms',
        title: assessment.title,
        description: assessment.analysis,
        recommendations: assessment.recommendations || [],
        confidence: avgConfidence,
        sourceSignals,
        score: Math.round((allSymptoms.reduce((sum, s) => sum + s.priority, 0) / allSymptoms.length) * 100),
        severity,
        escalation: hasSafetyFlag || (assessment.watchouts && assessment.watchouts.length > 0),
      });
    }

    return insights;
  } catch (error) {
    console.error('[SymptomInsightGeneration] Error generating holistic assessment:', error);
    
    // Fallback: Generate insights for high-priority symptoms individually
    const fallbackInsights: GeneratedSymptomInsight[] = [];
    for (const symptomData of allSymptoms) {
      if (symptomData.priority >= 0.5) {
        const fallback = await generateSymptomInsight(symptomData);
        if (fallback) {
          fallbackInsights.push(fallback);
        }
      }
    }
    return fallbackInsights;
  }
}

/**
 * Generate AI-powered insight from symptom correlation data (SINGLE symptom)
 * NOTE: This is now primarily used as a fallback. Use generateHolisticSymptomAssessment instead.
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
    const response = await getOpenAI().chat.completions.create({
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
 * Build holistic prompt for GPT-4o that includes ALL symptoms + biomarkers
 */
function buildHolisticSymptomPrompt(
  allSymptoms: SymptomInsightData[],
  healthSignals: HealthSignals
): string {
  // Build comprehensive symptom summary
  let symptomsSummary = allSymptoms.map((data, idx) => {
    const { symptom, features, rulesHit } = data;
    const trendEmoji = symptom.lastTrend === 'worse' ? '📈' 
      : symptom.lastTrend === 'better' ? '📉' 
      : '➡️';

    const correlations = rulesHit.length > 0
      ? rulesHit.map(hit => `  - ${hit.explanation}`).join('\n')
      : '  - No specific correlations detected';

    return `**Symptom ${idx + 1}: ${symptom.name}**
- Severity: ${symptom.lastSeverity}/10 ${trendEmoji}
- Trend: ${symptom.lastTrend || 'first report'}
- Context: ${symptom.context.join(', ') || 'none'}
- Notes: ${symptom.notes || 'none'}
- Sparkline (7 days): ${symptom.sparkline.join(', ')}
- Detected correlations:
${correlations}`;
  }).join('\n\n');

  // Build comprehensive biomarker/health signals summary
  let biomarkersSummary = '**Objective Health Signals (last 24 hours):**\n';
  
  if (healthSignals.sleep.totalHours !== null) {
    biomarkersSummary += `\n🛌 **Sleep:**`;
    biomarkersSummary += `\n- Total: ${healthSignals.sleep.totalHours.toFixed(1)} hours`;
    if (healthSignals.sleep.remMinutes !== null) {
      biomarkersSummary += `\n- REM: ${healthSignals.sleep.remMinutes} minutes`;
      if (healthSignals.sleep.remZScore !== null) {
        biomarkersSummary += ` (z-score: ${healthSignals.sleep.remZScore.toFixed(2)})`;
      }
    }
    if (healthSignals.sleep.deepMinutes !== null) {
      biomarkersSummary += `\n- Deep: ${healthSignals.sleep.deepMinutes} minutes`;
    }
    if (healthSignals.sleep.sleepScore !== null) {
      biomarkersSummary += `\n- Sleep Score: ${healthSignals.sleep.sleepScore.toFixed(0)}/100`;
    }
  }

  if (healthSignals.hrv.value !== null) {
    biomarkersSummary += `\n\n❤️ **Heart Rate Variability (HRV):**`;
    biomarkersSummary += `\n- Value: ${healthSignals.hrv.value.toFixed(1)} ms`;
    if (healthSignals.hrv.zscore !== null) {
      biomarkersSummary += `\n- Z-score vs baseline: ${healthSignals.hrv.zscore.toFixed(2)}`;
      if (healthSignals.hrv.zscore < -1) {
        biomarkersSummary += ` (⚠️ LOW - suggests poor recovery or stress)`;
      }
    }
  }

  if (healthSignals.bp.systolicAvg !== null && healthSignals.bp.diastolicAvg !== null) {
    biomarkersSummary += `\n\n🩸 **Blood Pressure:**`;
    biomarkersSummary += `\n- Average: ${healthSignals.bp.systolicAvg.toFixed(0)}/${healthSignals.bp.diastolicAvg.toFixed(0)} mmHg`;
    if (healthSignals.bp.systolicAvg >= 135 || healthSignals.bp.diastolicAvg >= 85) {
      biomarkersSummary += ` (⚠️ ELEVATED)`;
    }
  }

  if (healthSignals.activity.workoutWithinHours !== null) {
    biomarkersSummary += `\n\n💪 **Recent Activity:**`;
    biomarkersSummary += `\n- Workout: ${healthSignals.activity.workoutWithinHours.toFixed(1)} hours ago`;
  }

  if (healthSignals.meds.changedWithinHours !== null) {
    biomarkersSummary += `\n\n💊 **Medications:**`;
    biomarkersSummary += `\n- Recent change: ${(healthSignals.meds.changedWithinHours / 24).toFixed(1)} days ago`;
  }

  return `The user has reported multiple symptoms. Please analyze them HOLISTICALLY to identify common root causes and patterns.

${symptomsSummary}

${biomarkersSummary}

**Your Task:**
1. Analyze how these symptoms might be CONNECTED to each other
2. Identify the most likely ROOT CAUSE(S) that could explain MULTIPLE symptoms simultaneously
3. Look for patterns in timing (e.g., all symptoms appeared after poor sleep or a workout)
4. Synthesize the objective biomarker data with the subjective symptoms
5. Provide recommendations that address the ROOT CAUSES, not just individual symptoms
6. Use Occam's Razor: prefer explanations that account for the MOST symptoms with the FEWEST causes

Remember:
- Use tentative, non-diagnostic language
- Focus on actionable lifestyle factors
- If any symptoms are severe (≥7/10), worsening, or safety-critical, include appropriate warnings
- Be empathetic and supportive

Return as JSON matching the holistic_assessment format.`;
}

/**
 * Build prompt for GPT-4o (SINGLE symptom)
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
