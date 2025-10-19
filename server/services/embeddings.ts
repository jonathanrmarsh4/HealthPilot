import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/**
 * Generate embeddings for text using OpenAI's text-embedding-3-small model
 * Returns a vector of 1536 dimensions for semantic search
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty for embedding generation");
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error("Error generating embedding:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns a value between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Summarize a conversation using OpenAI
 * Extracts key insights: preferences, concerns, progress, goals
 */
export async function summarizeConversation(messages: Array<{ role: string; content: string }>): Promise<{
  summary: string;
  memoryType: 'preference' | 'progress' | 'concern' | 'goal' | 'general';
}> {
  try {
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a health coach memory system. Extract ONE key insight from this conversation.
          
Focus on:
- Preferences: exercise likes/dislikes, dietary preferences, training styles
- Progress: achievements, milestones, improvements
- Concerns: health worries, limitations, questions
- Goals: stated objectives, targets, aspirations
- General: other important context

Return JSON with:
{
  "summary": "brief 1-2 sentence insight",
  "memoryType": "preference|progress|concern|goal|general"
}

Keep summaries concise and actionable. Focus on what the AI coach should remember for future interactions.`
        },
        {
          role: "user",
          content: conversationText
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      summary: result.summary || "No significant insight extracted",
      memoryType: result.memoryType || 'general',
    };
  } catch (error: any) {
    console.error("Error summarizing conversation:", error);
    throw new Error(`Failed to summarize conversation: ${error.message}`);
  }
}
