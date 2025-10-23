import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, real, jsonb, index, uniqueIndex, unique, serial, bigint, numeric, date, boolean, primaryKey } from "drizzle-orm/pg-core";
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
  referralCode: varchar("referral_code").unique(), // Unique referral code for this user
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
  // Privacy & Compliance fields
  consentGivenAt: timestamp("consent_given_at"),
  deletionScheduledAt: timestamp("deletion_scheduled_at"),
  // Medical report upload quota tracking
  medicalReportsUsedThisMonth: integer("medical_reports_used_this_month").notNull().default(0),
  medicalReportsMonthStart: timestamp("medical_reports_month_start").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Page tile preferences for customizable layouts across all pages
export const pageTilePreferences = pgTable("page_tile_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  page: varchar("page").notNull(), // 'dashboard', 'training', 'sleep', 'biomarkers', 'meal-plans', 'supplements', etc.
  visible: text("visible").array().notNull().default(sql`ARRAY[]::text[]`), // Array of visible tile IDs
  order: text("order").array().notNull().default(sql`ARRAY[]::text[]`), // Array of tile IDs in display order
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Ensure only one preference record per user per page
  userPageIdx: uniqueIndex("page_tile_preferences_user_page_idx").on(table.userId, table.page),
}));

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

export const medicalReports = pgTable("medical_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  filePath: text("file_path").notNull(), // Path to uploaded PDF/image
  fileName: text("file_name").notNull(), // Original filename
  reportType: text("report_type"), // Observation_Labs, Cardiac_ECG, DiagnosticReport_Imaging, etc. - null until classified
  sourceFormat: text("source_format").notNull(), // PDF, PDF_OCR, Image_OCR, FHIR_JSON, HL7, CSV, JSON, XML, DICOM, TXT
  rawDataJson: jsonb("raw_data_json"), // OCR/parsed text output
  interpretedDataJson: jsonb("interpreted_data_json"), // Full interpretation result matching spec schema.root
  status: text("status").notNull().default("pending"), // pending, processing, interpreted, discarded, failed
  confidenceScores: jsonb("confidence_scores"), // { type_detection, extraction, normalization, overall }
  userFeedback: text("user_feedback"), // Discard message if status=discarded
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"), // When interpretation completed
}, (table) => [
  index("medical_reports_user_id_idx").on(table.userId),
  index("medical_reports_status_idx").on(table.status),
  index("medical_reports_report_type_idx").on(table.reportType),
]);

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

// Universal HealthKit events warehouse - ALL incoming health data is stored here
// This ensures no data is ever lost, even for unsupported/unknown metric types
export const hkEventsRaw = pgTable("hk_events_raw", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // Normalized type name (e.g., blood_pressure, heart_rate)
  tsStartUtc: timestamp("ts_start_utc"), // For interval metrics (sleep, workouts)
  tsEndUtc: timestamp("ts_end_utc"), // For interval metrics
  tsInstantUtc: timestamp("ts_instant_utc"), // For instant metrics (BP, HR, weight)
  unit: text("unit"), // Original unit from source
  valueJson: jsonb("value_json").notNull(), // Complete original value object/number
  source: text("source").notNull().default("health-auto-export"), // Source system identifier
  idempotencyKey: text("idempotency_key").notNull(), // Hash for deduplication
  receivedAtUtc: timestamp("received_at_utc").notNull().defaultNow(), // When webhook received this
}, (table) => [
  uniqueIndex("hk_events_raw_idempotency_idx").on(table.userId, table.idempotencyKey),
  index("hk_events_raw_user_type_idx").on(table.userId, table.type),
  index("hk_events_raw_received_idx").on(table.receivedAtUtc),
]);

export const nutritionProfiles = pgTable("nutrition_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  dietaryPreferences: text("dietary_preferences").array(), // 'vegetarian', 'vegan', 'pescatarian', etc.
  allergies: text("allergies").array(), // 'dairy', 'gluten', 'nuts', 'soy', 'eggs', 'shellfish', etc.
  intolerances: text("intolerances").array(), // 'lactose', 'gluten', 'fructose', etc.
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
  // AI-driven meal curation fields
  aiReasoning: text("ai_reasoning"), // AI explanation for why this meal was recommended (e.g., "High protein to support muscle recovery")
  mealLibraryId: varchar("meal_library_id"), // Reference to meal_library table for feedback tracking
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

// Exercise library - standardized exercises with metadata
export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  muscles: text("muscles").array().notNull(), // ['chest', 'triceps', 'shoulders']
  target: text("target"), // Primary muscle group from ExerciseDB (e.g., 'pectorals', 'quads')
  bodyPart: text("body_part"), // Body region from ExerciseDB (e.g., 'chest', 'legs', 'back')
  equipment: text("equipment").notNull(), // 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'
  incrementStep: real("increment_step").notNull().default(2.5), // kg to increase by for progressive overload
  tempoDefault: text("tempo_default"), // e.g., "3-1-1" (eccentric-pause-concentric)
  restDefault: integer("rest_default").default(90), // default rest in seconds
  instructions: text("instructions"), // how to perform the exercise
  videoUrl: text("video_url"), // optional demo video
  difficulty: text("difficulty").default("intermediate"), // 'beginner', 'intermediate', 'advanced'
  category: text("category").notNull(), // 'compound', 'isolation', 'cardio', 'flexibility'
  trackingType: text("tracking_type").notNull().default("weight_reps"), // 'weight_reps', 'bodyweight_reps', 'distance_duration', 'duration_only'
  exercisedbId: text("exercisedb_id"), // Stable link to ExerciseDB exercise ID for GIF/instructions lookups
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Workout Instances - Immutable snapshots of exercises when "Start Workout" is clicked
// This ensures the exact exercises shown in recommendations are preserved throughout the workout
export const workoutInstances = pgTable("workout_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  workoutSessionId: varchar("workout_session_id"), // FK to workout session when workout is started
  workoutType: text("workout_type").notNull(), // e.g., "Upper Body Strength", "Full Body HIIT"
  sourceType: text("source_type").notNull().default("daily_recommendation"), // 'daily_recommendation', 'training_schedule', 'manual'
  sourceId: varchar("source_id"), // ID of the source (e.g., training schedule ID)
  snapshotData: jsonb("snapshot_data").notNull(), // Complete immutable snapshot of exercises with all metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("workout_instances_user_id_idx").on(table.userId),
  index("workout_instances_session_id_idx").on(table.workoutSessionId),
]);

// Individual set tracking - one row per set
export const exerciseSets = pgTable("exercise_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutSessionId: varchar("workout_session_id").notNull(),
  exerciseId: varchar("exercise_id").notNull(),
  userId: varchar("user_id").notNull(),
  setIndex: integer("set_index").notNull(), // 1, 2, 3, etc.
  targetRepsLow: integer("target_reps_low"), // e.g., 6 for 6-8 reps
  targetRepsHigh: integer("target_reps_high"), // e.g., 8 for 6-8 reps
  weight: real("weight"), // in kg (for strength exercises)
  reps: integer("reps"), // actual reps completed (for strength exercises)
  distance: real("distance"), // in km (for cardio exercises like running, cycling)
  duration: integer("duration"), // in seconds (for cardio/flexibility exercises)
  rpeLogged: integer("rpe_logged"), // Rate of Perceived Exertion 1-10
  completed: integer("completed").notNull().default(0), // 1 if set was completed
  notes: text("notes"),
  restStartedAt: timestamp("rest_started_at"), // when rest timer started after completing this set
  tempo: text("tempo"), // override default tempo for this set
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Index for fast queries to get last weight/distance/duration by user and exercise
  userExerciseCreatedIdx: index("exercise_sets_user_exercise_created_idx").on(table.userId, table.exerciseId, table.createdAt),
}));

// Session PRs - track personal records achieved in a session
export const sessionPRs = pgTable("session_prs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutSessionId: varchar("workout_session_id").notNull(),
  exerciseId: varchar("exercise_id").notNull(),
  userId: varchar("user_id").notNull(),
  prType: text("pr_type").notNull(), // 'rep_pr', 'est_1rm_pr', 'volume_pr'
  value: real("value").notNull(), // the PR value (weight, reps, or volume)
  previousBest: real("previous_best"), // previous best for comparison
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Muscle Group Engagements - track which muscle groups were worked in each workout
export const muscleGroupEngagements = pgTable("muscle_group_engagements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  workoutSessionId: varchar("workout_session_id").notNull(),
  muscleGroup: text("muscle_group").notNull(), // 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'glutes', 'calves'
  engagementLevel: text("engagement_level").notNull(), // 'primary' (main focus), 'secondary' (supporting muscle)
  totalSets: integer("total_sets").notNull().default(0), // Total sets targeting this muscle group
  totalVolume: real("total_volume"), // Total volume (weight * reps) for this muscle group (optional, null for cardio)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // Index for fast queries by user and date range
  index("muscle_group_engagements_user_created_idx").on(table.userId, table.createdAt),
]);

// Training Load Sessions - session-level metrics for training load analysis and progressive overload
export const trainingLoadSessions = pgTable("training_load_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  workoutSessionId: varchar("workout_session_id").notNull(),
  // Session metrics
  totalVolume: real("total_volume"), // Sum of (weight * reps) across all sets
  totalTonnage: real("total_tonnage"), // Alternative calculation for total work
  avgIntensity: real("avg_intensity"), // Average % of 1RM across all sets
  peakRPE: integer("peak_rpe"), // Highest RPE recorded in session (1-10 scale)
  estimatedOneRepMax: real("estimated_one_rep_max"), // Estimated 1RM for primary lift
  // Completion status
  completionStatus: text("completion_status").notNull().default("completed"), // 'completed', 'partial', 'skipped'
  // User feedback (denormalized for easy access)
  overallDifficulty: integer("overall_difficulty"), // 1-5 scale (1=too easy, 5=too hard)
  fatigueLevel: integer("fatigue_level"), // 1-5 scale (1=energized, 5=exhausted)
  enjoymentRating: integer("enjoyment_rating"), // 1-5 scale (1=disliked, 5=loved)
  wouldRepeat: integer("would_repeat"), // 1 if user would do this workout again, 0 if not, null if not answered
  exercisesTooEasy: text("exercises_too_easy").array(), // List of exercise names that felt too easy
  exercisesTooHard: text("exercises_too_hard").array(), // List of exercise names that felt too hard
  painOrDiscomfort: text("pain_or_discomfort"), // Free text description of any pain/discomfort
  feedbackNotes: text("feedback_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Index for fast queries by user and creation date (for historical analysis)
  userCreatedIdx: index("training_load_sessions_user_created_idx").on(table.userId, table.createdAt),
}));

// Exercise Set Details - per-set tracking with detailed metrics for progressive overload and AI adaptation
export const exerciseSetDetails = pgTable("exercise_set_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  trainingLoadSessionId: varchar("training_load_session_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  setIndex: integer("set_index").notNull(), // 1, 2, 3, etc.
  // Performance tracking
  weight: real("weight"), // in kg (for strength exercises)
  reps: integer("reps"), // actual reps completed (for strength exercises)
  distance: real("distance"), // in km (for cardio exercises)
  duration: integer("duration"), // in seconds (for cardio/isometric holds)
  rpe: integer("rpe"), // Rate of Perceived Exertion 1-10
  // Feedback
  difficultyRating: integer("difficulty_rating"), // 1-5 scale (1=too easy, 5=too hard)
  formQuality: integer("form_quality"), // 1-5 scale (1=poor form, 5=perfect form)
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Index for fast queries to get last weight/distance/duration by user and exercise
  userExerciseCreatedIdx: index("exercise_set_details_user_exercise_created_idx").on(table.userId, table.exerciseName, table.createdAt),
}));

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
  // v2.0 fields for episode-based scoring
  episodeType: text("episode_type").default("primary"), // 'primary' | 'nap'
  episodeId: varchar("episode_id"), // UUID for episode tracking
  nightKeyLocalDate: text("night_key_local_date"), // YYYY-MM-DD in local timezone
  awakeningsCount: integer("awakenings_count").default(0), // Number of awakenings >= 2 min
  longestAwakeBoutMinutes: integer("longest_awake_bout_minutes").default(0), // Max single awake duration
  sleepMidpointLocal: timestamp("sleep_midpoint_local"), // Midpoint timestamp in local time
  sleepEfficiency: real("sleep_efficiency"), // actualSleepMinutes / totalMinutes
  flags: text("flags").array().default(sql`ARRAY[]::text[]`), // ['data_inconsistent', 'outlier_duration', etc.]
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
  insightType: text("insight_type").notNull().default("comment"), // 'comment' (informational) or 'actionable' (schedulable)
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
  // JSONB fields for complex values (pairs, multi-field metrics)
  targetValueData: jsonb("target_value_data"), // e.g., {systolic: 120, diastolic: 80} for blood pressure
  currentValueData: jsonb("current_value_data"),
  startValueData: jsonb("start_value_data"),
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

export const symptomEvents = pgTable("symptom_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(), // e.g., "headache", "nausea", "fatigue"
  coding: jsonb("coding"), // optional FHIR/medical coding: [{system, code, display}]
  episodeId: varchar("episode_id").notNull(), // groups related events for same symptom
  status: text("status").notNull(), // 'new', 'ongoing', 'resolved'
  severity: integer("severity"), // 0-10 scale, null when status='resolved'
  trend: text("trend"), // 'better', 'worse', 'same', null when resolved
  context: text("context").array().default(sql`ARRAY[]::text[]`), // ['after_workout', 'poor_sleep', 'stress_high', etc.]
  notes: text("notes"), // optional user notes
  signals: jsonb("signals"), // snapshot of health data at record time (sleep score, hrv, etc.)
  startedAt: timestamp("started_at").notNull(), // when symptom episode started (first event)
  recordedAt: timestamp("recorded_at").notNull(), // when this specific event was recorded
  endedAt: timestamp("ended_at"), // when resolved, null otherwise
  source: text("source").notNull().default("user"), // 'user' or 'ai_autolog'
  version: integer("version").notNull().default(1), // schema version for future evolution
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("symptom_events_user_episode_idx").on(table.userId, table.episodeId),
  index("symptom_events_user_recorded_idx").on(table.userId, table.recordedAt),
]);

// ExerciseDB - persistent storage for all 1,300+ exercises from the API
export const exercisedbExercises = pgTable("exercisedb_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exerciseId: text("exercise_id").notNull().unique(), // ExerciseDB API ID
  name: text("name").notNull(),
  bodyPart: text("body_part").notNull(),
  equipment: text("equipment").notNull(),
  target: text("target").notNull(), // Primary target muscle
  secondaryMuscles: jsonb("secondary_muscles").notNull().default(sql`'[]'::jsonb`), // Array of secondary muscles
  instructions: jsonb("instructions").notNull().default(sql`'[]'::jsonb`), // Array of instruction steps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("exercisedb_exercises_name_idx").on(table.name),
  index("exercisedb_exercises_body_part_idx").on(table.bodyPart),
  index("exercisedb_exercises_equipment_idx").on(table.equipment),
  index("exercisedb_exercises_target_idx").on(table.target),
]);

// ExerciseDB sync log - tracks when we last synced with the API
export const exercisedbSyncLog = pgTable("exercisedb_sync_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  exerciseCount: integer("exercise_count").notNull(),
  success: integer("success").notNull().default(1), // 1 if successful, 0 if failed
  errorMessage: text("error_message"),
});

// ExerciseDB Media Attempt Logs - telemetry for media matching attempts (debugging/tuning)
export const exerciseMediaAttemptLogs = pgTable("exercise_media_attempt_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Optional - may not have user context in all cases
  hpExerciseId: varchar("hp_exercise_id"), // HealthPilot exercise ID (from exercises table)
  hpExerciseName: text("hp_exercise_name").notNull(), // Name of the HP exercise
  target: text("target"), // Target muscle group
  bodyPart: text("body_part"), // Body part
  equipment: text("equipment"), // Equipment type
  reason: text("reason").notNull(), // 'LOW_CONFIDENCE' | 'NO_MATCH' | 'OK' | 'SUPPRESSED'
  externalId: text("external_id"), // ExerciseDB ID if available
  chosenId: text("chosen_id"), // ID of the matched ExerciseDB exercise
  chosenName: text("chosen_name"), // Name of the matched ExerciseDB exercise
  score: real("score"), // Match confidence score
  candidateCount: integer("candidate_count"), // Number of candidates evaluated
  candidates: jsonb("candidates"), // Top 5 candidates with scores [{id, name, score, target, bodyPart, equipment}]
  reviewStatus: text("review_status").notNull().default("pending"), // 'pending', 'reviewed', 'approved', 'rejected'
  reviewedBy: varchar("reviewed_by"), // Admin user who reviewed
  reviewedAt: timestamp("reviewed_at"),
  approvedExercisedbId: text("approved_exercisedb_id"), // Admin-approved correct ExerciseDB ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("media_attempt_logs_reason_idx").on(table.reason),
  index("media_attempt_logs_review_status_idx").on(table.reviewStatus),
  index("media_attempt_logs_hp_exercise_idx").on(table.hpExerciseId),
  index("media_attempt_logs_created_at_idx").on(table.createdAt),
]);

export const insertHealthRecordSchema = createInsertSchema(healthRecords).omit({
  id: true,
  uploadedAt: true,
});

export const insertMedicalReportSchema = createInsertSchema(medicalReports).omit({
  id: true,
  createdAt: true,
});

export const insertBiomarkerSchema = createInsertSchema(biomarkers).omit({
  id: true,
}).extend({
  recordedAt: z.coerce.date().optional().default(() => new Date()),
});

// Raw HealthKit events schemas
export const insertHkEventRawSchema = createInsertSchema(hkEventsRaw).omit({
  id: true,
  receivedAtUtc: true,
});

export type InsertHkEventRaw = z.infer<typeof insertHkEventRawSchema>;
export type SelectHkEventRaw = typeof hkEventsRaw.$inferSelect;

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

export const insertWorkoutInstanceSchema = createInsertSchema(workoutInstances).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseLogSchema = createInsertSchema(exerciseLogs).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseSetSchema = createInsertSchema(exerciseSets).omit({
  id: true,
  createdAt: true,
});

export const insertSessionPRSchema = createInsertSchema(sessionPRs).omit({
  id: true,
  createdAt: true,
});

export const insertMuscleGroupEngagementSchema = createInsertSchema(muscleGroupEngagements).omit({
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

export const insertSymptomEventSchema = createInsertSchema(symptomEvents).omit({
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

// User protocol completions - tracks when users complete recovery protocols
export const userProtocolCompletions = pgTable("user_protocol_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  protocolId: varchar("protocol_id").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  date: text("date").notNull(), // YYYY-MM-DD format for daily tracking
  context: jsonb("context"), // Stores readiness score, duration completed, notes, etc.
});

export const insertUserProtocolCompletionSchema = createInsertSchema(userProtocolCompletions).omit({
  id: true,
  completedAt: true,
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
  intent: text("intent").notNull().default("proactive_insight"), // 'proactive_insight' (AI suggestion requiring approval) or 'user_task' (direct user request - auto-scheduled)
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
  insightType: text("insight_type").notNull().default("actionable"), // 'comment' or 'actionable' - scheduled insights are typically actionable
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

// Proactive Suggestions - AI-generated suggestions when metrics are falling behind
export const proactiveSuggestions = pgTable("proactive_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  metricType: text("metric_type").notNull(), // 'steps', 'active_minutes', 'sleep', 'supplements', 'workouts'
  currentValue: real("current_value").notNull(), // Current metric value
  targetValue: real("target_value").notNull(), // Goal value
  deficit: real("deficit").notNull(), // How far behind (targetValue - currentValue)
  suggestedActivity: text("suggested_activity").notNull(), // e.g., "30-minute evening walk"
  activityType: text("activity_type").notNull(), // 'walk', 'run', 'workout', 'stretching', etc.
  duration: integer("duration"), // Activity duration in minutes
  reasoning: text("reasoning").notNull(), // AI explanation for this suggestion
  priority: text("priority").notNull().default("medium"), // 'high', 'medium', 'low'
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined', 'expired', 'scheduled'
  scheduledFor: timestamp("scheduled_for"), // When user scheduled the activity for
  notifiedAt: timestamp("notified_at"), // When user was notified via chat
  respondedAt: timestamp("responded_at"), // When user responded
  expiresAt: timestamp("expires_at"), // When this suggestion expires (e.g., end of day)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Response Patterns - Learn optimal intervention timing for each user
export const userResponsePatterns = pgTable("user_response_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  suggestionId: varchar("suggestion_id").notNull(), // FK to proactiveSuggestions
  metricType: text("metric_type").notNull(), // 'steps', 'active_minutes', etc.
  timeOfDay: text("time_of_day").notNull(), // 'morning', 'afternoon', 'evening', 'night'
  hourOfDay: integer("hour_of_day").notNull(), // 0-23, exact hour when suggestion was made
  dayOfWeek: text("day_of_week").notNull(), // 'Monday', 'Tuesday', etc.
  response: text("response").notNull(), // 'accepted', 'declined', 'ignored'
  deficitAmount: real("deficit_amount").notNull(), // How far behind they were
  activityType: text("activity_type").notNull(), // What activity was suggested
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

// Meal Feedback - Track user feedback on library meals and meal plans (swipe interface)
export const mealFeedback = pgTable("meal_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  mealLibraryId: varchar("meal_library_id"), // Reference to meal_library (optional for meal plan feedback)
  mealPlanId: varchar("meal_plan_id"), // Reference to meal_plans (for swipe interface)
  feedback: text("feedback").notNull(), // 'thumbs_up', 'thumbs_down', 'dislike', 'skip', 'accept', 'session_skip', 'permanent_dislike'
  feedbackType: text("feedback_type").notNull().default("session"), // 'session' (temporary, resets on session end), 'permanent' (never show again)
  swipeDirection: text("swipe_direction"), // 'left', 'right' for tracking actual swipe gesture
  // Track premium status at time of feedback (for deletion protection)
  userWasPremium: integer("user_was_premium").notNull().default(0), // 0 = false, 1 = true
  notes: text("notes"), // Optional user notes / reason for feedback
  // AI learning data (for meal plan swipes)
  mealName: text("meal_name"), // Store for AI learning
  mealType: text("meal_type"), // breakfast, lunch, dinner, snack
  cuisines: text("cuisines").array(), // Track cuisine preferences
  dishTypes: text("dish_types").array(), // Track dish type preferences
  calories: integer("calories"),
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

export const insertProactiveSuggestionSchema = createInsertSchema(proactiveSuggestions).omit({
  id: true,
  createdAt: true,
  notifiedAt: true,
  respondedAt: true,
});

export const insertUserResponsePatternSchema = createInsertSchema(userResponsePatterns).omit({
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

export type InsertMedicalReport = z.infer<typeof insertMedicalReportSchema>;
export type MedicalReport = typeof medicalReports.$inferSelect;

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

export type InsertWorkoutInstance = z.infer<typeof insertWorkoutInstanceSchema>;
export type WorkoutInstance = typeof workoutInstances.$inferSelect;

export type InsertExerciseLog = z.infer<typeof insertExerciseLogSchema>;
export type ExerciseLog = typeof exerciseLogs.$inferSelect;

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercises.$inferSelect;

export type InsertExerciseSet = z.infer<typeof insertExerciseSetSchema>;
export type ExerciseSet = typeof exerciseSets.$inferSelect;

export type InsertSessionPR = z.infer<typeof insertSessionPRSchema>;
export type SessionPR = typeof sessionPRs.$inferSelect;

export type InsertMuscleGroupEngagement = z.infer<typeof insertMuscleGroupEngagementSchema>;
export type MuscleGroupEngagement = typeof muscleGroupEngagements.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export type InsertAiAction = z.infer<typeof insertAiActionSchema>;
export type AiAction = typeof aiActions.$inferSelect;

export type InsertSymptomEvent = z.infer<typeof insertSymptomEventSchema>;
export type SymptomEvent = typeof symptomEvents.$inferSelect;

export type InsertExerciseFeedback = z.infer<typeof insertExerciseFeedbackSchema>;
export type ExerciseFeedback = typeof exerciseFeedback.$inferSelect;

export type InsertRecoveryProtocol = z.infer<typeof insertRecoveryProtocolSchema>;
export type RecoveryProtocol = typeof recoveryProtocols.$inferSelect;

export type InsertUserProtocolPreference = z.infer<typeof insertUserProtocolPreferenceSchema>;
export type UserProtocolPreference = typeof userProtocolPreferences.$inferSelect;

export type InsertUserProtocolCompletion = z.infer<typeof insertUserProtocolCompletionSchema>;
export type UserProtocolCompletion = typeof userProtocolCompletions.$inferSelect;

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

export type InsertProactiveSuggestion = z.infer<typeof insertProactiveSuggestionSchema>;
export type ProactiveSuggestion = typeof proactiveSuggestions.$inferSelect;

export type InsertUserResponsePattern = z.infer<typeof insertUserResponsePatternSchema>;
export type UserResponsePattern = typeof userResponsePatterns.$inferSelect;

export type InsertMealLibrary = z.infer<typeof insertMealLibrarySchema>;
export type MealLibrary = typeof mealLibrary.$inferSelect;

export type InsertMealFeedback = z.infer<typeof insertMealFeedbackSchema>;
export type MealFeedback = typeof mealFeedback.$inferSelect;

export type InsertMealLibrarySettings = z.infer<typeof insertMealLibrarySettingsSchema>;
export type MealLibrarySettings = typeof mealLibrarySettings.$inferSelect;

// User consent tracking for GDPR/HIPAA compliance
export const userConsents = pgTable("user_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentType: varchar("consent_type").notNull(), // 'health_data', 'ai_analysis', 'third_party', 'marketing'
  granted: integer("granted").notNull().default(0), // 0 = false, 1 = true
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserConsentSchema = createInsertSchema(userConsents).omit({
  id: true,
  createdAt: true,
});

export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type UserConsent = typeof userConsents.$inferSelect;

// Comprehensive audit logging for HIPAA/GDPR compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(), // 'read', 'create', 'update', 'delete', 'export'
  resourceType: varchar("resource_type").notNull(), // 'biomarker', 'workout', 'chat_message', etc.
  resourceId: varchar("resource_id"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  metadata: jsonb("metadata"), // Additional context
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("audit_logs_user_id_idx").on(table.userId),
  index("audit_logs_timestamp_idx").on(table.timestamp),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Subscription tracking - detailed Stripe subscription data
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique().notNull(),
  stripePriceId: varchar("stripe_price_id").notNull(), // Stripe price ID for this subscription
  tier: varchar("tier").notNull(), // 'premium', 'enterprise'
  billingCycle: varchar("billing_cycle").notNull(), // 'monthly', 'annual'
  status: varchar("status").notNull(), // 'active', 'canceled', 'past_due', 'trialing', 'incomplete'
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: integer("cancel_at_period_end").notNull().default(0), // 1 if user canceled but still has access until period end
  canceledAt: timestamp("canceled_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("subscriptions_user_id_idx").on(table.userId),
  index("subscriptions_stripe_id_idx").on(table.stripeSubscriptionId),
]);

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Promo codes for marketing campaigns
export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(), // e.g., "NEWYEAR2025", case-insensitive
  discountPercent: integer("discount_percent").notNull(), // 10 = 10% off, 20 = 20% off, etc.
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  maxUses: integer("max_uses"), // null = unlimited
  currentUses: integer("current_uses").notNull().default(0),
  allowedTiers: text("allowed_tiers").array(), // ['premium', 'enterprise'] or null for all tiers
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = disabled
  createdBy: varchar("created_by").notNull(), // admin user ID who created this
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("promo_codes_code_idx").on(table.code),
]);

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  currentUses: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// Referral program tracking
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerUserId: varchar("referrer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referredUserId: varchar("referred_user_id").references(() => users.id, { onDelete: "set null" }), // null if not signed up yet
  referralCode: varchar("referral_code").notNull().unique(), // unique code per user, e.g., "JOHN-2BA4"
  status: varchar("status").notNull().default("pending"), // 'pending', 'converted', 'rewarded'
  convertedAt: timestamp("converted_at"), // When referred user subscribed
  rewardGranted: integer("reward_granted").notNull().default(0), // 1 if referrer was rewarded
  rewardedAt: timestamp("rewarded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("referrals_referrer_idx").on(table.referrerUserId),
  index("referrals_code_idx").on(table.referralCode),
]);

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

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

// Voice chat sessions - stores summaries of voice interactions
export const voiceSessions = pgTable("voice_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(), // Summarized content of the voice session
  embedding: jsonb("embedding"), // Vector embedding for semantic search
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("voice_sessions_user_idx").on(table.userId),
]);

export const insertVoiceSessionSchema = createInsertSchema(voiceSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertVoiceSession = z.infer<typeof insertVoiceSessionSchema>;
export type VoiceSession = typeof voiceSessions.$inferSelect;

// Chat feedback - thumbs up/down on AI messages
export const chatFeedback = pgTable("chat_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(), // ID of the chat message being rated
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  feedbackType: varchar("feedback_type").notNull(), // 'thumbs_up' or 'thumbs_down'
  context: jsonb("context"), // Additional context (e.g., reason for dislike, workout difficulty, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("chat_feedback_user_idx").on(table.userId),
  index("chat_feedback_message_idx").on(table.messageId),
]);

export const insertChatFeedbackSchema = createInsertSchema(chatFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertChatFeedback = z.infer<typeof insertChatFeedbackSchema>;
export type ChatFeedback = typeof chatFeedback.$inferSelect;

// Safety escalations - logs when safety keywords are detected
export const safetyEscalations = pgTable("safety_escalations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  triggerKeyword: varchar("trigger_keyword").notNull(), // The keyword that triggered the escalation
  context: jsonb("context").notNull(), // Full context: message content, conversation type, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("safety_escalations_user_idx").on(table.userId),
]);

export const insertSafetyEscalationSchema = createInsertSchema(safetyEscalations).omit({
  id: true,
  createdAt: true,
});

export type InsertSafetyEscalation = z.infer<typeof insertSafetyEscalationSchema>;
export type SafetyEscalation = typeof safetyEscalations.$inferSelect;

// Coach memory - long-term memory for AI coach personalization
export const coachMemory = pgTable("coach_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  memoryType: varchar("memory_type").notNull(), // 'preference', 'progress', 'concern', 'goal', etc.
  summary: text("summary").notNull(), // Human-readable summary of the memory
  embedding: jsonb("embedding"), // Vector embedding for semantic retrieval
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("coach_memory_user_idx").on(table.userId),
  index("coach_memory_type_idx").on(table.memoryType),
]);

export const insertCoachMemorySchema = createInsertSchema(coachMemory).omit({
  id: true,
  createdAt: true,
});

export type InsertCoachMemory = z.infer<typeof insertCoachMemorySchema>;
export type CoachMemory = typeof coachMemory.$inferSelect;

// Preference vectors - weights for user preferences (exercise difficulty, types, etc.)
export const preferenceVectors = pgTable("preference_vectors", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  preferenceType: varchar("preference_type").notNull(), // 'exercise_difficulty', 'cardio_preference', 'meal_type', etc.
  weight: real("weight").notNull().default(0.0), // Numeric weight, adjusted based on feedback
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("preference_vectors_user_idx").on(table.userId),
  uniqueIndex("preference_vectors_user_type_idx").on(table.userId, table.preferenceType),
]);

export const insertPreferenceVectorSchema = createInsertSchema(preferenceVectors);

export type InsertPreferenceVector = z.infer<typeof insertPreferenceVectorSchema>;
export type PreferenceVector = typeof preferenceVectors.$inferSelect;

// Page tile preferences schemas
export const insertPageTilePreferencesSchema = createInsertSchema(pageTilePreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPageTilePreferences = z.infer<typeof insertPageTilePreferencesSchema>;
export type PageTilePreferences = typeof pageTilePreferences.$inferSelect;

// ExerciseDB schemas
export const insertExercisedbExerciseSchema = createInsertSchema(exercisedbExercises).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExercisedbExercise = z.infer<typeof insertExercisedbExerciseSchema>;
export type ExercisedbExercise = typeof exercisedbExercises.$inferSelect;

export const insertExercisedbSyncLogSchema = createInsertSchema(exercisedbSyncLog).omit({
  id: true,
  syncedAt: true,
});

export type InsertExercisedbSyncLog = z.infer<typeof insertExercisedbSyncLogSchema>;
export type ExercisedbSyncLog = typeof exercisedbSyncLog.$inferSelect;

export const insertExerciseMediaAttemptLogSchema = createInsertSchema(exerciseMediaAttemptLogs).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export type InsertExerciseMediaAttemptLog = z.infer<typeof insertExerciseMediaAttemptLogSchema>;
export type ExerciseMediaAttemptLog = typeof exerciseMediaAttemptLogs.$inferSelect;

// ===== LANDING PAGE CMS =====

// Main landing page content (hero, SEO, general settings)
export const landingPageContent = pgTable("landing_page_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Hero Section
  heroTitle: text("hero_title").notNull().default("HealthPilot"),
  heroSubtitle: text("hero_subtitle").notNull().default("Your Body, Decoded"),
  heroDescription: text("hero_description").notNull(),
  heroBadgeText: text("hero_badge_text").default("AI-Powered Health Intelligence"),
  heroCtaPrimary: text("hero_cta_primary").default("Start Free"),
  heroCtaPrimaryLink: text("hero_cta_primary_link").default("/api/login"),
  heroCtaSecondary: text("hero_cta_secondary").default("Watch Demo"),
  heroCtaSecondaryLink: text("hero_cta_secondary_link").default("/security"),
  heroImageUrl: text("hero_image_url"),
  heroVisible: integer("hero_visible").notNull().default(1),
  
  // "How It Works" Section
  howItWorksTitle: text("how_it_works_title").default("How It Works"),
  howItWorksSubtitle: text("how_it_works_subtitle").default("Three steps from data to daily action."),
  howItWorksVisible: integer("how_it_works_visible").notNull().default(1),
  
  // Features Section
  featuresTitle: text("features_title").default("Features"),
  featuresSubtitle: text("features_subtitle"),
  featuresVisible: integer("features_visible").notNull().default(1),
  
  // Testimonials Section
  testimonialsTitle: text("testimonials_title").default("What Our Users Say"),
  testimonialsSubtitle: text("testimonials_subtitle"),
  testimonialsVisible: integer("testimonials_visible").notNull().default(1),
  
  // Pricing Section
  pricingTitle: text("pricing_title").default("Simple, Transparent Pricing"),
  pricingSubtitle: text("pricing_subtitle"),
  pricingVisible: integer("pricing_visible").notNull().default(1),
  
  // SEO Metadata
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  twitterTitle: text("twitter_title"),
  twitterDescription: text("twitter_description"),
  twitterImage: text("twitter_image"),
  canonicalUrl: text("canonical_url"),
  robotsMeta: text("robots_meta").default("index, follow"),
  
  // Analytics
  googleAnalyticsId: text("google_analytics_id"),
  googleTagManagerId: text("google_tag_manager_id"),
  metaPixelId: text("meta_pixel_id"),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Landing page features (How It Works + Feature sections)
export const landingPageFeatures = pgTable("landing_page_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  section: varchar("section").notNull(), // 'how_it_works' or 'features'
  icon: text("icon").notNull(), // Lucide icon name
  title: text("title").notNull(),
  description: text("description").notNull(),
  order: integer("order").notNull().default(0),
  visible: integer("visible").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("landing_page_features_section_idx").on(table.section),
]);

// Landing page testimonials
export const landingPageTestimonials = pgTable("landing_page_testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  company: text("company"),
  photoUrl: text("photo_url"),
  quote: text("quote").notNull(),
  rating: integer("rating").default(5), // 1-5 stars
  order: integer("order").notNull().default(0),
  visible: integer("visible").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Landing page pricing plans
export const landingPagePricingPlans = pgTable("landing_page_pricing_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: text("price").notNull(), // e.g., "$0", "$19/mo"
  description: text("description"),
  features: text("features").array().notNull(), // Array of feature strings
  ctaText: text("cta_text").notNull().default("Get Started"),
  ctaLink: text("cta_link").notNull(),
  highlighted: integer("highlighted").notNull().default(0), // Popular/recommended
  order: integer("order").notNull().default(0),
  visible: integer("visible").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Landing page social links
export const landingPageSocialLinks = pgTable("landing_page_social_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform").notNull(), // 'twitter', 'linkedin', 'facebook', 'instagram', 'github', etc.
  url: text("url").notNull(),
  icon: text("icon"), // Lucide icon name or custom icon
  order: integer("order").notNull().default(0),
  visible: integer("visible").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User meal preferences and feedback
export const userMealPreferences = pgTable("user_meal_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealId: varchar("meal_id").notNull().references(() => mealLibrary.id, { onDelete: "cascade" }),
  signal: varchar("signal").notNull(), // 'like', 'dislike', 'saved', 'completed'
  strength: real("strength").notNull().default(1.0), // Signal strength 0-1
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  mealType: varchar("meal_type"), // 'breakfast', 'lunch', 'dinner', 'snack'
  context: jsonb("context"), // Additional context like meal slot, day of week, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userMealIdx: index("user_meal_preference_idx").on(table.userId, table.mealId),
    timestampIdx: index("preference_timestamp_idx").on(table.timestamp),
  };
});

// User bandit state for recommendation learning
export const userBanditState = pgTable("user_bandit_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  armKey: varchar("arm_key").notNull(), // e.g., 'cuisine:italian', 'tag:high_protein'
  alpha: real("alpha").notNull().default(1.0), // Beta distribution alpha parameter
  beta: real("beta").notNull().default(1.0), // Beta distribution beta parameter
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    userArmIdx: unique("user_arm_unique").on(table.userId, table.armKey),
  };
});

// Meal recommendation history for tracking and analysis
export const mealRecommendationHistory = pgTable("meal_recommendation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestId: varchar("request_id").notNull(),
  mealSlot: varchar("meal_slot").notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  recommendations: jsonb("recommendations").notNull(), // Array of recommended meal IDs with scores
  filterStats: jsonb("filter_stats"), // Statistics about filtered meals
  scoringWeights: jsonb("scoring_weights"), // Weights used for scoring
  contextData: jsonb("context_data"), // User profile and context at time of recommendation
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("recommendation_user_idx").on(table.userId),
    requestIdIdx: index("recommendation_request_idx").on(table.requestId),
  };
});

// Insert schemas
export const insertLandingPageContentSchema = createInsertSchema(landingPageContent).omit({
  id: true,
  updatedAt: true,
});

export const insertLandingPageFeatureSchema = createInsertSchema(landingPageFeatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLandingPageTestimonialSchema = createInsertSchema(landingPageTestimonials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLandingPagePricingPlanSchema = createInsertSchema(landingPagePricingPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLandingPageSocialLinkSchema = createInsertSchema(landingPageSocialLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserMealPreferenceSchema = createInsertSchema(userMealPreferences).omit({
  id: true,
  timestamp: true,
  createdAt: true,
});

export const insertUserBanditStateSchema = createInsertSchema(userBanditState).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMealRecommendationHistorySchema = createInsertSchema(mealRecommendationHistory).omit({
  id: true,
  createdAt: true,
});

// Types
export type LandingPageContent = typeof landingPageContent.$inferSelect;
export type InsertLandingPageContent = z.infer<typeof insertLandingPageContentSchema>;

export type LandingPageFeature = typeof landingPageFeatures.$inferSelect;
export type InsertLandingPageFeature = z.infer<typeof insertLandingPageFeatureSchema>;

export type LandingPageTestimonial = typeof landingPageTestimonials.$inferSelect;
export type InsertLandingPageTestimonial = z.infer<typeof insertLandingPageTestimonialSchema>;

export type LandingPagePricingPlan = typeof landingPagePricingPlans.$inferSelect;
export type InsertLandingPagePricingPlan = z.infer<typeof insertLandingPagePricingPlanSchema>;

export type LandingPageSocialLink = typeof landingPageSocialLinks.$inferSelect;
export type InsertLandingPageSocialLink = z.infer<typeof insertLandingPageSocialLinkSchema>;

export type UserMealPreference = typeof userMealPreferences.$inferSelect;
export type InsertUserMealPreference = z.infer<typeof insertUserMealPreferenceSchema>;

export type UserBanditState = typeof userBanditState.$inferSelect;
export type InsertUserBanditState = z.infer<typeof insertUserBanditStateSchema>;

export type MealRecommendationHistory = typeof mealRecommendationHistory.$inferSelect;
export type InsertMealRecommendationHistory = z.infer<typeof insertMealRecommendationHistorySchema>;

// ===== Cost Control & Telemetry Tables =====

// Job telemetry events - tracks all async job executions
export const telemetryJobEvents = pgTable("telemetry_job_events", {
  id: serial("id").primaryKey(),
  jobId: varchar("job_id", { length: 40 }),
  jobType: varchar("job_type", { length: 40 }),
  userId: varchar("user_id", { length: 40 }).notNull(),
  tier: varchar("tier", { length: 16 }).notNull(), // free, premium, enterprise
  domain: varchar("domain", { length: 16 }).notNull(), // insights, metrics, workouts, meals, etc.
  queuedAt: timestamp("queued_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  queueWaitMs: integer("queue_wait_ms"),
  success: boolean("success"),
  errorCode: varchar("error_code", { length: 64 }),
  attempt: integer("attempt").default(1),
  rowsRead: integer("rows_read").default(0),
  rowsWritten: integer("rows_written").default(0),
  cpuMs: integer("cpu_ms").default(0),
  memMbPeak: integer("mem_mb_peak").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("telemetry_job_events_user_started_idx").on(table.userId, table.startedAt),
  index("telemetry_job_events_type_started_idx").on(table.jobType, table.startedAt),
  index("telemetry_job_events_tier_started_idx").on(table.tier, table.startedAt),
]);

// LLM call telemetry - tracks all OpenAI API calls
export const telemetryLlmEvents = pgTable("telemetry_llm_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 40 }).notNull(),
  tier: varchar("tier", { length: 16 }).notNull(),
  llmModel: varchar("llm_model", { length: 40 }).notNull(), // gpt-4o, gpt-4o-mini, etc.
  contextType: varchar("context_type", { length: 32 }).notNull(), // chat, insights, workout, meal, etc.
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cacheHit: boolean("cache_hit").default(false),
  durationMs: integer("duration_ms"),
  success: boolean("success"),
  errorCode: varchar("error_code", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("telemetry_llm_events_user_created_idx").on(table.userId, table.createdAt),
  index("telemetry_llm_events_model_created_idx").on(table.llmModel, table.createdAt),
]);

// Daily cost rollup per user
export const costUserDaily = pgTable("cost_user_daily", {
  userId: varchar("user_id", { length: 40 }).notNull(),
  date: date("date").notNull(),
  tier: varchar("tier", { length: 16 }).notNull(),
  jobs: integer("jobs").default(0),
  aiCalls: integer("ai_calls").default(0),
  cpuMs: bigint("cpu_ms", { mode: "number" }).default(0),
  tokensIn: bigint("tokens_in", { mode: "number" }).default(0),
  tokensOut: bigint("tokens_out", { mode: "number" }).default(0),
  costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.date] }),
  dateIdx: index("cost_user_daily_date_idx").on(table.date),
  tierDateIdx: index("cost_user_daily_tier_date_idx").on(table.tier, table.date),
}));

// Global daily cost rollup
export const costGlobalDaily = pgTable("cost_global_daily", {
  date: date("date").primaryKey(),
  jobs: integer("jobs").default(0),
  aiCalls: integer("ai_calls").default(0),
  cpuMs: bigint("cpu_ms", { mode: "number" }).default(0),
  tokensIn: bigint("tokens_in", { mode: "number" }).default(0),
  tokensOut: bigint("tokens_out", { mode: "number" }).default(0),
  costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).default("0"),
  tierBreakdownJson: jsonb("tier_breakdown_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Cost budgets and caps
export const costBudgets = pgTable("cost_budgets", {
  id: serial("id").primaryKey(),
  dailyCpuMsCap: bigint("daily_cpu_ms_cap", { mode: "number" }).notNull(),
  dailyJobsCap: integer("daily_jobs_cap").notNull(),
  llmInputTokensCap: bigint("llm_input_tokens_cap", { mode: "number" }).notNull(),
  llmOutputTokensCap: bigint("llm_output_tokens_cap", { mode: "number" }).notNull(),
  applyScope: varchar("apply_scope", { length: 16 }).notNull(), // global, free, premium, enterprise
  updatedBy: varchar("updated_by", { length: 80 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Zod insert schemas for cost control tables
export const insertTelemetryJobEventSchema = createInsertSchema(telemetryJobEvents).omit({
  id: true,
  createdAt: true,
});

export const insertTelemetryLlmEventSchema = createInsertSchema(telemetryLlmEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCostUserDailySchema = createInsertSchema(costUserDaily).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCostGlobalDailySchema = createInsertSchema(costGlobalDaily).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCostBudgetSchema = createInsertSchema(costBudgets).omit({
  id: true,
  updatedAt: true,
});

// Types for cost control tables
export type TelemetryJobEvent = typeof telemetryJobEvents.$inferSelect;
export type InsertTelemetryJobEvent = z.infer<typeof insertTelemetryJobEventSchema>;

export type TelemetryLlmEvent = typeof telemetryLlmEvents.$inferSelect;
export type InsertTelemetryLlmEvent = z.infer<typeof insertTelemetryLlmEventSchema>;

export type CostUserDaily = typeof costUserDaily.$inferSelect;
export type InsertCostUserDaily = z.infer<typeof insertCostUserDailySchema>;

export type CostGlobalDaily = typeof costGlobalDaily.$inferSelect;
export type InsertCostGlobalDaily = z.infer<typeof insertCostGlobalDailySchema>;

export type CostBudget = typeof costBudgets.$inferSelect;
export type InsertCostBudget = z.infer<typeof insertCostBudgetSchema>;

// ============================================================================
// DAILY INSIGHTS SYSTEM
// ============================================================================

// Daily metrics from devices and labs - stores verified health data
export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 40 }).notNull(),
  name: varchar("name", { length: 64 }).notNull(), // sleep_duration_min, hrv_night_ms, etc.
  value: real("value").notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  source: varchar("source", { length: 64 }).notNull(), // apple_healthkit, oura, fitbit, garmin, lab
  qualityFlag: varchar("quality_flag", { length: 16 }).notNull(), // good, ok, poor, unknown
  userCompletionStatus: varchar("user_completion_status", { length: 16 }), // complete, partial, null
  isBaselineEligible: boolean("is_baseline_eligible").notNull().default(true), // Can this row be used for baseline calculation?
  exclusionReason: varchar("exclusion_reason", { length: 128 }), // Why this row was excluded from baselines
  ingestionMetadata: jsonb("ingestion_metadata"), // Additional context about data source and processing
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("daily_metrics_user_name_observed_desc_idx").on(table.userId, table.name, table.observedAt.desc()),
  index("daily_metrics_user_name_baseline_idx").on(table.userId, table.name, table.isBaselineEligible).where(sql`${table.isBaselineEligible} = true`),
  index("daily_metrics_observed_idx").on(table.observedAt),
]);

// Lab results with reference ranges
export const labs = pgTable("labs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 40 }).notNull(),
  panel: varchar("panel", { length: 64 }).notNull(), // lipid_panel, metabolic_panel, etc.
  marker: varchar("marker", { length: 64 }).notNull(), // ldl_cholesterol, glucose, etc.
  value: real("value").notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  refLow: real("ref_low"),
  refHigh: real("ref_high"),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  source: varchar("source", { length: 64 }).notNull().default("lab"),
  qualityFlag: varchar("quality_flag", { length: 16 }).notNull().default("good"),
  isBaselineEligible: boolean("is_baseline_eligible").notNull().default(true), // Can this row be used for baseline calculation?
  exclusionReason: varchar("exclusion_reason", { length: 128 }), // Why this row was excluded from baselines
  ingestionMetadata: jsonb("ingestion_metadata"), // Additional context about data source and processing
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("labs_user_marker_observed_desc_idx").on(table.userId, table.marker, table.observedAt.desc()),
  index("labs_user_marker_baseline_idx").on(table.userId, table.marker, table.isBaselineEligible).where(sql`${table.isBaselineEligible} = true`),
  index("labs_observed_idx").on(table.observedAt),
]);

// Generated daily health insights - up to 3 per user per day
export const dailyHealthInsights = pgTable("daily_health_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 40 }).notNull(),
  date: date("date").notNull(),
  generatedFor: date("generated_for").notNull(), // Which day this insight analyzes (usually date - 1 day)
  title: text("title").notNull(),
  message: text("message").notNull(),
  metric: varchar("metric", { length: 64 }).notNull(), // Which metric triggered this insight
  severity: varchar("severity", { length: 16 }).notNull(), // low, moderate, high
  confidence: real("confidence").notNull(), // 0.0 to 1.0
  evidence: jsonb("evidence"), // { baseline_days, method, delta_pct, etc. }
  status: varchar("status", { length: 16 }).notNull().default("active"), // active, acknowledged, dismissed
  score: real("score"), // Ranking score used to select top 3 insights
  issuedBy: varchar("issued_by", { length: 64 }).default("system"), // system, manual, etc.
  recommendationId: varchar("recommendation_id"), // Link to recommendations table if actionable recommendation was generated
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("daily_health_insights_user_date_status_score_idx").on(table.userId, table.date, table.status, table.score.desc()),
  index("daily_health_insights_user_date_idx").on(table.userId, table.date),
  index("daily_health_insights_date_idx").on(table.date),
  uniqueIndex("daily_health_insights_user_date_metric_active_idx")
    .on(table.userId, table.date, table.metric)
    .where(sql`${table.status} = 'active'`),
]);

// AI-generated daily training sessions
export const generatedWorkouts = pgTable("generated_workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 40 }).notNull(),
  date: date("date").notNull(), // The date this workout is generated for
  workoutData: jsonb("workout_data").notNull(), // Full workout plan matching DailyWorkoutSchema
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending, accepted, modified, rejected, completed
  acceptedSnapshot: jsonb("accepted_snapshot"), // Immutable snapshot of accepted exercises (prevents tracker duplication)
  userModifications: jsonb("user_modifications"), // Track any user changes to the generated plan
  feedbackNotes: text("feedback_notes"), // User feedback about the workout
  regenerationCount: integer("regeneration_count").notNull().default(0), // How many times user regenerated this day
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("generated_workouts_user_date_idx").on(table.userId, table.date),
  index("generated_workouts_user_status_idx").on(table.userId, table.status),
  uniqueIndex("generated_workouts_user_date_unique_idx").on(table.userId, table.date),
]);

// Zod insert schemas for Daily Insights tables
export const insertDailyMetricSchema = createInsertSchema(dailyMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertLabSchema = createInsertSchema(labs).omit({
  id: true,
  createdAt: true,
});

export const insertDailyHealthInsightSchema = createInsertSchema(dailyHealthInsights).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedWorkoutSchema = createInsertSchema(generatedWorkouts).omit({
  id: true,
  createdAt: true,
});

// Types for Daily Insights tables
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type InsertDailyMetric = z.infer<typeof insertDailyMetricSchema>;

export type Lab = typeof labs.$inferSelect;
export type InsertLab = z.infer<typeof insertLabSchema>;

export type DailyHealthInsight = typeof dailyHealthInsights.$inferSelect;
export type InsertDailyHealthInsight = z.infer<typeof insertDailyHealthInsightSchema>;

export type GeneratedWorkout = typeof generatedWorkouts.$inferSelect;
export type InsertGeneratedWorkout = z.infer<typeof insertGeneratedWorkoutSchema>;
