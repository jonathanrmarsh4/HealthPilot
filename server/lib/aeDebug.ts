/**
 * AutoExport Debug Utilities
 * Enable with AE_DEBUG=1 environment variable
 */

export const AE_DEBUG = process.env.AE_DEBUG === "1";

export function alog(...args: any[]) {
  if (AE_DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[AE_DEBUG ${timestamp}]`, ...args);
  }
}

export function logWebhookPayload(userId: string, payload: any) {
  if (!AE_DEBUG) return;
  
  alog("=== WEBHOOK RECEIVED ===");
  alog("User ID:", userId);
  alog("Payload keys:", Object.keys(payload));
  
  if (payload.data && Array.isArray(payload.data)) {
    const metricTypes = new Map<string, number>();
    
    for (const metric of payload.data) {
      const name = metric.name || metric.type || "unknown";
      metricTypes.set(name, (metricTypes.get(name) || 0) + (metric.data?.length || 1));
    }
    
    alog("Metric types and counts:");
    for (const [type, count] of metricTypes.entries()) {
      alog(`  - ${type}: ${count} samples`);
    }
  }
  
  // Log full payload structure for first metric of each type
  if (payload.data && Array.isArray(payload.data)) {
    const seen = new Set<string>();
    for (const metric of payload.data) {
      const name = metric.name || metric.type || "unknown";
      if (!seen.has(name)) {
        seen.add(name);
        alog(`Sample structure for "${name}":`, {
          name: metric.name,
          units: metric.units,
          dataCount: metric.data?.length || 0,
          firstDataPoint: metric.data?.[0] ? {
            keys: Object.keys(metric.data[0]),
            sample: metric.data[0]
          } : null
        });
      }
    }
  }
  
  alog("=== END WEBHOOK ===");
}
