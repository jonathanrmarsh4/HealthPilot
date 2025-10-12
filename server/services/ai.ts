import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Retry helper with exponential backoff for rate limit errors
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.status === 429 || error.error?.type === 'rate_limit_error';
      const isTransient = error.status === 500 || error.status === 502 || error.status === 503;
      
      if (!isRateLimit && !isTransient) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw error;
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
// Use smaller chunks to respect Anthropic's acceleration limits
// (API won't allow sudden jumps from 0 to high token usage)
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
    
    // Add delay between chunks to respect Anthropic's acceleration limits
    // Gradual scaling: wait longer for each successive chunk
    if (i < chunks.length - 1) {
      // Progressive delays: 15s, 20s, 25s, 30s... to allow gradual token usage increase
      const baseDelay = 15000; // 15 seconds base
      const progressiveDelay = i * 5000; // Add 5s per chunk
      const delayMs = baseDelay + progressiveDelay;
      console.log(`  ⏳ Waiting ${Math.ceil(delayMs / 1000)}s before chunk ${i + 2} (gradual scaling for API acceleration limits)...`);
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
    const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a health data extraction specialist. Analyze the following health document and extract ALL relevant biomarkers, test results, and health metrics.

Document Name: ${fileName}

Document Content:
${documentText}

Extract EVERY biomarker value found in the document. Common biomarker types include:

**Lipid Panel**: ldl-cholesterol, hdl-cholesterol, total-cholesterol, triglycerides, vldl-cholesterol
**Liver Function**: alt, ast, alp, bilirubin, albumin, ggt
**Kidney Function**: creatinine, bun, egfr, urea
**Blood Counts**: rbc, wbc, hemoglobin, hematocrit, platelets, mcv, mch, mchc
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

  const content = message.content[0];
  if (content.type === "text") {
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
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
}) {
  const chatContextSection = userProfile.chatContext 
    ? `\n\n## Conversation History with User:\n${userProfile.chatContext}\n\nUse insights from the conversation to personalize the meal plan based on the user's preferences, goals, and lifestyle discussed in the chat.`
    : '';

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a nutritionist AI. Create a personalized daily meal plan based on the following user profile:

${JSON.stringify(userProfile, null, 2)}${chatContextSection}

Generate a JSON array of 4 meals (breakfast, lunch, dinner, snack) with this structure:
[
  {
    "mealType": "Breakfast" | "Lunch" | "Dinner" | "Snack",
    "name": "Meal name",
    "description": "Brief description",
    "calories": number,
    "protein": number (grams),
    "carbs": number (grams),
    "fat": number (grams),
    "prepTime": number (minutes),
    "recipe": "Detailed cooking instructions",
    "tags": ["High Protein", "Heart Healthy", etc]
  }
]

Make sure the meals are balanced, nutritious, and aligned with the user's health goals and preferences shared in the conversation.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") {
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse meal plan:", e);
    }
  }

  return [];
}

export async function generateTrainingSchedule(userProfile: {
  fitnessLevel?: string;
  goals?: string[];
  availableDays?: number;
  healthConstraints?: string[];
  recentBiomarkers?: any[];
  chatContext?: string;
}) {
  const chatContextSection = userProfile.chatContext 
    ? `\n\n## Conversation History with User:\n${userProfile.chatContext}\n\nUse insights from the conversation to personalize the training schedule based on the user's fitness goals, preferences, and any discussed limitations or interests.`
    : '';

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a fitness coach AI. Create a personalized weekly training schedule based on the following user profile:

${JSON.stringify(userProfile, null, 2)}${chatContextSection}

Generate a JSON array of workouts for the week with this structure:
[
  {
    "day": "Monday" | "Tuesday" | etc,
    "workoutType": "Workout name",
    "duration": number (minutes),
    "intensity": "Low" | "Moderate" | "High",
    "exercises": [
      {
        "name": "Exercise name",
        "sets": number (optional),
        "reps": "8-10" (optional),
        "duration": "20 min" (optional)
      }
    ]
  }
]

Make sure the schedule is safe, progressive, and aligned with the user's fitness level, health constraints, and goals discussed in the conversation.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") {
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
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

## QUALITY CRITERIA:
- Each recommendation should reference specific data points and patterns
- Highlight multi-metric benefits (e.g., "This will improve both sleep and glucose control")
- Provide clear, actionable steps
- Explain the "why" behind each recommendation
- Prioritize based on potential health impact and user goals
- Include alternative therapies as optional enhancements when they make sense for the individual's physiology

Generate insights that demonstrate deep understanding of how different health metrics interact and influence each other.`;

  const message = await retryWithBackoff(() => anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: analysisPrompt,
      },
    ],
  }));

  const content = message.content[0];
  if (content.type === "text") {
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
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
  }
) {
  let contextSection = "";
  
  if (context) {
    contextSection = `\n\n## USER'S CURRENT HEALTH CONTEXT:\n`;
    
    if (context.currentPage) {
      contextSection += `- Currently viewing: ${context.currentPage}\n`;
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

## Alternative Therapy Guidance:
When appropriate based on user's data and goals, suggest alternative therapies as optional enhancements:
- **Sauna**: For cardiovascular health, detoxification, recovery, stress reduction
- **Cold Plunge/Cryotherapy**: For inflammation reduction, metabolic health, recovery, mental clarity
- **Other therapies**: Red light therapy, breathwork, contrast therapy when relevant

Only suggest these when they meaningfully support the user's specific health goals, biomarkers, or physiology. Explain the mechanism and expected benefits based on their data.

Be conversational, empathetic, and encouraging. **Ask ONE question at a time - never multiple questions in the same message.** Keep responses concise and focused. Remember any information the user shares and reference it in future responses.${onboardingSection}${contextSection}

If this is the first message, introduce yourself briefly and ask about their primary health or fitness goal.`;

  const messages = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages as any,
  });

  const content = message.content[0];
  if (content.type === "text") {
    return content.text;
  }

  return "I'm here to help with your health and fitness goals. How can I assist you today?";
}

export async function generateDailyInsights(data: {
  biomarkers: any[];
  sleepSessions: any[];
  recentActivity?: any;
  chatContext?: string;
  timezone?: string;
}) {
  const message = await retryWithBackoff(() => anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an intelligent health insights AI. Analyze the user's health data and generate personalized daily insights.

## User's Health Data:
${JSON.stringify(data, null, 2)}

## Your Task:
Generate a JSON array of daily health insights with this structure:
[
  {
    "type": "daily_summary" | "pattern" | "correlation" | "trend" | "alert",
    "title": "Short compelling title",
    "description": "Brief actionable insight (1-2 sentences)",
    "category": "sleep" | "activity" | "nutrition" | "biomarkers" | "overall",
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

## Focus Areas:
1. **Daily Summary**: Overall health status for today based on all metrics
2. **Patterns**: Recurring behaviors (e.g., "You sleep better after evening workouts")
3. **Correlations**: Connections between metrics (e.g., "High protein days = better sleep")
4. **Trends**: Week/month changes (e.g., "Resting HR down 5 bpm this month")
5. **Alerts**: Concerning changes or values outside optimal ranges

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

Generate 3-5 insights prioritized by importance. Focus on what matters most to the user's health today.`,
      },
    ],
  }));

  const content = message.content[0];
  if (content.type === "text") {
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse insights:", e);
    }
  }

  return [];
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
  const message = await retryWithBackoff(() => anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 3072,
    messages: [
      {
        role: "user",
        content: `You are an expert sports science and recovery coach AI. Analyze the user's training analytics and provide personalized recovery insights.

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
Generate a JSON array of recovery insights and recommendations:
[
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

  const content = message.content[0];
  if (content.type === "text") {
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
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
  const message = await retryWithBackoff(() => anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a health data analyst AI. Analyze the following biomarker trend and predict future values.

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

  const content = message.content[0];
  if (content.type === "text") {
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
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
  const message = await retryWithBackoff(() => anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a health data analyst AI. Compare two time periods for the following health metric.

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

  const content = message.content[0];
  if (content.type === "text") {
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse period comparison:", e);
    }
  }

  return null;
}
