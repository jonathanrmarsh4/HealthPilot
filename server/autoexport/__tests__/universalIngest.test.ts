import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateIdempotencyKey, hashValue } from '../idempotency';
import { HK_TYPE_REGISTRY, isTypeRoutingEnabled } from '../registry';
import { normalizeHealthKitEvent, routeEventToMappers } from '../mappers';

describe('Universal HealthKit Ingest', () => {
  describe('Idempotency System', () => {
    it('should generate consistent idempotency keys for same event', () => {
      const input = {
        userId: 'user123',
        type: 'blood_pressure',
        tsInstant: new Date('2024-01-15T10:00:00Z'),
        value: { systolic: 120, diastolic: 80 },
      };

      const key1 = generateIdempotencyKey(input);
      const key2 = generateIdempotencyKey(input);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
    });

    it('should generate different keys for different events', () => {
      const input1 = {
        userId: 'user123',
        type: 'blood_pressure',
        tsInstant: new Date('2024-01-15T10:00:00Z'),
        value: { systolic: 120, diastolic: 80 },
      };

      const input2 = {
        userId: 'user123',
        type: 'blood_pressure',
        tsInstant: new Date('2024-01-15T10:00:00Z'),
        value: { systolic: 125, diastolic: 85 },
      };

      const key1 = generateIdempotencyKey(input1);
      const key2 = generateIdempotencyKey(input2);

      expect(key1).not.toBe(key2);
    });

    it('should hash values consistently for object normalization', () => {
      const obj1 = { b: 2, a: 1, c: 3 };
      const obj2 = { a: 1, b: 2, c: 3 }; // Different order, same content

      const hash1 = hashValue(obj1);
      const hash2 = hashValue(obj2);

      expect(hash1).toBe(hash2); // Should normalize object keys
    });
  });

  describe('Type Registry', () => {
    it('should support blood pressure type', () => {
      const config = HK_TYPE_REGISTRY['blood_pressure'];
      expect(config).toBeDefined();
      expect(config.supported).toBe(true);
      expect(config.mapper).toBe('bp');
    });

    it('should support weight type', () => {
      const config = HK_TYPE_REGISTRY['weight'];
      expect(config).toBeDefined();
      expect(config.supported).toBe(true);
      expect(config.mapper).toBe('weight');
    });

    it('should support lean body mass type', () => {
      const config = HK_TYPE_REGISTRY['lean_body_mass'];
      expect(config).toBeDefined();
      expect(config.supported).toBe(true);
      expect(config.mapper).toBe('lean_mass');
    });

    it('should support sleep analysis type', () => {
      const config = HK_TYPE_REGISTRY['sleep_analysis'];
      expect(config).toBeDefined();
      expect(config.supported).toBe(true);
      expect(config.mapper).toBe('sleep');
    });

    it('should handle unknown types gracefully', () => {
      const config = HK_TYPE_REGISTRY['unknown_exotic_metric'];
      expect(config).toBeUndefined();
    });
  });

  describe('Type Routing', () => {
    it('should enable routing for supported types by default', () => {
      expect(isTypeRoutingEnabled('blood_pressure')).toBe(true);
      expect(isTypeRoutingEnabled('weight')).toBe(true);
      expect(isTypeRoutingEnabled('sleep_analysis')).toBe(true);
    });

    it('should disable routing for blocklisted types', () => {
      // Set environment blocklist
      const originalBlocklist = process.env.AE_INGEST_BLOCKLIST;
      process.env.AE_INGEST_BLOCKLIST = 'weight,steps';

      expect(isTypeRoutingEnabled('weight')).toBe(false);
      expect(isTypeRoutingEnabled('steps')).toBe(false);
      expect(isTypeRoutingEnabled('blood_pressure')).toBe(true); // Not blocklisted

      // Restore
      process.env.AE_INGEST_BLOCKLIST = originalBlocklist;
    });

    it('should only enable allowlisted types when allowlist is set', () => {
      const originalAllowlist = process.env.AE_INGEST_ALLOWLIST;
      process.env.AE_INGEST_ALLOWLIST = 'blood_pressure,heart_rate';

      expect(isTypeRoutingEnabled('blood_pressure')).toBe(true);
      expect(isTypeRoutingEnabled('heart_rate')).toBe(true);
      expect(isTypeRoutingEnabled('weight')).toBe(false); // Not allowlisted

      // Restore
      process.env.AE_INGEST_ALLOWLIST = originalAllowlist;
    });
  });

  describe('Event Normalization', () => {
    it('should normalize blood pressure event', () => {
      const rawEvent = {
        type: 'blood_pressure',
        metricName: 'Blood Pressure',
        dataPoint: {
          date: '2024-01-15T10:00:00Z',
          systolic: 120,
          diastolic: 80,
        },
        metric: {
          name: 'Blood Pressure',
          units: 'mmHg',
        },
      };

      const normalized = normalizeHealthKitEvent(rawEvent);

      expect(normalized.type).toBe('blood_pressure');
      expect(normalized.recordedAt).toBeInstanceOf(Date);
      expect(normalized.payload).toMatchObject({
        systolic: 120,
        diastolic: 80,
      });
      expect(normalized.value).toBeNull(); // BP doesn't have single value
      expect(normalized.unit).toBe('mmHg');
    });

    it('should normalize weight event with kg to lbs conversion', () => {
      const rawEvent = {
        type: 'weight',
        metricName: 'Weight',
        dataPoint: {
          date: '2024-01-15T10:00:00Z',
          qty: 70, // kg
          unit: 'kg',
        },
        metric: {
          name: 'Weight',
        },
      };

      const normalized = normalizeHealthKitEvent(rawEvent);

      expect(normalized.type).toBe('weight');
      expect(normalized.value).toBeCloseTo(154.32, 1); // 70 kg ≈ 154.32 lbs
      expect(normalized.unit).toBe('lbs');
    });

    it('should normalize blood glucose with mmol/L to mg/dL conversion', () => {
      const rawEvent = {
        type: 'blood_glucose',
        metricName: 'Blood Glucose',
        dataPoint: {
          date: '2024-01-15T10:00:00Z',
          qty: 5.5, // mmol/L
          unit: 'mmol/L',
        },
        metric: {
          name: 'Blood Glucose',
        },
      };

      const normalized = normalizeHealthKitEvent(rawEvent);

      expect(normalized.type).toBe('blood_glucose');
      expect(normalized.value).toBeCloseTo(99.1, 1); // 5.5 mmol/L ≈ 99.1 mg/dL
      expect(normalized.unit).toBe('mg/dL');
    });

    it('should normalize temperature with Celsius to Fahrenheit conversion', () => {
      const rawEvent = {
        type: 'body_temperature',
        metricName: 'Body Temperature',
        dataPoint: {
          date: '2024-01-15T10:00:00Z',
          qty: 37, // °C
          unit: '°C',
        },
        metric: {
          name: 'Body Temperature',
        },
      };

      const normalized = normalizeHealthKitEvent(rawEvent);

      expect(normalized.type).toBe('body_temperature');
      expect(normalized.value).toBeCloseTo(98.6, 1); // 37°C = 98.6°F
      expect(normalized.unit).toBe('°F');
    });

    it('should handle unknown types without throwing', () => {
      const rawEvent = {
        type: 'exotic_unknown_metric',
        metricName: 'Exotic Unknown Metric',
        dataPoint: {
          date: '2024-01-15T10:00:00Z',
          value: 42,
        },
        metric: {
          name: 'Exotic Unknown Metric',
        },
      };

      const normalized = normalizeHealthKitEvent(rawEvent);

      expect(normalized.type).toBe('exotic_unknown_metric');
      expect(normalized.value).toBe(42);
      expect(normalized.payload).toMatchObject({ value: 42 });
    });
  });

  describe('Mapper Routing', () => {
    const mockStorage = {
      upsertBiomarker: vi.fn().mockResolvedValue({ id: 'bio123' }),
      createSleepSession: vi.fn().mockResolvedValue({ id: 'sleep123' }),
      createWorkoutSession: vi.fn().mockResolvedValue({ id: 'workout123' }),
    };

    const mockContext = {
      storage: mockStorage as any,
      userId: 'user123',
      alog: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should route blood pressure to biomarkers table', async () => {
      const event = {
        type: 'blood_pressure',
        recordedAt: new Date('2024-01-15T10:00:00Z'),
        value: null,
        unit: 'mmHg',
        payload: { systolic: 120, diastolic: 80 },
      };

      const count = await routeEventToMappers(event, mockContext);

      expect(count).toBe(2); // Systolic + Diastolic
      expect(mockStorage.upsertBiomarker).toHaveBeenCalledTimes(2);
      expect(mockStorage.upsertBiomarker).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          type: 'blood-pressure-systolic',
          value: 120,
          unit: 'mmHg',
          source: 'health-auto-export',
        })
      );
      expect(mockStorage.upsertBiomarker).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          type: 'blood-pressure-diastolic',
          value: 80,
          unit: 'mmHg',
          source: 'health-auto-export',
        })
      );
    });

    it('should route weight to biomarkers table', async () => {
      const event = {
        type: 'weight',
        recordedAt: new Date('2024-01-15T10:00:00Z'),
        value: 154.32, // Already converted to lbs
        unit: 'lbs',
        payload: { qty: 154.32, unit: 'lbs' },
      };

      const count = await routeEventToMappers(event, mockContext);

      expect(count).toBe(1);
      expect(mockStorage.upsertBiomarker).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          type: 'weight',
          value: 154.32,
          unit: 'lbs',
          source: 'health-auto-export',
        })
      );
    });

    it('should return 0 for unsupported types', async () => {
      const event = {
        type: 'unknown_type',
        recordedAt: new Date('2024-01-15T10:00:00Z'),
        value: 42,
        unit: 'units',
        payload: { value: 42 },
      };

      const count = await routeEventToMappers(event, mockContext);

      expect(count).toBe(0);
      expect(mockStorage.upsertBiomarker).not.toHaveBeenCalled();
    });
  });

  describe('Integration: Full Ingest Flow', () => {
    it('should demonstrate complete flow: raw event → normalization → routing', async () => {
      // 1. Incoming raw metric from Health Auto Export
      const incomingMetric = {
        name: 'Blood Pressure',
        units: 'mmHg',
        data: [
          {
            date: '2024-01-15T10:00:00Z',
            systolic: 120,
            diastolic: 80,
          },
        ],
      };

      // 2. Normalize event
      const normalized = normalizeHealthKitEvent({
        type: 'blood_pressure',
        metricName: incomingMetric.name,
        dataPoint: incomingMetric.data[0],
        metric: incomingMetric,
      });

      expect(normalized.type).toBe('blood_pressure');
      expect(normalized.payload.systolic).toBe(120);
      expect(normalized.payload.diastolic).toBe(80);

      // 3. Generate idempotency key
      const idempotencyKey = generateIdempotencyKey({
        userId: 'user123',
        type: normalized.type,
        tsInstant: normalized.recordedAt,
        value: normalized.payload,
      });

      expect(idempotencyKey).toBeDefined();
      expect(idempotencyKey.length).toBe(64); // SHA-256

      // 4. Check if type should be routed
      const shouldRoute = HK_TYPE_REGISTRY[normalized.type]?.supported && 
                          isTypeRoutingEnabled(normalized.type);

      expect(shouldRoute).toBe(true);

      // This demonstrates the complete flow:
      // Webhook receives metric → Normalize → Generate idempotency key →
      // Write to raw table → Check routing → Write to curated table
    });
  });
});
