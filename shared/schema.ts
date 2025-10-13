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
  dashboardPreferences: jsonb("dashboard_preferences"), // Widget visibility and order preferences
  // Onboarding tracking
  onboardingCompleted: integer("onboarding_completed").notNull().default(0), // 0 = false, 1 = true (for compatibility)
  onboardingStep: varchar("onboarding_step"), // Current step: 'welcome', 'apple_health', 'health_records', 'training_plan', 'meal_plan'
  onboardingStartedAt: timestamp("onboarding_started_at"),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
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
  detailedRecipe: text("detailed_recipe"), // Step-by-step cooking instructions
  ingredients: text("ingredients").array(), // List of ingredients with measurements
  servings: integer("servings").default(1), // Number of servings
  imageUrl: varchar("image_url"), // URL to meal photo
  scheduledDate: timestamp("scheduled_date"), // The date this meal is scheduled for
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trainingSchedules = pgTable("training_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  day: text("day").notNull(),
  workoutType: text("workout_type").notNull(),
  sessionType: text("session_type").notNull().default("workout"), // "workout", "sauna", "cold_plunge"
  duration: integer("duration").notNull(),
  intensity: text("intensity").notNull(),
  description: text("description"), // How this workout supports user's active goals
  exercises: jsonb("exercises").notNull(),
  isOptional: integer("is_optional").notNull().default(0), // 1 if optional recovery session
  scheduledFor: timestamp("scheduled_for"), // Specific date/time when user schedules recovery session
  completed: integer("completed").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  workoutType: text("workout_type").notNull(), // running, cycling, strength, hiit, yoga, swimming, sauna, cold_plunge, etc.
  sessionType: text("session_type").notNull().default("workout"), // "workout", "sauna", "cold_plunge"
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  distance: real("distance"), // in meters (for cardio)
  calories: integer("calories"),
  avgHeartRate: integer("avg_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  sourceType: text("source_type").notNull().default("manual"), // apple_health, manual, strava, etc.
  sourceId: text("source_id"), // external ID from source system
  trainingScheduleId: varchar("training_schedule_id"), // FK to training_schedules if matched
  notes: text("notes"),
  perceivedEffort: integer("perceived_effort"), // RPE scale 1-10
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exerciseLogs = pgTable("exercise_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutSessionId: varchar("workout_session_id").notNull(),
  userId: varchar("user_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  weight: real("weight"), // in kg
  restTime: integer("rest_time"), // in seconds
  personalRecord: integer("personal_record").notNull().default(0), // 1 if this is a PR
  notes: text("notes"),
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

export const insights = pgTable("insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // 'daily_summary', 'pattern', 'correlation', 'trend', 'alert'
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'sleep', 'activity', 'nutrition', 'biomarkers', 'overall'
  priority: text("priority").notNull().default("medium"), // 'high', 'medium', 'low'
  insightData: jsonb("insight_data"), // stores metrics, trends, correlations
  actionable: integer("actionable").notNull().default(1), // 1 if has actionable advice
  dismissed: integer("dismissed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  relevantDate: timestamp("relevant_date").notNull().defaultNow(), // date this insight is relevant to
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  metricType: text("metric_type").notNull(), // weight, body_fat, resting_hr, sleep_score, etc.
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value"),
  startValue: real("start_value"), // baseline when goal was created
  unit: text("unit").notNull(), // kg, %, bpm, etc.
  deadline: timestamp("deadline").notNull(),
  status: text("status").notNull().default("active"), // active, achieved, missed, abandoned
  notes: text("notes"),
  createdByAI: integer("created_by_ai").notNull().default(0), // 1 if created by AI, 0 if manual
  createdAt: timestamp("created_at").notNull().defaultNow(),
  achievedAt: timestamp("achieved_at"),
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

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseLogSchema = createInsertSchema(exerciseLogs).omit({
  id: true,
  createdAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  achievedAt: true,
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

export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insights.$inferSelect;

export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;

export type InsertExerciseLog = z.infer<typeof insertExerciseLogSchema>;
export type ExerciseLog = typeof exerciseLogs.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;
