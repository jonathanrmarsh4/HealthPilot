import { db } from "../db";
import { 
  telemetryJobEvents, 
  telemetryLlmEvents, 
  costUserDaily, 
  costGlobalDaily,
  InsertTelemetryJobEvent,
  InsertTelemetryLlmEvent,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

// Cost constants (per unit)
const COST_CPU_MS = parseFloat(process.env.COST_CPU_MS || "0.00000002");
const COST_DB_ROW_1K = parseFloat(process.env.COST_DB_ROW_1K || "0.0005");
const COST_LLM_INPUT_TOKEN = parseFloat(process.env.COST_LLM_INPUT_TOKEN || "0.00000015");
const COST_LLM_OUTPUT_TOKEN = parseFloat(process.env.COST_LLM_OUTPUT_TOKEN || "0.0000006");

interface JobContext {
  userId: string;
  tier: string;
  domain: string;
  jobId?: string;
  jobType?: string;
}

interface JobResult {
  success: boolean;
  error?: Error;
  rowsRead?: number;
  rowsWritten?: number;
}

/**
 * Wraps an async job function with telemetry recording
 * Automatically tracks start time, duration, success/failure, and resource usage
 */
export async function withJobTelemetry<T>(
  jobName: string,
  context: JobContext,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const queuedAt = new Date();
  
  let success = false;
  let errorCode: string | undefined;
  let result: T;
  let rowsRead = 0;
  let rowsWritten = 0;

  try {
    result = await fn();
    success = true;
    
    // Extract metrics if result has them
    if (result && typeof result === 'object') {
      const r = result as JobResult;
      rowsRead = r.rowsRead || 0;
      rowsWritten = r.rowsWritten || 0;
    }
  } catch (error) {
    success = false;
    errorCode = error instanceof Error ? error.name : 'UnknownError';
    throw error;
  } finally {
    const finishedAt = new Date();
    const durationMs = Date.now() - startTime;
    
    // Estimate CPU time (rough approximation - real CPU time would need profiling)
    const cpuMs = Math.floor(durationMs * 0.8); // Assume 80% CPU utilization

    // Record job event
    try {
      await db.insert(telemetryJobEvents).values({
        jobId: context.jobId || `${jobName}-${Date.now()}`,
        jobType: context.jobType || jobName,
        userId: context.userId,
        tier: context.tier,
        domain: context.domain,
        queuedAt,
        startedAt: queuedAt,
        finishedAt,
        durationMs,
        queueWaitMs: 0, // No queue system yet
        success,
        errorCode,
        attempt: 1,
        rowsRead,
        rowsWritten,
        cpuMs,
        memMbPeak: 0, // Would need memory profiling
      });
    } catch (err) {
      console.error('[Telemetry] Failed to record job event:', err);
    }
  }

  return result;
}

interface LLMEvent {
  userId?: string; // Optional - defaults to 'system' if not provided
  tier?: string; // Optional - defaults to 'system' if not provided
  llmModel: string;
  contextType?: string; // Optional - defaults to 'ai_service' if not provided
  inputTokens: number;
  outputTokens: number;
  cacheHit?: boolean;
  durationMs?: number;
  success?: boolean;
  errorCode?: string;
}

/**
 * Records an LLM API call event for cost tracking
 * Supports optional userId, tier, and contextType - uses defaults when not provided
 */
export async function recordLLMEvent(event: LLMEvent): Promise<void> {
  try {
    await db.insert(telemetryLlmEvents).values({
      userId: event.userId || 'system',
      tier: event.tier || 'system',
      llmModel: event.llmModel,
      contextType: event.contextType || 'ai_service',
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      cacheHit: event.cacheHit || false,
      durationMs: event.durationMs,
      success: event.success !== false, // Default to true unless explicitly false
      errorCode: event.errorCode,
    });
  } catch (err) {
    console.error('[Telemetry] Failed to record LLM event:', err);
  }
}

/**
 * Rolls up telemetry events into daily cost aggregates
 * Should be run nightly to aggregate the previous day's data
 */
export async function rollupCostsForDate(date: Date): Promise<void> {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  
  console.log(`[Cost Rollup] Processing ${dateStr}...`);

  try {
    // Aggregate job events by user
    const jobAggregates = await db.execute<{
      user_id: string;
      tier: string;
      jobs: string;
      cpu_ms: string;
      rows_read: string;
      rows_written: string;
    }>(sql`
      SELECT 
        user_id,
        tier,
        COUNT(*)::text as jobs,
        COALESCE(SUM(cpu_ms), 0)::text as cpu_ms,
        COALESCE(SUM(rows_read), 0)::text as rows_read,
        COALESCE(SUM(rows_written), 0)::text as rows_written
      FROM telemetry_job_events
      WHERE DATE(started_at) = ${dateStr}
      AND success = true
      GROUP BY user_id, tier
    `);

    // Aggregate LLM events by user
    const llmAggregates = await db.execute<{
      user_id: string;
      tier: string;
      ai_calls: string;
      tokens_in: string;
      tokens_out: string;
    }>(sql`
      SELECT 
        user_id,
        tier,
        COUNT(*)::text as ai_calls,
        COALESCE(SUM(input_tokens), 0)::text as tokens_in,
        COALESCE(SUM(output_tokens), 0)::text as tokens_out
      FROM telemetry_llm_events
      WHERE DATE(created_at) = ${dateStr}
      AND success = true
      GROUP BY user_id, tier
    `);

    // Create a map of user data
    const userMap = new Map<string, {
      tier: string;
      jobs: number;
      aiCalls: number;
      cpuMs: number;
      tokensIn: number;
      tokensOut: number;
      rowsRead: number;
      rowsWritten: number;
    }>();

    // Merge job aggregates
    for (const row of jobAggregates.rows) {
      const key = row.user_id;
      const existing = userMap.get(key) || {
        tier: row.tier,
        jobs: 0,
        aiCalls: 0,
        cpuMs: 0,
        tokensIn: 0,
        tokensOut: 0,
        rowsRead: 0,
        rowsWritten: 0,
      };
      
      existing.jobs = parseInt(row.jobs);
      existing.cpuMs = parseInt(row.cpu_ms);
      existing.rowsRead = parseInt(row.rows_read);
      existing.rowsWritten = parseInt(row.rows_written);
      
      userMap.set(key, existing);
    }

    // Merge LLM aggregates
    for (const row of llmAggregates.rows) {
      const key = row.user_id;
      const existing = userMap.get(key) || {
        tier: row.tier,
        jobs: 0,
        aiCalls: 0,
        cpuMs: 0,
        tokensIn: 0,
        tokensOut: 0,
        rowsRead: 0,
        rowsWritten: 0,
      };
      
      existing.aiCalls = parseInt(row.ai_calls);
      existing.tokensIn = parseInt(row.tokens_in);
      existing.tokensOut = parseInt(row.tokens_out);
      
      userMap.set(key, existing);
    }

    // Calculate costs and upsert user daily records
    let globalJobs = 0;
    let globalAiCalls = 0;
    let globalCpuMs = 0;
    let globalTokensIn = 0;
    let globalTokensOut = 0;
    let globalCostUsd = 0;
    const tierBreakdown: Record<string, number> = {};

    for (const [userId, data] of userMap) {
      // Calculate cost for this user
      const cpuCost = (data.cpuMs * COST_CPU_MS);
      const dbCost = ((data.rowsRead + data.rowsWritten) / 1000) * COST_DB_ROW_1K;
      const llmCost = (data.tokensIn * COST_LLM_INPUT_TOKEN) + (data.tokensOut * COST_LLM_OUTPUT_TOKEN);
      const totalCost = cpuCost + dbCost + llmCost;

      // Upsert user daily record
      await db.insert(costUserDaily).values({
        userId,
        date: dateStr,
        tier: data.tier,
        jobs: data.jobs,
        aiCalls: data.aiCalls,
        cpuMs: data.cpuMs,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        costUsd: totalCost.toFixed(6),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [costUserDaily.userId, costUserDaily.date],
        set: {
          jobs: data.jobs,
          aiCalls: data.aiCalls,
          cpuMs: data.cpuMs,
          tokensIn: data.tokensIn,
          tokensOut: data.tokensOut,
          costUsd: totalCost.toFixed(6),
          updatedAt: new Date(),
        },
      });

      // Accumulate global totals
      globalJobs += data.jobs;
      globalAiCalls += data.aiCalls;
      globalCpuMs += data.cpuMs;
      globalTokensIn += data.tokensIn;
      globalTokensOut += data.tokensOut;
      globalCostUsd += totalCost;
      
      // Track tier breakdown
      tierBreakdown[data.tier] = (tierBreakdown[data.tier] || 0) + totalCost;
    }

    // Upsert global daily record
    await db.insert(costGlobalDaily).values({
      date: dateStr,
      jobs: globalJobs,
      aiCalls: globalAiCalls,
      cpuMs: globalCpuMs,
      tokensIn: globalTokensIn,
      tokensOut: globalTokensOut,
      costUsd: globalCostUsd.toFixed(6),
      tierBreakdownJson: tierBreakdown,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: costGlobalDaily.date,
      set: {
        jobs: globalJobs,
        aiCalls: globalAiCalls,
        cpuMs: globalCpuMs,
        tokensIn: globalTokensIn,
        tokensOut: globalTokensOut,
        costUsd: globalCostUsd.toFixed(6),
        tierBreakdownJson: tierBreakdown,
        updatedAt: new Date(),
      },
    });

    console.log(`[Cost Rollup] Completed ${dateStr}: ${userMap.size} users, $${globalCostUsd.toFixed(6)} total`);
  } catch (err) {
    console.error(`[Cost Rollup] Failed for ${dateStr}:`, err);
    throw err;
  }
}
