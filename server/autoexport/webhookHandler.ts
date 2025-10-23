import type { Request, Response } from 'express';
import type { IStorage } from '../storage';
import { generateIdempotencyKey } from './idempotency';
import { HK_TYPE_REGISTRY, isTypeRoutingEnabled } from './registry';
import { normalizeHealthKitEvent, routeEventToMappers } from './mappers';
import { alog } from '../lib/aeDebug';

/**
 * Universal HealthKit Ingest Handler
 * 
 * Architecture:
 * 1. Parse incoming metrics from Health Auto Export app (multiple formats supported)
 * 2. Write ALL events to hk_events_raw table (append-only warehouse)
 * 3. Route supported types to curated tables via mappers
 * 4. Return response immediately (async processing happens in background)
 */
export async function handleHealthAutoExportWebhook(
  req: Request,
  res: Response,
  storage: IStorage,
  userId: string
): Promise<void> {
  try {
    alog("📥 Universal HK Ingest - Starting");
    alog(`📋 Payload keys: ${Object.keys(req.body).join(', ')}`);
    
    // STEP 1: Parse metrics from multiple payload formats
    let metrics: any[] = [];
    
    if (req.body.data && req.body.data.metrics && Array.isArray(req.body.data.metrics)) {
      metrics = req.body.data.metrics;
      alog("✅ Format: data.metrics");
    } else if (req.body.metrics && Array.isArray(req.body.metrics)) {
      metrics = req.body.metrics;
      alog("✅ Format: metrics");
    } else if (Array.isArray(req.body)) {
      metrics = req.body;
      alog("✅ Format: root array");
    } else if (req.body.data && Array.isArray(req.body.data)) {
      metrics = req.body.data;
      alog("✅ Format: data array");
    } else if (req.body.name || req.body.type) {
      metrics = [req.body];
      alog("✅ Format: single metric object");
    } else {
      // Flexible extraction - try to find ANY array in payload
      const bodyKeys = Object.keys(req.body || {});
      for (const key of bodyKeys) {
        const value = req.body[key];
        if (Array.isArray(value) && value.length > 0) {
          metrics = value;
          alog(`✅ Format: extracted from '${key}'`);
          break;
        }
        // Check nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          for (const nestedKey of Object.keys(value)) {
            if (Array.isArray(value[nestedKey]) && value[nestedKey].length > 0) {
              metrics = value[nestedKey];
              alog(`✅ Format: extracted from '${key}.${nestedKey}'`);
              break;
            }
          }
          if (metrics.length > 0) break;
        }
      }
    }

    if (metrics.length === 0) {
      alog("❌ No metrics found in payload");
      return res.status(400).json({ 
        error: "No metrics found",
        hint: "Expected formats: {data: {metrics: [...]}}, {metrics: [...]}, [...], or single metric object"
      });
    }

    alog(`📊 Found ${metrics.length} metric group(s) to process`);

    // STEP 2 & 3: Process each metric - write to raw, then route
    let rawEventsWritten = 0;
    let rawDuplicates = 0;
    let curatedRecordsCreated = 0;
    const eventTypesSeen = new Set<string>();

    for (const metric of metrics) {
      // Detect metric type from name/type field
      const metricName = metric.name || metric.type || 'unknown';
      const normalizedType = normalizeMetricType(metricName);
      
      // Check if this is a workout (special handling)
      const isWorkoutObject = metric.start || metric.startDate || metric.duration || 
                               metric.activeEnergyBurned || metric.totalEnergyBurned;
      if (isWorkoutObject && !metric.data) {
        metric.data = [metric]; // Wrap in array
      }

      // Extract data points array
      const dataPoints = metric.data && Array.isArray(metric.data) ? metric.data : [metric];
      
      alog(`📦 Processing "${metricName}" (${normalizedType}): ${dataPoints.length} data points`);
      eventTypesSeen.add(normalizedType);

      // Process each data point
      for (const dataPoint of dataPoints) {
        // Normalize the event structure
        const normalizedEvent = normalizeHealthKitEvent({
          type: normalizedType,
          metricName,
          dataPoint,
          metric,
        });

        // Generate idempotency key
        const idempotencyKey = generateIdempotencyKey({
          userId,
          type: normalizedEvent.type,
          tsInstant: normalizedEvent.recordedAt,
          value: normalizedEvent.payload,
        });

        // Write to raw events table (warehouse)
        const rawEvent = await storage.insertHkEventRaw({
          userId,
          type: normalizedEvent.type,
          recordedAtUtc: normalizedEvent.recordedAt,
          payload: normalizedEvent.payload,
          idempotencyKey,
        });

        if (rawEvent) {
          rawEventsWritten++;
          alog(`  ✅ RAW: ${normalizedEvent.type} @ ${normalizedEvent.recordedAt.toISOString()}`);

          // Route to curated tables if supported and routing enabled
          if (HK_TYPE_REGISTRY[normalizedEvent.type]?.supported && isTypeRoutingEnabled(normalizedEvent.type)) {
            const count = await routeEventToMappers(normalizedEvent, { storage, userId, alog });
            curatedRecordsCreated += count;
            if (count > 0) {
              alog(`    📊 CURATED: ${count} record(s) created`);
            }
          } else {
            alog(`    ⏭️  Type not routed (unsupported or blocked)`);
          }
        } else {
          rawDuplicates++;
          alog(`  ⏭️  DUPLICATE: ${normalizedEvent.type} (skipped via idempotency)`);
        }
      }
    }

    alog(`✅ Ingest complete: ${rawEventsWritten} raw, ${curatedRecordsCreated} curated, ${rawDuplicates} duplicates`);

    // Return success response
    res.json({ 
      success: true, 
      message: `Ingested ${rawEventsWritten} events (${curatedRecordsCreated} routed to curated tables, ${rawDuplicates} duplicates skipped)`,
      stats: {
        rawEventsWritten,
        curatedRecordsCreated,
        duplicatesSkipped: rawDuplicates,
        eventTypes: Array.from(eventTypesSeen),
      }
    });
  } catch (error: any) {
    console.error("❌ Error in universal HK ingest:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * Normalize metric type names to standard format
 * Maps various Health Auto Export naming conventions to our standard types
 */
function normalizeMetricType(name: string): string {
  const normalized = name.toLowerCase().trim()
    .replace(/\s+/g, '_')           // spaces to underscores
    .replace(/-/g, '_')             // hyphens to underscores
    .replace(/[^a-z0-9_]/g, '');    // remove special chars

  // Map common variations to standard types
  const typeMap: Record<string, string> = {
    // Heart Rate
    'heart_rate': 'heart_rate',
    'heartrate': 'heart_rate',
    'resting_heart_rate': 'resting_heart_rate',
    'restingheartrate': 'resting_heart_rate',
    
    // HRV
    'heart_rate_variability_sdnn': 'heart_rate_variability',
    'heart_rate_variability': 'heart_rate_variability',
    'hrv': 'heart_rate_variability',
    
    // Blood Pressure
    'blood_pressure': 'blood_pressure',
    'bloodpressure': 'blood_pressure',
    'blood_pressure_systolic': 'blood_pressure',
    'blood_pressure_diastolic': 'blood_pressure',
    
    // Weight
    'weight': 'weight',
    'body_weight': 'weight',
    'weight_body_mass': 'weight',
    
    // Lean Mass
    'lean_body_mass': 'lean_body_mass',
    'leanbodymass': 'lean_body_mass',
    
    // Sleep
    'sleep_analysis': 'sleep_analysis',
    'sleepanalysis': 'sleep_analysis',
    'sleep': 'sleep_analysis',
    
    // Blood Glucose
    'blood_glucose': 'blood_glucose',
    'bloodglucose': 'blood_glucose',
    
    // Temperature
    'body_temperature': 'body_temperature',
    'bodytemperature': 'body_temperature',
    
    // Steps
    'steps': 'steps',
    'step_count': 'steps',
    
    // Energy
    'active_energy': 'active_energy',
    'active_energy_burned': 'active_energy',
    'activeenergy': 'active_energy',
    
    // Oxygen
    'oxygen_saturation': 'oxygen_saturation',
    'oxygensaturation': 'oxygen_saturation',
    
    // Workouts
    'workout': 'workout',
    'workouts': 'workout',
  };

  return typeMap[normalized] || normalized;
}
