import { db } from "../db";
import { trainingSchedules, goalPlanSessions, goalPlans, trainingAvailabilities } from "@shared/schema";
import type { InsertTrainingSchedule, GoalPlan, GoalPlanSession, TrainingAvailability } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfDay, addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export interface ScheduleGoalPlanRequest {
  userId: string;
  goalPlanId: string;
  startDate: string;
  trainingDays: string[];
  timezone: string;
}

export interface ScheduledSession {
  date: string;
  session: GoalPlanSession;
  phaseContext: {
    phaseNumber: number;
    phaseName: string;
    weekNumber: number;
    weekLabel: string;
  };
}

export class GoalSchedulerService {
  async scheduleGoalPlan(request: ScheduleGoalPlanRequest): Promise<ScheduledSession[]> {
    const { userId, goalPlanId, startDate, trainingDays, timezone } = request;

    const [goalPlan, sessions] = await Promise.all([
      db.select().from(goalPlans).where(eq(goalPlans.id, goalPlanId)).limit(1).then(r => r[0]),
      db.select().from(goalPlanSessions).where(eq(goalPlanSessions.goalPlanId, goalPlanId))
    ]);

    if (!goalPlan || !sessions.length) {
      throw new Error("Goal plan or sessions not found");
    }

    if (goalPlan.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const orderedSessions = sessions.sort((a, b) => a.sessionOrder - b.sessionOrder);

    const startDateObj = parseISO(startDate);
    const scheduledSessions: ScheduledSession[] = [];
    const trainingDaySet = new Set(trainingDays.map(d => d.toLowerCase()));

    const newScheduleVersion = await this.getNextScheduleVersion(userId, goalPlanId);

    const scheduleEntries: InsertTrainingSchedule[] = [];
    let currentDate = startOfDay(startDateObj);
    let sessionIndex = 0;

    const maxIterations = 365;
    let iterations = 0;

    while (sessionIndex < orderedSessions.length && iterations < maxIterations) {
      iterations++;
      
      const dayName = format(currentDate, "EEEE").toLowerCase();

      if (trainingDaySet.has(dayName)) {
        const session = orderedSessions[sessionIndex];
        
        const phaseContext = this.extractPhaseContext(session);
        
        const dateInTimezone = formatInTimeZone(currentDate, timezone, "yyyy-MM-dd");

        const scheduleEntry: InsertTrainingSchedule = {
          userId,
          day: dayName,
          workoutType: session.focusArea || "Full Body",
          sessionType: "workout",
          duration: session.durationMinutes || 60,
          intensity: session.intensity || "moderate",
          description: session.description || "",
          exercises: session.exercises as any,
          isOptional: 0,
          coreProgram: 1,
          scheduledFor: currentDate,
          goalPlanSessionId: session.id,
          sourceGoalPlanId: goalPlanId,
          phaseContext: phaseContext as any,
          scheduledBy: "ai_chat",
          scheduleVersion: newScheduleVersion,
          isActive: 1,
          completed: 0,
        };

        scheduleEntries.push(scheduleEntry);

        scheduledSessions.push({
          date: dateInTimezone,
          session,
          phaseContext,
        });

        sessionIndex++;
      }

      currentDate = addDays(currentDate, 1);
    }

    if (sessionIndex < orderedSessions.length) {
      throw new Error(`Could not schedule all ${orderedSessions.length} sessions within 365 days. Only scheduled ${sessionIndex} sessions.`);
    }

    return db.transaction(async (tx) => {
      await tx
        .update(trainingSchedules)
        .set({ isActive: 0 })
        .where(and(
          eq(trainingSchedules.userId, userId),
          eq(trainingSchedules.sourceGoalPlanId, goalPlanId)
        ));

      if (scheduleEntries.length > 0) {
        await tx.insert(trainingSchedules).values(scheduleEntries);
      }

      return scheduledSessions;
    });
  }

  private extractPhaseContext(session: GoalPlanSession): {
    phaseNumber: number;
    phaseName: string;
    weekNumber: number;
    weekLabel: string;
  } {
    const phaseMatch = session.phaseLabel?.match(/Phase (\d+):\s*(.+)/);
    const weekMatch = session.weekLabel?.match(/Week (\d+)/);

    return {
      phaseNumber: phaseMatch ? parseInt(phaseMatch[1]) : 1,
      phaseName: phaseMatch ? phaseMatch[2] : session.phaseLabel || "Phase",
      weekNumber: weekMatch ? parseInt(weekMatch[1]) : 1,
      weekLabel: session.weekLabel || "Week 1",
    };
  }

  private async getNextScheduleVersion(userId: string, goalPlanId: string): Promise<number> {
    const existing = await db
      .select()
      .from(trainingSchedules)
      .where(and(
        eq(trainingSchedules.userId, userId),
        eq(trainingSchedules.sourceGoalPlanId, goalPlanId)
      ))
      .orderBy(trainingSchedules.scheduleVersion);

    if (!existing.length) {
      return 1;
    }

    const maxVersion = Math.max(...existing.map(s => s.scheduleVersion || 1));
    return maxVersion + 1;
  }

  async getScheduledSessions(userId: string, goalPlanId: string): Promise<any[]> {
    const result = await db
      .select()
      .from(trainingSchedules)
      .where(and(
        eq(trainingSchedules.userId, userId),
        eq(trainingSchedules.sourceGoalPlanId, goalPlanId),
        eq(trainingSchedules.isActive, 1)
      ))
      .orderBy(trainingSchedules.scheduledFor);

    return result;
  }

  async deleteScheduledSessions(userId: string, goalPlanId: string): Promise<void> {
    await db
      .update(trainingSchedules)
      .set({ isActive: 0 })
      .where(and(
        eq(trainingSchedules.userId, userId),
        eq(trainingSchedules.sourceGoalPlanId, goalPlanId)
      ));
  }
}

export const goalSchedulerService = new GoalSchedulerService();
