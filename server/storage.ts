import { db } from "./db";
import { 
  type User, 
  type UpsertUser,
  type HealthRecord,
  type InsertHealthRecord,
  type Biomarker,
  type InsertBiomarker,
  type MealPlan,
  type InsertMealPlan,
  type TrainingSchedule,
  type InsertTrainingSchedule,
  type Recommendation,
  type InsertRecommendation,
  type ChatMessage,
  type InsertChatMessage,
  type SleepSession,
  type InsertSleepSession,
  users,
  healthRecords,
  biomarkers,
  mealPlans,
  trainingSchedules,
  recommendations,
  chatMessages,
  sleepSessions,
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, like, count } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserSettings(userId: string): Promise<{ timezone: string }>;
  updateUserSettings(userId: string, settings: { timezone: string }): Promise<void>;
  updateUserProfile(userId: string, profileData: Partial<Pick<User, "firstName" | "lastName" | "height" | "dateOfBirth" | "gender" | "bloodType" | "activityLevel" | "location">>): Promise<User>;
  
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  getHealthRecords(userId: string): Promise<HealthRecord[]>;
  getHealthRecord(id: string, userId: string): Promise<HealthRecord | undefined>;
  getHealthRecordByFileId(fileId: string, userId: string): Promise<HealthRecord | undefined>;
  updateHealthRecord(id: string, userId: string, data: Partial<HealthRecord>): Promise<HealthRecord | undefined>;
  deleteHealthRecord(id: string, userId: string): Promise<void>;
  
  createBiomarker(biomarker: InsertBiomarker): Promise<Biomarker>;
  upsertBiomarker(biomarker: InsertBiomarker): Promise<Biomarker>;
  getBiomarkers(userId: string, type?: string): Promise<Biomarker[]>;
  getBiomarkersByTimeRange(userId: string, type: string, startDate: Date, endDate: Date): Promise<Biomarker[]>;
  
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getMealPlans(userId: string): Promise<MealPlan[]>;
  
  createTrainingSchedule(schedule: InsertTrainingSchedule): Promise<TrainingSchedule>;
  getTrainingSchedules(userId: string): Promise<TrainingSchedule[]>;
  updateTrainingSchedule(id: string, userId: string, data: Partial<TrainingSchedule>): Promise<TrainingSchedule | undefined>;
  
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  getRecommendations(userId: string): Promise<Recommendation[]>;
  dismissRecommendation(id: string, userId: string): Promise<void>;
  
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  clearChatHistory(userId: string): Promise<void>;
  
  createSleepSession(session: InsertSleepSession): Promise<SleepSession>;
  upsertSleepSession(session: InsertSleepSession): Promise<SleepSession>;
  getSleepSessions(userId: string, startDate?: Date, endDate?: Date): Promise<SleepSession[]>;
  getLatestSleepSession(userId: string): Promise<SleepSession | undefined>;
  
  getAllUsers(limit: number, offset: number, search?: string): Promise<{ users: User[], total: number }>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserAdminFields(id: string, updates: { 
    role?: "user" | "admin"; 
    subscriptionTier?: "free" | "premium" | "enterprise";
    subscriptionStatus?: "active" | "inactive" | "cancelled" | "past_due";
  }): Promise<User>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
    enterpriseUsers: number;
    totalRecords: number;
    totalBiomarkers: number;
  }>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user exists by ID
    const existingById = await db.select().from(users).where(eq(users.id, userData.id));
    if (existingById.length > 0) {
      // Update existing user by ID
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    }
    
    // Check if user exists by email
    if (userData.email) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingByEmail.length > 0) {
        // Update existing user by email
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return user;
      }
    }
    
    // Insert new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getUserSettings(userId: string): Promise<{ timezone: string }> {
    // Use raw SQL to avoid schema mismatch issues
    const result = await db.execute(
      sql`SELECT timezone FROM users WHERE id = ${userId}`
    );
    const rows: any[] = result.rows || [];
    if (rows.length === 0) {
      return { timezone: "UTC" };
    }
    return { timezone: rows[0].timezone || "UTC" };
  }

  async updateUserSettings(userId: string, settings: { timezone: string }): Promise<void> {
    // Use raw SQL to avoid schema mismatch issues
    await db.execute(
      sql`UPDATE users SET timezone = ${settings.timezone} WHERE id = ${userId}`
    );
  }

  async updateUserProfile(userId: string, profileData: Partial<Pick<User, "firstName" | "lastName" | "height" | "dateOfBirth" | "gender" | "bloodType" | "activityLevel" | "location">>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    return user;
  }

  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    const result = await db.insert(healthRecords).values(record).returning();
    return result[0];
  }

  async getHealthRecords(userId: string): Promise<HealthRecord[]> {
    return await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.userId, userId))
      .orderBy(desc(healthRecords.uploadedAt));
  }

  async getHealthRecord(id: string, userId: string): Promise<HealthRecord | undefined> {
    const result = await db.select().from(healthRecords).where(
      and(eq(healthRecords.id, id), eq(healthRecords.userId, userId))
    );
    return result[0];
  }

  async getHealthRecordByFileId(fileId: string, userId: string): Promise<HealthRecord | undefined> {
    const result = await db.select().from(healthRecords).where(
      and(eq(healthRecords.fileId, fileId), eq(healthRecords.userId, userId))
    );
    return result[0];
  }

  async updateHealthRecord(id: string, userId: string, data: Partial<HealthRecord>): Promise<HealthRecord | undefined> {
    const result = await db
      .update(healthRecords)
      .set(data)
      .where(and(eq(healthRecords.id, id), eq(healthRecords.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteHealthRecord(id: string, userId: string): Promise<void> {
    // First verify the record exists and belongs to the user
    const record = await this.getHealthRecord(id, userId);
    if (!record) {
      return;
    }
    // Delete associated biomarkers first
    await db.delete(biomarkers).where(eq(biomarkers.recordId, id));
    // Then delete the health record
    await db.delete(healthRecords).where(
      and(eq(healthRecords.id, id), eq(healthRecords.userId, userId))
    );
  }

  async createBiomarker(biomarker: InsertBiomarker): Promise<Biomarker> {
    const result = await db.insert(biomarkers).values(biomarker).returning();
    return result[0];
  }

  async upsertBiomarker(biomarker: InsertBiomarker): Promise<Biomarker> {
    // Check if biomarker exists with same userId, type, value, recordedAt, and source
    const existing = await db
      .select()
      .from(biomarkers)
      .where(
        and(
          eq(biomarkers.userId, biomarker.userId),
          eq(biomarkers.type, biomarker.type),
          eq(biomarkers.recordedAt, biomarker.recordedAt),
          eq(biomarkers.source, biomarker.source)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing record
      const [updated] = await db
        .update(biomarkers)
        .set({ value: biomarker.value, unit: biomarker.unit })
        .where(eq(biomarkers.id, existing[0].id))
        .returning();
      return updated;
    }
    
    // Insert new record
    const [inserted] = await db.insert(biomarkers).values(biomarker).returning();
    return inserted;
  }

  async getBiomarkers(userId: string, type?: string): Promise<Biomarker[]> {
    if (type) {
      return await db
        .select()
        .from(biomarkers)
        .where(and(eq(biomarkers.userId, userId), eq(biomarkers.type, type)))
        .orderBy(desc(biomarkers.recordedAt));
    }
    return await db
      .select()
      .from(biomarkers)
      .where(eq(biomarkers.userId, userId))
      .orderBy(desc(biomarkers.recordedAt));
  }

  async getBiomarkersByTimeRange(
    userId: string,
    type: string,
    startDate: Date,
    endDate: Date
  ): Promise<Biomarker[]> {
    const result = await db
      .select()
      .from(biomarkers)
      .where(
        and(
          eq(biomarkers.userId, userId),
          eq(biomarkers.type, type)
        )
      )
      .orderBy(biomarkers.recordedAt);
    
    return result.filter(
      b => b.recordedAt >= startDate && b.recordedAt <= endDate
    );
  }

  async createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan> {
    const result = await db.insert(mealPlans).values(mealPlan).returning();
    return result[0];
  }

  async getMealPlans(userId: string): Promise<MealPlan[]> {
    return await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.userId, userId))
      .orderBy(desc(mealPlans.createdAt));
  }

  async createTrainingSchedule(schedule: InsertTrainingSchedule): Promise<TrainingSchedule> {
    const result = await db.insert(trainingSchedules).values(schedule).returning();
    return result[0];
  }

  async getTrainingSchedules(userId: string): Promise<TrainingSchedule[]> {
    return await db
      .select()
      .from(trainingSchedules)
      .where(eq(trainingSchedules.userId, userId))
      .orderBy(desc(trainingSchedules.createdAt));
  }

  async updateTrainingSchedule(id: string, userId: string, data: Partial<TrainingSchedule>): Promise<TrainingSchedule | undefined> {
    const result = await db
      .update(trainingSchedules)
      .set(data)
      .where(and(eq(trainingSchedules.id, id), eq(trainingSchedules.userId, userId)))
      .returning();
    return result[0];
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const result = await db.insert(recommendations).values(recommendation).returning();
    return result[0];
  }

  async getRecommendations(userId: string): Promise<Recommendation[]> {
    return await db
      .select()
      .from(recommendations)
      .where(and(eq(recommendations.userId, userId), eq(recommendations.dismissed, 0)))
      .orderBy(desc(recommendations.createdAt));
  }

  async dismissRecommendation(id: string, userId: string): Promise<void> {
    await db
      .update(recommendations)
      .set({ dismissed: 1 })
      .where(and(eq(recommendations.id, id), eq(recommendations.userId, userId)));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }

  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.createdAt);
  }

  async clearChatHistory(userId: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  }

  async createSleepSession(session: InsertSleepSession): Promise<SleepSession> {
    const result = await db.insert(sleepSessions).values(session).returning();
    return result[0];
  }

  async upsertSleepSession(session: InsertSleepSession): Promise<SleepSession> {
    // Better deduplication: check for any session on the same date (within 12 hours of bedtime)
    // This handles cases where timestamps differ slightly or calculation methods change
    const bedtimeStart = new Date(session.bedtime);
    bedtimeStart.setHours(bedtimeStart.getHours() - 6); // 6 hours before bedtime
    
    const bedtimeEnd = new Date(session.bedtime);
    bedtimeEnd.setHours(bedtimeEnd.getHours() + 6); // 6 hours after bedtime
    
    const existing = await db
      .select()
      .from(sleepSessions)
      .where(
        and(
          eq(sleepSessions.userId, session.userId),
          sql`${sleepSessions.bedtime} >= ${bedtimeStart.toISOString()}`,
          sql`${sleepSessions.bedtime} <= ${bedtimeEnd.toISOString()}`
        )
      )
      .orderBy(desc(sleepSessions.createdAt))
      .limit(1);

    if (existing.length > 0) {
      // Update existing session (keep the most recent one)
      const [updated] = await db
        .update(sleepSessions)
        .set(session)
        .where(eq(sleepSessions.id, existing[0].id))
        .returning();
      
      // Delete any other duplicates in the same time range
      await db
        .delete(sleepSessions)
        .where(
          and(
            eq(sleepSessions.userId, session.userId),
            sql`${sleepSessions.bedtime} >= ${bedtimeStart.toISOString()}`,
            sql`${sleepSessions.bedtime} <= ${bedtimeEnd.toISOString()}`,
            sql`${sleepSessions.id} != ${existing[0].id}`
          )
        );
      
      return updated;
    }

    // Insert new session
    const result = await db.insert(sleepSessions).values(session).returning();
    return result[0];
  }

  async getSleepSessions(userId: string, startDate?: Date, endDate?: Date): Promise<SleepSession[]> {
    let query = db
      .select()
      .from(sleepSessions)
      .where(eq(sleepSessions.userId, userId));

    if (startDate && endDate) {
      const result = await query.orderBy(desc(sleepSessions.bedtime));
      return result.filter(
        s => s.bedtime >= startDate && s.bedtime <= endDate
      );
    }

    return await query.orderBy(desc(sleepSessions.bedtime));
  }

  async getLatestSleepSession(userId: string): Promise<SleepSession | undefined> {
    const result = await db
      .select()
      .from(sleepSessions)
      .where(eq(sleepSessions.userId, userId))
      .orderBy(desc(sleepSessions.bedtime))
      .limit(1);
    return result[0];
  }

  async getAllUsers(limit: number, offset: number, search?: string): Promise<{ users: User[], total: number }> {
    let query = db.select().from(users);
    let countQuery = db.select({ count: count() }).from(users);

    if (search) {
      const searchCondition = or(
        like(users.email, `%${search}%`),
        like(users.firstName, `%${search}%`),
        like(users.lastName, `%${search}%`)
      );
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    const [usersResult, totalResult] = await Promise.all([
      query.orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      users: usersResult,
      total: totalResult[0]?.count || 0
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserAdminFields(id: string, updates: { 
    role?: "user" | "admin"; 
    subscriptionTier?: "free" | "premium" | "enterprise";
    subscriptionStatus?: "active" | "inactive" | "cancelled" | "past_due";
  }): Promise<User> {
    // Whitelist only admin-updatable fields at storage layer
    const allowedUpdates: Partial<User> = {};
    if (updates.role !== undefined) allowedUpdates.role = updates.role;
    if (updates.subscriptionTier !== undefined) allowedUpdates.subscriptionTier = updates.subscriptionTier;
    if (updates.subscriptionStatus !== undefined) allowedUpdates.subscriptionStatus = updates.subscriptionStatus;

    const result = await db
      .update(users)
      .set({ ...allowedUpdates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
    enterpriseUsers: number;
    totalRecords: number;
    totalBiomarkers: number;
  }> {
    const [
      totalUsersResult,
      activeUsersResult,
      premiumUsersResult,
      enterpriseUsersResult,
      totalRecordsResult,
      totalBiomarkersResult
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(users).where(eq(users.subscriptionStatus, 'active')),
      db.select({ count: count() }).from(users).where(eq(users.subscriptionTier, 'premium')),
      db.select({ count: count() }).from(users).where(eq(users.subscriptionTier, 'enterprise')),
      db.select({ count: count() }).from(healthRecords),
      db.select({ count: count() }).from(biomarkers)
    ]);

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      premiumUsers: premiumUsersResult[0]?.count || 0,
      enterpriseUsers: enterpriseUsersResult[0]?.count || 0,
      totalRecords: totalRecordsResult[0]?.count || 0,
      totalBiomarkers: totalBiomarkersResult[0]?.count || 0
    };
  }
}

export const storage = new DbStorage();
