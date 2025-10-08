import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().default(""),
  password: text("password").notNull().default(""),
  timezone: varchar("timezone").default("UTC"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // 'user' or 'admin'
  subscriptionTier: varchar("subscription_tier").notNull().default("free"), // 'free', 'premium', 'enterprise'
  subscriptionStatus: varchar("subscription_status").default("active"), // 'active', 'cancelled', 'past_due'
  stripeCustomerId: varchar("stripe_customer_id"),
  // Health profile fields
  height: real("height"), // in cm
  dateOfBirth: timestamp("date_of_birth"),
  gender: varchar("gender"), // 'male', 'female', 'other', 'prefer_not_to_say'
  bloodType: varchar("blood_type"), // 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  activityLevel: varchar("activity_level"), // 'sedentary', 'light', 'moderate', 'active', 'very_active'
  location: varchar("location"), // City, Country
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const healthRecords = pgTable("health_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  fileId: text("file_id"),
  fileUrl: text("file_url"),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
  aiAnalysis: jsonb("ai_analysis"),
  extractedData: jsonb("extracted_data"),
});

export const biomarkers = pgTable("biomarkers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  source: text("source").notNull().default("manual"),
  recordId: varchar("record_id"),
});

export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  mealType: text("meal_type").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  prepTime: integer("prep_time").notNull(),
  recipe: text("recipe"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trainingSchedules = pgTable("training_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  day: text("day").notNull(),
  workoutType: text("workout_type").notNull(),
  duration: integer("duration").notNull(),
  intensity: text("intensity").notNull(),
  exercises: jsonb("exercises").notNull(),
  completed: integer("completed").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  details: text("details"),
  actionLabel: text("action_label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  dismissed: integer("dismissed").notNull().default(0),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sleepSessions = pgTable("sleep_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  bedtime: timestamp("bedtime").notNull(),
  waketime: timestamp("waketime").notNull(),
  totalMinutes: integer("total_minutes").notNull(),
  awakeMinutes: integer("awake_minutes").default(0),
  lightMinutes: integer("light_minutes").default(0),
  deepMinutes: integer("deep_minutes").default(0),
  remMinutes: integer("rem_minutes").default(0),
  sleepScore: integer("sleep_score"),
  quality: text("quality"),
  source: text("source").notNull().default("apple-health"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHealthRecordSchema = createInsertSchema(healthRecords).omit({
  id: true,
  uploadedAt: true,
});

export const insertBiomarkerSchema = createInsertSchema(biomarkers).omit({
  id: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingScheduleSchema = createInsertSchema(trainingSchedules).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertSleepSessionSchema = createInsertSchema(sleepSessions).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;
export type HealthRecord = typeof healthRecords.$inferSelect;

export type InsertBiomarker = z.infer<typeof insertBiomarkerSchema>;
export type Biomarker = typeof biomarkers.$inferSelect;

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

export type InsertTrainingSchedule = z.infer<typeof insertTrainingScheduleSchema>;
export type TrainingSchedule = typeof trainingSchedules.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertSleepSession = z.infer<typeof insertSleepSessionSchema>;
export type SleepSession = typeof sleepSessions.$inferSelect;
