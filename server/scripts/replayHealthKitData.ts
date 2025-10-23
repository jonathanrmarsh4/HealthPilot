/**
 * Replay Script: Send test HealthKit data to the universal ingest webhook
 * 
 * Usage: npx tsx server/scripts/replayHealthKitData.ts
 * 
 * This script tests the universal ingest system by sending realistic Health Auto Export
 * payloads including:
 * - Blood Pressure (systolic/diastolic pairs)
 * - Weight (with kg to lbs conversion)
 * - Lean Body Mass
 * - Blood Glucose (with mmol/L to mg/dL conversion)
 * - Heart Rate
 * - Sleep Analysis
 * - Unknown/exotic types (to test raw-only capture)
 */

const testPayloads = [
  // Test 1: Blood Pressure (most important - fixed correlation bug)
  {
    name: "Blood Pressure Test",
    payload: {
      data: {
        metrics: [
          {
            name: "Blood Pressure",
            units: "mmHg",
            data: [
              {
                date: "2024-01-15T08:00:00Z",
                systolic: 118,
                diastolic: 76,
              },
              {
                date: "2024-01-15T18:00:00Z",
                systolic: 122,
                diastolic: 78,
              },
              {
                date: "2024-01-16T08:00:00Z",
                systolic: 120,
                diastolic: 80,
              },
            ],
          },
        ],
      },
    },
  },

  // Test 2: Weight with unit conversion (kg → lbs)
  {
    name: "Weight Test (kg to lbs)",
    payload: {
      metrics: [
        {
          name: "Weight",
          units: "kg",
          data: [
            {
              date: "2024-01-15T07:00:00Z",
              qty: 75.5, // Should convert to ~166.45 lbs
              unit: "kg",
            },
            {
              date: "2024-01-16T07:00:00Z",
              qty: 75.2, // Should convert to ~165.79 lbs
              unit: "kg",
            },
          ],
        },
      ],
    },
  },

  // Test 3: Lean Body Mass
  {
    name: "Lean Body Mass Test",
    payload: {
      metrics: [
        {
          name: "Lean Body Mass",
          units: "kg",
          data: [
            {
              date: "2024-01-15T07:00:00Z",
              qty: 62.3, // Should convert to ~137.35 lbs
              unit: "kg",
            },
          ],
        },
      ],
    },
  },

  // Test 4: Blood Glucose with unit conversion (mmol/L → mg/dL)
  {
    name: "Blood Glucose Test (mmol/L to mg/dL)",
    payload: {
      data: [
        {
          name: "Blood Glucose",
          units: "mmol/L",
          data: [
            {
              date: "2024-01-15T09:00:00Z",
              qty: 5.5, // Should convert to ~99.1 mg/dL
              unit: "mmol/L",
            },
            {
              date: "2024-01-15T12:30:00Z",
              qty: 7.2, // Should convert to ~129.7 mg/dL
              unit: "mmol/L",
            },
          ],
        },
      ],
    },
  },

  // Test 5: Heart Rate & HRV
  {
    name: "Heart Rate and HRV Test",
    payload: {
      metrics: [
        {
          name: "Heart Rate",
          units: "bpm",
          data: [
            {
              date: "2024-01-15T10:00:00Z",
              Avg: 72,
            },
            {
              date: "2024-01-15T14:00:00Z",
              Avg: 85,
            },
          ],
        },
        {
          name: "Heart Rate Variability SDNN",
          units: "ms",
          data: [
            {
              date: "2024-01-15T08:00:00Z",
              qty: 45,
            },
          ],
        },
      ],
    },
  },

  // Test 6: Sleep Analysis
  {
    name: "Sleep Analysis Test",
    payload: {
      data: {
        metrics: [
          {
            name: "Sleep Analysis",
            units: "hours",
            data: [
              {
                inBedStart: "2024-01-14T22:30:00Z",
                inBedEnd: "2024-01-15T06:45:00Z",
                asleep: 7.5,
                awake: 0.5,
                deep: 1.8,
                rem: 1.5,
                core: 4.2,
              },
            ],
          },
        ],
      },
    },
  },

  // Test 7: Unknown/Exotic Type (tests raw-only capture)
  {
    name: "Unknown Type Test (raw-only capture)",
    payload: {
      metrics: [
        {
          name: "Exotic_Biometric_Scan",
          units: "units",
          data: [
            {
              date: "2024-01-15T10:00:00Z",
              value: 42,
              confidence: 0.95,
            },
          ],
        },
      ],
    },
  },

  // Test 8: Duplicate Event (tests idempotency)
  {
    name: "Duplicate Event Test (idempotency)",
    payload: {
      metrics: [
        {
          name: "Blood Pressure",
          units: "mmHg",
          data: [
            {
              date: "2024-01-15T08:00:00Z",
              systolic: 118,
              diastolic: 76,
            },
          ],
        },
      ],
    },
  },

  // Test 9: Steps (activity metric)
  {
    name: "Steps Test",
    payload: {
      metrics: [
        {
          name: "Steps",
          units: "steps",
          data: [
            {
              date: "2024-01-15T23:59:00Z",
              qty: 8543,
            },
          ],
        },
      ],
    },
  },

  // Test 10: Body Temperature with Celsius to Fahrenheit conversion
  {
    name: "Body Temperature Test (°C to °F)",
    payload: {
      metrics: [
        {
          name: "Body Temperature",
          units: "°C",
          data: [
            {
              date: "2024-01-15T06:00:00Z",
              qty: 36.8, // Should convert to ~98.2°F
              unit: "°C",
            },
          ],
        },
      ],
    },
  },
];

async function replayData() {
  console.log("🎬 HealthKit Replay Script - Universal Ingest Test");
  console.log("=" .repeat(60));

  const webhookUrl = process.env.WEBHOOK_URL || "http://localhost:5000/api/health-auto-export/ingest";
  const bearerToken = process.env.WEBHOOK_TOKEN || ""; // Get from Replit Auth

  if (!bearerToken) {
    console.error("❌ WEBHOOK_TOKEN environment variable not set");
    console.log("Please set WEBHOOK_TOKEN to your Replit Auth bearer token");
    process.exit(1);
  }

  console.log(`📡 Webhook URL: ${webhookUrl}`);
  console.log(`🔑 Using bearer token: ${bearerToken.substring(0, 20)}...`);
  console.log("");

  for (let i = 0; i < testPayloads.length; i++) {
    const test = testPayloads[i];
    console.log(`\n📤 Test ${i + 1}/${testPayloads.length}: ${test.name}`);
    console.log("─".repeat(60));

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(test.payload),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Success:", result.message);
        if (result.stats) {
          console.log(`   📊 Raw events: ${result.stats.rawEventsWritten}`);
          console.log(`   📈 Curated records: ${result.stats.curatedRecordsCreated}`);
          console.log(`   ⏭️  Duplicates: ${result.stats.duplicatesSkipped}`);
          console.log(`   🏷️  Types: ${result.stats.eventTypes.join(', ')}`);
        }
      } else {
        console.log(`❌ Failed: ${response.status} ${response.statusText}`);
        console.log(`   Error: ${result.error || JSON.stringify(result)}`);
      }
    } catch (error: any) {
      console.log(`❌ Request failed: ${error.message}`);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Replay complete!");
  console.log("\nNext steps:");
  console.log("1. Check /api/admin/hk-stats to see ingestion statistics");
  console.log("2. Check /api/admin/hk-events-raw to view raw events");
  console.log("3. Check /api/biomarkers to see curated biomarker data");
}

replayData().catch(console.error);
