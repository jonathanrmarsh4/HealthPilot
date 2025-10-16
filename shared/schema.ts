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
  personalContext: jsonb("personal_context"), // AI memories: personal details, motivations, life events, milestones, conversation highlights
  // Onboarding tracking - granular completion flags for contextual onboarding
  onboardingCompleted: integer("onboarding_completed").notNull().default(0), // 0 = false, 1 = true (for compatibility)
  onboardingStep: varchar("onboarding_step"), // Legacy field - kept for compatibility
  basicInfoComplete: integer("basic_info_complete").notNull().default(0), // Initial questions (age, height, weight, gender, activity)
  trainingSetupComplete: integer("training_setup_complete").notNull().default(0), // Fitness profile + training plan setup
  mealsSetupComplete: integer("meals_setup_complete").notNull().default(0), // Nutrition preferences + meal plan setup
  supplementsSetupComplete: integer("supplements_setup_complete").notNull().default(0), // Supplement recommendations received
  biomarkersSetupComplete: integer("biomarkers_setup_complete").notNull().default(0), // Blood work upload prompted
  onboardingStartedAt: timestamp("onboarding_started_at"),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  eulaAcceptedAt: timestamp("eula_accepted_at"),
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

export const nutritionProfiles = pgTable("nutrition_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  dietaryPreferences: text("dietary_preferences").array(), // 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'whole30', etc.
  allergies: text("allergies").array(), // 'dairy', 'gluten', 'nuts', 'soy', 'eggs', 'shellfish', etc.
  intolerances: text("intolerances").array(), // 'lactose', 'gluten', 'fructose', etc.
  cuisinePreferences: text("cuisine_preferences").array(), // 'italian', 'asian', 'mexican', 'mediterranean', etc.
  dislikedFoods: text("disliked_foods").array(), // Specific foods user doesn't like
  calorieTarget: integer("calorie_target"), // Daily calorie goal
  proteinTarget: real("protein_target"), // Daily protein goal in grams
  carbsTarget: real("carbs_target"), // Daily carbs goal in grams
  fatTarget: real("fat_target"), // Daily fat goal in grams
  mealsPerDay: integer("meals_per_day").default(3), // How many meals per day
  snacksPerDay: integer("snacks_per_day").default(1), // How many snacks per day
  cookingSkillLevel: text("cooking_skill_level"), // 'beginner', 'intermediate', 'advanced'
  maxPrepTime: integer("max_prep_time"), // Maximum prep time willing to spend (minutes)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  // Spoonacular-specific fields
  spoonacularRecipeId: integer("spoonacular_recipe_id"), // ID from Spoonacular API
  sourceUrl: text("source_url"), // Original recipe source URL
  readyInMinutes: integer("ready_in_minutes"), // Total time to make
  healthScore: real("health_score"), // Spoonacular health score (0-100)
  dishTypes: text("dish_types").array(), // 'breakfast', 'main course', 'dessert', etc.
  diets: text("diets").array(), // 'vegetarian', 'vegan', 'gluten free', etc.
  cuisines: text("cuisines").array(), // 'italian', 'asian', etc.
  extendedIngredients: jsonb("extended_ingredients"), // Full ingredient details from Spoonacular
  analyzedInstructions: jsonb("analyzed_instructions"), // Structured cooking steps
  nutritionData: jsonb("nutrition_data"), // Full nutrition breakdown from Spoonacular
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userFeedback: text("user_feedback"), // "liked" or "disliked"
  feedbackAt: timestamp("feedback_at"), // When user gave feedback
});

export const favoriteRecipes = pgTable("favorite_recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  spoonacularRecipeId: integer("spoonacular_recipe_id").notNull(),
  recipeName: text("recipe_name").notNull(),
  imageUrl: text("image_url"),
  readyInMinutes: integer("ready_in_minutes"),
  servings: integer("servings"),
  recipeData: jsonb("recipe_data"), // Store full recipe for quick access
  notes: text("notes"), // User's personal notes about this recipe
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
  coreProgram: integer("core_program").notNull().default(0), // 1 if this is essential to user's goals
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
  scheduledAt: timestamp("scheduled_at"),
  trainingScheduleId: varchar("training_schedule_id"),
  userFeedback: text("user_feedback"),
  dismissReason: text("dismiss_reason"),
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

export const readinessScores = pgTable("readiness_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  date: timestamp("date").notNull(), // Date this score is for
  score: real("score").notNull(), // 0-100 (allows decimal precision)
  quality: text("quality").notNull(), // 'excellent', 'good', 'fair', 'poor'
  recommendation: text("recommendation").notNull(), // 'ready', 'caution', 'rest'
  reasoning: text("reasoning").notNull(),
  sleepScore: real("sleep_score"), // Allows decimal precision
  sleepValue: real("sleep_value"), // hours
  hrvScore: real("hrv_score"), // Allows decimal precision
  hrvValue: real("hrv_value"), // ms
  restingHRScore: real("resting_hr_score"), // Allows decimal precision
  restingHRValue: real("resting_hr_value"), // bpm
  workloadScore: real("workload_score"), // Allows decimal precision
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const readinessSettings = pgTable("readiness_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // One setting per user
  sleepWeight: real("sleep_weight").notNull().default(0.40), // Default 40%
  hrvWeight: real("hrv_weight").notNull().default(0.30), // Default 30%
  restingHRWeight: real("resting_hr_weight").notNull().default(0.15), // Default 15%
  workloadWeight: real("workload_weight").notNull().default(0.15), // Default 15%
  alertThreshold: real("alert_threshold").notNull().default(50), // Alert when score < threshold
  alertsEnabled: integer("alerts_enabled").notNull().default(1), // 1 = enabled, 0 = disabled
  // Personal Baselines - user's typical values when well-rested
  usePersonalBaselines: integer("use_personal_baselines").notNull().default(0), // 1 = enabled, 0 = disabled
  personalHrvBaseline: real("personal_hrv_baseline"), // User's typical HRV in ms when well-rested
  personalRestingHrBaseline: real("personal_resting_hr_baseline"), // User's typical resting HR in bpm
  personalSleepHoursBaseline: real("personal_sleep_hours_baseline"), // User's typical sleep hours
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const fitnessProfiles = pgTable("fitness_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // One profile per user
  
  // Fitness Level & Experience
  fitnessLevel: varchar("fitness_level").notNull().default("intermediate"), // 'beginner', 'intermediate', 'advanced', 'athlete', 'elite'
  trainingExperience: integer("training_experience"), // years of training
  currentTrainingFrequency: integer("current_training_frequency"), // days per week
  
  // Equipment Access
  hasGymAccess: integer("has_gym_access").notNull().default(0), // 1 = yes, 0 = no
  gymType: varchar("gym_type"), // 'commercial', 'crossfit', 'powerlifting', 'boutique', 'home', 'other'
  homeEquipment: text("home_equipment").array(), // ['dumbbells', 'barbell', 'rack', 'bench', 'bands', 'kettlebells', etc.]
  
  // Facilities & Memberships
  specialFacilities: text("special_facilities").array(), // ['crossfit_box', 'pool', 'track', 'climbing_gym', etc.]
  recoveryEquipment: text("recovery_equipment").array(), // ['sauna', 'cold_plunge', 'massage_gun', 'foam_roller', etc.]
  
  // Goals & Preferences
  primaryGoal: varchar("primary_goal"), // 'strength', 'endurance', 'weight_loss', 'muscle_gain', 'performance', 'general_fitness'
  secondaryGoals: text("secondary_goals").array(), // additional goals
  preferredWorkoutTypes: text("preferred_workout_types").array(), // ['strength', 'hiit', 'cardio', 'yoga', 'crossfit', etc.]
  preferredDuration: integer("preferred_duration"), // minutes per workout
  preferredIntensity: varchar("preferred_intensity"), // 'low', 'moderate', 'high', 'variable'
  availableDays: text("available_days").array(), // ['Monday', 'Tuesday', etc.]
  
  // Health & Limitations
  injuries: text("injuries").array(), // list of current or past injuries
  limitations: text("limitations").array(), // movement restrictions or considerations
  medicalConditions: text("medical_conditions").array(), // relevant health conditions
  
  // Additional Context
  notes: text("notes"), // any additional information
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const exerciseFeedback = pgTable("exercise_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  feedback: text("feedback").notNull(), // 'up' or 'down'
  context: jsonb("context"), // stores readiness score, workout plan type, date, etc.
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

export const aiActions = pgTable("ai_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  actionType: text("action_type").notNull(), // 'UPDATE_GOAL', 'CREATE_GOAL', 'UPDATE_BIOMARKER', 'DELETE_BIOMARKER', 'ARCHIVE_RECORD', etc.
  targetTable: text("target_table").notNull(), // 'goals', 'biomarkers', 'health_records', etc.
  targetId: varchar("target_id"), // ID of the record that was modified/created
  changesBefore: jsonb("changes_before"), // State before the change (for updates/deletes)
  changesAfter: jsonb("changes_after"), // State after the change (for creates/updates)
  reasoning: text("reasoning").notNull(), // AI's explanation of why it made this change
  conversationContext: text("conversation_context"), // The user message that triggered this action
  success: integer("success").notNull().default(1), // 1 if successful, 0 if failed
  errorMessage: text("error_message"), // Error details if failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHealthRecordSchema = createInsertSchema(healthRecords).omit({
  id: true,
  uploadedAt: true,
});

export const insertBiomarkerSchema = createInsertSchema(biomarkers).omit({
  id: true,
}).extend({
  recordedAt: z.coerce.date().optional().default(() => new Date()),
});

export const insertNutritionProfileSchema = createInsertSchema(nutritionProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

export const insertFavoriteRecipeSchema = createInsertSchema(favoriteRecipes).omit({
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

export const insertReadinessScoreSchema = createInsertSchema(readinessScores).omit({
  id: true,
  createdAt: true,
});

export const insertReadinessSettingsSchema = createInsertSchema(readinessSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFitnessProfileSchema = createInsertSchema(fitnessProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertAiActionSchema = createInsertSchema(aiActions).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseFeedbackSchema = createInsertSchema(exerciseFeedback).omit({
  id: true,
  createdAt: true,
});

export const recoveryProtocols = pgTable("recovery_protocols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'mobility', 'mindfulness', 'nutrition', 'cold_therapy', 'heat_therapy', 'breathing', 'sleep_hygiene'
  description: text("description").notNull(),
  duration: integer("duration"), // in minutes
  difficulty: text("difficulty").notNull(), // 'beginner', 'intermediate', 'advanced'
  benefits: text("benefits").array(), // List of benefits
  instructions: text("instructions"), // How to do it
  targetFactors: text("target_factors").array(), // Which readiness factors this helps: 'sleep', 'hrv', 'resting_hr', 'workload'
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userProtocolPreferences = pgTable("user_protocol_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  protocolId: varchar("protocol_id").notNull(),
  preference: text("preference").notNull(), // 'upvote', 'downvote', 'neutral'
  context: jsonb("context"), // Stores readiness score, factors, etc when voted
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRecoveryProtocolSchema = createInsertSchema(recoveryProtocols).omit({
  id: true,
  createdAt: true,
});

export const insertUserProtocolPreferenceSchema = createInsertSchema(userProtocolPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Supplements table - user's current supplement stack
export const supplements = pgTable("supplements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(), // e.g., "5000 IU", "500mg"
  timing: text("timing").notNull(), // 'morning', 'pre_workout', 'post_workout', 'evening', 'with_meal'
  purpose: text("purpose"), // Why they're taking it
  active: integer("active").notNull().default(1), // 1 if currently taking, 0 if discontinued
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Daily reminders table - recurring health reminders
export const dailyReminders = pgTable("daily_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // 'supplement', 'nutrition', 'biomarker', 'recovery', 'hydration'
  title: text("title").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("daily"), // 'daily', 'weekly', 'after_workout'
  timeOfDay: text("time_of_day"), // 'morning', 'afternoon', 'evening', 'any'
  linkedRecordId: varchar("linked_record_id"), // ID of related supplement/biomarker/etc
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Reminder completions table - tracks adherence
export const reminderCompletions = pgTable("reminder_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reminderId: varchar("reminder_id").notNull(),
  userId: varchar("user_id").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  date: text("date").notNull(), // YYYY-MM-DD format for daily tracking
});

// Supplement recommendations table - AI-suggested supplements
export const supplementRecommendations = pgTable("supplement_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  supplementName: text("supplement_name").notNull(),
  dosage: text("dosage").notNull(),
  reason: text("reason").notNull(), // AI explanation
  biomarkerLinked: text("biomarker_linked"), // Which biomarker triggered this
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined'
  recommendedAt: timestamp("recommended_at").notNull().defaultNow(),
});

// Scheduled Exercise Recommendations - AI-suggested exercises with smart scheduling
export const scheduledExerciseRecommendations = pgTable("scheduled_exercise_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  exerciseType: text("exercise_type").notNull(), // 'mobility', 'stretching', 'core', 'cardio', 'recovery', etc.
  description: text("description").notNull(),
  duration: integer("duration"), // in minutes
  frequency: text("frequency").notNull(), // 'daily', '3x_week', '5x_week', 'specific_day'
  recommendedBy: text("recommended_by").notNull().default("ai"), // 'ai' or 'user'
  reason: text("reason").notNull(), // AI explanation for why this exercise was recommended
  isSupplementary: integer("is_supplementary").notNull().default(1), // 1 = supplementary (won't override core workouts), 0 = can be core
  status: text("status").notNull().default("pending"), // 'pending', 'scheduled', 'declined', 'completed'
  scheduledDates: text("scheduled_dates").array(), // Array of ISO date strings when this is scheduled
  userFeedback: text("user_feedback"), // 'accepted_auto', 'accepted_manual', 'declined'
  declineReason: text("decline_reason"),
  recommendedAt: timestamp("recommended_at").notNull().defaultNow(),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
});

// Scheduled Insights - AI insights with smart recurring scheduling (sauna, meditation, etc.)
export const scheduledInsights = pgTable("scheduled_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  insightId: varchar("insight_id"), // Reference to original insight if applicable
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'recovery', 'wellness', 'nutrition', 'training', etc.
  activityType: text("activity_type").notNull(), // 'sauna', 'meditation', 'ice_bath', 'stretching', 'mobility', etc.
  duration: integer("duration"), // in minutes
  frequency: text("frequency").notNull(), // 'daily', 'after_workout', '3x_week', '5x_week', 'specific_day', 'one_time'
  contextTrigger: text("context_trigger"), // 'after_workout', 'morning', 'evening', 'before_bed', null for scheduled times
  recommendedBy: text("recommended_by").notNull().default("ai"), // 'ai' or 'user'
  reason: text("reason"), // AI explanation for why this was recommended
  priority: text("priority").notNull().default("medium"), // 'high', 'medium', 'low'
  status: text("status").notNull().default("pending"), // 'pending', 'scheduled', 'active', 'declined', 'completed'
  scheduledDates: text("scheduled_dates").array(), // Array of ISO date strings when this is scheduled
  userFeedback: text("user_feedback"), // 'thumbs_up', 'thumbs_down', null
  feedbackNote: text("feedback_note"), // Optional note from user about why they liked/disliked
  recommendedAt: timestamp("recommended_at").notNull().defaultNow(),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
});

// Insight Feedback - Track user feedback on AI insights
export const insightFeedback = pgTable("insight_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  insightId: varchar("insight_id").notNull(), // Reference to insights table
  feedback: text("feedback").notNull(), // 'thumbs_up' or 'thumbs_down'
  context: jsonb("context"), // stores additional context like category, priority, date, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Meal Library - Admin-managed recipe database for cost optimization
export const mealLibrary = pgTable("meal_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  spoonacularRecipeId: integer("spoonacular_recipe_id").unique(), // Original Spoonacular ID
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  sourceUrl: text("source_url"),
  readyInMinutes: integer("ready_in_minutes"),
  servings: integer("servings").default(1),
  // Nutrition
  calories: integer("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  // Recipe details
  ingredients: jsonb("ingredients"), // Array of ingredient objects
  instructions: text("instructions"),
  extendedIngredients: jsonb("extended_ingredients"),
  // Diversity & categorization
  cuisines: text("cuisines").array(), // 'italian', 'asian', 'mexican', etc.
  dishTypes: text("dish_types").array(), // 'breakfast', 'main course', 'dessert', etc.
  diets: text("diets").array(), // 'vegetarian', 'vegan', 'gluten free', etc.
  mealTypes: text("meal_types").array(), // 'breakfast', 'lunch', 'dinner', 'snack'
  difficulty: text("difficulty"), // 'easy', 'medium', 'hard'
  // Performance metrics
  totalServed: integer("total_served").notNull().default(0), // How many times shown to users
  thumbsUpCount: integer("thumbs_up_count").notNull().default(0),
  thumbsDownCount: integer("thumbs_down_count").notNull().default(0),
  conversionRate: real("conversion_rate").default(0), // thumbsUpCount / totalServed
  // Status
  status: text("status").notNull().default("active"), // 'active', 'flagged_for_deletion', 'replaced'
  flaggedAt: timestamp("flagged_at"),
  replacedAt: timestamp("replaced_at"),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Meal Feedback - Track user feedback on library meals
export const mealFeedback = pgTable("meal_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  mealLibraryId: varchar("meal_library_id").notNull(), // Reference to meal_library
  feedback: text("feedback").notNull(), // 'thumbs_up' or 'thumbs_down'
  // Track premium status at time of feedback (for deletion protection)
  userWasPremium: integer("user_was_premium").notNull().default(0), // 0 = false, 1 = true
  notes: text("notes"), // Optional user notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Meal Library Settings - Admin configuration for library management
export const mealLibrarySettings = pgTable("meal_library_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Admin user who set these
  librarySizeTarget: integer("library_size_target").notNull().default(100), // Target library size
  deletionThreshold: real("deletion_threshold").notNull().default(0.40), // 40% thumbs down = deletion
  replacementFrequency: text("replacement_frequency").notNull().default("monthly"), // 'weekly', 'monthly', 'manual'
  lastReplacementRun: timestamp("last_replacement_run"),
  nextReplacementRun: timestamp("next_replacement_run"),
  autoReplaceEnabled: integer("auto_replace_enabled").notNull().default(1), // 0 = false, 1 = true
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSupplementSchema = createInsertSchema(supplements).omit({
  id: true,
  createdAt: true,
});

export const insertDailyReminderSchema = createInsertSchema(dailyReminders).omit({
  id: true,
  createdAt: true,
});

export const insertReminderCompletionSchema = createInsertSchema(reminderCompletions).omit({
  id: true,
  completedAt: true,
});

export const insertSupplementRecommendationSchema = createInsertSchema(supplementRecommendations).omit({
  id: true,
  recommendedAt: true,
});

export const insertScheduledExerciseRecommendationSchema = createInsertSchema(scheduledExerciseRecommendations).omit({
  id: true,
  recommendedAt: true,
  scheduledAt: true,
  completedAt: true,
});

export const insertScheduledInsightSchema = createInsertSchema(scheduledInsights).omit({
  id: true,
  recommendedAt: true,
  scheduledAt: true,
  completedAt: true,
});

export const insertInsightFeedbackSchema = createInsertSchema(insightFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertMealLibrarySchema = createInsertSchema(mealLibrary).omit({
  id: true,
  importedAt: true,
  updatedAt: true,
});

export const insertMealFeedbackSchema = createInsertSchema(mealFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertMealLibrarySettingsSchema = createInsertSchema(mealLibrarySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;
export type HealthRecord = typeof healthRecords.$inferSelect;

export type InsertBiomarker = z.infer<typeof insertBiomarkerSchema>;
export type Biomarker = typeof biomarkers.$inferSelect;

export type InsertNutritionProfile = z.infer<typeof insertNutritionProfileSchema>;
export type NutritionProfile = typeof nutritionProfiles.$inferSelect;

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

export type InsertFavoriteRecipe = z.infer<typeof insertFavoriteRecipeSchema>;
export type FavoriteRecipe = typeof favoriteRecipes.$inferSelect;

export type InsertTrainingSchedule = z.infer<typeof insertTrainingScheduleSchema>;
export type TrainingSchedule = typeof trainingSchedules.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertSleepSession = z.infer<typeof insertSleepSessionSchema>;
export type SleepSession = typeof sleepSessions.$inferSelect;

export type InsertReadinessScore = z.infer<typeof insertReadinessScoreSchema>;
export type ReadinessScore = typeof readinessScores.$inferSelect;

export type InsertReadinessSettings = z.infer<typeof insertReadinessSettingsSchema>;
export type ReadinessSettings = typeof readinessSettings.$inferSelect;

export type InsertFitnessProfile = z.infer<typeof insertFitnessProfileSchema>;
export type FitnessProfile = typeof fitnessProfiles.$inferSelect;

export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insights.$inferSelect;

export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;

export type InsertExerciseLog = z.infer<typeof insertExerciseLogSchema>;
export type ExerciseLog = typeof exerciseLogs.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export type InsertAiAction = z.infer<typeof insertAiActionSchema>;
export type AiAction = typeof aiActions.$inferSelect;

export type InsertExerciseFeedback = z.infer<typeof insertExerciseFeedbackSchema>;
export type ExerciseFeedback = typeof exerciseFeedback.$inferSelect;

export type InsertRecoveryProtocol = z.infer<typeof insertRecoveryProtocolSchema>;
export type RecoveryProtocol = typeof recoveryProtocols.$inferSelect;

export type InsertUserProtocolPreference = z.infer<typeof insertUserProtocolPreferenceSchema>;
export type UserProtocolPreference = typeof userProtocolPreferences.$inferSelect;

export type InsertSupplement = z.infer<typeof insertSupplementSchema>;
export type Supplement = typeof supplements.$inferSelect;

export type InsertDailyReminder = z.infer<typeof insertDailyReminderSchema>;
export type DailyReminder = typeof dailyReminders.$inferSelect;

export type InsertReminderCompletion = z.infer<typeof insertReminderCompletionSchema>;
export type ReminderCompletion = typeof reminderCompletions.$inferSelect;

export type InsertSupplementRecommendation = z.infer<typeof insertSupplementRecommendationSchema>;
export type SupplementRecommendation = typeof supplementRecommendations.$inferSelect;

export type InsertScheduledExerciseRecommendation = z.infer<typeof insertScheduledExerciseRecommendationSchema>;
export type ScheduledExerciseRecommendation = typeof scheduledExerciseRecommendations.$inferSelect;

export type InsertScheduledInsight = z.infer<typeof insertScheduledInsightSchema>;
export type ScheduledInsight = typeof scheduledInsights.$inferSelect;

export type InsertInsightFeedback = z.infer<typeof insertInsightFeedbackSchema>;
export type InsightFeedback = typeof insightFeedback.$inferSelect;

export type InsertMealLibrary = z.infer<typeof insertMealLibrarySchema>;
export type MealLibrary = typeof mealLibrary.$inferSelect;

export type InsertMealFeedback = z.infer<typeof insertMealFeedbackSchema>;
export type MealFeedback = typeof mealFeedback.$inferSelect;

export type InsertMealLibrarySettings = z.infer<typeof insertMealLibrarySettingsSchema>;
export type MealLibrarySettings = typeof mealLibrarySettings.$inferSelect;

// Message usage tracking for free tier limits
export const messageUsage = pgTable("message_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  messageDate: timestamp("message_date").notNull().defaultNow(), // Date of message (for daily counting)
  messageCount: integer("message_count").notNull().default(1), // Number of messages sent on this date
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMessageUsageSchema = createInsertSchema(messageUsage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMessageUsage = z.infer<typeof insertMessageUsageSchema>;
export type MessageUsage = typeof messageUsage.$inferSelect;
