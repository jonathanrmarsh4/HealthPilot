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
  recentTrends?: any;
  healthGoals?: string[];
  chatContext?: string;
}) {
  const chatContextSection = data.chatContext 
    ? `\n\n## Conversation History with User:\n${data.chatContext}\n\nUse insights from the conversation to provide recommendations that align with the user's goals, preferences, and lifestyle discussed in the chat.`
    : '';

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a health insights AI. Analyze the following health data and provide actionable recommendations:

${JSON.stringify(data, null, 2)}${chatContextSection}

Generate a JSON array of recommendations with this structure:
[
  {
    "title": "Recommendation title",
    "description": "Brief description",
    "category": "Nutrition" | "Exercise" | "Biomarker" | "Lifestyle",
    "priority": "high" | "medium" | "low",
    "details": "Detailed explanation and reasoning",
    "actionLabel": "Action button text"
  }
]

Focus on:
1. Any biomarkers outside optimal ranges
2. Concerning trends
3. Opportunities for improvement
4. Preventive health measures
5. User's personal goals and preferences shared in the conversation

Provide 3-5 specific, actionable recommendations prioritized by importance and aligned with what the user shared about their health journey.`,
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
      console.error("Failed to parse recommendations:", e);
    }
  }

  return [];
}

export async function chatWithHealthCoach(
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
) {
  const systemPrompt = `You are a friendly and knowledgeable health and fitness coach AI. Your role is to:

1. Ask thoughtful questions about the user's health and fitness goals
2. Understand their current lifestyle, habits, and challenges
3. Learn about their dietary preferences and restrictions
4. Understand their fitness level and exercise history
5. Identify any health concerns or medical conditions

Your goal is to gather information that will help create personalized:
- Meal plans tailored to their nutritional needs
- Training schedules appropriate for their fitness level
- Health recommendations based on their specific situation

Be conversational, empathetic, and encouraging. Ask one or two questions at a time. Keep responses concise and focused. Remember any information the user shares and reference it in future responses.

Start by introducing yourself and asking about their primary health or fitness goal.`;

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

## Guidelines:
- Be specific with numbers and timeframes
- Make insights actionable - tell user what to do
- Prioritize based on health impact (high = needs attention, low = informational)
- Reference user's timezone: ${data.timezone || 'UTC'}
- Use conversational, motivating language
- Celebrate wins and improvements

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
