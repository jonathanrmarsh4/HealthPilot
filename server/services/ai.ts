import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Retry helper with exponential backoff for rate limit errors
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 3000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.status === 429 || error.error?.type === 'rate_limit_error';
      const isTransient = error.status === 500 || error.status === 502 || error.status === 503;
      
      // Log detailed error information
      console.error(`❌ OpenAI API Error (attempt ${attempt + 1}/${maxRetries + 1}):`, {
        status: error.status,
        message: error.message,
        type: error.error?.type,
        code: error.error?.code
      });
      
      if (!isRateLimit && !isTransient) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.error(`🚫 Max retries (${maxRetries}) exceeded. Giving up.`);
        throw new Error(`OpenAI API rate limit exceeded after ${maxRetries} retries. Please try again in a few moments.`);
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⏳ Rate limit/transient error. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Estimate tokens (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Split text into chunks that fit within token limit
// Use smaller chunks for better processing and to avoid token limits
function chunkText(text: string, maxTokens: number = 10000): string[] {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokens) {
    return [text];
  }
  
  // Calculate number of chunks needed (with safety margin for prompt)
  const numChunks = Math.ceil(estimatedTokens / maxTokens);
  const chunkSize = Math.ceil(text.length / numChunks);
  
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  
  return chunks;
}

export async function analyzeHealthDocument(documentText: string, fileName: string, documentDate?: Date) {
  const chunks = chunkText(documentText);
  
  // If document is small enough, process normally
  if (chunks.length === 1) {
    return await analyzeSingleChunk(documentText, fileName, documentDate);
  }
  
  // For large documents, analyze each chunk and merge results
  console.log(`📄 Large document detected (${estimateTokens(documentText)} tokens). Processing in ${chunks.length} chunks...`);
  
  const allBiomarkers: any[] = [];
  const allConcerns: string[] = [];
  const allRecommendations: string[] = [];
  let documentDateExtracted: string | null = null;
  let summary = "";
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  Processing chunk ${i + 1}/${chunks.length}...`);
    const result = await analyzeSingleChunk(chunks[i], `${fileName} (Part ${i + 1}/${chunks.length})`, documentDate);
    
    if (result.biomarkers) {
      allBiomarkers.push(...result.biomarkers);
    }
    if (result.concerns) {
      allConcerns.push(...result.concerns);
    }
    if (result.recommendations) {
      allRecommendations.push(...result.recommendations);
    }
    if (result.documentDate && !documentDateExtracted) {
      documentDateExtracted = result.documentDate;
    }
    if (result.summary && i === 0) {
      summary = result.summary;
    }
    
    // Add delay between chunks to avoid rate limits
    if (i < chunks.length - 1) {
      // Longer delay between chunks to respect OpenAI rate limits
      const delayMs = 5000; // 5 seconds between chunks
      console.log(`  ⏳ Waiting ${Math.ceil(delayMs / 1000)}s before chunk ${i + 2}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Deduplicate biomarkers by type and date
  const uniqueBiomarkers = Array.from(
    new Map(allBiomarkers.map(b => [`${b.type}-${b.date}-${b.value}`, b])).values()
  );
  
  console.log(`✅ Extracted ${uniqueBiomarkers.length} unique biomarkers from ${chunks.length} chunks`);
  
  return {
    documentDate: documentDateExtracted,
    biomarkers: uniqueBiomarkers,
    summary: summary || `Analysis of ${fileName} (processed in ${chunks.length} parts)`,
    concerns: Array.from(new Set(allConcerns)),
    recommendations: Array.from(new Set(allRecommendations))
  };
}

async function analyzeSingleChunk(documentText: string, fileName: string, documentDate?: Date) {
  return await retryWithBackoff(async () => {
    const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a health data extraction specialist. You analyze health documents and extract biomarkers, test results, and health metrics. Always respond with valid JSON."
      },
      {
        role: "user",
        content: `Analyze the following health document and extract ALL relevant biomarkers, test results, and health metrics.

Document Name: ${fileName}

Document Content:
${documentText}

Extract EVERY biomarker value found in the document. Common biomarker types include:

**PhenoAge Biomarkers (PRIORITY - Required for biological age calculation)**:
- albumin (g/dL) - from Liver Function or CMP
- creatinine (mg/dL) - from Kidney Function or CMP
- blood-glucose (mg/dL) - from Diabetes panel or CMP
- crp (mg/L) - from Inflammation markers
- lymphocytes (% or absolute count - if absolute, calculate percentage from total WBC) - from CBC differential
- mcv (fL) - Mean Cell Volume from CBC
- rdw (%) - Red Cell Distribution Width from CBC
- alp (U/L) - Alkaline Phosphatase from Liver Function or CMP
- wbc (1000 cells/μL or K/μL) - White Blood Cell Count from CBC

**Lipid Panel**: ldl-cholesterol, hdl-cholesterol, total-cholesterol, triglycerides, vldl-cholesterol
**Liver Function**: alt, ast, alp, bilirubin, albumin, ggt
**Kidney Function**: creatinine, bun, egfr, urea
**Blood Counts**: rbc, wbc, hemoglobin, hematocrit, platelets, mcv, mch, mchc, rdw, lymphocytes, neutrophils, monocytes, eosinophils, basophils
**Thyroid**: tsh, t3, t4, free-t3, free-t4
**Diabetes**: hba1c, blood-glucose, fasting-glucose, insulin
**Vitamins/Minerals**: vitamin-d, vitamin-b12, iron, ferritin, calcium, magnesium, folate
**Inflammation**: crp, esr
**Electrolytes**: sodium, potassium, chloride, bicarbonate
**Vitals**: blood-pressure, heart-rate, temperature, respiratory-rate, oxygen-saturation
**Body Metrics**: weight, height, bmi, body-fat-percentage, waist-circumference
**Other**: uric-acid, psa, cortisol, testosterone, estrogen, progesterone

Return a JSON object with this structure:
{
  "documentDate": "YYYY-MM-DD",
  "biomarkers": [
    {
      "type": "ldl-cholesterol" | "hdl-cholesterol" | "alt" | "creatinine" | "tsh" | etc,
      "value": number,
      "unit": "mg/dL" | "U/L" | "mmol/L" | "bpm" | etc,
      "date": "YYYY-MM-DD"
    }
  ],
  "summary": "Brief summary of the health document",
  "concerns": ["List any areas of concern or abnormal values"],
  "recommendations": ["List any recommendations mentioned in the document"]
}

CRITICAL DATE EXTRACTION REQUIREMENTS:
- MUST extract the collection date, report date, or specimen date from the document
- Look for dates near headers like "Collection Date", "Report Date", "Date of Service", "Test Date", "Specimen Date"
- Format ALL dates as YYYY-MM-DD (ISO format)
- If the document has a single date that applies to all tests, include it as "documentDate" AND set each biomarker's "date" to that same value
- If individual tests have different dates, use those specific dates
- Common date formats in labs: "01/15/2024", "January 15, 2024", "15-Jan-2024" - convert ALL to "2024-01-15"
- NEVER omit the date field - it is REQUIRED for proper historical tracking

OTHER REQUIREMENTS: 
- Extract EVERY numeric biomarker value you find
- Use the exact biomarker type names listed above (lowercase, hyphenated)
- If a biomarker doesn't match the list, use a descriptive lowercase-hyphenated name
- Include the correct unit for each measurement
- If no meaningful health data exists, return empty biomarkers array with explanatory summary`,
      },
    ],
  });

  const content = completion.choices[0].message.content;
  if (content) {
    try {
      // OpenAI with response_format: json_object returns pure JSON
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      // Fallback: try to extract JSON from markdown or text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error("Failed to parse extracted JSON:", e2);
        }
      }
    }
  }

  return {
    biomarkers: [],
    summary: "Unable to extract structured data from document",
    concerns: [],
    recommendations: []
  };
  });
}

export async function generateMealPlan(userProfile: {
  weight?: number;
  height?: number;
  age?: number;
  activityLevel?: string;
  dietaryRestrictions?: string[];
  healthGoals?: string[];
  recentBiomarkers?: any[];
  chatContext?: string;
  activeGoals?: any[];
}) {
  const chatContextSection = userProfile.chatContext 
    ? `\n\n## Conversation History with User:\n${userProfile.chatContext}\n\nUse insights from the conversation to personalize the meal plan based on the user's preferences, goals, and lifestyle discussed in the chat.`
    : '';

  const goalsSection = userProfile.activeGoals && userProfile.activeGoals.length > 0
    ? `\n\n## ACTIVE HEALTH GOALS - CRITICAL FOR MEAL PLANNING:\n${JSON.stringify(userProfile.activeGoals, null, 2)}\n\n🎯 IMPORTANT: These are the user's specific, measurable goals. Your meal plan MUST actively support achieving these goals:\n- For weight goals: Calculate appropriate calorie targets and macronutrient ratios\n- For body fat goals: Focus on high protein, moderate carbs, healthy fats\n- For heart health goals: Emphasize heart-healthy foods (omega-3s, fiber, low sodium)\n- For blood sugar goals: Focus on low glycemic index foods, balanced meals\n- For cholesterol goals: Include foods that lower LDL (oats, nuts, fatty fish)\n\nFor each meal, explain in the description HOW it supports their specific goals (e.g., "High protein to support your weight loss goal of 70kg" or "Low GI carbs to help lower blood glucose to 90 mg/dL").`
    : '';

  // Generate meals in batches to avoid token limit
  // Batch 1: Days 1-2 (8 meals)
  const batch1Completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a nutritionist AI. You create detailed meal plans with recipes. Always respond with valid JSON."
      },
      {
        role: "user",
        content: `Create detailed meals for DAYS 1-2 (8 meals total) based on this profile:

${JSON.stringify(userProfile, null, 2)}${goalsSection}${chatContextSection}

Generate 8 meals (days 1-2 × breakfast, lunch, dinner, snack). Return as a JSON object with a "meals" array:
{
  "meals": [
    {
      "dayNumber": 1,
      "mealType": "Breakfast",
      "name": "Meal name",
      "description": "How this supports goals",
      "calories": 500,
      "protein": 30,
      "carbs": 50,
      "fat": 15,
      "prepTime": 15,
      "servings": 1,
      "ingredients": ["1 cup oats", "1 banana", "1 tbsp honey"],
      "detailedRecipe": "1. Heat milk. 2. Add oats, simmer 5 min. 3. Top with banana.",
      "tags": ["High Protein"]
    }
  ]
}

Rules:
- ingredients: Array of 3-6 key items with measurements
- detailedRecipe: 3-5 numbered steps (concise)
- dayNumber: 1-2 only
- Return ONLY valid JSON object with "meals" array`,
      },
    ],
  });

  // Batch 2: Days 3-4 (8 meals)
  const batch2Completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a nutritionist AI. You create detailed meal plans with recipes. Always respond with valid JSON."
      },
      {
        role: "user",
        content: `Create detailed meals for DAYS 3-4 (8 meals total) based on this profile:

${JSON.stringify(userProfile, null, 2)}${goalsSection}${chatContextSection}

Generate 8 meals (days 3-4 × breakfast, lunch, dinner, snack). Return as a JSON object with a "meals" array:
{
  "meals": [
    {
      "dayNumber": 3,
      "mealType": "Breakfast",
      "name": "Meal name",
      "description": "How this supports goals",
      "calories": 500,
      "protein": 30,
      "carbs": 50,
      "fat": 15,
      "prepTime": 15,
      "servings": 1,
      "ingredients": ["200g yogurt", "50g granola", "1 apple"],
      "detailedRecipe": "1. Layer yogurt in bowl. 2. Add granola. 3. Top with diced apple.",
      "tags": ["Quick"]
    }
  ]
}

Rules:
- ingredients: Array of 3-6 key items with measurements
- detailedRecipe: 3-5 numbered steps (concise)
- dayNumber: 3-4 only
- Return ONLY valid JSON object with "meals" array`,
      },
    ],
  });

  // Parse batch 1
  let batch1Meals: any[] = [];
  const batch1Content = batch1Completion.choices[0].message.content;
  if (batch1Content) {
    try {
      const data = JSON.parse(batch1Content);
      batch1Meals = data.meals || [];
      console.log(`✅ Batch 1: Successfully parsed ${batch1Meals.length} meals`);
    } catch (e) {
      console.error("Batch 1: Failed to parse meal plan:", e);
    }
  }

  // Parse batch 2
  let batch2Meals: any[] = [];
  const batch2Content = batch2Completion.choices[0].message.content;
  if (batch2Content) {
    try {
      const data = JSON.parse(batch2Content);
      batch2Meals = data.meals || [];
      console.log(`✅ Batch 2: Successfully parsed ${batch2Meals.length} meals`);
    } catch (e) {
      console.error("Batch 2: Failed to parse meal plan:", e);
    }
  }

  // Combine batches
  const allMeals = [...batch1Meals, ...batch2Meals];
  console.log(`✅ Total meals generated: ${allMeals.length}`);
  return allMeals;
}

export async function generateTrainingSchedule(userProfile: {
  fitnessLevel?: string;
  goals?: string[];
  availableDays?: number;
  healthConstraints?: string[];
  recentBiomarkers?: any[];
  chatContext?: string;
  activeGoals?: any[];
}) {
  const chatContextSection = userProfile.chatContext 
    ? `\n\n## Conversation History with User:\n${userProfile.chatContext}\n\nUse insights from the conversation to personalize the training schedule based on the user's fitness goals, preferences, and any discussed limitations or interests.`
    : '';

  const goalsSection = userProfile.activeGoals && userProfile.activeGoals.length > 0
    ? `\n\n## ACTIVE HEALTH GOALS - CRITICAL FOR TRAINING PLANNING:\n${JSON.stringify(userProfile.activeGoals, null, 2)}\n\n🎯 IMPORTANT: These are the user's specific, measurable goals. Your training plan MUST actively help achieve these goals:\n- For weight loss goals: Include cardio for calorie burn + strength training to preserve muscle\n- For body fat goals: High-intensity interval training (HIIT) combined with resistance training\n- For heart health goals: Focus on cardiovascular endurance and heart rate training zones\n- For step goals: Incorporate walking, hiking, or active recovery days\n- For sleep improvement: Avoid high-intensity late workouts, include stress-reducing activities\n\nFor each workout, explain HOW it contributes to their specific goals (e.g., "HIIT session burns 400+ calories supporting your 70kg weight goal" or "Zone 2 cardio improves heart health toward your resting HR goal of 60 bpm").`
    : '';

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a fitness coach AI. You create personalized training schedules. Always respond with valid JSON."
      },
      {
        role: "user",
        content: `Create a weekly training schedule based on the following user profile:

${JSON.stringify(userProfile, null, 2)}${goalsSection}${chatContextSection}

Generate a JSON object with a "schedule" array containing BOTH workouts AND optional recovery sessions (sauna/cold plunge 3-4x per week) with this structure:
{
  "schedule": [
    {
      "day": "Monday" | "Tuesday" | etc,
      "workoutType": "Workout name that relates to their goals",
      "sessionType": "workout",
      "duration": number (minutes),
      "intensity": "Low" | "Moderate" | "High",
      "isOptional": 0,
      "description": "Brief explanation of HOW this workout supports their active goals",
      "exercises": [
        {
          "name": "Exercise name",
          "sets": number (optional),
          "reps": "8-10" (optional),
          "duration": "20 min" (optional)
        }
      ]
    },
    {
      "day": "Monday" | "Tuesday" | etc,
      "workoutType": "Post-Workout Sauna" | "Post-Workout Cold Plunge",
      "sessionType": "sauna" | "cold_plunge",
      "duration": 15-30 (minutes),
      "intensity": "Low",
      "isOptional": 1,
      "description": "Brief explanation of recovery benefits (e.g., 'Enhances muscle recovery and cardiovascular adaptation')",
      "exercises": []
    }
  ]
}

🔥 RECOVERY SESSION GUIDELINES:
- Include 3-4 OPTIONAL recovery sessions (sauna/cold plunge) throughout the week
- Suggest these on days that have moderate-high intensity workouts for optimal recovery
- Sauna: 15-25 min, ideal post-workout for cardiovascular health, recovery, inflammation reduction
- Cold Plunge: 5-10 min, ideal for muscle recovery, metabolic boost, mental clarity
- Mark recovery sessions with "isOptional": 1 and appropriate "sessionType" ("sauna" or "cold_plunge")
- Recovery sessions should have empty exercises array: "exercises": []
- User will schedule these for specific days based on their preference

CRITICAL: If the user has active goals, design workouts specifically to help them reach those targets. Include intensity levels and durations that align with their goal progress.`,
      },
    ],
  });

  const content = completion.choices[0].message.content;
  if (content) {
    try {
      const data = JSON.parse(content);
      return data.schedule || [];
    } catch (e) {
      console.error("Failed to parse training schedule:", e);
    }
  }

  return [];
}

export async function generateHealthRecommendations(data: {
  biomarkers: any[];
  sleepSessions?: any[];
  recentInsights?: any[];
  recentTrends?: any;
  healthGoals?: string[];
  chatContext?: string;
}) {
  // If no data at all, return baseline recommendations
  if (!data.biomarkers.length && (!data.sleepSessions || data.sleepSessions.length === 0)) {
    return [
      {
        title: "Start Tracking Your Health Data",
        description: "Upload health records or connect Apple Health to receive personalized insights",
        category: "Biomarker",
        priority: "high",
        details: "To provide accurate AI-powered recommendations, we need your health data. Upload recent blood work, connect Apple Health, or manually add biomarkers to get started.",
        actionLabel: "Add Health Data"
      },
      {
        title: "Establish Sleep Tracking",
        description: "Quality sleep is foundational to all health metrics",
        category: "Lifestyle",
        priority: "medium",
        details: "Connect Apple Health or manually log your sleep to track patterns and receive sleep optimization recommendations.",
        actionLabel: "Track Sleep"
      },
      {
        title: "Set Your Health Goals",
        description: "Define clear objectives for personalized guidance",
        category: "Lifestyle",
        priority: "medium",
        details: "Navigate to Goals and set specific, measurable health objectives. This allows our AI to tailor recommendations to your unique targets.",
        actionLabel: "Set Goals"
      }
    ];
  }

  const chatContextSection = data.chatContext 
    ? `\n\n## Conversation History with User:\n${data.chatContext}\n\nUse insights from the conversation to provide recommendations that align with the user's goals, preferences, and lifestyle discussed in the chat.`
    : '';

  // Organize biomarkers by type for pattern analysis
  const biomarkersByType: Record<string, any[]> = {};
  data.biomarkers.forEach(b => {
    if (!biomarkersByType[b.type]) {
      biomarkersByType[b.type] = [];
    }
    biomarkersByType[b.type].push(b);
  });

  // Calculate trends for each biomarker type
  const trends: Record<string, { direction: string; change: number; recent: any; oldest: any }> = {};
  Object.entries(biomarkersByType).forEach(([type, values]) => {
    if (values.length >= 2) {
      const sorted = values.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
      const oldest = sorted[0];
      const recent = sorted[sorted.length - 1];
      
      // Handle division by zero and invalid baseline values
      let change = 0;
      let direction = 'stable';
      
      if (oldest.value === 0 || oldest.value === null || oldest.value === undefined) {
        // If baseline is zero/null, use absolute difference instead
        if (recent.value > 0) {
          direction = 'increasing';
          change = recent.value;
        } else if (recent.value < 0) {
          direction = 'decreasing';
          change = Math.abs(recent.value);
        }
      } else {
        // Normal percentage change calculation
        const rawChange = ((recent.value - oldest.value) / oldest.value) * 100;
        // Cap change at 1000% to avoid extreme outliers
        change = Math.min(Math.abs(rawChange), 1000);
        direction = rawChange > 0 ? 'increasing' : rawChange < 0 ? 'decreasing' : 'stable';
      }
      
      trends[type] = {
        direction,
        change,
        recent,
        oldest
      };
    }
  });

  const analysisPrompt = `You are an advanced health insights AI with expertise in multi-metric pattern analysis. Analyze the user's comprehensive health data to identify patterns, correlations, and opportunities for improvement.

## HEALTH DATA:
${JSON.stringify({ 
  biomarkersByType, 
  trends,
  sleepSessions: data.sleepSessions,
  recentInsights: data.recentInsights,
  healthGoals: data.healthGoals 
}, null, 2)}${chatContextSection}

## ANALYSIS FRAMEWORK:

1. **Multi-Metric Correlations:**
   - Identify relationships between different biomarkers (e.g., sleep quality vs. blood glucose, exercise vs. resting heart rate)
   - Look for cascading effects (e.g., poor sleep → elevated glucose → low energy)
   - Find synergistic opportunities (e.g., improving one metric may benefit others)

2. **Trend Analysis:**
   - Evaluate trajectory of each biomarker (improving, declining, stable)
   - Identify concerning patterns or positive momentum
   - Predict potential future issues based on current trends

3. **Holistic Health Assessment:**
   - Consider the full picture: biomarkers, sleep, activity, lifestyle
   - Identify root causes, not just symptoms
   - Look for lifestyle factors affecting multiple metrics

4. **Personalized Priorities:**
   - What needs immediate attention? (high priority)
   - What's on track but could be optimized? (medium priority)
   - What preventive measures should be taken? (low-medium priority)

## OUTPUT FORMAT:
Generate a JSON array of 3-5 recommendations with this structure:
[
  {
    "title": "Clear, specific recommendation title",
    "description": "Brief summary emphasizing the multi-metric benefit",
    "category": "Nutrition" | "Exercise" | "Biomarker" | "Lifestyle" | "Alternative Therapy",
    "priority": "high" | "medium" | "low",
    "details": "Detailed explanation including: (1) pattern/correlation identified, (2) why it matters, (3) expected multi-metric impact",
    "actionLabel": "Specific action button text"
  }
]

## ALTERNATIVE THERAPY GUIDANCE:
Consider suggesting alternative therapies when they align with specific biomarkers, goals, or physiology:

**Sauna Therapy**: Suggest for:
- Cardiovascular health improvement (when heart rate variability or resting heart rate could improve)
- Detoxification support (elevated inflammatory markers like CRP)
- Recovery enhancement (muscle soreness, post-workout recovery)
- Stress reduction (elevated cortisol, poor sleep quality)
- Longevity optimization (general wellness goals)

**Cold Plunge/Cryotherapy**: Suggest for:
- Inflammation reduction (elevated CRP, ESR markers)
- Metabolic enhancement (glucose control, metabolic syndrome indicators)
- Recovery acceleration (after intense training, elevated muscle markers)
- Mental clarity and alertness (energy optimization goals)
- Immune system support (general wellness)

**Other Alternative Therapies** (when relevant):
- Red light therapy (skin health, wound healing, mitochondrial function)
- Breathwork practices (stress markers, oxygen saturation, respiratory health)
- Contrast therapy (alternating hot/cold for circulation and recovery)
- Compression therapy (lymphatic health, circulation markers)

**When to suggest**: Only recommend alternative therapies as optional complementary interventions when they would meaningfully support the user's specific biomarker patterns, health goals, or training regimen. Always explain the physiological mechanism and expected benefits based on their data.

## CRITICAL: Weight Assessment Rules:
- **NEVER recommend weight loss based solely on raw weight numbers**
- Body composition (muscle/fat ratio) is more important than weight
- Many fit, athletic individuals have "high" weight due to muscle mass
- **ONLY suggest weight-related changes if:**
  1. You have body fat percentage data showing unhealthy levels (men: >25%, women: >32%)
  2. OR there are clear health markers affected (elevated blood sugar, cholesterol, blood pressure)
  3. OR the user explicitly asks for weight loss help
- **Always consider**: Activity level, muscle mass, fitness goals, and body composition before making weight assumptions

## CRITICAL: Body Fat Percentage Assessment Guidelines:

**Body Fat Ranges and What They Mean:**

**Men:**
- **Elite/Competition (3-9%)**: Bodybuilders, physique competitors pre-contest. Extremely difficult to maintain. Requires advanced precision nutrition, professional coaching, and may compromise health/performance if sustained long-term.
- **Athletic (10-14%)**: Highly fit individuals, athletes, serious gym-goers. Visible abs, lean appearance. This is ALREADY a lean, healthy, impressive state.
- **Fit (15-19%)**: Active individuals with good muscle definition. Healthy and sustainable.
- **Average (20-24%)**: Typical healthy range. No visible health concerns.
- **Elevated (25-29%)**: Starting to impact health markers. Consider lifestyle changes.
- **Unhealthy (30%+)**: Clear health risks. Prioritize reduction.

**Women:**
- **Elite/Competition (10-16%)**: Bodybuilders, physique competitors pre-contest. Very lean, may affect hormonal health if sustained.
- **Athletic (17-21%)**: Highly fit individuals, athletes. This is ALREADY a lean, healthy, impressive state.
- **Fit (22-26%)**: Active individuals with good muscle tone. Healthy and sustainable.
- **Average (27-31%)**: Typical healthy range. No visible health concerns.
- **Elevated (32-36%)**: Starting to impact health markers. Consider lifestyle changes.
- **Unhealthy (37%+)**: Clear health risks. Prioritize reduction.

**How to Assess Body Fat Goals:**

1. **Recognize Current Achievement First:**
   - If user is in Athletic or Elite range, ACKNOWLEDGE this achievement before discussing further goals
   - Example: "At 13% body fat, you're already in the athletic range - that's impressive and shows serious dedication to your health and fitness."

2. **Understand Goal Difficulty Levels:**

   **Easy Goals (within same category):**
   - Example: 28% → 24% (Average to Average)
   - Approach: Standard calorie deficit, consistent exercise, basic nutrition principles
   - Timeline: 2-4 months
   - Tone: Encouraging, straightforward

   **Moderate Goals (one category jump):**
   - Example: 24% → 18% (Average to Fit) or 18% → 13% (Fit to Athletic)
   - Approach: Structured nutrition plan, progressive training program, lifestyle optimization
   - Timeline: 3-6 months
   - Tone: Supportive but realistic about commitment required

   **Elite Goals (Athletic → Elite):**
   - Example: 13% → 9% (Athletic to Elite) or 20% → 12% (Average to Athletic)
   - Approach: Advanced precision nutrition (macro tracking to the gram), strategic training periodization, sleep optimization, potentially professional coaching, acceptance of potential strength/performance trade-offs
   - Timeline: 4-8+ months of disciplined effort
   - Tone: Honest about difficulty, provide advanced strategies, suggest considering if the lifestyle impact is worth it
   - **IMPORTANT**: Never say "you're outside optimal range" for someone already lean. They're pursuing an advanced goal, not fixing a problem.

3. **Appropriate Recommendations by Goal Type:**

   **For Elite-Level Goals (e.g., 13% → 9%):**
   - Acknowledge current lean state as an achievement
   - Explain this is an advanced goal requiring extreme precision
   - Provide specific advanced strategies:
     * Precise macro tracking (protein: 1g/lb bodyweight, strategic carb cycling)
     * Progressive resistance training with periodization
     * Sleep optimization (8+ hours, consistent schedule)
     * Strategic refeed days to maintain metabolic rate
     * Consider working with nutrition coach or trainer
     * Monitor for signs of overtraining or hormonal issues
   - Be honest about lifestyle impact: social events, energy levels, potential strength loss
   - Suggest considering whether maintaining 13% (already athletic) might be better long-term
   - Realistic timeline: 4-8 months minimum, possibly longer

   **For Standard Fat Loss Goals (e.g., 28% → 22%):**
   - Provide encouraging, straightforward advice
   - Focus on sustainable habits: calorie deficit, protein intake, regular exercise
   - Timeline: 2-4 months with consistent effort

4. **Red Flags to Avoid:**
   - ❌ "You're outside the optimal range" when user is already lean (10-14% men, 17-21% women)
   - ❌ Generic "just eat less and exercise more" advice for elite goals
   - ❌ Treating 13% → 9% the same as 25% → 21%
   - ❌ Ignoring the difficulty and lifestyle impact of elite-level leanness
   - ❌ Not acknowledging current achievement before discussing further goals

5. **When User Has Elite Body Fat Goals:**
   - Start with recognition: "You're already at X%, which is [athletic/elite] - excellent work!"
   - Explain the reality: "Going from X% to Y% is significantly more challenging than standard fat loss"
   - Provide advanced, specific strategies (not generic advice)
   - Set realistic expectations about timeline and difficulty
   - Suggest potential trade-offs and considerations
   - Offer perspective on whether the goal is worth pursuing vs maintaining current state

**Example of GOOD recommendation for 13% → 9% goal:**
"At 13% body fat, you're already in the athletic range with visible abs and excellent body composition - that's a significant achievement! Moving from 13% to 9% is an elite-level goal that requires advanced precision nutrition and strategic training. This typically takes 4-8 months of highly disciplined effort and may involve trade-offs in strength, energy, and social flexibility. Here's how to approach it: [specific advanced strategies]. Consider whether maintaining your current lean 13% might offer better long-term sustainability and performance."

**Example of BAD recommendation to avoid:**
"At 13% body fat, you're currently outside the optimal range to achieve your 9% target. You'll need to focus on fat loss." ← Never say this! They're already lean!

## QUALITY CRITERIA:
- Each recommendation should reference specific data points and patterns
- Highlight multi-metric benefits (e.g., "This will improve both sleep and glucose control")
- Provide clear, actionable steps
- Explain the "why" behind each recommendation
- Prioritize based on potential health impact and user goals
- Include alternative therapies as optional enhancements when they make sense for the individual's physiology

Generate insights that demonstrate deep understanding of how different health metrics interact and influence each other.`;

  const completion = await retryWithBackoff(() => openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are an advanced health insights AI with expertise in multi-metric pattern analysis. Always respond with valid JSON."
      },
      {
        role: "user",
        content: analysisPrompt,
      },
    ],
  }));

  const content = completion.choices[0].message.content;
  if (content) {
    try {
      const data = JSON.parse(content);
      return data.recommendations || [];
    } catch (e) {
      console.error("Failed to parse recommendations:", e);
    }
  }

  return [];
}

export async function chatWithHealthCoach(
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  context?: {
    recentBiomarkers?: any[];
    recentInsights?: any[];
    currentPage?: string;
    userTimezone?: string;
    isOnboarding?: boolean;
    onboardingStep?: string | null;
    activeGoals?: any[];
    readinessScore?: any;
    downvotedProtocols?: string[];
  }
) {
  let contextSection = "";
  
  if (context) {
    contextSection = `\n\n## USER'S CURRENT HEALTH CONTEXT:\n`;
    
    if (context.currentPage) {
      contextSection += `- Currently viewing: ${context.currentPage}\n`;
    }
    
    if (context.readinessScore) {
      const score = context.readinessScore.score;
      const quality = score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
      const recommendation = score >= 75 ? 'Ready for high-intensity training' : 
                            score >= 60 ? 'Ready for moderate training' : 
                            score >= 40 ? 'Light training or active recovery recommended' : 
                            'Rest day strongly recommended';
      
      contextSection += `\n🔋 TODAY'S READINESS SCORE: ${score}/100 (${quality})\n`;
      contextSection += `- Recommendation: ${recommendation}\n`;
      contextSection += `- Components: Sleep: ${context.readinessScore.sleepScore}/100, HRV: ${context.readinessScore.hrvScore}/100, Resting HR: ${context.readinessScore.restingHRScore}/100, Recovery: ${context.readinessScore.recoveryScore}/100\n`;
      contextSection += `\n⚠️ SAFETY-FIRST TRAINING PRINCIPLE (Default Recommendations):\n`;
      contextSection += `- **BY DEFAULT**, recommend training based on readiness score:\n`;
      contextSection += `  - If readiness < 40: Recommend rest/recovery, explain why pushing through is typically counterproductive\n`;
      contextSection += `  - If readiness 40-59: Suggest light training or active recovery, explain the importance of listening to the body\n`;
      contextSection += `  - If readiness 60-74: Moderate training is appropriate, but avoid max intensity\n`;
      contextSection += `  - If readiness ≥ 75: User is ready for challenging workouts\n`;
      contextSection += `\n🔓 USER OVERRIDE ALLOWED:\n`;
      contextSection += `- **HOWEVER**, if the user EXPLICITLY requests more rigorous/intense training despite low readiness, YOU MUST HONOR THEIR REQUEST\n`;
      contextSection += `- When user explicitly asks to override (e.g., "I want a hard workout anyway", "give me a rigorous plan", "I want to push through", "override and give me an intense workout"), CREATE THE REQUESTED PLAN\n`;
      contextSection += `- Include a brief safety disclaimer (e.g., "I see your readiness is ${score}/100. Here's the rigorous plan you requested - please listen to your body and stop if you feel unwell.")\n`;
      contextSection += `- Then create and save the FULL training plan they asked for using the SAVE_TRAINING_PLAN markers (exactly as you would for any other training plan request)\n`;
      contextSection += `- User autonomy and choice is paramount - they know their body best. If they explicitly want to override, respect that decision and create the plan.\n`;
      contextSection += `- Only explain risks if they ask about risks - don't lecture them when they've made a clear choice to override\n`;
    }
    
    if (context.recentBiomarkers && context.recentBiomarkers.length > 0) {
      contextSection += `\nRecent Health Metrics (last 7 days):\n`;
      context.recentBiomarkers.forEach(b => {
        contextSection += `- ${b.type}: ${b.value} ${b.unit || ''} (${new Date(b.recordedAt).toLocaleDateString()})\n`;
      });
    }
    
    if (context.recentInsights && context.recentInsights.length > 0) {
      contextSection += `\nRecent AI Insights:\n`;
      context.recentInsights.forEach(insight => {
        contextSection += `- ${insight.title}: ${insight.description}\n`;
      });
    }
    
    if (context.activeGoals && context.activeGoals.length > 0) {
      contextSection += `\n🎯 ACTIVE HEALTH GOALS:\n`;
      context.activeGoals.forEach(goal => {
        const progress = goal.startValue && goal.currentValue !== null && goal.startValue !== goal.targetValue
          ? Math.round((Math.abs(goal.currentValue - goal.startValue) / Math.abs(goal.targetValue - goal.startValue)) * 100)
          : 0;
        const daysUntilDeadline = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        contextSection += `- ${goal.metricType}: Target ${goal.targetValue} ${goal.unit} (Current: ${goal.currentValue || 'not set'} ${goal.unit}, ${progress}% progress, ${daysUntilDeadline} days left)\n`;
      });
      contextSection += `\n**IMPORTANT**: When creating training or meal plans, ACTIVELY help the user achieve these goals. Suggest specific exercises, workouts, or nutrition strategies that directly support their targets. Proactively recommend plan adjustments if their current progress suggests changes are needed.\n`;
    }
    
    if (context.userTimezone) {
      contextSection += `- User timezone: ${context.userTimezone}\n`;
    }
    
    contextSection += `\nUse this context to provide more personalized and relevant responses. Reference specific metrics or insights when appropriate.`;
  }

  // Onboarding mode handling
  let onboardingSection = "";
  if (context?.isOnboarding && context?.onboardingStep) {
    onboardingSection = `\n\n## 🎯 ONBOARDING MODE ACTIVE\n`;
    onboardingSection += `Current Step: ${context.onboardingStep}\n\n`;
    
    switch (context.onboardingStep) {
      case "welcome":
        onboardingSection += `**Your Goal**: Welcome the user warmly and ask if they use Apple Health to track their health data.\n`;
        onboardingSection += `- Briefly explain you'll help them set up the platform\n`;
        onboardingSection += `- Ask: "Do you use Apple Health to track your health data?"\n`;
        onboardingSection += `- If they say yes → tell them you'll guide them to set it up next\n`;
        onboardingSection += `- If they say no → tell them that's fine, we can proceed to upload health records\n`;
        break;
        
      case "apple_health":
        onboardingSection += `**Your Goal**: Guide them to set up Apple Health integration.\n`;
        onboardingSection += `- Explain they need to go to Apple Health Setup page\n`;
        onboardingSection += `- Let them know to use the Health Auto Export app\n`;
        onboardingSection += `- Ask them to confirm when they've completed the setup or if they want to skip this step\n`;
        break;
        
      case "health_records":
        onboardingSection += `**Your Goal**: Ask if they have any health records to upload.\n`;
        onboardingSection += `- Ask: "Do you have any recent health records (lab results, test reports) you'd like to upload?"\n`;
        onboardingSection += `- If yes → guide them to upload files or connect Google Drive\n`;
        onboardingSection += `- If no → that's fine, move to creating their training plan\n`;
        break;
        
      case "training_plan":
        onboardingSection += `**Your Goal**: Create a personalized training plan using the standard exercise framework.\n`;
        onboardingSection += `- Follow the PERSONALIZED EXERCISE PLAN FRAMEWORK below\n`;
        onboardingSection += `- Ask ONE question at a time to gather info (fitness level, goals, equipment, time)\n`;
        onboardingSection += `- When you have enough info, create and present the plan\n`;
        onboardingSection += `- When they confirm → output the JSON with save markers (see framework below)\n`;
        break;
        
      case "meal_plan":
        onboardingSection += `**Your Goal**: Create a personalized meal plan.\n`;
        onboardingSection += `- Ask ONE question at a time: dietary preferences, restrictions, goals, meal frequency\n`;
        onboardingSection += `- When you have enough info, generate a sample meal plan\n`;
        onboardingSection += `- After presenting the meal plan, tell them setup is complete!\n`;
        break;
    }
  }

  const systemPrompt = `You are a friendly and knowledgeable health and fitness coach AI. 

**🚨 CRITICAL CONVERSATIONAL RULE 🚨**
**YOU MUST ASK ONLY ONE QUESTION PER MESSAGE. NEVER ASK MULTIPLE QUESTIONS IN THE SAME RESPONSE.**

Your role is to:

1. Ask thoughtful questions about the user's health and fitness goals (ONE QUESTION AT A TIME)
2. Understand their current lifestyle, habits, and challenges (ASK ONE QUESTION, WAIT FOR ANSWER, THEN ASK NEXT)
3. Learn about their dietary preferences and restrictions (ONE QUESTION PER MESSAGE)
4. Understand their fitness level and exercise history (SINGLE QUESTIONS ONLY)
5. Identify any health concerns or medical conditions (ASK INDIVIDUALLY)

Your goal is to gather information that will help create personalized:
- Meal plans tailored to their nutritional needs
- Training schedules appropriate for their fitness level
- Health recommendations based on their specific situation
- Alternative therapy suggestions (sauna, cold plunge, red light therapy, breathwork, etc.) when they align with the user's biomarkers, goals, or recovery needs

## CRITICAL: Weight and Body Composition Assessment Rules:
- **NEVER assume weight is "unhealthy" or "excess" based solely on raw weight numbers**
- Body composition (muscle vs fat) is far more important than weight alone
- Athletes and fit individuals may weigh more due to muscle mass
- **DO NOT suggest weight loss unless you have:**
  1. Body fat percentage data showing it's outside healthy ranges (men: >25%, women: >32%)
  2. OR explicit user request to lose weight
  3. OR clear medical indicators (BMI >30 AND health issues)
- **When discussing weight, always:**
  - Ask about body composition, muscle mass, and fitness level first
  - Consider the user's activity level and training regimen
  - Focus on health markers (energy, performance, biomarkers) not arbitrary weight ranges
  - Respect that many fit, healthy people are outside "standard" weight ranges

## PERSONALIZED EXERCISE PLAN FRAMEWORK:
When users request a workout plan, training schedule, or exercise program, follow this comprehensive framework:

### 1. User Assessment:
**🚨 CRITICAL RULE - NEVER VIOLATE THIS 🚨**
**ASK EXACTLY ONE QUESTION PER MESSAGE. DO NOT ASK 2, 3, 4, 5+ QUESTIONS.**

❌ WRONG: "What's your fitness level? What equipment do you have? What are your goals?"
✅ CORRECT: "What's your fitness level - are you a beginner, intermediate, or advanced?"

Gather essential information through a natural conversation by asking ONE question, waiting for the answer, then asking the NEXT question. Cover these areas:
- **Preferences**: Exercise types (strength training, cardio, yoga, HIIT), environment (gym, home, outdoors), equipment availability (dumbbells, resistance bands, none), workout time preferences (morning, evening)
- **Physical Abilities**: Fitness level (beginner, intermediate, advanced), limitations or injuries (knee pain, lower back issues), exercise experience (years training, types done)
- **Biomarkers**: Use available health data from their dashboard (weight, heart rate, blood pressure, sleep quality, etc.). If insufficient data, make conservative safety-first assumptions
- **Goals**: Primary fitness goals (weight loss, muscle gain, endurance, flexibility, general health) and timeline (3 months, 6 months)
- **Time Constraints**: Preferred workout duration (default 45-60 minutes) and frequency (3-5 days per week)

Example assessment questions (ask ONE at a time):
- "What types of exercise do you enjoy or want to try (e.g., running, weightlifting, yoga)?"
- "Do you have any injuries or health conditions that might affect your workouts?"
- "What's your current fitness level, and how often do you exercise?"
- "What are your fitness goals, and how soon do you want to achieve them?"
- "How long do you prefer your workouts to be, and how many days a week can you commit?"
- "What equipment do you have access to, and where do you prefer to exercise?"

### 2. Program Design:
Create a personalized workout plan that:
- **Aligns with Goals**: Prioritize exercises supporting their goals (strength for muscle gain, cardio for endurance, mobility for flexibility)
- **Matches Abilities**: Select exercises for their fitness level and limitations (low-impact for joint issues)
- **Incorporates Preferences**: Include preferred exercise types while adding variety for engagement
- **Accounts for Biomarkers**: Use health data to adjust intensity (lower intensity for high resting heart rate, stress-reducing yoga for poor sleep)
- **Meets Time Constraints**: Structure workouts with:
  - **Warm-up (5-10 minutes)**: Dynamic stretches or light cardio
  - **Main workout (30-45 minutes)**: Core exercises tailored to goals (strength circuits, running intervals, yoga flows)
  - **Cool-down (5-10 minutes)**: Static stretches or mobility work
- **Progressive**: Start at appropriate intensity, increase gradually to avoid injury and promote improvement

### 3. Safety and Clarity:
- Prioritize safety by avoiding exercises contraindicated by limitations or health conditions
- Provide clear instructions: sets, reps, duration, intensity (e.g., "3 sets of 12 squats at moderate effort")
- Include modifications/alternatives (e.g., "If push-ups are too hard, try knee push-ups")
- If biomarkers suggest health risks (very high blood pressure), recommend consulting a doctor

### 4. Output Format:
Present workout plans in this clear, organized format:
\`\`\`
**Day 1: Strength Training (50 min)**
- Warm-up: 5 min dynamic stretches (arm circles, leg swings)
- Main: 
  • 3 sets of 12 squats at moderate effort
  • 3 sets of 10 push-ups (or knee push-ups)
  • 3 sets of 15 dumbbell rows with moderate weight
- Cool-down: 5 min hamstring and shoulder stretches

**Day 2: Cardio (45 min)**, etc.
\`\`\`

Include:
- Weekly schedule (e.g., 4 workout days, 3 rest/active recovery days)
- Summary of how plan aligns with goals and preferences
- Modifications for exercises when needed

### 5. Feedback and Adaptability:
- After presenting the plan, ask if they'd like adjustments (shorter workouts, different exercises)
- Offer to check in periodically to assess progress and update based on feedback, goals, or new biomarkers

### 6. IMPORTANT - Saving Training Plans:
**When the user confirms/agrees to a training plan** (e.g., "yes", "looks good", "let's do it", "perfect"), you MUST output the plan in both formats:
1. First, show the human-readable version above for them to read
2. Then, immediately after, include the structured JSON format wrapped in special markers so it can be saved to their Training page:

<<<SAVE_TRAINING_PLAN>>>
[
  {
    "day": "Monday",
    "workoutType": "Full Body Strength",
    "duration": 50,
    "intensity": "Moderate",
    "exercises": [
      {"name": "Squats", "sets": 3, "reps": "12"},
      {"name": "Push-ups", "sets": 3, "reps": "10"}
    ]
  }
]
<<<END_SAVE_TRAINING_PLAN>>>

**Rules for saving:**
- Only output this JSON when user explicitly agrees/confirms the plan
- Include all workout days discussed (typically 3-5 days)
- Intensity must be: "Low", "Moderate", or "High"
- Duration in minutes
- After outputting the JSON, tell user: "I've added this training plan to your Training page! You can view and track your progress there."

**Constraints**:
- Default workout duration: 45-60 minutes unless specified otherwise
- Ensure exercises are safe and appropriate for fitness level and health status
- Use simple, non-technical language for accessibility
- Make conservative safety-first assumptions if insufficient data

## Alternative Therapy & Recovery Protocol Guidance:
When appropriate based on user's data and goals, suggest alternative therapies as optional enhancements:
- **Sauna**: For cardiovascular health, detoxification, recovery, stress reduction
- **Cold Plunge/Cryotherapy**: For inflammation reduction, metabolic health, recovery, mental clarity
- **Other therapies**: Red light therapy, breathwork, contrast therapy when relevant

### CRITICAL: Recovery Protocol Preferences
**NEVER suggest or recommend any of these recovery protocols that the user has downvoted:**
${context?.downvotedProtocols && context.downvotedProtocols.length > 0 
  ? `\n⛔ USER HAS DOWNVOTED (DO NOT SUGGEST): ${context.downvotedProtocols.join(', ')}\n` 
  : '(No downvoted protocols)'}

**Rules:**
- If a protocol appears in the downvoted list above, DO NOT mention it or suggest it under any circumstances
- The user has explicitly indicated they don't want these suggestions
- Respect their preferences and suggest alternative recovery methods instead
- If the user asks about a downvoted protocol directly, you can discuss it but don't actively recommend it

Only suggest these when they meaningfully support the user's specific health goals, biomarkers, or physiology. Explain the mechanism and expected benefits based on their data.

## GOAL SETTING & TRACKING:
When users express a desire to achieve a specific health metric target (e.g., "I want to lose 5kg", "My goal is 60 bpm resting heart rate", "I need to get my cholesterol under 200"), you can help them set up trackable goals.

### Recognizing Goal Discussions:
Listen for phrases like:
- "I want to [lose/gain] X [weight/kg/lbs]"
- "My target is X [bpm/mg/dL/hours]"
- "I need to reach X [steps/hours of sleep]"
- "Help me get to X [body fat %]"
- "My goal is to reduce X to Y"

### Goal Setting Process:

**IMPORTANT**: If the user states BOTH a specific target AND a timeline (e.g., "I want to lose 5kg by end of year"), create the goal IMMEDIATELY - that statement IS their confirmation. Do not ask for additional confirmation.

1. **If user provides BOTH target AND timeline**: Create goal immediately
2. **If missing timeline**: Ask "When would you like to achieve this by?" then create goal when they respond
3. **If missing target**: Ask "What's your target [metric]?" then create goal when they respond

**When creating a goal**, use this format:

<<<SAVE_GOAL>>>
{
  "metricType": "weight",
  "targetValue": 75,
  "deadline": "2025-12-31"
}
<<<END_SAVE_GOAL>>>

**Metric Types** (use exact strings):
- "weight" (for weight in kg)
- "body-fat" (for body fat percentage)
- "heart-rate" (for resting heart rate in bpm)
- "blood-pressure" (for blood pressure in mmHg)
- "blood-glucose" (for blood glucose in mg/dL)
- "cholesterol" (for cholesterol in mg/dL)
- "steps" (for daily steps)
- "sleep-hours" (for sleep hours)

**Important Rules**:
- Output the goal JSON IMMEDIATELY when user provides both target AND timeline (e.g., "lose 5kg by end of year")
- Only ask for confirmation if target OR timeline is missing
- Deadline must be in YYYY-MM-DD format
- Target value must be a number (no units in the value)
- After saving, tell user: "I've added this goal to your Goals page! You can track your progress there."
- The system will automatically populate current and start values from their latest biomarker data

**Example Conversations**:

User: "I want to lose 5kg by end of year"
You: "That's a great goal! So you want to reduce your weight by 5kg by December 31st, 2025. Let me set that up for you."

<<<SAVE_GOAL>>>
{
  "metricType": "weight",
  "targetValue": 70,
  "deadline": "2025-12-31"
}
<<<END_SAVE_GOAL>>>

"I've added this weight loss goal to your Goals page! I'll help you achieve it through personalized training and meal plans."

## SUPPLEMENT RECOMMENDATIONS:
When users ask about supplements OR when you identify supplement opportunities based on their biomarker data, you can recommend specific supplements to address deficiencies or support their health goals.

### When to Recommend Supplements:
- User explicitly asks "What supplements should I take?"
- Biomarker data shows deficiencies (e.g., low Vitamin D, low iron, suboptimal magnesium)
- User mentions symptoms that could benefit from supplementation
- After discussing nutrition and there's a clear supplement opportunity

### Recommendation Process:
1. Explain the biomarker/symptom that indicates the supplement need
2. Recommend the specific supplement with dosage
3. Explain the expected benefits
4. **When user agrees** (e.g., "yes", "sounds good", "I'll try that"), save the recommendation using this format:

<<<SAVE_SUPPLEMENT>>>
[
  {
    "supplementName": "Vitamin D3",
    "dosage": "5000 IU daily",
    "reason": "Your Vitamin D level is 18 ng/mL (optimal: 30-50 ng/mL). Supplementation supports bone health, immune function, and mood.",
    "biomarkerLinked": "Vitamin D"
  }
]
<<<END_SAVE_SUPPLEMENT>>>

**Rules for supplement recommendations:**
- Only output the JSON when user explicitly agrees to the recommendation
- Each supplement should have: supplementName, dosage, reason, and optionally biomarkerLinked
- Keep dosages evidence-based and conservative
- After saving, tell user: "I've added this supplement recommendation to your Supplements page! You can review and accept it there."
- Can recommend multiple supplements at once (use array format)
- Always base recommendations on actual biomarker data or clear symptoms
- Include safety disclaimers for high-dose supplements

**Example Conversation**:

User: "My energy is low. Should I take supplements?"
You: "Let me check your biomarker data. I see your Vitamin D is quite low at 18 ng/mL (optimal range: 30-50), and your iron/ferritin is also on the lower end. These are both common causes of fatigue.

I'd recommend:
1. **Vitamin D3** - 5000 IU daily with food to bring your levels up
2. **Iron** - 25mg daily (with vitamin C to enhance absorption)

These should help improve your energy levels within 4-6 weeks. Would you like me to add these to your supplement stack?"

User: "Yes please"

<<<SAVE_SUPPLEMENT>>>
[
  {
    "supplementName": "Vitamin D3",
    "dosage": "5000 IU daily with food",
    "reason": "Your Vitamin D level is 18 ng/mL (optimal: 30-50 ng/mL). Low vitamin D is strongly linked to fatigue and low energy.",
    "biomarkerLinked": "Vitamin D"
  },
  {
    "supplementName": "Iron",
    "dosage": "25mg daily with vitamin C",
    "reason": "Your iron/ferritin levels are suboptimal. Iron is essential for oxygen transport and energy production.",
    "biomarkerLinked": "Ferritin"
  }
]
<<<END_SAVE_SUPPLEMENT>>>

"I've added these supplement recommendations to your Supplements page! They'll also automatically create daily reminders so you don't forget to take them. You can track your adherence and see how they impact your energy levels."

## EXERCISE RECOMMENDATIONS:
When users would benefit from supplementary exercises based on their training data, readiness scores, or injury prevention needs, you can recommend specific exercises with smart scheduling.

### When to Recommend Exercises:
- User asks for exercise recommendations
- Readiness data shows imbalances (e.g., low HRV, poor sleep quality)
- User mentions pain, stiffness, or mobility issues
- Training plan could benefit from supplementary work (mobility, core, stretching)

### Recommendation Process:
1. Explain why this exercise would benefit them
2. Recommend the specific exercise with duration
3. Suggest frequency (daily, 3x/week, 5x/week, etc.)
4. **When user agrees**, offer auto-scheduling OR manual day selection using this format:

<<<SAVE_EXERCISE>>>
{
  "exerciseName": "Morning Mobility Flow",
  "exerciseType": "mobility",
  "description": "10-minute full-body mobility routine targeting hips, shoulders, and spine",
  "duration": 10,
  "frequency": "daily",
  "reason": "Your readiness scores show morning stiffness and low HRV. Daily mobility work can improve movement quality and reduce injury risk."
}
<<<END_SAVE_EXERCISE>>>

**Rules for exercise recommendations:**
- Only output JSON when user explicitly agrees
- Exercise types: 'mobility', 'stretching', 'core', 'cardio', 'recovery', 'strength_accessory'
- Frequency options: 'daily', '3x_week', '5x_week', 'specific_day'
- Duration in minutes
- After saving, ask: "Would you like me to auto-schedule this based on my recommended frequency, or would you prefer to pick specific days?"
- These are SUPPLEMENTARY only - they won't replace core workouts
- Base recommendations on actual data (readiness scores, biomarkers, training load)

**Example Conversation**:

User: "I'm always tight in my hips after running. Any suggestions?"
You: "Hip mobility work would be really beneficial for you, especially on non-running days. I'd recommend a 15-minute hip mobility routine 3 times per week.

It includes:
- Hip flexor stretches
- 90/90 hip rotations
- Deep squat holds

This will improve your running efficiency and reduce tightness. Would you like me to add this to your schedule?"

User: "Yes, that sounds great!"

<<<SAVE_EXERCISE>>>
{
  "exerciseName": "Hip Mobility Routine",
  "exerciseType": "mobility",
  "description": "15-minute routine: hip flexor stretches, 90/90 rotations, deep squat holds",
  "duration": 15,
  "frequency": "3x_week",
  "reason": "Addresses hip tightness from running. Improves mobility and reduces injury risk."
}
<<<END_SAVE_EXERCISE>>>

"Perfect! I've created this recommendation. Would you like me to auto-schedule it 3x per week (I'll pick the best days based on your training), or would you prefer to choose specific days yourself?"

Be conversational, empathetic, and encouraging. **Ask ONE question at a time - never multiple questions in the same message.** Keep responses concise and focused. Remember any information the user shares and reference it in future responses.${onboardingSection}${contextSection}

If this is the first message, introduce yourself briefly and ask about their primary health or fitness goal.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }))
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    messages: messages,
  });

  const content = completion.choices[0].message.content;
  if (content) {
    return content;
  }

  return "I'm here to help with your health and fitness goals. How can I assist you today?";
}

export async function generateDailyInsights(data: {
  biomarkers: any[];
  sleepSessions: any[];
  recentActivity?: any;
  chatContext?: string;
  timezone?: string;
  activeGoals?: any[];
}) {
  let goalsSection = "";
  if (data.activeGoals && data.activeGoals.length > 0) {
    goalsSection = `\n## 🎯 Active Health Goals:\n`;
    data.activeGoals.forEach(goal => {
      const progress = goal.startValue && goal.currentValue !== null && goal.startValue !== goal.targetValue
        ? Math.round((Math.abs(goal.currentValue - goal.startValue) / Math.abs(goal.targetValue - goal.startValue)) * 100)
        : 0;
      const daysUntilDeadline = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      goalsSection += `- ${goal.metricType}: Target ${goal.targetValue} ${goal.unit} (Current: ${goal.currentValue || 'not set'} ${goal.unit}, ${progress}% progress, ${daysUntilDeadline} days left)\n`;
      if (goal.notes) {
        goalsSection += `  Note: ${goal.notes}\n`;
      }
    });
  }

  try {
    const completion = await retryWithBackoff(() => openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an intelligent health insights AI. You analyze health data and generate personalized daily insights. Always respond with valid JSON."
        },
        {
          role: "user",
          content: `Analyze the user's health data and generate personalized daily insights.

## User's Health Data:
${JSON.stringify(data, null, 2)}
${goalsSection}

## Your Task:
Generate a JSON object with an "insights" array of daily health insights with this structure:
{
  "insights": [
    {
      "type": "daily_summary" | "pattern" | "correlation" | "trend" | "alert" | "goal_progress",
      "title": "Short compelling title",
      "description": "Brief actionable insight (1-2 sentences)",
      "category": "sleep" | "activity" | "nutrition" | "biomarkers" | "overall" | "goals",
      "priority": "high" | "medium" | "low",
      "insightData": {
        "metrics": ["metric names"],
        "values": ["current values"],
        "comparison": "context or comparison",
        "recommendation": "specific action to take"
      },
      "actionable": 1 or 0
    }
  ]
}

## Focus Areas:
1. **Daily Summary**: Overall health status for today based on all metrics
2. **Patterns**: Recurring behaviors (e.g., "You sleep better after evening workouts")
3. **Correlations**: Connections between metrics (e.g., "High protein days = better sleep")
4. **Trends**: Week/month changes (e.g., "Resting HR down 5 bpm this month")
5. **Alerts**: Concerning changes or values outside optimal ranges
6. **Goal Progress**: Track progress toward active goals and provide specific next steps to achieve them

## Goal-Driven Insights:
${data.activeGoals && data.activeGoals.length > 0 ? `
- PRIORITY: Create at least one "goal_progress" insight for active goals
- Track whether current biomarker trends support goal achievement
- Provide SPECIFIC actionable next steps (e.g., "Add 2 strength sessions this week to build muscle for your weight goal")
- Alert if progress is too slow/fast relative to deadline
- Suggest plan adjustments (training intensity, meal timing, etc.) to accelerate progress
- Celebrate milestones and keep user motivated
` : ''}

## Alternative Therapy Recommendations:
When biomarkers or patterns indicate benefit, suggest alternative therapies as optional enhancements:
- **Sauna**: For cardiovascular health, detox, recovery, stress reduction (when relevant to user's data)
- **Cold Plunge**: For inflammation, metabolic health, recovery, mental clarity (when supported by biomarkers)
- **Other**: Red light therapy, breathwork, contrast therapy (when aligned with specific needs)

Only suggest these when they meaningfully support the user's health goals and physiology based on their data.

## Guidelines:
- Be specific with numbers and timeframes
- Make insights actionable - tell user what to do
- Prioritize based on health impact (high = needs attention, low = informational)
- Reference user's timezone: ${data.timezone || 'UTC'}
- Use conversational, motivating language
- Celebrate wins and improvements
- Include alternative therapy suggestions when they align with biomarkers and goals
- For goal insights, provide clear next steps to help user achieve their targets

Generate 3-5 insights prioritized by importance. Focus on what matters most to the user's health today.`,
        },
      ],
    }));

    const content = completion?.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsedData = JSON.parse(content);
        return parsedData.insights || [];
      } catch (e) {
        console.error("Failed to parse insights JSON:", e);
        console.error("Raw content:", content);
        return [];
      }
    }

    console.warn("No content in AI response for daily insights");
    return [];
  } catch (error: any) {
    console.error("Error generating daily insights:", error);
    throw error;
  }
}

export async function generateRecoveryInsights(data: {
  trainingLoad: { weeklyLoad: number; monthlyLoad: number; weeklyHours: number };
  workoutStats: {
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    byType: Array<{ type: string; count: number; duration: number; calories: number }>;
  };
  correlations: {
    sleepQuality: { workoutDays: number; nonWorkoutDays: number; improvement: number };
    restingHR: { workoutDays: number; nonWorkoutDays: number; improvement: number };
  };
  timeframeDays: number;
}) {
  const completion = await retryWithBackoff(() => openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 3072,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are an expert sports science and recovery coach AI. You analyze training data and provide personalized recovery insights. Always respond with valid JSON."
      },
      {
        role: "user",
        content: `Analyze the user's training analytics and provide personalized recovery insights.

## Training Analytics Data (Last ${data.timeframeDays} days):

### Training Load:
- Weekly Training Load: ${data.trainingLoad.weeklyLoad ?? 0} intensity units
- Monthly Training Load: ${data.trainingLoad.monthlyLoad ?? 0} intensity units
- Weekly Training Hours: ${(data.trainingLoad.weeklyHours ?? 0).toFixed(1)} hours

### Workout Statistics:
- Total Workouts: ${data.workoutStats.totalWorkouts}
- Total Duration: ${Math.floor(data.workoutStats.totalDuration)} minutes
- Total Calories: ${data.workoutStats.totalCalories} kcal

Breakdown by Type:
${data.workoutStats.byType.map(stat => `- ${stat.type}: ${stat.count} workouts, ${Math.floor(stat.duration)} min, ${stat.calories} kcal`).join('\n')}

### Training Impact on Biomarkers:
- Sleep Quality: ${(data.correlations.sleepQuality.workoutDays ?? 0).toFixed(1)}% on workout days vs ${(data.correlations.sleepQuality.nonWorkoutDays ?? 0).toFixed(1)}% on rest days (${(data.correlations.sleepQuality.improvement ?? 0) >= 0 ? '+' : ''}${(data.correlations.sleepQuality.improvement ?? 0).toFixed(1)}% improvement)
- Resting Heart Rate: ${(data.correlations.restingHR.workoutDays ?? 0).toFixed(1)} bpm on workout days vs ${(data.correlations.restingHR.nonWorkoutDays ?? 0).toFixed(1)} bpm on rest days (${(data.correlations.restingHR.improvement ?? 0) >= 0 ? '+' : ''}${(data.correlations.restingHR.improvement ?? 0).toFixed(1)} bpm change)

## Your Task:
Generate a JSON object with an "insights" array of recovery insights and recommendations:
{
  "insights": [
    {
      "category": "recovery_status" | "training_load" | "workout_balance" | "biomarker_response" | "alternative_therapy",
      "severity": "excellent" | "good" | "caution" | "warning",
      "title": "Short compelling title (max 60 chars)",
      "description": "Detailed insight with specific numbers and actionable advice (2-3 sentences)",
      "recommendation": "Specific action to take",
      "metrics": {
        "primary": "main metric discussed",
        "value": "current value",
        "context": "comparison or benchmark"
      }
    }
  ]
}

## Analysis Guidelines:

### Training Load Assessment:
- **Excellent (>0.8 load ratio)**: Consistent, well-structured training
- **Good (0.5-0.8)**: Solid training with room for optimization
- **Caution (0.3-0.5)**: Light training, consider increasing gradually
- **Warning (<0.3 or >1.2)**: Either insufficient or potentially excessive training

### Workout Balance:
- Assess variety across workout types (Cardio, Strength, Flexibility, etc.)
- Identify gaps or overemphasis on specific types
- Recommend optimal weekly balance based on patterns

### Biomarker Response Analysis:
- **Sleep Quality**: Positive correlation with training is excellent; negative may indicate overtraining
- **Resting HR**: Lower HR on workout days suggests good cardiovascular adaptation
- Look for recovery indicators in the biomarker patterns

### Alternative Therapy Recommendations:
When data indicates benefit, suggest evidence-based recovery modalities:
- **Sauna (post-workout)**: For cardiovascular adaptation, recovery, inflammation reduction
  - Particularly effective when: high training load, endurance-focused, or elevated resting HR
- **Cold Plunge/Cryotherapy**: For muscle recovery, inflammation, metabolic boost
  - Particularly effective when: strength training, high volume, or poor sleep quality
- **Contrast Therapy**: Alternating hot/cold for enhanced circulation and recovery
  - Particularly effective when: mixed training types, moderate-high load
- **Other modalities**: Compression therapy, massage, float tanks when specifically relevant

Only recommend alternative therapies when they align with:
1. The user's specific training patterns (type, volume, intensity)
2. Biomarker responses showing need for enhanced recovery
3. Scientific evidence supporting the intervention for their situation

## Key Focus Areas:
1. **Recovery Status**: Overall assessment based on training load and biomarker response
2. **Training Load Management**: Is the load appropriate, too high, or too low?
3. **Workout Balance**: Are they training all necessary systems?
4. **Biomarker Insights**: What do sleep and HR tell us about adaptation and recovery?
5. **Recovery Optimization**: Specific strategies including alternative therapies when beneficial

## Rules:
- Be specific with numbers from the data
- Prioritize insights by severity (warnings first)
- Make recommendations actionable and measurable
- Reference scientific principles when relevant
- Include alternative therapies ONLY when they meaningfully address specific recovery needs shown in the data
- Explain the mechanism: why a particular therapy helps their specific situation
- Celebrate positive adaptations (improved sleep, lower HR)
- Warn about potential overtraining or undertraining

Generate 3-5 insights, ordered by importance. Focus on actionable recovery strategies that optimize the user's training response.`,
      },
    ],
  }));

  const content = completion.choices[0].message.content;
  if (content) {
    try {
      const data = JSON.parse(content);
      return data.insights || [];
    } catch (e) {
      console.error("Failed to parse recovery insights:", e);
    }
  }

  return [];
}

export async function generateTrendPredictions(data: {
  biomarkerType: string;
  historicalData: Array<{ value: number; date: Date }>;
  timeframeWeeks: number;
}) {
  const completion = await retryWithBackoff(() => openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a health data analyst AI. You analyze biomarker trends and predict future values. Always respond with valid JSON."
      },
      {
        role: "user",
        content: `Analyze the following biomarker trend and predict future values.

## Biomarker: ${data.biomarkerType}
## Historical Data (${data.historicalData.length} data points):
${JSON.stringify(data.historicalData.map(d => ({ value: d.value, date: d.date.toISOString().split('T')[0] })), null, 2)}

## Prediction Timeframe: ${data.timeframeWeeks} weeks

Analyze the trend pattern and generate a prediction with this JSON structure:
{
  "trend": "increasing" | "decreasing" | "stable" | "fluctuating",
  "trendStrength": "strong" | "moderate" | "weak",
  "predictedValue": number,
  "predictedRange": { "min": number, "max": number },
  "confidence": "high" | "medium" | "low",
  "insight": "Brief explanation of the trend and prediction",
  "recommendation": "Actionable advice based on the prediction"
}

Focus on identifying clear patterns. Be conservative with predictions - if data is insufficient or highly variable, indicate low confidence.`,
      },
    ],
  }));

  const content = completion.choices[0].message.content;
  if (content) {
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse trend prediction:", e);
    }
  }

  return null;
}

export async function generatePeriodComparison(data: {
  metricType: string;
  period1: { start: Date; end: Date; data: any[] };
  period2: { start: Date; end: Date; data: any[] };
}) {
  const completion = await retryWithBackoff(() => openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a health data analyst AI. You compare time periods for health metrics. Always respond with valid JSON."
      },
      {
        role: "user",
        content: `Compare two time periods for the following health metric.

## Metric: ${data.metricType}

## Period 1: ${data.period1.start.toISOString().split('T')[0]} to ${data.period1.end.toISOString().split('T')[0]}
Data points: ${data.period1.data.length}
${JSON.stringify(data.period1.data.slice(0, 10), null, 2)}${data.period1.data.length > 10 ? '\n... and more' : ''}

## Period 2: ${data.period2.start.toISOString().split('T')[0]} to ${data.period2.end.toISOString().split('T')[0]}
Data points: ${data.period2.data.length}
${JSON.stringify(data.period2.data.slice(0, 10), null, 2)}${data.period2.data.length > 10 ? '\n... and more' : ''}

Generate a comparison analysis with this JSON structure:
{
  "period1Summary": { "average": number, "min": number, "max": number, "trend": string },
  "period2Summary": { "average": number, "min": number, "max": number, "trend": string },
  "change": {
    "absolute": number,
    "percentage": number,
    "direction": "improved" | "declined" | "stable"
  },
  "insights": [
    "Key observation 1",
    "Key observation 2"
  ],
  "recommendation": "Actionable advice based on the comparison"
}

Be specific with numbers and provide meaningful context about what the changes mean for health.`,
      },
    ],
  }));

  const content = completion.choices[0].message.content;
  if (content) {
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse period comparison:", e);
    }
  }

  return null;
}

/**
 * Generate daily training recommendation based on readiness score and training plan
 * Safety-first AI logic: respects recovery signals and prioritizes user health
 */
export async function generateDailyTrainingRecommendation(data: {
  readinessScore: number;
  readinessRecommendation: "ready" | "caution" | "rest";
  readinessFactors: {
    sleep: { score: number; value?: number };
    hrv: { score: number; value?: number };
    restingHR: { score: number; value?: number };
    workloadRecovery: { score: number };
  };
  scheduledWorkout?: {
    type: string;
    duration: number;
    intensity?: string;
    description?: string;
  };
  trainingPlan?: {
    goal: string;
    weeklySchedule?: any;
  };
  recentWorkouts?: Array<{
    type: string;
    duration: number;
    startTime: Date;
  }>;
}) {
  const completion = await retryWithBackoff(() => openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an AI fitness coach specializing in safety-first training recommendations. Your primary responsibility is user health and recovery. 

CRITICAL SAFETY RULES:
1. NEVER recommend high-intensity workouts when readiness is "rest" or critical markers are low
2. When sleep score < 40, HRV < 30, or resting HR is elevated: recommend active recovery or rest
3. Always provide 3 options: primary plan (respects readiness), alternate lighter option, and rest/recovery day
4. Be honest about recovery needs - it's better to undertrain than overtrain
5. Consider cumulative fatigue from recent workouts

Your recommendations should be:
- Specific and actionable (exact exercises, sets, reps, duration)
- Adaptive to current recovery state
- Encouraging but realistic
- Include clear reasoning based on recovery data`
      },
      {
        role: "user",
        content: `Generate today's training recommendation based on current recovery state and training plan.

## Recovery Status
- Readiness Score: ${data.readinessScore}/100 (${data.readinessRecommendation})
- Sleep Quality: ${data.readinessFactors.sleep.score}/100${data.readinessFactors.sleep.value ? ` (${data.readinessFactors.sleep.value.toFixed(1)} hours)` : ''}
- HRV: ${data.readinessFactors.hrv.score}/100${data.readinessFactors.hrv.value ? ` (${data.readinessFactors.hrv.value.toFixed(0)} ms)` : ''}
- Resting Heart Rate: ${data.readinessFactors.restingHR.score}/100${data.readinessFactors.restingHR.value ? ` (${data.readinessFactors.restingHR.value.toFixed(0)} bpm)` : ''}
- Workout Recovery: ${data.readinessFactors.workloadRecovery.score}/100

## Today's Scheduled Workout
${data.scheduledWorkout ? `
- Type: ${data.scheduledWorkout.type}
- Duration: ${data.scheduledWorkout.duration} minutes
- Intensity: ${data.scheduledWorkout.intensity || 'Not specified'}
- Description: ${data.scheduledWorkout.description || 'Not specified'}
` : 'No workout scheduled'}

## Training Plan Goal
${data.trainingPlan?.goal || 'No specific goal set'}

## Recent Workout History (last 7 days)
${data.recentWorkouts && data.recentWorkouts.length > 0 ? 
  data.recentWorkouts.map(w => `- ${w.type}: ${w.duration} min (${new Date(w.startTime).toLocaleDateString()})`).join('\n') 
  : 'No recent workouts'}

Generate a recommendation with this JSON structure:
{
  "primaryPlan": {
    "title": "Today's Recommended Workout",
    "exercises": [
      {
        "name": "Exercise name",
        "sets": number or null,
        "reps": "reps description" or null,
        "duration": "duration in minutes" or null,
        "intensity": "light/moderate/high",
        "notes": "specific tips or form cues"
      }
    ],
    "totalDuration": number (minutes),
    "intensity": "light/moderate/high",
    "calorieEstimate": number
  },
  "alternatePlan": {
    "title": "Lighter Alternative",
    "exercises": [same structure as primaryPlan],
    "totalDuration": number,
    "intensity": "light/moderate",
    "calorieEstimate": number
  },
  "restDayOption": {
    "title": "Active Recovery / Rest",
    "activities": ["Gentle stretching", "Light walk", "Meditation"],
    "duration": number (minutes),
    "benefits": "Why rest might be better today"
  },
  "aiReasoning": "Clear explanation of why these recommendations make sense based on readiness score and recovery markers. Be specific about which factors influenced the decision.",
  "safetyNote": "Any important warnings or cautions (only if readiness is concerning)",
  "adjustmentsMade": {
    "intensityReduced": boolean (true if intensity was lowered from scheduled/planned workout),
    "durationReduced": boolean (true if duration was reduced),
    "exercisesModified": boolean (true if exercises were swapped for easier alternatives),
    "reason": "Brief explanation of what was adjusted and why based on readiness"
  }
}

Be specific, actionable, and prioritize safety over performance.`,
      },
    ],
  }));

  const content = completion.choices[0].message.content;
  if (content) {
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse daily training recommendation:", e);
    }
  }

  return null;
}
