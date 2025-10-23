/**
 * Configuration for Dynamic Insights Engine
 */

export interface InsightsConfig {
  /** Force dynamic discovery across all metric types */
  includeAll: boolean;
  
  /** Auto-register unseen metrics from hk_events_raw */
  dynamicDiscovery: boolean;
  
  /** Maximum insights to render per day */
  maxPerDay: number;
  
  /** Maximum insights per metric family */
  topKPerFamily: number;
  
  /** Enable verbose debug logging */
  debug: boolean;
}

export function loadInsightsConfig(): InsightsConfig {
  return {
    includeAll: process.env.INSIGHTS_INCLUDE_ALL === "1",
    dynamicDiscovery: process.env.INSIGHTS_DYNAMIC_DISCOVERY === "1",
    maxPerDay: parseInt(process.env.INSIGHTS_MAX_PER_DAY || "12", 10),
    topKPerFamily: parseInt(process.env.INSIGHTS_TOPK_PER_FAMILY || "3", 10),
    debug: process.env.INSIGHTS_DEBUG === "1"
  };
}

export const config = loadInsightsConfig();
