/**
 * Debug logging for insights engine
 */

export const INSIGHTS_DEBUG = process.env.INSIGHTS_DEBUG === "1";

export function ilog(...args: any[]) {
  if (INSIGHTS_DEBUG) {
    console.log("[INSIGHTS_DEBUG]", new Date().toISOString(), ...args);
  }
}

export function ilogSection(title: string) {
  if (INSIGHTS_DEBUG) {
    console.log("\n" + "=".repeat(80));
    console.log(`[INSIGHTS_DEBUG] ${title}`);
    console.log("=".repeat(80));
  }
}

export function ilogMetrics(metrics: string[]) {
  if (INSIGHTS_DEBUG) {
    console.log(`[INSIGHTS_DEBUG] Discovered ${metrics.length} metrics:`, metrics.join(", "));
  }
}

export function ilogInsight(insight: { id: string; title: string; score: number; family: string; metric: string; explain: string }) {
  if (INSIGHTS_DEBUG) {
    console.log(`[INSIGHTS_DEBUG] Insight fired:`, {
      id: insight.id,
      title: insight.title,
      score: insight.score.toFixed(3),
      family: insight.family,
      metric: insight.metric,
      explain: insight.explain
    });
  }
}
