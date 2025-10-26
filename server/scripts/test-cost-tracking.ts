/**
 * Test script to verify OpenAI cost tracking is working end-to-end
 * 
 * This script:
 * 1. Makes a test OpenAI API call
 * 2. Verifies the telemetry event is recorded
 * 3. Reports the results
 */

import { db } from "../db";
import { telemetryLlmEvents } from "@shared/schema";
import { desc } from "drizzle-orm";

// Dynamic import to avoid loading OpenAI at module level
async function runTest() {
  console.log("🧪 Cost Tracking End-to-End Test\n");
  console.log("=" .repeat(50));
  
  // Step 1: Count existing events
  const beforeEvents = await db.select().from(telemetryLlmEvents).orderBy(desc(telemetryLlmEvents.createdAt)).limit(1);
  const beforeCount = beforeEvents.length > 0 ? beforeEvents[0].id : 0;
  console.log(`📊 Latest telemetry event ID before test: ${beforeCount}`);
  
  // Step 2: Make a test OpenAI call
  console.log("\n🤖 Making test OpenAI API call...");
  const startTime = Date.now();
  
  try {
    // Import instrumented OpenAI client
    const ai = await import("../services/ai");
    
    // Make a simple test call using the instrumented openAI client
    const testProfile = {
      weight: 80,
      height: 180,
      age: 30,
      activityLevel: "moderate",
      dietaryRestrictions: [],
      healthGoals: ["Test cost tracking"],
      activeGoals: []
    };
    
    const testResult = await ai.generateMacroRecommendations({
      goals: testProfile.activeGoals,
      currentWeight: { value: testProfile.weight, unit: "kg" },
      trainingDays: 3,
      primaryGoal: "maintain"
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ OpenAI call completed in ${duration}ms`);
    console.log(`📝 Response received: ${JSON.stringify(testResult).slice(0, 150)}...`);
    
    // Step 3: Wait a moment for telemetry to be written
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 4: Check if telemetry was recorded
    const afterEvents = await db.select().from(telemetryLlmEvents).orderBy(desc(telemetryLlmEvents.createdAt)).limit(1);
    const afterCount = afterEvents.length > 0 ? afterEvents[0].id : 0;
    
    console.log(`\n📊 Latest telemetry event ID after test: ${afterCount}`);
    
    if (afterCount > beforeCount) {
      const newEvent = afterEvents[0];
      console.log("\n✅ SUCCESS! Telemetry event recorded:");
      console.log(`   ID: ${newEvent.id}`);
      console.log(`   Model: ${newEvent.llmModel}`);
      console.log(`   Input tokens: ${newEvent.inputTokens}`);
      console.log(`   Output tokens: ${newEvent.outputTokens}`);
      console.log(`   Duration: ${newEvent.durationMs}ms`);
      console.log(`   Created at: ${newEvent.createdAt}`);
      
      // Calculate cost
      const inputCost = newEvent.inputTokens * 0.00000015;
      const outputCost = newEvent.outputTokens * 0.0000006;
      const totalCost = inputCost + outputCost;
      console.log(`   Estimated cost: $${totalCost.toFixed(6)}`);
      
      console.log("\n🎉 Cost tracking system is working correctly!");
    } else {
      console.log("\n❌ FAILURE: No new telemetry event was recorded");
      console.log("   This suggests the instrumentation is not working");
    }
    
  } catch (error: any) {
    console.error("\n❌ Error during test:", error.message);
    throw error;
  }
  
  console.log("\n" + "=".repeat(50));
}

runTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
