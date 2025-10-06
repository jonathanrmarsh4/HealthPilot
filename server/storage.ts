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
  users,
  healthRecords,
  biomarkers,
  mealPlans,
  trainingSchedules,
  recommendations,
  chatMessages,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  getHealthRecords(userId: string): Promise<HealthRecord[]>;
  getHealthRecord(id: string): Promise<HealthRecord | undefined>;
  updateHealthRecord(id: string, data: Partial<HealthRecord>): Promise<HealthRecord>;
  deleteHealthRecord(id: string): Promise<void>;
  
  createBiomarker(biomarker: InsertBiomarker): Promise<Biomarker>;
  getBiomarkers(userId: string, type?: string): Promise<Biomarker[]>;
  getBiomarkersByTimeRange(userId: string, type: string, startDate: Date, endDate: Date): Promise<Biomarker[]>;
  
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getMealPlans(userId: string): Promise<MealPlan[]>;
  
  createTrainingSchedule(schedule: InsertTrainingSchedule): Promise<TrainingSchedule>;
  getTrainingSchedules(userId: string): Promise<TrainingSchedule[]>;
  updateTrainingSchedule(id: string, data: Partial<TrainingSchedule>): Promise<TrainingSchedule>;
  
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  getRecommendations(userId: string): Promise<Recommendation[]>;
  dismissRecommendation(id: string): Promise<void>;
  
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  clearChatHistory(userId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
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

  async getHealthRecord(id: string): Promise<HealthRecord | undefined> {
    const result = await db.select().from(healthRecords).where(eq(healthRecords.id, id));
    return result[0];
  }

  async getHealthRecordByFileId(fileId: string): Promise<HealthRecord | undefined> {
    const result = await db.select().from(healthRecords).where(eq(healthRecords.fileId, fileId));
    return result[0];
  }

  async updateHealthRecord(id: string, data: Partial<HealthRecord>): Promise<HealthRecord> {
    const result = await db
      .update(healthRecords)
      .set(data)
      .where(eq(healthRecords.id, id))
      .returning();
    return result[0];
  }

  async deleteHealthRecord(id: string): Promise<void> {
    // Delete associated biomarkers first
    await db.delete(biomarkers).where(eq(biomarkers.recordId, id));
    // Then delete the health record
    await db.delete(healthRecords).where(eq(healthRecords.id, id));
  }

  async createBiomarker(biomarker: InsertBiomarker): Promise<Biomarker> {
    const result = await db.insert(biomarkers).values(biomarker).returning();
    return result[0];
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

  async updateTrainingSchedule(id: string, data: Partial<TrainingSchedule>): Promise<TrainingSchedule> {
    const result = await db
      .update(trainingSchedules)
      .set(data)
      .where(eq(trainingSchedules.id, id))
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

  async dismissRecommendation(id: string): Promise<void> {
    await db
      .update(recommendations)
      .set({ dismissed: 1 })
      .where(eq(recommendations.id, id));
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
}

export const storage = new DbStorage();
