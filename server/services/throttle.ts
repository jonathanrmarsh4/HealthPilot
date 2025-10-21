import { db } from "../db";
import { costBudgets, telemetryJobEvents, telemetryLlmEvents } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// In-memory tracking of today's usage per tier
interface UsageTracker {
  date: string;
  cpuMs: number;
  jobs: number;
  tokensIn: number;
  tokensOut: number;
}

const tierUsage = new Map<string, UsageTracker>();

// In-memory budget cache (refreshed periodically)
interface BudgetLimits {
  dailyCpuMsCap: number;
  dailyJobsCap: number;
  llmInputTokensCap: number;
  llmOutputTokensCap: number;
  updatedAt: Date;
}

let globalBudget: BudgetLimits | null = null;
const tierBudgets = new Map<string, BudgetLimits>();
let lastBudgetRefresh = 0;
const BUDGET_REFRESH_INTERVAL = 60000; // Refresh every 60 seconds

/**
 * Loads budget caps from the database
 * Caches results for 60 seconds to reduce DB load
 */
async function loadBudgets(): Promise<void> {
  const now = Date.now();
  if (now - lastBudgetRefresh < BUDGET_REFRESH_INTERVAL) {
    return; // Use cached budgets
  }

  try {
    const budgets = await db.select().from(costBudgets);
    
    for (const budget of budgets) {
      const limits: BudgetLimits = {
        dailyCpuMsCap: Number(budget.dailyCpuMsCap),
        dailyJobsCap: budget.dailyJobsCap,
        llmInputTokensCap: Number(budget.llmInputTokensCap),
        llmOutputTokensCap: Number(budget.llmOutputTokensCap),
        updatedAt: budget.updatedAt || new Date(),
      };

      if (budget.applyScope === 'global') {
        globalBudget = limits;
      } else {
        tierBudgets.set(budget.applyScope, limits);
      }
    }

    lastBudgetRefresh = now;
    console.log('[Throttle] Loaded budgets:', {
      global: !!globalBudget,
      tiers: Array.from(tierBudgets.keys()),
    });
  } catch (err) {
    console.error('[Throttle] Failed to load budgets:', err);
  }
}

/**
 * Gets the current usage for a tier today
 * Returns in-memory tracker or creates a new one
 */
function getTierUsage(tier: string): UsageTracker {
  const today = new Date().toISOString().split('T')[0];
  const key = `${tier}:${today}`;
  
  let usage = tierUsage.get(key);
  if (!usage || usage.date !== today) {
    usage = {
      date: today,
      cpuMs: 0,
      jobs: 0,
      tokensIn: 0,
      tokensOut: 0,
    };
    tierUsage.set(key, usage);
    
    // Clean up old entries
    for (const [k, v] of tierUsage) {
      if (v.date !== today) {
        tierUsage.delete(k);
      }
    }
  }
  
  return usage;
}

/**
 * Refreshes usage from database for accurate tracking
 * Called periodically or when precision is needed
 */
async function refreshUsageFromDB(tier: string): Promise<UsageTracker> {
  const today = new Date().toISOString().split('T')[0];
  const usage = getTierUsage(tier);

  try {
    // Get job stats
    const jobStats = await db.execute<{
      jobs: string;
      cpu_ms: string;
    }>(sql`
      SELECT 
        COUNT(*)::text as jobs,
        COALESCE(SUM(cpu_ms), 0)::text as cpu_ms
      FROM telemetry_job_events
      WHERE tier = ${tier}
      AND DATE(started_at) = ${today}
    `);

    // Get LLM stats
    const llmStats = await db.execute<{
      tokens_in: string;
      tokens_out: string;
    }>(sql`
      SELECT 
        COALESCE(SUM(input_tokens), 0)::text as tokens_in,
        COALESCE(SUM(output_tokens), 0)::text as tokens_out
      FROM telemetry_llm_events
      WHERE tier = ${tier}
      AND DATE(created_at) = ${today}
    `);

    if (jobStats.rows.length > 0) {
      usage.jobs = parseInt(jobStats.rows[0].jobs);
      usage.cpuMs = parseInt(jobStats.rows[0].cpu_ms);
    }

    if (llmStats.rows.length > 0) {
      usage.tokensIn = parseInt(llmStats.rows[0].tokens_in);
      usage.tokensOut = parseInt(llmStats.rows[0].tokens_out);
    }

    return usage;
  } catch (err) {
    console.error('[Throttle] Failed to refresh usage from DB:', err);
    return usage;
  }
}

interface ThrottleRequest {
  tier: string;
  domain: string;
  estCpuMs?: number;
  estTokensIn?: number;
  estTokensOut?: number;
}

interface ThrottleResponse {
  allowed: boolean;
  reason?: string;
  deferMs?: number; // If not allowed, suggested defer time
}

/**
 * Checks if a job should be allowed or deferred based on budget caps
 * Returns true if allowed, false if over budget
 */
export async function checkBudgetAndMaybeDefer(
  request: ThrottleRequest
): Promise<ThrottleResponse> {
  // Load budgets (uses cache)
  await loadBudgets();

  // Get applicable budget (tier-specific or global fallback)
  const budget = tierBudgets.get(request.tier) || globalBudget;
  
  if (!budget) {
    // No budget configured, allow everything
    return { allowed: true };
  }

  // Get current usage
  const usage = getTierUsage(request.tier);

  // Check jobs cap
  if (usage.jobs >= budget.dailyJobsCap) {
    return {
      allowed: false,
      reason: `Daily jobs cap reached (${budget.dailyJobsCap})`,
      deferMs: getTimeUntilMidnight(),
    };
  }

  // Check CPU cap
  const estimatedCpuMs = request.estCpuMs || 1000; // Default estimate
  if (usage.cpuMs + estimatedCpuMs > budget.dailyCpuMsCap) {
    return {
      allowed: false,
      reason: `Daily CPU cap would be exceeded (${budget.dailyCpuMsCap}ms)`,
      deferMs: getTimeUntilMidnight(),
    };
  }

  // Check LLM token caps
  const estimatedTokensIn = request.estTokensIn || 0;
  const estimatedTokensOut = request.estTokensOut || 0;
  
  if (usage.tokensIn + estimatedTokensIn > budget.llmInputTokensCap) {
    return {
      allowed: false,
      reason: `Daily LLM input token cap would be exceeded (${budget.llmInputTokensCap})`,
      deferMs: getTimeUntilMidnight(),
    };
  }

  if (usage.tokensOut + estimatedTokensOut > budget.llmOutputTokensCap) {
    return {
      allowed: false,
      reason: `Daily LLM output token cap would be exceeded (${budget.llmOutputTokensCap})`,
      deferMs: getTimeUntilMidnight(),
    };
  }

  // All checks passed, increment usage
  usage.jobs += 1;
  usage.cpuMs += estimatedCpuMs;
  usage.tokensIn += estimatedTokensIn;
  usage.tokensOut += estimatedTokensOut;

  return { allowed: true };
}

/**
 * Records actual usage after a job completes
 * Adjusts the in-memory tracker based on actual vs estimated usage
 */
export function recordActualUsage(
  tier: string,
  actualCpuMs: number,
  actualTokensIn: number = 0,
  actualTokensOut: number = 0
): void {
  const usage = getTierUsage(tier);
  
  // Note: We already incremented estimates in checkBudgetAndMaybeDefer
  // Here we could adjust if we track both estimated and actual,
  // but for simplicity we'll just log it
  console.log('[Throttle] Actual usage recorded:', {
    tier,
    cpuMs: actualCpuMs,
    tokensIn: actualTokensIn,
    tokensOut: actualTokensOut,
  });
}

/**
 * Gets milliseconds until midnight (next budget reset)
 */
function getTimeUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

/**
 * Forces a refresh of usage from database
 * Useful for getting accurate counts before important decisions
 */
export async function refreshBudgetUsage(tier: string): Promise<UsageTracker> {
  return refreshUsageFromDB(tier);
}

/**
 * Gets current budget limits for a tier
 */
export async function getBudgetLimits(tier: string): Promise<BudgetLimits | null> {
  await loadBudgets();
  return tierBudgets.get(tier) || globalBudget;
}

/**
 * Manually sets a budget (used by admin endpoints)
 */
export function setBudgetCache(scope: string, limits: BudgetLimits): void {
  if (scope === 'global') {
    globalBudget = limits;
  } else {
    tierBudgets.set(scope, limits);
  }
  lastBudgetRefresh = Date.now();
}
