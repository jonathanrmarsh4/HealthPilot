#!/usr/bin/env tsx
/**
 * Health Auto Export Webhook Testing Script
 * 
 * Tests the webhook endpoint with various payload formats to diagnose
 * which metric types are being processed correctly.
 * 
 * Usage:
 *   npm run test-webhook [options]
 *   
 * Options:
 *   --type <metric>   Test specific metric type (bp, weight, sleep, etc.)
 *   --all             Test all metric types
 *   --user <id>       User ID to test with (defaults to authenticated user)
 */

import axios from 'axios';

const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : 'http://localhost:5000';

// Sample payloads for each metric type
const SAMPLE_PAYLOADS = {
  bloodPressure: {
    data: {
      metrics: [
        {
          name: "Blood Pressure",
          units: "mmHg",
          data: [
            {
              date: new Date().toISOString(),
              systolic: 120,
              diastolic: 80
            },
            {
              date: new Date(Date.now() - 3600000).toISOString(),
              systolic: 125,
              diastolic: 82
            }
          ]
        }
      ]
    }
  },
  
  weight: {
    data: {
      metrics: [
        {
          name: "Weight",
          units: "kg",
          data: [
            {
              date: new Date().toISOString(),
              qty: 70.5
            }
          ]
        }
      ]
    }
  },
  
  leanBodyMass: {
    data: {
      metrics: [
        {
          name: "Lean Body Mass",
          units: "kg",
          data: [
            {
              date: new Date().toISOString(),
              qty: 55.2
            }
          ]
        }
      ]
    }
  },
  
  sleep: {
    data: {
      metrics: [
        {
          name: "Sleep Analysis",
          units: "hours",
          data: [
            {
              date: new Date().toISOString(),
              bedtime: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
              waketime: new Date().toISOString(),
              asleep: 7.5,
              awake: 0.3,
              deep: 1.8,
              rem: 1.5,
              core: 4.2
            }
          ]
        }
      ]
    }
  },
  
  heartRate: {
    data: {
      metrics: [
        {
          name: "Heart Rate",
          units: "bpm",
          data: [
            { date: new Date().toISOString(), qty: 72 },
            { date: new Date(Date.now() - 3600000).toISOString(), Avg: 75 }
          ]
        }
      ]
    }
  },
  
  hrv: {
    data: {
      metrics: [
        {
          name: "Heart Rate Variability",
          units: "ms",
          data: [
            { date: new Date().toISOString(), qty: 45 }
          ]
        }
      ]
    }
  },
  
  steps: {
    data: {
      metrics: [
        {
          name: "Steps",
          units: "count",
          data: [
            { date: new Date().toISOString(), qty: 8500 }
          ]
        }
      ]
    }
  },
  
  // Alternative payload format tests
  alternativeFormats: {
    // Format with snake_case names
    snakeCase: {
      data: {
        metrics: [
          {
            name: "blood_pressure",
            units: "mmHg",
            data: [
              {
                date: new Date().toISOString(),
                sys: 118,
                dia: 78
              }
            ]
          }
        ]
      }
    },
    
    // Format with camelCase names
    camelCase: {
      data: {
        metrics: [
          {
            name: "bloodPressure",
            units: "mmHg",
            data: [
              {
                date: new Date().toISOString(),
                systolic: 122,
                diastolic: 81
              }
            ]
          }
        ]
      }
    },
    
    // Format with nested value objects
    nestedValues: {
      data: {
        metrics: [
          {
            name: "Weight",
            units: "kg",
            data: [
              {
                date: new Date().toISOString(),
                value: {
                  kg: 71.2
                }
              }
            ]
          }
        ]
      }
    }
  }
};

async function testWebhook(metricType: string, payload: any, authToken?: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${metricType}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await axios.post(
      `${BASE_URL}/api/health-auto-export/webhook`,
      payload,
      { headers }
    );
    
    console.log('✅ Response:', response.status, response.statusText);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    console.error('Error data:', error.response?.data);
    console.error('Error message:', error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

async function runTests() {
  const args = process.argv.slice(2);
  const testType = args.find(arg => arg.startsWith('--type='))?.split('=')[1];
  const testAll = args.includes('--all');
  const authToken = process.env.AUTH_TOKEN;
  
  if (!authToken) {
    console.warn('⚠️  No AUTH_TOKEN provided. You may need to authenticate manually.');
    console.warn('   Set AUTH_TOKEN environment variable with a valid session token.');
  }
  
  console.log('🧪 Health Auto Export Webhook Test Suite');
  console.log('Target:', BASE_URL);
  console.log('Debug mode:', process.env.AE_DEBUG === '1' ? 'ENABLED ✅' : 'DISABLED ⚠️');
  
  if (!process.env.AE_DEBUG) {
    console.warn('\n⚠️  AE_DEBUG is not enabled! Set AE_DEBUG=1 to see detailed logs.\n');
  }
  
  const results: any[] = [];
  
  if (testAll) {
    // Test all standard payloads
    for (const [type, payload] of Object.entries(SAMPLE_PAYLOADS)) {
      if (type === 'alternativeFormats') continue;
      const result = await testWebhook(type, payload, authToken);
      results.push({ type, ...result });
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    }
    
    // Test alternative formats
    console.log('\n📋 Testing Alternative Formats...\n');
    for (const [format, payload] of Object.entries(SAMPLE_PAYLOADS.alternativeFormats)) {
      const result = await testWebhook(`alt-${format}`, payload, authToken);
      results.push({ type: `alt-${format}`, ...result });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } else if (testType) {
    // Test specific type
    const payload = (SAMPLE_PAYLOADS as any)[testType];
    if (!payload) {
      console.error(`❌ Unknown metric type: ${testType}`);
      console.log('Available types:', Object.keys(SAMPLE_PAYLOADS).filter(k => k !== 'alternativeFormats').join(', '));
      process.exit(1);
    }
    const result = await testWebhook(testType, payload, authToken);
    results.push({ type: testType, ...result });
    
  } else {
    // Default: test blood pressure
    console.log('Testing Blood Pressure (use --all to test everything)\n');
    const result = await testWebhook('bloodPressure', SAMPLE_PAYLOADS.bloodPressure, authToken);
    results.push({ type: 'bloodPressure', ...result });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.type}: ${r.error}`);
    });
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Check server logs for [AE_DEBUG] output');
  console.log('2. Query database to verify data was inserted:');
  console.log('   SELECT type, value, recorded_at FROM biomarkers WHERE source = \'health-auto-export\' ORDER BY recorded_at DESC LIMIT 10;');
  console.log('3. If issues persist, check the Health Auto Export app configuration\n');
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
