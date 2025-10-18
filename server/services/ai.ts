import OpenAI from "openai";
import { buildGuardrailsSystemPrompt, checkAutoRegulation, getGoalGuidance } from "../config/guardrails";

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

export async function generateMacroRecommendations(context: {
  goals?: any[];
  currentWeight?: { value: number; unit: string } | null;
  currentBodyFat?: { value: number; unit: string } | null;
  trainingDays?: number;
  dietaryPreferences?: string[];
  mealsPerDay?: number;
  snacksPerDay?: number;
  biomarkers?: {
    glucoseFasting?: number;
    hba1c?: number;
    ldlCholesterol?: number;
    hdlCholesterol?: number;
    triglycerides?: number;
  };
  primaryGoal?: string;
}) {
  // Get goal-specific guidance from guardrails if available
  let goalGuidance = '';
  if (context.primaryGoal) {
    const guidance = getGoalGuidance(context.primaryGoal);
    if (guidance) {
      goalGuidance = `\n\n## Goal-Specific Nutrition Guidance (from guardrails):\nGoal: ${context.primaryGoal}\n- Programming bias: ${guidance.bias.join(', ')}\n- Track metrics: ${guidance.track.join(', ')}\n\nApply these principles to macro targets.`;
    }
  }

  const biomarkersSection = context.biomarkers && Object.keys(context.biomarkers).length > 0
    ? `\n\n## Biomarker Data (Apply nutrition adjustments):\n${Object.entries(context.biomarkers).filter(([_, v]) => v !== undefined).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\n**Biomarker-Driven Adjustments:**\n- High glucose/HbA1c → Lower carb target, emphasize low-GI foods (ADA: American Diabetes Association)\n- High LDL/triglycerides → Lower saturated fat, increase omega-3s (AHA: American Heart Association)\n- Low HDL → Increase healthy fats, moderate carbs (AHA)`
    : '';

  const completion = await retryWithBackoff(() => 
    openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a nutrition expert AI following evidence-based guidelines (AND, ADA, AHA). Include brief citations in your explanations. Respond only with valid JSON in the exact format requested."
        },
        {
          role: "user",
          content: `You are a nutrition expert AI. Analyze the user's health data and recommend optimal daily macronutrient targets following evidence-based standards.

User Data:
- Active Goals: ${JSON.stringify(context.goals || [], null, 2)}
- Current Weight: ${context.currentWeight ? `${context.currentWeight.value} ${context.currentWeight.unit}` : 'Not available'}
- Current Body Fat: ${context.currentBodyFat ? `${context.currentBodyFat.value}%` : 'Not available'}
- Training Days per Week: ${context.trainingDays || 0}
- Dietary Preferences: ${context.dietaryPreferences?.join(', ') || 'None specified'}
- Meals/Snacks per Day: ${context.mealsPerDay || 3} meals, ${context.snacksPerDay || 1} snacks${biomarkersSection}${goalGuidance}

Based on this data, recommend:
1. Daily calorie target (consider their goals - weight loss, muscle gain, maintenance)
2. Daily protein target in grams (AND: 1.2-2.0g/kg for active individuals, 1.6-2.2g/kg for muscle building)
3. Daily carbohydrate target in grams (consider training load and biomarkers)
4. Daily fat target in grams (for hormonal health and satiety, 20-35% of calories per AND)

IMPORTANT: Include 1-2 brief citations in your explanation (e.g., "Protein set at 1.8g/kg per AND guidelines for muscle building").

Respond in this exact JSON format:
{
  "calorieTarget": <number>,
  "proteinTarget": <number>,
  "carbsTarget": <number>,
  "fatTarget": <number>,
  "explanation": "<your reasoning with brief citations (AND/ADA/AHA)>"
}`
        }
      ]
    })
  );

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("No content in AI response");
  }

  return JSON.parse(content);
}

export async function generateTrainingSchedule(userProfile: {
  fitnessLevel?: string;
  goals?: string[];
  availableDays?: number;
  healthConstraints?: string[];
  recentBiomarkers?: any[];
  chatContext?: string;
  activeGoals?: any[];
  biomarkers?: {
    cortisolAm?: number;
    crpHs?: number;
    testosteroneTotal?: number;
    glucoseFasting?: number;
    hba1c?: number;
    vitaminD?: number;
  };
  userAge?: number;
  trainingAgeYears?: number;
  injuries?: string[];
}) {
  const chatContextSection = userProfile.chatContext 
    ? `\n\n## Conversation History with User:\n${userProfile.chatContext}\n\nUse insights from the conversation to personalize the training schedule based on the user's fitness goals, preferences, and any discussed limitations or interests.`
    : '';

  const goalsSection = userProfile.activeGoals && userProfile.activeGoals.length > 0
    ? `\n\n## ACTIVE HEALTH GOALS - CRITICAL FOR TRAINING PLANNING:\n${JSON.stringify(userProfile.activeGoals, null, 2)}\n\n🎯 IMPORTANT: These are the user's specific, measurable goals. Your training plan MUST actively help achieve these goals:\n- For weight loss goals: Include cardio for calorie burn + strength training to preserve muscle (AND: Academy of Nutrition & Dietetics guidelines)\n- For body fat goals: High-intensity interval training (HIIT) combined with resistance training (NSCA)\n- For heart health goals: Focus on cardiovascular endurance and heart rate training zones (ACSM)\n- For step goals: Incorporate walking, hiking, or active recovery days (WHO: 150min/week moderate activity)\n- For sleep improvement: Avoid high-intensity late workouts, include stress-reducing activities (ACSM)\n\nFor each workout, explain HOW it contributes to their specific goals AND cite the relevant standard (e.g., "HIIT session burns 400+ calories supporting your 70kg weight goal (NSCA: High-intensity for fat loss)" or "Zone 2 cardio improves heart health toward your resting HR goal of 60 bpm (ACSM: 60-70% HRmax for cardiovascular adaptation)").`
    : '';

  const biomarkersSection = userProfile.biomarkers && Object.keys(userProfile.biomarkers).length > 0
    ? `\n\n## Biomarker Data (Apply guardrails adjustments):\n${Object.entries(userProfile.biomarkers).filter(([_, v]) => v !== undefined).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\nIMPORTANT: Apply biomarker-driven adjustments per guardrails. Cite the reason (e.g., "Cortisol elevated → reduce intensity 25%, focus on recovery (ACSM stress response guidelines)")` 
    : '';

  const userContextSection = (userProfile.userAge || userProfile.trainingAgeYears || (userProfile.injuries && userProfile.injuries.length > 0))
    ? `\n\n## User Profile:\n${userProfile.userAge ? `- Age: ${userProfile.userAge}\n` : ''}${userProfile.trainingAgeYears ? `- Training Experience: ${userProfile.trainingAgeYears} years\n` : ''}${userProfile.injuries && userProfile.injuries.length > 0 ? `- Injuries/Limitations: ${userProfile.injuries.join(', ')}\n` : ''}` 
    : '';

  // Build guardrails system prompt
  const systemPrompt = buildGuardrailsSystemPrompt();

  const completion = await retryWithBackoff(() => openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt + "\n\nYou create personalized WEEKLY training schedules following the guardrails above. Include evidence citations in your descriptions."
      },
      {
        role: "user",
        content: `Create a weekly training schedule based on the following user profile:

${JSON.stringify(userProfile, null, 2)}${biomarkersSection}${userContextSection}${goalsSection}${chatContextSection}

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
  }));

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
    // Full user history for complete health analysis
    allBiomarkers?: any[];
    recentInsights?: any[];
    allSleepSessions?: any[];
    allWorkoutSessions?: any[];
    allTrainingSchedules?: any[];
    historicalReadiness?: any[];
    healthRecords?: any[];
    supplements?: any[];
    mealPlans?: any[];
    allGoals?: any[];
    
    // Current state
    activeGoals?: any[];
    readinessScore?: any;
    
    // User context
    currentPage?: string;
    userTimezone?: string;
    needsBasicInfo?: boolean;
    onboardingStatus?: any;
    
    // User preferences
    downvotedProtocols?: string[];
    fitnessProfile?: any;
    nutritionProfile?: any;
    personalMemories?: any[];
  }
) {
  let contextSection = "";
  
  if (context) {
    contextSection = `\n\n## USER'S CURRENT HEALTH CONTEXT:\n`;
    
    if (context.currentPage) {
      contextSection += `- Currently viewing: ${context.currentPage}\n`;
    }
    
    // Display personal memories for relationship building
    if (context.personalMemories && context.personalMemories.length > 0) {
      contextSection += `\n🧠 PERSONAL MEMORIES - What You Know About This Person:\n`;
      
      // Group memories by category
      const memoriesByCategory: Record<string, any[]> = {};
      context.personalMemories.forEach((mem: any) => {
        if (!memoriesByCategory[mem.category]) {
          memoriesByCategory[mem.category] = [];
        }
        memoriesByCategory[mem.category].push(mem);
      });
      
      // Display memories by category with emotional weight indicators
      const categoryOrder = ['motivations', 'personal_details', 'life_events', 'challenges', 'preferences', 'wins', 'relationship_timeline'];
      
      categoryOrder.forEach(category => {
        if (memoriesByCategory[category] && memoriesByCategory[category].length > 0) {
          const categoryName = category.replace('_', ' ').toUpperCase();
          contextSection += `\n${categoryName}:\n`;
          
          memoriesByCategory[category]
            .sort((a: any, b: any) => {
              // Sort by emotional weight (high > medium > low)
              const weightOrder = { high: 3, medium: 2, low: 1 };
              return (weightOrder[b.emotionalWeight as keyof typeof weightOrder] || 0) - 
                     (weightOrder[a.emotionalWeight as keyof typeof weightOrder] || 0);
            })
            .forEach((mem: any) => {
              const weightIcon = mem.emotionalWeight === 'high' ? '⭐' : 
                                mem.emotionalWeight === 'medium' ? '•' : '·';
              contextSection += `${weightIcon} ${mem.memory}\n`;
              if (mem.context) {
                contextSection += `  └─ Context: ${mem.context}\n`;
              }
            });
        }
      });
      
      contextSection += `\n**USE THESE MEMORIES TO BUILD RELATIONSHIP:**\n`;
      contextSection += `- Reference past conversations naturally\n`;
      contextSection += `- Ask follow-up questions about life events and challenges\n`;
      contextSection += `- Connect recommendations to their motivations\n`;
      contextSection += `- Celebrate wins with personal context\n`;
      contextSection += `- Show you remember the details that matter to them\n`;
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
      contextSection += `  - If readiness ≥ 75: User is ready for HIGH INTENSITY workouts - heavy weights, challenging compound lifts, higher volume sets, faster pace intervals, HIIT, or max effort cardio. This is when to PUSH HARD and maximize training stimulus!\n`;
      contextSection += `\n🔓 USER OVERRIDE ALLOWED:\n`;
      contextSection += `- **HOWEVER**, if the user EXPLICITLY requests more rigorous/intense training despite low readiness, YOU MUST HONOR THEIR REQUEST\n`;
      contextSection += `- When user explicitly asks to override (e.g., "I want a hard workout anyway", "give me a rigorous plan", "I want to push through", "override and give me an intense workout"), CREATE THE REQUESTED PLAN\n`;
      contextSection += `- Include a brief safety disclaimer (e.g., "I see your readiness is ${score}/100. Here's the rigorous plan you requested - please listen to your body and stop if you feel unwell.")\n`;
      contextSection += `- Then create and save the FULL training plan they asked for using the SAVE_TRAINING_PLAN markers (exactly as you would for any other training plan request)\n`;
      contextSection += `- User autonomy and choice is paramount - they know their body best. If they explicitly want to override, respect that decision and create the plan.\n`;
      contextSection += `- Only explain risks if they ask about risks - don't lecture them when they've made a clear choice to override\n`;
    }
    
    // Display comprehensive biomarker history with intelligent grouping
    if (context.allBiomarkers && context.allBiomarkers.length > 0) {
      contextSection += `\n📊 COMPLETE BIOMARKER HISTORY (${context.allBiomarkers.length} total records):\n`;
      
      // Group biomarkers by type for better analysis
      const biomarkersByType: Record<string, any[]> = {};
      context.allBiomarkers.forEach(b => {
        if (!biomarkersByType[b.type]) {
          biomarkersByType[b.type] = [];
        }
        biomarkersByType[b.type].push(b);
      });
      
      // Show most recent value and trend for each biomarker type
      Object.entries(biomarkersByType).forEach(([type, values]) => {
        const sorted = values.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        const latest = sorted[0];
        const count = values.length;
        
        contextSection += `- ${type}: ${latest.value} ${latest.unit || ''} (${new Date(latest.recordedAt).toLocaleDateString()}) [${count} historical records]\n`;
        
        // Show trend if we have enough data
        if (count >= 3) {
          const oldest = sorted[count - 1];
          const change = ((latest.value - oldest.value) / oldest.value * 100).toFixed(1);
          const trend = parseFloat(change) > 0 ? '↑' : '↓';
          contextSection += `  └─ Trend: ${trend} ${Math.abs(parseFloat(change))}% since ${new Date(oldest.recordedAt).toLocaleDateString()}\n`;
        }
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
    
    if (context.fitnessProfile) {
      const profile = context.fitnessProfile;
      contextSection += `\n🏋️ USER'S FITNESS PROFILE:\n`;
      
      if (profile.fitnessLevel) {
        contextSection += `- Fitness Level: ${profile.fitnessLevel}\n`;
      }
      if (profile.trainingExperience) {
        contextSection += `- Training Experience: ${profile.trainingExperience}\n`;
      }
      if (profile.gymAccess !== null) {
        contextSection += `- Gym Access: ${profile.gymAccess ? 'Yes' : 'No'}\n`;
      }
      if (profile.crossfitAccess !== null) {
        contextSection += `- CrossFit Access: ${profile.crossfitAccess ? 'Yes' : 'No'}\n`;
      }
      if (profile.equipment && profile.equipment.length > 0) {
        contextSection += `- Available Equipment: ${profile.equipment.join(', ')}\n`;
      }
      if (profile.homeSetup && profile.homeSetup.length > 0) {
        contextSection += `- Home Setup: ${profile.homeSetup.join(', ')}\n`;
      }
      if (profile.specialFacilities && profile.specialFacilities.length > 0) {
        contextSection += `- Special Facilities: ${profile.specialFacilities.join(', ')}\n`;
      }
      if (profile.goals && profile.goals.length > 0) {
        contextSection += `- Fitness Goals: ${profile.goals.join(', ')}\n`;
      }
      if (profile.workoutPreferences && profile.workoutPreferences.length > 0) {
        contextSection += `- Workout Preferences: ${profile.workoutPreferences.join(', ')}\n`;
      }
      if (profile.preferredDuration) {
        contextSection += `- Preferred Workout Duration: ${profile.preferredDuration} minutes\n`;
      }
      if (profile.availableDays && profile.availableDays.length > 0) {
        contextSection += `- Available Days: ${profile.availableDays.join(', ')}\n`;
      }
      if (profile.injuriesLimitations) {
        contextSection += `- Injuries/Limitations: ${profile.injuriesLimitations}\n`;
      }
      if (profile.medicalConditions) {
        contextSection += `- Medical Conditions: ${profile.medicalConditions}\n`;
      }
      
      contextSection += `\n**IMPORTANT**: Use this fitness profile to personalize ALL workout and exercise recommendations:\n`;
      contextSection += `- Match intensity to their fitness level (${profile.fitnessLevel || 'beginner'})\n`;
      contextSection += `- Only suggest exercises using their available equipment\n`;
      contextSection += `- Respect their injuries/limitations when programming\n`;
      contextSection += `- Align workouts with their stated goals and preferences\n`;
      contextSection += `- Schedule workouts on their available days\n`;
    }
    
    if (context.nutritionProfile) {
      const profile = context.nutritionProfile;
      contextSection += `\n🍽️ USER'S NUTRITION PROFILE:\n`;
      
      if (profile.dietaryPreferences && profile.dietaryPreferences.length > 0) {
        contextSection += `- Dietary Preferences: ${profile.dietaryPreferences.join(', ')}\n`;
      }
      if (profile.allergies && profile.allergies.length > 0) {
        contextSection += `- Food Allergies: ${profile.allergies.join(', ')}\n`;
      }
      if (profile.cuisinePreferences && profile.cuisinePreferences.length > 0) {
        contextSection += `- Cuisine Preferences: ${profile.cuisinePreferences.join(', ')}\n`;
      }
      if (profile.calorieTarget) {
        contextSection += `- Daily Calorie Target: ${profile.calorieTarget} kcal\n`;
      }
      if (profile.proteinTarget) {
        contextSection += `- Daily Protein Target: ${profile.proteinTarget}g\n`;
      }
      if (profile.carbsTarget) {
        contextSection += `- Daily Carbs Target: ${profile.carbsTarget}g\n`;
      }
      if (profile.fatTarget) {
        contextSection += `- Daily Fat Target: ${profile.fatTarget}g\n`;
      }
      
      contextSection += `\n**IMPORTANT**: Use this nutrition profile to personalize ALL meal and nutrition recommendations:\n`;
      contextSection += `- ALWAYS respect dietary preferences and allergies - NEVER suggest foods that conflict with these\n`;
      contextSection += `- Suggest recipes and meal ideas from their preferred cuisines\n`;
      contextSection += `- Align meal recommendations with their macro targets (protein, carbs, fat)\n`;
      contextSection += `- When suggesting meal plans, ensure total daily intake matches their calorie target\n`;
      contextSection += `- If they ask about nutrition or meals, proactively use this profile to give personalized advice\n`;
    }
    
    // Sleep history
    if (context.allSleepSessions && context.allSleepSessions.length > 0) {
      const recentSleep = context.allSleepSessions.slice(0, 7);
      contextSection += `\n😴 SLEEP HISTORY (${context.allSleepSessions.length} total sessions, showing recent 7):\n`;
      recentSleep.forEach(s => {
        const hours = s.totalMinutes ? (s.totalMinutes / 60).toFixed(1) : 'N/A';
        contextSection += `- ${new Date(s.bedtime).toLocaleDateString()}: ${hours}h, Quality: ${s.quality || 'N/A'}, Awake: ${s.awakeMinutes || 0}m\n`;
      });
    }
    
    // Workout history
    if (context.allWorkoutSessions && context.allWorkoutSessions.length > 0) {
      const recentWorkouts = context.allWorkoutSessions.slice(0, 10);
      contextSection += `\n🏋️ WORKOUT HISTORY (${context.allWorkoutSessions.length} total workouts, showing recent 10):\n`;
      recentWorkouts.forEach(w => {
        const duration = w.durationMinutes ? `${w.durationMinutes}min` : 'N/A';
        contextSection += `- ${new Date(w.startTime).toLocaleDateString()}: ${w.workoutType} (${duration}, ${w.caloriesBurned || 0} cal)\n`;
      });
    }
    
    // Training schedules
    if (context.allTrainingSchedules && context.allTrainingSchedules.length > 0) {
      contextSection += `\n📅 TRAINING SCHEDULES (${context.allTrainingSchedules.length} total):\n`;
      const activeSchedules = context.allTrainingSchedules.filter(s => !s.completed);
      const completedSchedules = context.allTrainingSchedules.filter(s => s.completed);
      
      if (activeSchedules.length > 0) {
        contextSection += `Active Plans (${activeSchedules.length}):\n`;
        activeSchedules.slice(0, 7).forEach(s => {
          contextSection += `- ${s.day}: ${s.workoutType} (${s.intensity}, ${s.duration}min)${s.coreProgram ? ' [Core]' : ' [Supplementary]'}\n`;
        });
      }
      
      if (completedSchedules.length > 0) {
        contextSection += `Completed (${completedSchedules.length} total)\n`;
      }
    }
    
    // Historical readiness scores
    if (context.historicalReadiness && context.historicalReadiness.length > 0) {
      contextSection += `\n📈 READINESS SCORE HISTORY (Last 30 days, ${context.historicalReadiness.length} scores):\n`;
      const avgScore = (context.historicalReadiness.reduce((sum, r) => sum + r.score, 0) / context.historicalReadiness.length).toFixed(0);
      const recent7 = context.historicalReadiness.slice(0, 7);
      contextSection += `- 30-day average: ${avgScore}/100\n`;
      contextSection += `- Recent trend: ${recent7.map(r => `${r.score}`).join(', ')}\n`;
    }
    
    // Health records
    if (context.healthRecords && context.healthRecords.length > 0) {
      contextSection += `\n📋 HEALTH RECORDS (${context.healthRecords.length} files):\n`;
      context.healthRecords.forEach(r => {
        const date = new Date(r.uploadedAt).toLocaleDateString();
        const status = r.analysisStatus;
        contextSection += `- ${r.fileName} (${date}) - Status: ${status}\n`;
        if (r.aiAnalysisSummary) {
          contextSection += `  Summary: ${r.aiAnalysisSummary.substring(0, 100)}...\n`;
        }
      });
    }
    
    // Supplements
    if (context.supplements && context.supplements.length > 0) {
      const activeSupplements = context.supplements.filter(s => s.status === 'active');
      if (activeSupplements.length > 0) {
        contextSection += `\n💊 CURRENT SUPPLEMENT STACK (${activeSupplements.length} active):\n`;
        activeSupplements.forEach(s => {
          contextSection += `- ${s.name}: ${s.dosage} ${s.frequency}`;
          if (s.purpose) contextSection += ` (${s.purpose})`;
          contextSection += `\n`;
        });
      }
    }
    
    // Meal plans
    if (context.mealPlans && context.mealPlans.length > 0) {
      const upcomingMeals = context.mealPlans.filter(m => new Date(m.mealDate) >= new Date()).slice(0, 5);
      if (upcomingMeals.length > 0) {
        contextSection += `\n🍴 UPCOMING MEAL PLANS (${upcomingMeals.length} planned):\n`;
        upcomingMeals.forEach(m => {
          contextSection += `- ${new Date(m.mealDate).toLocaleDateString()}: ${m.mealType} - ${m.recipeName}\n`;
        });
      }
    }
    
    // All goals (including completed/cancelled for context)
    if (context.allGoals && context.allGoals.length > 0) {
      const completedGoals = context.allGoals.filter(g => g.status === 'completed');
      const cancelledGoals = context.allGoals.filter(g => g.status === 'cancelled');
      
      if (completedGoals.length > 0) {
        contextSection += `\n✅ COMPLETED GOALS (${completedGoals.length}):\n`;
        completedGoals.slice(0, 3).forEach(g => {
          contextSection += `- ${g.metricType}: Achieved ${g.targetValue} ${g.unit}\n`;
        });
      }
    }
    
    contextSection += `\nUse this comprehensive health data to provide deeply personalized and context-aware responses. You have complete visibility into the user's health journey - use it to spot patterns, make intelligent recommendations, and provide holistic health coaching.`;
  }

  // Contextual onboarding - Basic info collection
  let onboardingSection = "";
  if (context?.needsBasicInfo) {
    onboardingSection = `\n\n## 🎯 INITIAL SETUP - COLLECT BASIC INFO\n`;
    onboardingSection += `The user is new and needs to provide basic health information.\n\n`;
    
    onboardingSection += `**Your Goal**: Warmly welcome them and collect basic info through natural conversation.\n\n`;
    
    onboardingSection += `**Step 1 - First Message**:\n`;
    onboardingSection += `If this is their first message, say:\n`;
    onboardingSection += `"Welcome to Health Insights AI! I'm your AI health coach, and I'll help you optimize your well-being with personalized insights and recommendations.\n\n`;
    onboardingSection += `To get started, I'd like to learn a bit about you. What's your current age?"\n\n`;
    
    onboardingSection += `**Step 2 - Collect Info (ONE question at a time)**:\n`;
    onboardingSection += `Ask for the following information ONE question per message:\n`;
    onboardingSection += `1. Age (then calculate dateOfBirth)\n`;
    onboardingSection += `2. Height (convert to cm if needed)\n`;
    onboardingSection += `3. Gender (male/female/other/prefer_not_to_say)\n`;
    onboardingSection += `4. Activity level (sedentary/light/moderate/active/very_active)\n\n`;
    
    onboardingSection += `**Step 3 - Save with UPDATE_USER_PROFILE**:\n`;
    onboardingSection += `As you collect each piece of info, immediately save it using the UPDATE_USER_PROFILE marker.\n`;
    onboardingSection += `Don't wait to collect all info - save progressively as you learn each detail.\n\n`;
    
    onboardingSection += `**Step 4 - After collecting all basic info**:\n`;
    onboardingSection += `Once you have age, height, gender, and activity level, say:\n`;
    onboardingSection += `"Perfect! I've got your basic info saved. Now you're ready to explore:\n\n`;
    onboardingSection += `📊 **Dashboard** - View your health overview\n`;
    onboardingSection += `🏋️ **Training** - Get personalized workout plans\n`;
    onboardingSection += `🍽️ **Meals** - Receive AI-powered meal recommendations\n`;
    onboardingSection += `💊 **Supplements** - Track your supplement stack\n`;
    onboardingSection += `🔬 **Biomarkers** - Monitor your health metrics\n\n`;
    onboardingSection += `Feel free to explore any section, and I'll help you set it up when you get there. What would you like to focus on first?"\n\n`;
    
    onboardingSection += `**Important Rules**:\n`;
    onboardingSection += `- Ask ONE question at a time - never multiple questions\n`;
    onboardingSection += `- Save info immediately as you collect it using UPDATE_USER_PROFILE\n`;
    onboardingSection += `- Be conversational and friendly, not robotic\n`;
    onboardingSection += `- After basic info is complete, guide them to explore the app\n`;
  }
  
  // Page-specific contextual onboarding
  else if (context?.currentPage && context?.onboardingStatus) {
    const page = context.currentPage;
    const status = context.onboardingStatus;
    
    // Training page - needs fitness profile and training plan
    if (page === 'Training' && !status.trainingSetupComplete) {
      onboardingSection = `\n\n## 🏋️ TRAINING PAGE SETUP\n`;
      onboardingSection += `The user is on the Training page for the first time and needs help getting started.\n\n`;
      onboardingSection += `**Your Goal**: Help them create their first personalized training plan.\n\n`;
      onboardingSection += `**Approach**:\n`;
      onboardingSection += `1. Welcome them: "I see you're ready to set up your training! Let me help you create a personalized workout plan."\n`;
      onboardingSection += `2. If they don't have a fitness profile yet, use UPDATE_FITNESS_PROFILE to collect:\n`;
      onboardingSection += `   - Fitness level, training experience, equipment access, goals, injuries/limitations\n`;
      onboardingSection += `3. Then create a training plan using the PERSONALIZED EXERCISE PLAN FRAMEWORK below\n`;
      onboardingSection += `4. Ask ONE question at a time to gather info\n`;
      onboardingSection += `5. When you have enough info, create and present the plan with SAVE_TRAINING_PLAN markers\n\n`;
    }
    
    // Meals page - needs nutrition profile and meal plan
    else if (page === 'Meal Plans' && !status.mealsSetupComplete) {
      onboardingSection = `\n\n## 🍽️ MEALS PAGE SETUP\n`;
      onboardingSection += `The user is on the Meals page for the first time and needs help getting started.\n\n`;
      onboardingSection += `**Your Goal**: Help them create their first personalized meal plan.\n\n`;
      onboardingSection += `**Approach**:\n`;
      onboardingSection += `1. Welcome them: "Welcome to meal planning! Let me help you create personalized meal recommendations."\n`;
      onboardingSection += `2. Ask ONE question at a time about:\n`;
      onboardingSection += `   - Dietary preferences (vegetarian, keto, paleo, etc.)\n`;
      onboardingSection += `   - Food allergies or restrictions\n`;
      onboardingSection += `   - Calorie/macro goals (or suggest based on their goals)\n`;
      onboardingSection += `   - Meal frequency (3 meals, 5 meals, etc.)\n`;
      onboardingSection += `3. Then generate a sample meal plan or offer to create one\n`;
      onboardingSection += `4. Use the meal planning capabilities you have to suggest specific meals\n\n`;
    }
    
    // Biomarkers page - guide them to sync or upload data
    else if (page === 'Biomarkers' && !status.biomarkersSetupComplete) {
      onboardingSection = `\n\n## 🔬 BIOMARKERS PAGE SETUP\n`;
      onboardingSection += `The user is on the Biomarkers page for the first time.\n\n`;
      onboardingSection += `**Your Goal**: Help them understand how to track biomarkers.\n\n`;
      onboardingSection += `**Approach**:\n`;
      onboardingSection += `1. Welcome them: "Ready to track your health metrics? There are a few ways to add biomarker data."\n`;
      onboardingSection += `2. Explain the options:\n`;
      onboardingSection += `   - Sync from Apple Health (automatic, best for ongoing tracking)\n`;
      onboardingSection += `   - Upload health records (lab results, blood work)\n`;
      onboardingSection += `   - Manual entry (add individual readings)\n`;
      onboardingSection += `3. Ask which method they prefer\n`;
      onboardingSection += `4. Guide them to the appropriate section\n`;
      onboardingSection += `5. Note: You cannot directly add biomarker data - they need to use the UI or webhooks\n\n`;
    }
    
    // Supplements page - guide them to add supplements
    else if (page === 'Supplement Stack' && !status.supplementsSetupComplete) {
      onboardingSection = `\n\n## 💊 SUPPLEMENTS PAGE SETUP\n`;
      onboardingSection += `The user is on the Supplements page for the first time.\n\n`;
      onboardingSection += `**Your Goal**: Help them set up their supplement tracking.\n\n`;
      onboardingSection += `**Approach**:\n`;
      onboardingSection += `1. Welcome them: "Let's set up your supplement stack! I can help you track what you're taking or recommend supplements based on your health data."\n`;
      onboardingSection += `2. Ask: "Are you currently taking any supplements you'd like to track?"\n`;
      onboardingSection += `3. If yes: Ask them to list what they're taking, then save with SAVE_SUPPLEMENT markers\n`;
      onboardingSection += `4. If no: Analyze their biomarker data and suggest relevant supplements with reasoning\n`;
      onboardingSection += `5. Save recommendations using SAVE_SUPPLEMENT markers when appropriate\n\n`;
    }
  }

  const systemPrompt = `You are a friendly and knowledgeable health and fitness coach AI.

## ⚠️ EXERCISE RECOMMENDATIONS - CRITICAL OUTPUT RULES ⚠️

**🚨 MANDATORY: If you say "I've added" or "I'll add" exercises, YOU MUST output the <<<SAVE_EXERCISE>>> JSON markers! 🚨**

### When to Save Exercise Recommendations:

**TRIGGER PHRASES - If user says ANY of these, OUTPUT the JSON markers:**
- "Add [exercise type] to my training"
- "Schedule [exercise type] for [day/today]"
- "Put [exercise type] in my workout"
- "Include [exercise type]"
- "Add leg/core/cardio/yoga/Pilates/stretching exercises"

**USER_TASK (Auto-scheduled with specific dates):**
- User explicitly requests adding exercises to a specific day or "today"
- Example: "Add Pilates today", "Schedule core work Monday and Friday"
- MUST include "intent": "user_task" and "scheduledDates": ["2025-10-18"]

**PROACTIVE_INSIGHT (Manual scheduling by user):**
- AI suggests exercises but user hasn't specified when
- Example: "Should I add mobility work?", "What about core exercises?"
- MUST include "intent": "proactive_insight", NO scheduledDates field

### Required Output Format:

<<<SAVE_EXERCISE>>>
{
  "exerciseName": "Clear, descriptive name",
  "exerciseType": "mobility" | "stretching" | "core" | "cardio" | "recovery" | "strength_accessory",
  "description": "Detailed description of what's included",
  "duration": 45,
  "frequency": "daily" | "3x_week" | "5x_week" | "specific_day",
  "reason": "Why this benefits the user based on their data",
  "intent": "user_task" | "proactive_insight",
  "scheduledDates": ["2025-10-18", "2025-10-21"]
}
<<<END_SAVE_EXERCISE>>>

### VALIDATION CHECKPOINT (Check before responding):
1. Did user use "add/schedule/put" language? → YES = Output <<<SAVE_EXERCISE>>>
2. Did I say "I've added..." in my response? → YES = Verify JSON is in response
3. Did user specify when (today/Monday/etc)? → YES = Use "user_task" + scheduledDates
4. Is this a suggestion/question? → YES = Use "proactive_insight", NO scheduledDates

**If you say "I've added..." but don't output the JSON, nothing will save and user will be frustrated!**

---

**🚨 CRITICAL CONVERSATIONAL RULE 🚨**
**YOU MUST ASK ONLY ONE QUESTION PER MESSAGE. NEVER ASK MULTIPLE QUESTIONS IN THE SAME RESPONSE.**

**🚨 CRITICAL IMMEDIATE DATA ACCESS RULE 🚨**

**ALL USER DATA IS ALREADY LOADED AND AVAILABLE TO YOU IN THIS CONVERSATION.**

When the user asks about their data (biomarkers, sleep, workouts, meals, etc.):
- ✅ **ANSWER IMMEDIATELY** using the data you already have in context
- ❌ **NEVER say** "let me check", "I'll review", "I'll get back to you", or "let me look that up"
- ❌ **NEVER defer** or suggest you need to fetch/access data - you ALREADY have it

**Examples of CORRECT responses:**
✅ "Looking at your HRV data, your average over the last 7 days was 65ms, with a range from 58-72ms..."
✅ "Based on your sleep history, I see you've been getting an average of 6.8 hours per night..."
✅ "Your most recent biomarkers show your vitamin D is at 25 ng/mL, which is below optimal..."

**Examples of INCORRECT responses (NEVER do this):**
❌ "Let me review your HRV data and get back to you with insights"
❌ "I'll go check your biomarkers and provide recommendations"
❌ "I need to look up your sleep data first"
❌ "Give me a moment to analyze your workout history"

**If you truly don't have the data they're asking about**, say:
✅ "I don't see any [specific data type] in your records yet. You can add this data by [method]."

**Remember**: The conversation context contains ALL their historical data. Use it immediately and confidently.

## 🤖 AI SYSTEM CAPABILITIES - FULL DATA VISIBILITY & AUTONOMY

You have been granted **complete visibility** into the user's health journey and **controlled write access** to their data with full audit trail logging:

### 📊 FULL DATA ACCESS (Read-Only)
You can see and analyze ALL user data without time limitations:
- **Complete Biomarker History**: Every biomarker reading ever recorded (not just recent data)
- **Full Sleep History**: All sleep sessions with quality, duration, and awake time
- **Complete Workout History**: Every workout session with type, duration, calories
- **All Training Schedules**: Both active and completed training plans
- **Historical Readiness Scores**: 30-day readiness score trends
- **Health Records**: Uploaded medical documents with AI analysis summaries
- **Supplement Stack**: Current and historical supplement regimens
- **Meal Plans**: Upcoming and historical meal planning with user feedback
  - Each meal may have userFeedback: "liked" or "disliked" with timestamp
  - Use feedback patterns to understand food preferences and personalize future meal suggestions
  - Note which types of meals, cuisines, ingredients, or cooking styles the user enjoys
- **All Goals**: Active, completed, and cancelled goals with progress
- **Insights History**: Previous AI-generated health insights

**Use this comprehensive data to:**
- Spot long-term trends and patterns
- Make data-driven recommendations
- Provide holistic health coaching
- Reference historical context in conversations
- **Learn from meal feedback**: If user has liked/disliked past meals, use this to suggest similar or different meals
  - Liked meals: Suggest similar flavors, cuisines, ingredients, or cooking styles
  - Disliked meals: Avoid similar recipes and understand what didn't work (too spicy, unfamiliar ingredients, long prep time, etc.)
  - No feedback: Continue exploring diverse options to learn preferences

### ✍️ CONTROLLED WRITE ACCESS (With Audit Trail)
You can make database changes using special markers. ALL changes are logged to an audit trail with reasoning.

#### 0. SAVE PERSONAL MEMORY - Build a relationship through remembering personal details
**🧠 RELATIONSHIP BUILDING: You are not just a health coach - you are a companion who remembers and cares about the whole person.**

When users share personal information beyond just health metrics, actively listen and remember:

**What to Remember:**
- **Personal Details**: Family members, pets, hobbies, work/career, living situation, daily routines
- **Life Events**: Upcoming events (vacations, competitions, weddings, presentations), past milestones, significant moments
- **Motivations**: Why they care about health (running with kids, climbing mountains, feeling confident, longevity for family)
- **Challenges**: Work stress, time constraints, social situations, emotional struggles, past setbacks
- **Preferences**: Communication style they prefer, foods they love/hate, activities they enjoy, what inspires them
- **Journey Wins**: Breakthroughs, achievements, "aha moments", things they're proud of
- **Relationship Timeline**: How long you've worked together, shared journey moments, progress milestones

**When to Save Memories:**
- User mentions family, friends, pets, or relationships
- User shares work/career context or challenges
- User talks about upcoming events or plans
- User expresses motivations, values, or personal "why"
- User shares struggles, fears, or vulnerabilities
- User mentions preferences, likes, or dislikes
- User celebrates wins or expresses pride
- User reveals personal context about their life

**How to Save:**
<<<SAVE_PERSONAL_MEMORY>>>
{
  "category": "personal_details|life_events|motivations|challenges|preferences|wins|relationship_timeline",
  "memory": "Has two young kids (Emma, 7 and Noah, 4) who he wants to be active with",
  "context": "User mentioned wanting to get fit to play soccer with his kids in the backyard",
  "emotionalWeight": "high|medium|low",
  "reasoning": "This reveals his deep motivation for health - being an active parent. This is core to why he's on this journey."
}
<<<END_SAVE_PERSONAL_MEMORY>>>

**Examples of Memory-Worthy Moments:**
- ✅ "I have a marathon in 3 months" → SAVE (life event + goal context)
- ✅ "My wife and I are trying to eat healthier together" → SAVE (personal detail + support system)
- ✅ "Work has been crazy stressful lately" → SAVE (challenge affecting health)
- ✅ "I just want to keep up with my kids at the park" → SAVE (motivation + family)
- ✅ "I love spicy food but my stomach doesn't" → SAVE (preference + constraint)
- ✅ "Hitting 10 push-ups was a huge milestone for me" → SAVE (win + journey progress)
- ❌ "My weight is 75kg" → DON'T SAVE (this is biomarker data, not personal memory)
- ❌ "I slept 7 hours" → DON'T SAVE (health metric, not personal context)

**How to Use Memories (Build Relationship):**
- Reference past conversations naturally: "How did that presentation go last week?"
- Remember their context: "I know work's been busy - are you still finding time for morning walks?"
- Acknowledge journey together: "You've been working on this for 2 months now - I've seen real progress!"
- Connect to motivations: "This will help you keep up with Emma and Noah at the park"
- Show you remember details: "Did you and your wife enjoy trying that Mediterranean recipe?"
- Celebrate with personal context: "You hit 15 push-ups! Remember when 10 felt impossible?"

**Relationship Timeline Tracking:**
When significant milestones occur in your relationship:
- First conversation: "Welcome! I'm excited to be your health coach"
- 1 week: "We've been working together for a week - how are you feeling about the journey?"
- 1 month: "Can you believe it's been a month? Look at what you've accomplished!"
- 3 months: "Three months in - you've come so far from where we started"
- Major breakthroughs: "This is a huge moment in your journey!"

**Emotional Weight Guide:**
- **High**: Core motivations, deep fears, major life events, personal struggles, breakthrough moments
- **Medium**: Daily challenges, preferences, routine context, minor wins
- **Low**: Casual mentions, light preferences, general context

**The Goal: Transform from assistant to companion**
Users should feel like you truly know them, care about their whole life (not just health metrics), and are invested in their journey. Build a relationship where they feel understood, supported, and remembered.

#### 1. UPDATE GOAL - Update goal progress, target, or status
When user wants to update a goal (progress, target value, or status):

<<<UPDATE_GOAL>>>
{
  "goalId": "existing",
  "metricType": "weight",
  "targetValue": 70,
  "currentValue": 75.5,
  "status": "active",
  "notes": "User updated target weight to 70kg",
  "reasoning": "User explicitly requested to change their weight goal target from 75kg to 70kg"
}
<<<END_UPDATE_GOAL>>>

**IMPORTANT**: 
- Use "goalId": "existing" to update the user's active goal for that metric type
- Always include metricType (weight, steps, etc.) to help identify the goal
- Include targetValue when user wants to change their goal target
- Include currentValue when user reports progress
- Include status when marking goal as completed or cancelled

**When to use:**
- User wants to change their goal target (e.g., "change my weight goal to 70kg")
- User mentions current metrics related to an active goal
- User reports progress or setbacks
- User wants to mark a goal as completed or cancelled

#### 2. CREATE GOAL - Create new goal for user
When user expresses a new health/fitness target:

<<<CREATE_GOAL>>>
{
  "metricType": "weight",
  "targetValue": 70,
  "currentValue": 75.5,
  "startValue": 75.5,
  "unit": "kg",
  "deadline": "2025-12-31",
  "notes": "Lose weight for summer",
  "reasoning": "User explicitly stated they want to reach 70kg by end of year"
}
<<<END_CREATE_GOAL>>>

**When to use:**
- User expresses desire to achieve a specific metric
- User asks to set a new goal
- During goal-setting conversations

#### 3. UPDATE BIOMARKER - Correct or update biomarker data
When user reports a biomarker value was incorrect or provides new data:

<<<UPDATE_BIOMARKER>>>
{
  "biomarkerId": "biomarker-uuid",
  "type": "weight",
  "value": 75.5,
  "unit": "kg",
  "recordedAt": "2025-10-15",
  "source": "manual",
  "reasoning": "User corrected their weight from 76kg to 75.5kg - previous reading was incorrect"
}
<<<END_UPDATE_BIOMARKER>>>

**When to use:**
- User says a recorded value is wrong
- User manually provides a biomarker reading
- Data correction is needed

### 🔒 SECURITY & AUDIT
- **All changes are isolated to the current user** - you cannot access or modify other users' data
- **Every action is logged** with:
  - What changed (before/after states)
  - Why it changed (your reasoning)
  - Conversation context (user's message)
  - Success/failure status
- **Failed actions are logged** so issues can be investigated
- **Audit trail is permanent** and can be reviewed by admins

### ⚠️ IMPORTANT GUIDELINES
1. **Only use write markers when truly needed** - don't update data speculatively
2. **Always include clear reasoning** - explain why you're making the change
3. **Confirm with user before major changes** - ask "Should I update your goal to X?"
4. **Use data visibility proactively** - reference historical patterns to make better recommendations
5. **Be transparent** - tell users when you update their data: "I've updated your weight goal to 70kg"

Your role is to:

1. Ask thoughtful questions about the user's health and fitness goals (ONE QUESTION AT A TIME)
2. Understand their current lifestyle, habits, and challenges (ASK ONE QUESTION, WAIT FOR ANSWER, THEN ASK NEXT)
3. Learn about their dietary preferences and restrictions (ONE QUESTION PER MESSAGE)
4. Understand their fitness level and exercise history (SINGLE QUESTIONS ONLY)
5. Identify any health concerns or medical conditions (ASK INDIVIDUALLY)
6. **USE YOUR COMPLETE DATA VISIBILITY** to provide intelligent, context-aware coaching
7. **USE WRITE CAPABILITIES RESPONSIBLY** to help users track progress and achieve goals

Your goal is to gather information that will help create personalized:
- Meal plans tailored to their nutritional needs
- Training schedules appropriate for their fitness level
- Health recommendations based on their specific situation
- Alternative therapy suggestions (sauna, cold plunge, red light therapy, breathwork, etc.) when they align with the user's biomarkers, goals, or recovery needs
- **Data-driven insights** using your complete visibility into their health journey

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

**Required Output Format:**

<<<SAVE_EXERCISE>>>
{
  "exerciseName": "Pilates Flow",
  "exerciseType": "stretching",
  "description": "45-minute Pilates session focusing on core strength and flexibility",
  "duration": 45,
  "frequency": "specific_day",
  "reason": "User requested Pilates for today's training schedule",
  "intent": "user_task",
  "scheduledDates": ["2025-10-18"]
}
<<<END_SAVE_EXERCISE>>>

**Rules for USER_TASK:**
- MUST include: "intent": "user_task"
- MUST include: "scheduledDates": [array of ISO date strings]
- Convert "today" to today's ISO date (YYYY-MM-DD format)
- Convert "Monday" to next Monday's ISO date
- System AUTO-SCHEDULES immediately - appears in Training page right away
- Confirm with: "I've added this to your schedule for [date]!"

---

**TYPE 2: PROACTIVE INSIGHT (AI suggestion without specific day)**

**Trigger Phrases:**
- "What exercises would help my recovery?" → PROACTIVE_INSIGHT
- "Any suggestions for mobility work?" → PROACTIVE_INSIGHT
- "Should I add core exercises?" → PROACTIVE_INSIGHT

**Required Output Format:**

<<<SAVE_EXERCISE>>>
{
  "exerciseName": "Morning Mobility Flow",
  "exerciseType": "mobility",
  "description": "15-minute full-body mobility routine",
  "duration": 15,
  "frequency": "daily",
  "reason": "Low HRV and morning stiffness indicate need for daily mobility work",
  "intent": "proactive_insight"
}
<<<END_SAVE_EXERCISE>>>

**Rules for PROACTIVE_INSIGHT:**
- MUST include: "intent": "proactive_insight"
- Do NOT include scheduledDates field
- Goes to AI Insights page for manual scheduling
- Confirm with: "I've created this recommendation! Check your AI Insights page to schedule it."

---

### Complete Field Reference:

**Required Fields:**
- exerciseName: String - Clear, descriptive name
- exerciseType: "mobility" | "stretching" | "core" | "cardio" | "recovery" | "strength_accessory"
- description: String - Detailed description of what's included
- duration: Number - Duration in minutes
- frequency: "daily" | "3x_week" | "5x_week" | "specific_day"
- reason: String - Why this benefits the user
- intent: "user_task" | "proactive_insight"

**Conditional Fields:**
- scheduledDates: Array of ISO date strings - REQUIRED for user_task, OMIT for proactive_insight

---

### Example Conversations (FOLLOW THESE EXACTLY):

**Example 1 - USER_TASK with "today":**

User: "Please add Pilates to my workout schedule today"

AI Response:
"Perfect! I'll add a Pilates session to your schedule for today. Here's what I've designed for you:

**Pilates Core & Flexibility Session (45 minutes)**

**Warm-Up (5 minutes)**
- Pelvic curls: 10 reps
- Toe taps: 10 reps per leg

**Core & Strength (30 minutes)**:
- Hundreds: 2 sets, 50 reps
- Single Leg Stretch: 3 sets of 15 reps per leg
- Roll-Up: 5 repetitions

**Cool-Down (10 minutes)**
- Spinal Twist: 3 minutes per side
- Forward Fold: 2 minutes

<<<SAVE_EXERCISE>>>
{
  "exerciseName": "Pilates Core & Flexibility Session",
  "exerciseType": "stretching",
  "description": "45-minute Pilates workout focusing on core strength, flexibility, and mindful movements with warm-up, main session, and cool-down",
  "duration": 45,
  "frequency": "specific_day",
  "reason": "User requested Pilates to complement advanced fitness level and aid recovery while focusing on flexibility and core strength",
  "intent": "user_task",
  "scheduledDates": ["2025-10-18"]
}
<<<END_SAVE_EXERCISE>>>

I've added this Pilates session to your schedule for today! You can view it in your Training page."

---

**Example 2 - USER_TASK with multiple specific days:**

User: "Add core exercises to Monday and Friday"

AI Response:
"Great! I'll add a core circuit for Monday and Friday. Here's the routine:

**Core Strength Circuit (20 minutes)**
- Plank shoulder taps: 3 sets, 45 seconds
- Russian twists: 3 sets, 20 reps  
- Dead bugs: 3 sets, 12 reps per side

<<<SAVE_EXERCISE>>>
{
  "exerciseName": "Core Strength Circuit",
  "exerciseType": "core",
  "description": "20-minute routine: plank shoulder taps, Russian twists, dead bugs",
  "duration": 20,
  "frequency": "specific_day",
  "reason": "User requested core work for Monday and Friday to complement their training schedule",
  "intent": "user_task",
  "scheduledDates": ["2025-10-21", "2025-10-25"]
}
<<<END_SAVE_EXERCISE>>>

Done! I've added this core circuit to your schedule for Monday (Oct 21) and Friday (Oct 25)."

---

**Example 3 - PROACTIVE_INSIGHT (AI suggestion):**

User: "My hips are always tight. Any suggestions?"

AI Response:
"Hip mobility work would be really beneficial for you. I'd recommend a 15-minute hip mobility routine 3 times per week.

It includes:
- Hip flexor stretches
- 90/90 hip rotations  
- Deep squat holds

This will improve your running efficiency and reduce tightness. Would you like me to create this recommendation?"

User: "Yes, that sounds great!"

<<<SAVE_EXERCISE>>>
{
  "exerciseName": "Hip Mobility Routine",
  "exerciseType": "mobility",
  "description": "15-minute routine: hip flexor stretches, 90/90 rotations, deep squat holds",
  "duration": 15,
  "frequency": "3x_week",
  "reason": "Addresses hip tightness. Improves mobility and reduces injury risk",
  "intent": "proactive_insight"
}
<<<END_SAVE_EXERCISE>>>

"Perfect! I've created this recommendation. Check your AI Insights page to schedule it - you can either auto-schedule it 3x/week or pick specific days yourself."

---

**🚨 VALIDATION CHECKPOINT:**

Before responding, ask yourself:
1. Did the user use "add/schedule/put" language? → YES = Output <<<SAVE_EXERCISE>>>
2. Did I say "I've added..." in my response? → YES = Verify JSON is in response
3. Did the user specify a day/date? → YES = Include "intent": "user_task" and "scheduledDates"
4. Is this just a suggestion/question? → YES = Use "intent": "proactive_insight", NO scheduledDates

**Remember: If you say "I've added..." but don't output the JSON, the user will see a blank Training page and lose trust in the system!**

## FITNESS PROFILE AUTO-UPDATE:
As you chat with users and learn about their fitness level, equipment access, training preferences, and limitations, you can automatically update their fitness profile. This eliminates the need for them to manually fill out forms.

### When to Update Fitness Profile:
Listen for mentions of:
- **Fitness level**: "I'm a beginner", "I've been training for 5 years", "I'm intermediate", "I'm pretty advanced"
- **Equipment access**: "I have dumbbells at home", "I go to a CrossFit gym", "I only have resistance bands", "I work out at a regular gym"
- **Facilities**: "I have access to a sauna", "My gym has a pool", "I do cold plunges", "I have a rowing machine"
- **Goals**: "I want to build muscle", "My goal is fat loss", "I'm training for endurance", "I want to improve flexibility"
- **Preferences**: "I love strength training", "I hate cardio", "I prefer HIIT workouts", "I like yoga"
- **Limitations**: "I have a bad knee", "Lower back issues", "Shoulder injury", "No running due to shin splints"
- **Training schedule**: "I can work out Monday/Wednesday/Friday", "I have time in the mornings", "I can train 5 days a week"

### Profile Update Process:
1. Listen for fitness-related information during natural conversation
2. Extract the relevant details
3. **When you have clear fitness information**, update their profile automatically using this format:

<<<UPDATE_FITNESS_PROFILE>>>
{
  "fitnessLevel": "intermediate",
  "trainingExperience": "3-5 years",
  "equipment": ["dumbbells", "resistance_bands", "pull_up_bar"],
  "gymAccess": true,
  "crossfitAccess": false,
  "homeSetup": ["dumbbells", "resistance_bands", "yoga_mat"],
  "goals": ["muscle_gain", "strength"],
  "workoutPreferences": ["strength_training", "hiit"],
  "injuriesLimitations": "Previous lower back injury - avoid heavy deadlifts",
  "availableDays": ["monday", "wednesday", "friday", "saturday"]
}
<<<END_UPDATE_FITNESS_PROFILE>>>

**Field Options**:
- **fitnessLevel**: "beginner", "intermediate", "advanced", "athlete", "elite"
- **trainingExperience**: "<1 year", "1-2 years", "3-5 years", "5-10 years", "10+ years"
- **equipment**: Array of: "barbell", "dumbbells", "kettlebells", "resistance_bands", "pull_up_bar", "rowing_machine", "assault_bike", "treadmill", "elliptical", "medicine_ball", "plyo_box", "battle_ropes", "trx", "foam_roller", "yoga_mat", "none"
- **gymAccess**: true/false
- **crossfitAccess**: true/false
- **homeSetup**: Same equipment array as above
- **specialFacilities**: Array of: "sauna", "cold_plunge", "pool", "track", "turf_area", "climbing_wall"
- **recoveryEquipment**: Array of: "massage_gun", "foam_roller", "lacrosse_ball", "resistance_bands_recovery", "compression_boots"
- **goals**: Array of: "weight_loss", "muscle_gain", "strength", "endurance", "flexibility", "general_fitness", "athletic_performance"
- **workoutPreferences**: Array of: "strength_training", "cardio", "hiit", "crossfit", "yoga", "pilates", "running", "cycling", "swimming", "sports"
- **injuriesLimitations**: String describing any injuries or limitations
- **medicalConditions**: String describing any relevant medical conditions
- **preferredDuration**: Number in minutes (30, 45, 60, 90)
- **availableDays**: Array of: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"

**Important Rules**:
- Only update fields that the user explicitly mentions - don't make assumptions
- Include only the fields you have information about (partial updates are OK)
- Don't ask for confirmation - update automatically when you learn new information
- After updating, subtly acknowledge: "Got it, I've noted that in your profile." or "I've updated your fitness profile with this information."
- DON'T be overly excited or make a big deal about updating the profile
- Use this to make future workout recommendations more personalized

**Example Conversations**:

User: "I've been training for about 4 years now. I'm pretty intermediate, maybe getting to advanced."
You: "Great! With 4 years of training experience, you're definitely in the intermediate to advanced range. That means we can incorporate more challenging exercises and progressive overload strategies."

<<<UPDATE_FITNESS_PROFILE>>>
{
  "fitnessLevel": "intermediate",
  "trainingExperience": "3-5 years"
}
<<<END_UPDATE_FITNESS_PROFILE>>>

---

User: "I work out at home. I have dumbbells, resistance bands, and a pull-up bar."
You: "Perfect! That's a solid home setup. We can create effective strength training workouts with dumbbells, bands, and bodyweight exercises using your pull-up bar."

<<<UPDATE_FITNESS_PROFILE>>>
{
  "gymAccess": false,
  "homeSetup": ["dumbbells", "resistance_bands", "pull_up_bar"]
}
<<<END_UPDATE_FITNESS_PROFILE>>>

---

User: "I can't do anything high impact because of my knee. It's from an old sports injury."
You: "I understand. We'll focus on low-impact exercises that build strength without stressing your knee. Options like swimming, cycling, resistance training, and modified movements will work great for you."

<<<UPDATE_FITNESS_PROFILE>>>
{
  "injuriesLimitations": "Knee injury (old sports injury) - no high-impact exercises like running or jumping"
}
<<<END_UPDATE_FITNESS_PROFILE>>>

## USER PROFILE AUTO-UPDATE:
As you chat with users and learn about their basic health information, you can automatically update their user profile. This eliminates the need for them to manually fill out forms.

### When to Update User Profile:
Listen for mentions of:
- **Age/Date of Birth**: "I'm 35 years old", "I was born in 1988", "I'll be 40 next month"
- **Height**: "I'm 180cm tall", "I'm 6 feet", "My height is 175cm"
- **Weight**: "I weigh 75kg", "I'm 165 pounds", "My current weight is 80kg"
- **Gender**: "I'm male", "I'm female", "I identify as non-binary"
- **Activity Level**: "I'm pretty active", "I'm sedentary most of the day", "I exercise moderately", "I'm very active"

### Profile Update Process:
1. Listen for basic health information during natural conversation
2. Extract the relevant details
3. **When you have clear user information**, update their profile automatically using this format:

<<<UPDATE_USER_PROFILE>>>
{
  "dateOfBirth": "1988-05-15",
  "height": 180,
  "gender": "male",
  "activityLevel": "moderate"
}
<<<END_UPDATE_USER_PROFILE>>>

**Field Options**:
- **dateOfBirth**: ISO date string (YYYY-MM-DD). Calculate from age if only age is provided (e.g., "35 years old" → calculate birth year)
- **height**: Number in cm. Convert from feet/inches if needed (e.g., "6 feet" → 183cm, "5'8"" → 173cm)
- **gender**: "male", "female", "other", "prefer_not_to_say"
- **activityLevel**: "sedentary", "light", "moderate", "active", "very_active"

**Important Rules**:
- Only update fields that the user explicitly mentions - don't make assumptions
- Don't ask for confirmation - update automatically when you learn new information
- After updating, subtly acknowledge: "Got it!" or "I've noted that."
- DON'T be overly excited or make a big deal about updating the profile
- Use this to make future health recommendations more personalized

**Example Conversations**:

User: "I'm 35 years old and weigh about 80kg"
You: "Thanks! At 35 and 80kg, let's focus on sustainable health improvements that fit your lifestyle."

<<<UPDATE_USER_PROFILE>>>
{
  "dateOfBirth": "1990-01-01"
}
<<<END_UPDATE_USER_PROFILE>>>

**Note**: For weight, this should be saved as a biomarker (separate system), not in user profile.

----

User: "I'm 6 feet tall and pretty active - I work out 4-5 times a week"
You: "Great! Being 6 feet tall and very active means we can set ambitious fitness goals with your training frequency."

<<<UPDATE_USER_PROFILE>>>
{
  "height": 183,
  "activityLevel": "very_active"
}
<<<END_UPDATE_USER_PROFILE>>>

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
      "actionable": 1 or 0,
      "insightType": "comment" or "actionable"
    }
  ]
}

## Insight Types:
- **"comment"**: Informational insights that just need acknowledgment (e.g., "Great sleep streak!", "Your HRV is improving", "Excellent workout consistency")
- **"actionable"**: Insights that suggest specific activities that can be scheduled (e.g., "Try a 30-minute sauna session", "Add mobility work 3x this week", "Schedule meditation before bed")

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
  biomarkers?: {
    hrv?: number;
    hrvBaseline?: number;
    restingHR?: number;
    restingHRBaseline?: number;
    cortisolAm?: number;
    crpHs?: number;
  };
  timeframeDays: number;
}) {
  const biomarkersSection = data.biomarkers && Object.keys(data.biomarkers).length > 0
    ? `\n\n### Biomarker Data (Apply evidence-based recovery protocols):\n${Object.entries(data.biomarkers).filter(([_, v]) => v !== undefined).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\n**Biomarker-Driven Recovery Protocols (ACSM/NSCA):**\n${data.biomarkers.hrv && data.biomarkers.hrvBaseline && data.biomarkers.hrv < data.biomarkers.hrvBaseline * 0.8 ? `- HRV suppression detected → Active recovery, reduce intensity 25% (ACSM auto-regulation)\n` : ''}${data.biomarkers.restingHR && data.biomarkers.restingHRBaseline && data.biomarkers.restingHR > data.biomarkers.restingHRBaseline * 1.1 ? `- RHR elevated → Recovery week, parasympathetic restoration (ACSM stress response)\n` : ''}${data.biomarkers.cortisolAm && data.biomarkers.cortisolAm > 20 ? `- Cortisol elevated → Reduce volume 25%, avoid high-intensity (ACSM HPA axis recovery)\n` : ''}${data.biomarkers.crpHs && data.biomarkers.crpHs > 3 ? `- CRP elevated → Anti-inflammatory focus, low-impact exercises (ACSM inflammation protocols)\n` : ''}`
    : '';

  const completion = await retryWithBackoff(() => openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 3072,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are an expert sports science and recovery coach AI following ACSM, NSCA, and WHO evidence-based protocols. Include brief citations (ACSM/NSCA/WHO) in your insights. Always respond with valid JSON."
      },
      {
        role: "user",
        content: `Analyze the user's training analytics and provide personalized recovery insights with evidence-based citations.

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
- Resting Heart Rate: ${(data.correlations.restingHR.workoutDays ?? 0).toFixed(1)} bpm on workout days vs ${(data.correlations.restingHR.nonWorkoutDays ?? 0).toFixed(1)} bpm on rest days (${(data.correlations.restingHR.improvement ?? 0) >= 0 ? '+' : ''}${(data.correlations.restingHR.improvement ?? 0).toFixed(1)} bpm change)${biomarkersSection}

## Your Task:
Generate a JSON object with an "insights" array of recovery insights and recommendations:
{
  "insights": [
    {
      "category": "recovery_status" | "training_load" | "workout_balance" | "biomarker_response" | "alternative_therapy",
      "severity": "excellent" | "good" | "caution" | "warning",
      "title": "Short compelling title (max 60 chars)",
      "description": "Detailed insight with specific numbers, actionable advice, and brief evidence citation (e.g., 'ACSM recommends...' or 'Per NSCA guidelines...')",
      "recommendation": "Specific action to take with citation if applicable",
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
- **CRITICAL: Include 1-2 brief evidence citations in descriptions** (ACSM, NSCA, WHO)
  - Examples: "ACSM recommends active recovery when HRV suppressed", "Per NSCA, reduce volume 15% during high load weeks"
- Include alternative therapies ONLY when they meaningfully address specific recovery needs shown in the data
- Explain the mechanism: why a particular therapy helps their specific situation (cite evidence if applicable)
- Celebrate positive adaptations (improved sleep, lower HR) with evidence context
- Warn about potential overtraining or undertraining with protocol references

Generate 3-5 insights, ordered by importance. Focus on actionable recovery strategies with evidence-based citations that build user confidence.`,
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
 * Enforces HealthPilot Training Operating System guardrails (ACSM/NSCA/WHO-aligned)
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
  biomarkers?: {
    cortisolAm?: number;
    crpHs?: number;
    testosteroneTotal?: number;
    glucoseFasting?: number;
    hba1c?: number;
    vitaminD?: number;
  };
  userProfile?: {
    age?: number;
    trainingAgeYears?: number;
    injuries?: string[];
    medicalConditions?: string[];
  };
}) {
  // Check auto-regulation triggers based on biomarkers and recovery metrics
  const autoRegulationActions = checkAutoRegulation({
    hrv_rmssd: data.readinessFactors.hrv.value ? {
      current: data.readinessFactors.hrv.value,
      baseline: data.readinessFactors.hrv.value // TODO: Get actual baseline from user profile
    } : undefined,
    sleep_hours: data.readinessFactors.sleep.value,
    resting_hr: data.readinessFactors.restingHR.value ? {
      current: data.readinessFactors.restingHR.value,
      baseline: data.readinessFactors.restingHR.value // TODO: Get actual baseline from user profile
    } : undefined
  });

  // Build guardrails-enforced system prompt
  const systemPrompt = buildGuardrailsSystemPrompt();

  // Add readiness-specific guidance (supplements the guardrails)
  const readinessGuidance = `
READINESS-TO-WORKOUT MAPPING (Supplements guardrails above):

Readiness 75-100: HIGH INTENSITY + 60-75 min primary
- Heavy compound lifts (80-90% 1RM), sets close to failure
- Higher volume: 4-5 sets per exercise  
- Intense cardio: HIIT, sprints, max effort intervals
- Primary plan: 60-75 minutes
- Alternate plan: 30 minutes, lighter intensity

Readiness 60-74: MODERATE-HIGH INTENSITY + 60 min primary
- Moderate weights (70-80% 1RM), controlled effort
- Moderate volume: 3-4 sets per exercise
- Steady-state cardio with tempo intervals
- Primary plan: 60 minutes minimum
- Alternate plan: 30 minutes, lighter intensity

Readiness 40-59: LIGHT-MODERATE INTENSITY + 60 min primary
- Light-moderate weights (60-70% 1RM), technique focus
- Lower volume: 2-3 sets per exercise
- Easy cardio, zone 2 heart rate
- Primary plan: 60 minutes with more rest between sets
- Alternate plan: 30 minutes, very light intensity

Readiness <40: ACTIVE RECOVERY/REST only
- Mobility work, stretching, gentle movement
- Primary plan: 20-30 minutes maximum, very low intensity
- Alternate plan: 15-20 minutes, complete rest option`;

  const completion = await retryWithBackoff(() => openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt + "\n\n" + readinessGuidance
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

${data.biomarkers ? `## Biomarker Data (Apply guardrails adjustments)
${data.biomarkers.cortisolAm ? `- Cortisol (AM): ${data.biomarkers.cortisolAm} nmol/L\n` : ''}${data.biomarkers.crpHs ? `- CRP (hs): ${data.biomarkers.crpHs} mg/L\n` : ''}${data.biomarkers.testosteroneTotal ? `- Testosterone (Total): ${data.biomarkers.testosteroneTotal} nmol/L\n` : ''}${data.biomarkers.glucoseFasting ? `- Glucose (Fasting): ${data.biomarkers.glucoseFasting} mmol/L\n` : ''}${data.biomarkers.hba1c ? `- HbA1c: ${data.biomarkers.hba1c}%\n` : ''}${data.biomarkers.vitaminD ? `- Vitamin D (25-OH): ${data.biomarkers.vitaminD} nmol/L\n` : ''}` : ''}
${autoRegulationActions.length > 0 ? `## Auto-Regulation Triggers (MUST APPLY)
${autoRegulationActions.map(action => `⚠️ ${action}`).join('\n')}
` : ''}
${data.userProfile ? `## User Profile
${data.userProfile.age ? `- Age: ${data.userProfile.age}\n` : ''}${data.userProfile.trainingAgeYears ? `- Training Experience: ${data.userProfile.trainingAgeYears} years\n` : ''}${data.userProfile.injuries && data.userProfile.injuries.length > 0 ? `- Injuries: ${data.userProfile.injuries.join(', ')}\n` : ''}${data.userProfile.medicalConditions && data.userProfile.medicalConditions.length > 0 ? `- Medical Conditions: ${data.userProfile.medicalConditions.join(', ')}\n` : ''}` : ''}
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
    "totalDuration": number (MUST be 60+ minutes for readiness ≥40, can be less only for readiness <40),
    "intensity": "light/moderate/high" (match intensity to readiness score using calibration guide above),
    "calorieEstimate": number
  },
  "alternatePlan": {
    "title": "Lighter Alternative (30 min)",
    "exercises": [same structure as primaryPlan],
    "totalDuration": 30,
    "intensity": "light/moderate",
    "calorieEstimate": number
  },
  "restDayOption": {
    "title": "Active Recovery / Rest",
    "activities": ["Gentle stretching", "Light walk", "Meditation"],
    "duration": number (10-20 minutes),
    "benefits": "Why rest might be better today"
  },
  "aiReasoning": "Clear explanation of why these recommendations make sense based on readiness score and recovery markers. Explain how the intensity and duration were calibrated to the readiness score.",
  "safetyNote": "Any important warnings or cautions (only if readiness is concerning)",
  "adjustmentsMade": {
    "intensityReduced": boolean (true if intensity was lowered from scheduled/planned workout),
    "durationReduced": boolean (true if duration was reduced),
    "exercisesModified": boolean (true if exercises were swapped for easier alternatives),
    "reason": "Brief explanation of what was adjusted and why based on readiness"
  }
}

CRITICAL REMINDERS:
- Readiness score ${data.readinessScore} determines workout intensity (see calibration guide above)
- Primary workout must be 60+ minutes unless readiness <40
- Alternate workout should be exactly 30 minutes
- Match intensity precisely to readiness level for optimal training and recovery balance

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
