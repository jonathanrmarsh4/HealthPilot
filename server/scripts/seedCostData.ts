import { db } from "../db";
import { telemetryJobEvents, telemetryLlmEvents } from "../../shared/schema";
import { rollupCostsForDate } from "../services/telemetry";

/**
 * Seed script to generate synthetic telemetry data for testing the Cost Dashboard
 * 
 * Usage: tsx server/scripts/seedCostData.ts
 * 
 * This will:
 * 1. Create fake job events (metrics, insights, workouts, meals) for the past 7 days
 * 2. Create fake LLM events with various token counts
 * 3. Run the cost rollup to aggregate data into daily tables
 * 4. Display summary statistics
 */

const FAKE_USER_IDS = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5', 'user_6', 'user_7', 'user_8', 'user_9', 'user_10'];
const TIERS = ['free', 'premium', 'enterprise'] as const;
const JOB_DOMAINS = ['metrics', 'insights', 'workouts', 'meals'] as const;
const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

async function seedTelemetryData(days: number = 7) {
  console.log(`🌱 Seeding telemetry data for the past ${days} days...`);
  
  const now = new Date();
  const jobEventsToInsert: any[] = [];
  const llmEventsToInsert: any[] = [];
  
  for (let day = 0; day < days; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // Generate 20-50 job events per day
    const numJobs = randomInt(20, 50);
    for (let i = 0; i < numJobs; i++) {
      const userId = randomChoice(FAKE_USER_IDS);
      const tier = randomChoice(TIERS);
      const domain = randomChoice(JOB_DOMAINS);
      const startedAt = new Date(date.getTime() + randomInt(0, 86400000)); // Random time during the day
      const durationMs = randomInt(200, 8000);
      
      jobEventsToInsert.push({
        userId,
        tier,
        domain,
        jobType: `${domain}_generation`,
        success: Math.random() > 0.1, // 90% success rate
        cpuMs: randomInt(100, 5000),
        rowsRead: randomInt(10, 500),
        rowsWritten: randomInt(1, 100),
        durationMs,
        startedAt,
        finishedAt: new Date(startedAt.getTime() + durationMs),
        createdAt: startedAt,
      });
    }
    
    // Generate 30-80 LLM events per day
    const numLLM = randomInt(30, 80);
    for (let i = 0; i < numLLM; i++) {
      const userId = randomChoice(FAKE_USER_IDS);
      const tier = randomChoice(TIERS);
      const llmModel = randomChoice(MODELS);
      const contextType = randomChoice(['chat', 'insights', 'workout', 'meal', 'analysis']);
      
      // Different models have different token patterns
      const inputTokens = llmModel === 'gpt-4o' 
        ? randomInt(500, 3000)
        : randomInt(200, 1500);
      const outputTokens = llmModel === 'gpt-4o'
        ? randomInt(200, 1500)
        : randomInt(100, 800);
      
      llmEventsToInsert.push({
        userId,
        tier,
        llmModel,
        contextType,
        inputTokens,
        outputTokens,
        durationMs: randomInt(800, 6000),
        success: Math.random() > 0.05, // 95% success rate
        createdAt: new Date(date.getTime() + randomInt(0, 86400000)),
      });
    }
  }
  
  console.log(`📊 Inserting ${jobEventsToInsert.length} job events...`);
  if (jobEventsToInsert.length > 0) {
    // Insert in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < jobEventsToInsert.length; i += batchSize) {
      const batch = jobEventsToInsert.slice(i, i + batchSize);
      await db.insert(telemetryJobEvents).values(batch);
    }
  }
  
  console.log(`🤖 Inserting ${llmEventsToInsert.length} LLM events...`);
  if (llmEventsToInsert.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < llmEventsToInsert.length; i += batchSize) {
      const batch = llmEventsToInsert.slice(i, i + batchSize);
      await db.insert(telemetryLlmEvents).values(batch);
    }
  }
  
  console.log(`\n🔄 Running cost rollup for the past ${days} days...`);
  for (let day = 0; day < days; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];
    
    console.log(`  Rolling up ${dateStr}...`);
    await rollupCostsForDate(date);
  }
  
  console.log(`\n✅ Seed complete!`);
  console.log(`\nView the Cost Dashboard at: /admin/cost`);
  console.log(`- ${jobEventsToInsert.length} job events created`);
  console.log(`- ${llmEventsToInsert.length} LLM events created`);
  console.log(`- ${days} days of cost data rolled up`);
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedTelemetryData(7)
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedTelemetryData };
