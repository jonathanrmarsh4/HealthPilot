import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeHealthDocument(documentText: string, fileName: string) {
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a health data extraction specialist. Analyze the following health document and extract all relevant biomarkers, test results, and health metrics.

Document Name: ${fileName}

Document Content:
${documentText}

Please extract and return a JSON object with the following structure:
{
  "biomarkers": [
    {
      "type": "blood-glucose" | "cholesterol" | "blood-pressure" | "heart-rate" | "weight" | "bmi" | other,
      "value": number,
      "unit": "mg/dL" | "bpm" | "lbs" | etc,
      "date": "ISO date if available"
    }
  ],
  "summary": "Brief summary of the health document",
  "concerns": ["List any areas of concern or abnormal values"],
  "recommendations": ["List any recommendations mentioned in the document"]
}

If you cannot extract meaningful health data, return an empty biomarkers array with a summary explaining what the document contains.`,
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
}

export async function generateMealPlan(userProfile: {
  weight?: number;
  height?: number;
  age?: number;
  activityLevel?: string;
  dietaryRestrictions?: string[];
  healthGoals?: string[];
  recentBiomarkers?: any[];
}) {
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a nutritionist AI. Create a personalized daily meal plan based on the following user profile:

${JSON.stringify(userProfile, null, 2)}

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

Make sure the meals are balanced, nutritious, and aligned with the user's health goals.`,
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
}) {
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a fitness coach AI. Create a personalized weekly training schedule based on the following user profile:

${JSON.stringify(userProfile, null, 2)}

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

Make sure the schedule is safe, progressive, and aligned with the user's fitness level and health constraints.`,
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
}) {
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a health insights AI. Analyze the following health data and provide actionable recommendations:

${JSON.stringify(data, null, 2)}

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

Provide 3-5 specific, actionable recommendations prioritized by importance.`,
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
