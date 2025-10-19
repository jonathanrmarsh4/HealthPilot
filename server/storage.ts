import { db } from "./db";
import { 
  type User, 
  type UpsertUser,
  type HealthRecord,
  type InsertHealthRecord,
  type Biomarker,
  type InsertBiomarker,
  type NutritionProfile,
  type InsertNutritionProfile,
  type MealPlan,
  type InsertMealPlan,
  type FavoriteRecipe,
  type InsertFavoriteRecipe,
  type TrainingSchedule,
  type InsertTrainingSchedule,
  type Recommendation,
  type InsertRecommendation,
  type ChatMessage,
  type InsertChatMessage,
  type SleepSession,
  type InsertSleepSession,
  type ReadinessScore,
  type InsertReadinessScore,
  type ReadinessSettings,
  type InsertReadinessSettings,
  type FitnessProfile,
  type InsertFitnessProfile,
  type Insight,
  type InsertInsight,
  type WorkoutSession,
  type InsertWorkoutSession,
  type ExerciseLog,
  type InsertExerciseLog,
  type Exercise,
  type InsertExercise,
  type ExerciseSet,
  type InsertExerciseSet,
  type SessionPR,
  type InsertSessionPR,
  type MuscleGroupEngagement,
  type InsertMuscleGroupEngagement,
  type Goal,
  type InsertGoal,
  type ExerciseFeedback,
  type InsertExerciseFeedback,
  type RecoveryProtocol,
  type InsertRecoveryProtocol,
  type UserProtocolPreference,
  type InsertUserProtocolPreference,
  type Supplement,
  type InsertSupplement,
  type DailyReminder,
  type InsertDailyReminder,
  type ReminderCompletion,
  type InsertReminderCompletion,
  type SupplementRecommendation,
  type InsertSupplementRecommendation,
  type ScheduledExerciseRecommendation,
  type InsertScheduledExerciseRecommendation,
  type ScheduledInsight,
  type InsertScheduledInsight,
  type InsightFeedback,
  type InsertInsightFeedback,
  type AiAction,
  type InsertAiAction,
  type MealLibrary,
  type InsertMealLibrary,
  type MealFeedback,
  type InsertMealFeedback,
  type MealLibrarySettings,
  type InsertMealLibrarySettings,
  type PageTilePreferences,
  type InsertPageTilePreferences,
  users,
  healthRecords,
  biomarkers,
  nutritionProfiles,
  mealPlans,
  favoriteRecipes,
  trainingSchedules,
  recommendations,
  chatMessages,
  sleepSessions,
  readinessScores,
  readinessSettings,
  fitnessProfiles,
  insights,
  workoutSessions,
  exerciseLogs,
  exercises,
  exerciseSets,
  sessionPRs,
  muscleGroupEngagements,
  goals,
  aiActions,
  exerciseFeedback,
  recoveryProtocols,
  userProtocolPreferences,
  supplements,
  dailyReminders,
  reminderCompletions,
  supplementRecommendations,
  scheduledExerciseRecommendations,
  scheduledInsights,
  insightFeedback,
  mealLibrary,
  mealFeedback,
  mealLibrarySettings,
  messageUsage,
  pageTilePreferences,
} from "@shared/schema";
import { eq, desc, and, gte, lte, lt, sql, or, like, count, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserSettings(userId: string): Promise<{ timezone: string }>;
  updateUserSettings(userId: string, settings: { timezone: string }): Promise<void>;
  getDashboardPreferences(userId: string): Promise<{ visible: string[], order: string[] } | null>;
  saveDashboardPreferences(userId: string, preferences: { visible: string[], order: string[] }): Promise<void>;
  getPageTilePreferences(userId: string, page: string): Promise<PageTilePreferences | null>;
  savePageTilePreferences(userId: string, page: string, preferences: { visible: string[], order: string[] }): Promise<PageTilePreferences>;
  updateUserProfile(userId: string, profileData: Partial<Pick<User, "firstName" | "lastName" | "height" | "dateOfBirth" | "gender" | "bloodType" | "activityLevel" | "location" | "timezone">>): Promise<User>;
  acceptEula(userId: string): Promise<void>;
  
  // Onboarding methods - contextual onboarding with granular flags
  getOnboardingStatus(userId: string): Promise<{ 
    completed: boolean; 
    step: string | null; 
    startedAt: Date | null; 
    completedAt: Date | null;
    basicInfoComplete: boolean;
    trainingSetupComplete: boolean;
    mealsSetupComplete: boolean;
    supplementsSetupComplete: boolean;
    biomarkersSetupComplete: boolean;
  } | null>;
  updateOnboardingStep(userId: string, step: string): Promise<void>;
  updateOnboardingFlag(userId: string, flag: 'basicInfoComplete' | 'trainingSetupComplete' | 'mealsSetupComplete' | 'supplementsSetupComplete' | 'biomarkersSetupComplete', value: boolean): Promise<void>;
  completeOnboarding(userId: string): Promise<void>;
  skipOnboardingStep(userId: string, currentStep: string, nextStep: string): Promise<boolean>;
  
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  getHealthRecords(userId: string): Promise<HealthRecord[]>;
  getHealthRecord(id: string, userId: string): Promise<HealthRecord | undefined>;
  getHealthRecordByFileId(fileId: string, userId: string): Promise<HealthRecord | undefined>;
  updateHealthRecord(id: string, userId: string, data: Partial<HealthRecord>): Promise<HealthRecord | undefined>;
  deleteHealthRecord(id: string, userId: string): Promise<void>;
  
  createBiomarker(biomarker: InsertBiomarker): Promise<Biomarker>;
  upsertBiomarker(biomarker: InsertBiomarker): Promise<Biomarker>;
  updateBiomarker(id: string, userId: string, data: Partial<InsertBiomarker>): Promise<Biomarker | undefined>;
  getBiomarkers(userId: string, type?: string): Promise<Biomarker[]>;
  getBiomarkersByTimeRange(userId: string, type: string, startDate: Date, endDate: Date): Promise<Biomarker[]>;
  getLatestBiomarkerByType(userId: string, type: string): Promise<Biomarker | undefined>;
  
  createNutritionProfile(profile: InsertNutritionProfile): Promise<NutritionProfile>;
  getNutritionProfile(userId: string): Promise<NutritionProfile | undefined>;
  updateNutritionProfile(userId: string, data: Partial<NutritionProfile>): Promise<NutritionProfile | undefined>;
  
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getMealPlans(userId: string): Promise<MealPlan[]>;
  updateMealFeedback(mealId: string, userId: string, feedback: string): Promise<MealPlan | undefined>;
  deletePastMealPlans(userId: string): Promise<number>; // Returns count of deleted meals
  deleteFutureMealsBeyondDate(userId: string, maxDate: Date): Promise<number>; // Delete meals scheduled after maxDate
  
  createFavoriteRecipe(favorite: InsertFavoriteRecipe): Promise<FavoriteRecipe>;
  getFavoriteRecipes(userId: string): Promise<FavoriteRecipe[]>;
  getFavoriteRecipeBySpoonacularId(userId: string, spoonacularRecipeId: number): Promise<FavoriteRecipe | undefined>;
  deleteFavoriteRecipe(id: string, userId: string): Promise<void>;
  updateFavoriteRecipeNotes(id: string, userId: string, notes: string): Promise<FavoriteRecipe | undefined>;
  
  createTrainingSchedule(schedule: InsertTrainingSchedule): Promise<TrainingSchedule>;
  getTrainingSchedules(userId: string): Promise<TrainingSchedule[]>;
  updateTrainingSchedule(id: string, userId: string, data: Partial<TrainingSchedule>): Promise<TrainingSchedule | undefined>;
  saveWorkoutExerciseFromAI(userId: string, exercise: { exerciseName: string, exerciseType: string, description: string, duration?: number, scheduledDate?: Date, intensity?: string }): Promise<TrainingSchedule>;
  
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  getRecommendations(userId: string): Promise<Recommendation[]>;
  getScheduledRecommendations(userId: string): Promise<Recommendation[]>;
  getTodayScheduledRecommendations(userId: string, date: Date): Promise<Recommendation[]>;
  dismissRecommendation(id: string, userId: string): Promise<void>;
  scheduleRecommendation(id: string, userId: string, scheduledAt: Date, trainingScheduleId: string | null): Promise<void>;
  rescheduleRecommendation(id: string, userId: string, newDate: Date): Promise<void>;
  recordRecommendationFeedback(id: string, userId: string, feedback: "positive" | "negative", reason?: string): Promise<void>;
  
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  clearChatHistory(userId: string): Promise<void>;
  
  createSleepSession(session: InsertSleepSession): Promise<SleepSession>;
  upsertSleepSession(session: InsertSleepSession): Promise<SleepSession>;
  getSleepSessions(userId: string, startDate?: Date, endDate?: Date): Promise<SleepSession[]>;
  getLatestSleepSession(userId: string): Promise<SleepSession | undefined>;
  
  createReadinessScore(score: InsertReadinessScore): Promise<ReadinessScore>;
  getReadinessScores(userId: string, startDate?: Date, endDate?: Date): Promise<ReadinessScore[]>;
  getLatestReadinessScore(userId: string): Promise<ReadinessScore | undefined>;
  getReadinessScoreForDate(userId: string, date: Date): Promise<ReadinessScore | undefined>;
  
  getReadinessSettings(userId: string): Promise<ReadinessSettings | undefined>;
  upsertReadinessSettings(settings: InsertReadinessSettings): Promise<ReadinessSettings>;
  
  getFitnessProfile(userId: string): Promise<FitnessProfile | undefined>;
  upsertFitnessProfile(profile: InsertFitnessProfile): Promise<FitnessProfile>;
  
  createInsight(insight: InsertInsight): Promise<Insight>;
  getInsights(userId: string, limit?: number): Promise<Insight[]>;
  getDailyInsights(userId: string, date: Date): Promise<Insight[]>;
  dismissInsight(id: string, userId: string): Promise<void>;
  
  createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession>;
  getWorkoutSessions(userId: string, startDate?: Date, endDate?: Date): Promise<WorkoutSession[]>;
  getWorkoutSession(id: string, userId: string): Promise<WorkoutSession | undefined>;
  matchWorkoutToSchedule(sessionId: string, scheduleId: string, userId: string): Promise<void>;
  findMatchingSchedule(userId: string, workoutType: string, startTime: Date): Promise<TrainingSchedule | undefined>;
  
  createExerciseLog(log: InsertExerciseLog): Promise<ExerciseLog>;
  getExerciseLogs(workoutSessionId: string): Promise<ExerciseLog[]>;
  
  getExercisesForSession(sessionId: string, userId: string): Promise<Exercise[]>;
  getSetsForSession(sessionId: string, userId: string): Promise<ExerciseSet[]>;
  updateExerciseSet(setId: string, userId: string, data: Partial<ExerciseSet>): Promise<ExerciseSet | undefined>;
  addExerciseSet(sessionId: string, exerciseId: string, userId: string): Promise<ExerciseSet>;
  
  getTrainingLoad(userId: string, startDate: Date, endDate: Date): Promise<{
    weeklyLoad: number;
    monthlyLoad: number;
    weeklyHours: number;
  }>;
  getWorkoutStats(userId: string, startDate: Date, endDate: Date): Promise<{
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    byType: Array<{ type: string; count: number; duration: number; calories: number }>;
  }>;
  getWorkoutBiomarkerCorrelations(userId: string, startDate: Date, endDate: Date): Promise<{
    sleepQuality: { workoutDays: number; nonWorkoutDays: number; improvement: number };
    restingHR: { workoutDays: number; nonWorkoutDays: number; improvement: number };
  }>;
  
  // Muscle Group Frequency Tracking methods
  recordMuscleGroupEngagement(userId: string, workoutSessionId: string, muscleGroup: string, engagementLevel: 'primary' | 'secondary', totalSets: number, totalVolume?: number): Promise<void>;
  getMuscleGroupEngagements(userId: string, startDate: Date, endDate: Date): Promise<Array<{ muscleGroup: string; engagementLevel: string; totalSets: number; totalVolume: number | null; createdAt: Date }>>;
  getMuscleGroupFrequency(userId: string, daysBack?: number): Promise<Array<{ muscleGroup: string; lastTrained: Date | null; timesTrainedInPeriod: number; totalSets: number; totalVolume: number }>>;
  getMuscleGroupLastTrainedDate(userId: string, muscleGroup: string): Promise<Date | null>;
  
  getAllUsers(limit: number, offset: number, search?: string): Promise<{ users: User[], total: number }>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserAdminFields(id: string, updates: { 
    role?: "user" | "admin"; 
    subscriptionTier?: "free" | "premium" | "enterprise";
    subscriptionStatus?: "active" | "inactive" | "cancelled" | "past_due";
  }): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
    enterpriseUsers: number;
    totalRecords: number;
    totalBiomarkers: number;
  }>;
  
  // Message usage tracking for free tier
  getMessageUsageForDate(userId: string, date: Date): Promise<{ userId: string; messageDate: Date; messageCount: number } | undefined>;
  incrementMessageUsage(userId: string, date: Date): Promise<void>;
  
  createGoal(goal: InsertGoal): Promise<Goal>;
  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: string, userId: string): Promise<Goal | undefined>;
  updateGoal(id: string, userId: string, data: Partial<Goal>): Promise<Goal | undefined>;
  updateGoalProgress(goalId: string, userId: string, currentValue: number): Promise<Goal | undefined>;
  deleteGoal(id: string, userId: string): Promise<void>;
  
  createAiAction(action: InsertAiAction): Promise<AiAction>;
  getAiActions(userId: string, limit?: number): Promise<AiAction[]>;
  getAiActionsByType(userId: string, actionType: string): Promise<AiAction[]>;
  
  createExerciseFeedback(feedback: InsertExerciseFeedback): Promise<ExerciseFeedback>;
  getExerciseFeedback(userId: string, limit?: number): Promise<ExerciseFeedback[]>;
  
  // Recovery Protocol methods
  createRecoveryProtocol(protocol: InsertRecoveryProtocol): Promise<RecoveryProtocol>;
  getRecoveryProtocols(category?: string): Promise<RecoveryProtocol[]>;
  getRecoveryProtocol(id: string): Promise<RecoveryProtocol | undefined>;
  getProtocolsByTargetFactor(targetFactor: string): Promise<RecoveryProtocol[]>;
  
  // User Protocol Preference methods
  upsertUserProtocolPreference(preference: InsertUserProtocolPreference): Promise<UserProtocolPreference>;
  getUserProtocolPreferences(userId: string): Promise<UserProtocolPreference[]>;
  getUserProtocolPreference(userId: string, protocolId: string): Promise<UserProtocolPreference | undefined>;
  getDownvotedProtocols(userId: string): Promise<string[]>; // Returns array of protocol IDs
  
  // Supplement methods
  createSupplement(supplement: InsertSupplement): Promise<Supplement>;
  getSupplements(userId: string): Promise<Supplement[]>;
  getActiveSupplement(userId: string, id: string): Promise<Supplement | undefined>;
  updateSupplement(id: string, userId: string, data: Partial<Supplement>): Promise<Supplement | undefined>;
  deleteSupplement(id: string, userId: string): Promise<void>;
  
  // Daily Reminder methods
  createDailyReminder(reminder: InsertDailyReminder): Promise<DailyReminder>;
  getDailyReminders(userId: string): Promise<DailyReminder[]>;
  getActiveRemindersForToday(userId: string): Promise<DailyReminder[]>;
  updateDailyReminder(id: string, userId: string, data: Partial<DailyReminder>): Promise<DailyReminder | undefined>;
  deleteDailyReminder(id: string, userId: string): Promise<void>;
  
  // Reminder Completion methods
  markReminderComplete(reminderId: string, userId: string, date: string): Promise<ReminderCompletion>;
  getReminderCompletions(userId: string, date?: string): Promise<ReminderCompletion[]>;
  getReminderStreak(reminderId: string, userId: string): Promise<number>;
  
  // Supplement Recommendation methods
  createSupplementRecommendation(recommendation: InsertSupplementRecommendation): Promise<SupplementRecommendation>;
  getSupplementRecommendations(userId: string, status?: string): Promise<SupplementRecommendation[]>;
  updateSupplementRecommendationStatus(id: string, userId: string, status: string): Promise<void>;

  // Scheduled Exercise Recommendation methods
  createScheduledExerciseRecommendation(recommendation: InsertScheduledExerciseRecommendation): Promise<ScheduledExerciseRecommendation>;
  getScheduledExerciseRecommendations(userId: string, status?: string): Promise<ScheduledExerciseRecommendation[]>;
  getScheduledExerciseRecommendationsByIntent(userId: string, intent: string, status?: string): Promise<ScheduledExerciseRecommendation[]>;
  updateScheduledExerciseRecommendation(id: string, userId: string, updates: Partial<ScheduledExerciseRecommendation>): Promise<void>;
  deleteScheduledExerciseRecommendation(id: string, userId: string): Promise<void>;
  autoScheduleUserTaskExercise(id: string, userId: string, scheduledDates: string[]): Promise<void>;
  getScheduledExercisesForDateRange(userId: string, startDate: Date, endDate: Date): Promise<ScheduledExerciseRecommendation[]>;

  // Scheduled Insight methods
  createScheduledInsight(insight: InsertScheduledInsight): Promise<ScheduledInsight>;
  getScheduledInsights(userId: string, status?: string): Promise<ScheduledInsight[]>;
  updateScheduledInsight(id: string, userId: string, updates: Partial<ScheduledInsight>): Promise<void>;
  deleteScheduledInsight(id: string, userId: string): Promise<void>;
  
  // Insight Feedback methods
  createInsightFeedback(feedback: InsertInsightFeedback): Promise<InsightFeedback>;
  
  // Meal Library methods
  createMealLibraryItem(meal: InsertMealLibrary): Promise<MealLibrary>;
  getMealLibraryItems(filters?: { status?: string; cuisines?: string[]; diets?: string[]; }): Promise<MealLibrary[]>;
  getMealLibraryItem(id: string): Promise<MealLibrary | undefined>;
  updateMealLibraryItem(id: string, updates: Partial<MealLibrary>): Promise<MealLibrary | undefined>;
  updateMealPerformance(id: string, incrementServed: boolean, feedback?: 'thumbs_up' | 'thumbs_down'): Promise<void>;
  deleteMealLibraryItem(id: string): Promise<void>;
  getLowPerformingMeals(threshold: number): Promise<MealLibrary[]>;
  
  createMealFeedback(feedback: InsertMealFeedback): Promise<MealFeedback>;
  getUserMealFeedback(userId: string): Promise<MealFeedback[]>;
  getMealFeedback(mealLibraryId: string): Promise<MealFeedback[]>;
  getPremiumUsersWhoLikedMeal(mealLibraryId: string): Promise<string[]>; // Returns user IDs
  
  getMealLibrarySettings(userId: string): Promise<MealLibrarySettings | undefined>;
  upsertMealLibrarySettings(settings: InsertMealLibrarySettings): Promise<MealLibrarySettings>;
  
  // Proactive Suggestion methods
  checkUserMetrics(userId: string): Promise<Array<{ metricType: string; currentValue: number; targetValue: number; deficit: number; priority: string }>>;
  generateProactiveSuggestion(userId: string, deficit: { metricType: string; currentValue: number; targetValue: number; deficit: number; priority: string }): Promise<any>;
  getActiveSuggestions(userId: string): Promise<any[]>;
  respondToSuggestion(userId: string, suggestionId: string, response: string, scheduledFor?: Date): Promise<any>;
  
  // Privacy & Compliance methods
  createUserConsent(consent: { userId: string; consentType: string; consentGiven: boolean; consentText?: string; ipAddress?: string; userAgent?: string }): Promise<any>;
  getUserConsent(userId: string, consentType?: string): Promise<any[]>;
  createAuditLog(log: { userId: string; action: string; resourceType?: string; resourceId?: string; details?: any; ipAddress?: string; userAgent?: string }): Promise<void>;
  getAuditLogsForUser(userId: string, limit?: number): Promise<any[]>;
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
      // Update existing user by ID - PRESERVE existing role unless explicitly set to admin
      const updateData: any = { ...userData, updatedAt: new Date() };
      
      // Don't overwrite the role if the existing user already has one, unless we're explicitly setting it to admin
      if (existingById[0].role && userData.role !== 'admin') {
        updateData.role = existingById[0].role; // Preserve existing role
      }
      
      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    }
    
    // Check if user exists by email
    if (userData.email) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingByEmail.length > 0) {
        // Update existing user by email - PRESERVE existing role unless explicitly set to admin
        const updateData: any = { ...userData, updatedAt: new Date() };
        
        // Don't overwrite the role if the existing user already has one, unless we're explicitly setting it to admin
        if (existingByEmail[0].role && userData.role !== 'admin') {
          updateData.role = existingByEmail[0].role; // Preserve existing role
        }
        
        const [user] = await db
          .update(users)
          .set(updateData)
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

  async getDashboardPreferences(userId: string): Promise<{ visible: string[], order: string[] } | null> {
    const result = await db.execute(
      sql`SELECT dashboard_preferences FROM users WHERE id = ${userId}`
    );
    const rows: any[] = result.rows || [];
    if (rows.length === 0 || !rows[0].dashboard_preferences) {
      return null;
    }
    return rows[0].dashboard_preferences as { visible: string[], order: string[] };
  }

  async saveDashboardPreferences(userId: string, preferences: { visible: string[], order: string[] }): Promise<void> {
    await db.execute(
      sql`UPDATE users SET dashboard_preferences = ${JSON.stringify(preferences)}::jsonb WHERE id = ${userId}`
    );
  }

  async getPageTilePreferences(userId: string, page: string): Promise<PageTilePreferences | null> {
    const result = await db.select()
      .from(pageTilePreferences)
      .where(and(
        eq(pageTilePreferences.userId, userId),
        eq(pageTilePreferences.page, page)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  async savePageTilePreferences(userId: string, page: string, preferences: { visible: string[], order: string[] }): Promise<PageTilePreferences> {
    // Use proper upsert with onConflictDoUpdate to handle the unique constraint
    const result = await db.insert(pageTilePreferences)
      .values({
        userId,
        page,
        visible: preferences.visible,
        order: preferences.order,
      })
      .onConflictDoUpdate({
        target: [pageTilePreferences.userId, pageTilePreferences.page],
        set: {
          visible: preferences.visible,
          order: preferences.order,
          updatedAt: new Date(),
        }
      })
      .returning();
    
    return result[0];
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

  async acceptEula(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        eulaAcceptedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Onboarding methods implementation
  async getOnboardingStatus(userId: string): Promise<{ 
    completed: boolean; 
    step: string | null; 
    startedAt: Date | null; 
    completedAt: Date | null;
    basicInfoComplete: boolean;
    trainingSetupComplete: boolean;
    mealsSetupComplete: boolean;
    supplementsSetupComplete: boolean;
    biomarkersSetupComplete: boolean;
  } | null> {
    const result = await db.execute(
      sql`SELECT 
        onboarding_completed, 
        onboarding_step, 
        onboarding_started_at, 
        onboarding_completed_at,
        basic_info_complete,
        training_setup_complete,
        meals_setup_complete,
        supplements_setup_complete,
        biomarkers_setup_complete
      FROM users WHERE id = ${userId}`
    );
    const rows: any[] = result.rows || [];
    if (rows.length === 0) {
      return null;
    }
    const row = rows[0];
    return {
      completed: row.onboarding_completed === 1,
      step: row.onboarding_step,
      startedAt: row.onboarding_started_at,
      completedAt: row.onboarding_completed_at,
      basicInfoComplete: row.basic_info_complete === 1,
      trainingSetupComplete: row.training_setup_complete === 1,
      mealsSetupComplete: row.meals_setup_complete === 1,
      supplementsSetupComplete: row.supplements_setup_complete === 1,
      biomarkersSetupComplete: row.biomarkers_setup_complete === 1,
    };
  }

  async updateOnboardingStep(userId: string, step: string): Promise<void> {
    await db.execute(
      sql`UPDATE users SET 
        onboarding_step = ${step}, 
        onboarding_started_at = COALESCE(onboarding_started_at, NOW()),
        updated_at = NOW()
      WHERE id = ${userId}`
    );
  }

  async completeOnboarding(userId: string): Promise<void> {
    await db.execute(
      sql`UPDATE users SET 
        onboarding_completed = 1,
        onboarding_completed_at = NOW(),
        onboarding_step = NULL,
        updated_at = NOW()
      WHERE id = ${userId}`
    );
  }

  async skipOnboardingStep(userId: string, currentStep: string, nextStep: string): Promise<boolean> {
    const result = await db.execute(
      sql`UPDATE users SET 
        onboarding_step = ${nextStep},
        updated_at = NOW()
      WHERE id = ${userId} AND onboarding_step = ${currentStep}`
    );
    // PostgreSQL returns rowCount for UPDATE queries
    return (result.rowCount ?? 0) > 0;
  }

  async updateOnboardingFlag(userId: string, flag: 'basicInfoComplete' | 'trainingSetupComplete' | 'mealsSetupComplete' | 'supplementsSetupComplete' | 'biomarkersSetupComplete', value: boolean): Promise<void> {
    const columnMap: Record<typeof flag, string> = {
      basicInfoComplete: 'basic_info_complete',
      trainingSetupComplete: 'training_setup_complete',
      mealsSetupComplete: 'meals_setup_complete',
      supplementsSetupComplete: 'supplements_setup_complete',
      biomarkersSetupComplete: 'biomarkers_setup_complete',
    };
    
    const column = columnMap[flag];
    const intValue = value ? 1 : 0;
    
    await db.execute(
      sql`UPDATE users SET 
        ${sql.raw(column)} = ${intValue},
        updated_at = NOW()
      WHERE id = ${userId}`
    );
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

  async updateBiomarker(id: string, userId: string, data: Partial<InsertBiomarker>): Promise<Biomarker | undefined> {
    const result = await db
      .update(biomarkers)
      .set(data)
      .where(and(eq(biomarkers.id, id), eq(biomarkers.userId, userId)))
      .returning();
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

  async getLatestBiomarkerByType(userId: string, type: string): Promise<Biomarker | undefined> {
    const result = await db
      .select()
      .from(biomarkers)
      .where(and(eq(biomarkers.userId, userId), eq(biomarkers.type, type)))
      .orderBy(desc(biomarkers.recordedAt))
      .limit(1);
    
    return result[0];
  }

  async createNutritionProfile(profile: InsertNutritionProfile): Promise<NutritionProfile> {
    const result = await db.insert(nutritionProfiles).values(profile).returning();
    return result[0];
  }

  async getNutritionProfile(userId: string): Promise<NutritionProfile | undefined> {
    const result = await db
      .select()
      .from(nutritionProfiles)
      .where(eq(nutritionProfiles.userId, userId))
      .limit(1);
    return result[0];
  }

  async updateNutritionProfile(userId: string, data: Partial<NutritionProfile>): Promise<NutritionProfile | undefined> {
    const result = await db
      .update(nutritionProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nutritionProfiles.userId, userId))
      .returning();
    return result[0];
  }

  async createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan> {
    const result = await db.insert(mealPlans).values(mealPlan).returning();
    return result[0];
  }

  async getMealPlans(userId: string): Promise<MealPlan[]> {
    // Get current date at start of day (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, userId),
          // Only return meals scheduled for today or future
          // If scheduledDate is null, include it (for backward compatibility)
          or(
            gte(mealPlans.scheduledDate, today),
            isNull(mealPlans.scheduledDate)
          )
        )
      )
      .orderBy(mealPlans.scheduledDate, mealPlans.mealType);
  }

  async updateMealFeedback(mealId: string, userId: string, feedback: string): Promise<MealPlan | undefined> {
    const result = await db
      .update(mealPlans)
      .set({ 
        userFeedback: feedback,
        feedbackAt: new Date()
      })
      .where(
        and(
          eq(mealPlans.id, mealId),
          eq(mealPlans.userId, userId)
        )
      )
      .returning();
    return result[0];
  }

  async deletePastMealPlans(userId: string): Promise<number> {
    // Delete meals scheduled before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db
      .delete(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, userId),
          lt(mealPlans.scheduledDate, today)
        )
      )
      .returning({ id: mealPlans.id });
    
    return result.length;
  }

  async deleteFutureMealsBeyondDate(userId: string, maxDate: Date): Promise<number> {
    // Delete meals scheduled after the maxDate to enforce 7-day cap
    const result = await db
      .delete(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, userId),
          gte(mealPlans.scheduledDate, maxDate)
        )
      )
      .returning({ id: mealPlans.id });
    
    return result.length;
  }

  async createFavoriteRecipe(favorite: InsertFavoriteRecipe): Promise<FavoriteRecipe> {
    const result = await db.insert(favoriteRecipes).values(favorite).returning();
    return result[0];
  }

  async getFavoriteRecipes(userId: string): Promise<FavoriteRecipe[]> {
    return await db
      .select()
      .from(favoriteRecipes)
      .where(eq(favoriteRecipes.userId, userId))
      .orderBy(desc(favoriteRecipes.createdAt));
  }

  async getFavoriteRecipeBySpoonacularId(userId: string, spoonacularRecipeId: number): Promise<FavoriteRecipe | undefined> {
    const result = await db
      .select()
      .from(favoriteRecipes)
      .where(
        and(
          eq(favoriteRecipes.userId, userId),
          eq(favoriteRecipes.spoonacularRecipeId, spoonacularRecipeId)
        )
      )
      .limit(1);
    return result[0];
  }

  async deleteFavoriteRecipe(id: string, userId: string): Promise<void> {
    await db
      .delete(favoriteRecipes)
      .where(and(eq(favoriteRecipes.id, id), eq(favoriteRecipes.userId, userId)));
  }

  async updateFavoriteRecipeNotes(id: string, userId: string, notes: string): Promise<FavoriteRecipe | undefined> {
    const result = await db
      .update(favoriteRecipes)
      .set({ notes })
      .where(and(eq(favoriteRecipes.id, id), eq(favoriteRecipes.userId, userId)))
      .returning();
    return result[0];
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

  async saveWorkoutExerciseFromAI(userId: string, exercise: { 
    exerciseName: string, 
    exerciseType: string, 
    description: string, 
    duration?: number, 
    scheduledDate?: Date,
    intensity?: string 
  }): Promise<TrainingSchedule> {
    // Convert exercise to training schedule format
    // Normalize scheduledDate to ensure it's a Date object
    const normalizedDate = exercise.scheduledDate ? new Date(exercise.scheduledDate) : new Date();
    
    const schedule: InsertTrainingSchedule = {
      userId,
      day: normalizedDate.toISOString().split('T')[0],
      workoutType: exercise.exerciseType,
      sessionType: 'workout',
      duration: exercise.duration || 30,
      intensity: exercise.intensity || 'moderate',
      description: exercise.description,
      exercises: [{ name: exercise.exerciseName, type: exercise.exerciseType }],
      scheduledFor: exercise.scheduledDate || null,
      coreProgram: 0,
      isOptional: 0,
      completed: 0,
    };

    const result = await db.insert(trainingSchedules).values(schedule).returning();
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

  async scheduleRecommendation(id: string, userId: string, scheduledAt: Date, trainingScheduleId: string | null): Promise<void> {
    await db
      .update(recommendations)
      .set({ 
        scheduledAt, 
        trainingScheduleId,
        dismissed: 1 // Hide from recommendation list once scheduled
      })
      .where(and(eq(recommendations.id, id), eq(recommendations.userId, userId)));
  }

  async recordRecommendationFeedback(id: string, userId: string, feedback: "positive" | "negative", reason?: string): Promise<void> {
    await db
      .update(recommendations)
      .set({ 
        userFeedback: feedback,
        dismissReason: reason || null,
        dismissed: feedback === "negative" ? 1 : 0 // Dismiss if negative feedback
      })
      .where(and(eq(recommendations.id, id), eq(recommendations.userId, userId)));
  }

  async getScheduledRecommendations(userId: string): Promise<Recommendation[]> {
    // Fetch all recommendations with scheduledAt set
    const allScheduled = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.userId, userId),
          sql`${recommendations.scheduledAt} IS NOT NULL`
        )
      )
      .orderBy(recommendations.scheduledAt);
    
    // Filter in JS to ensure proper timezone handling
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allScheduled.filter(rec => {
      if (!rec.scheduledAt) return false;
      const scheduledDate = new Date(rec.scheduledAt);
      return scheduledDate >= today;
    });
  }

  async getTodayScheduledRecommendations(userId: string, date: Date): Promise<Recommendation[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Fetch all scheduled recommendations and filter in JS
    const allScheduled = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.userId, userId),
          sql`${recommendations.scheduledAt} IS NOT NULL`
        )
      )
      .orderBy(recommendations.createdAt);
    
    return allScheduled.filter(rec => {
      if (!rec.scheduledAt) return false;
      const scheduledDate = new Date(rec.scheduledAt);
      return scheduledDate >= startOfDay && scheduledDate <= endOfDay;
    });
  }

  async rescheduleRecommendation(id: string, userId: string, newDate: Date): Promise<void> {
    await db
      .update(recommendations)
      .set({ scheduledAt: newDate })
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
    // Smart deduplication: find sessions for the same night
    // A night is defined by the wake date - sessions that wake on the same day are the same night
    // This handles cases where broken sessions have different bedtimes (e.g., 5:12 AM vs 10:42 PM)
    const wakeDate = new Date(session.waketime);
    const wakeDateOnly = new Date(wakeDate.getFullYear(), wakeDate.getMonth(), wakeDate.getDate());
    
    // Find all sessions for this user that wake on the same date (or within 12 hours)
    const wakeStart = new Date(wakeDateOnly);
    wakeStart.setHours(wakeStart.getHours() - 12); // 12 hours before wake date
    
    const wakeEnd = new Date(wakeDateOnly);
    wakeEnd.setHours(wakeEnd.getHours() + 36); // 36 hours after wake date (covers next day too)
    
    const existing = await db
      .select()
      .from(sleepSessions)
      .where(
        and(
          eq(sleepSessions.userId, session.userId),
          sql`${sleepSessions.waketime} >= ${wakeStart.toISOString()}`,
          sql`${sleepSessions.waketime} <= ${wakeEnd.toISOString()}`
        )
      )
      .orderBy(desc(sleepSessions.createdAt));

    if (existing.length > 0) {
      // Update the most recent one and delete all others
      const [updated] = await db
        .update(sleepSessions)
        .set(session)
        .where(eq(sleepSessions.id, existing[0].id))
        .returning();
      
      // Delete ALL other sessions in this wake time range (clean up all duplicates)
      if (existing.length > 1) {
        await db
          .delete(sleepSessions)
          .where(
            and(
              eq(sleepSessions.userId, session.userId),
              sql`${sleepSessions.waketime} >= ${wakeStart.toISOString()}`,
              sql`${sleepSessions.waketime} <= ${wakeEnd.toISOString()}`,
              sql`${sleepSessions.id} != ${existing[0].id}`
            )
          );
      }
      
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

  async createReadinessScore(score: InsertReadinessScore): Promise<ReadinessScore> {
    const result = await db.insert(readinessScores).values(score).returning();
    return result[0];
  }

  async getReadinessScores(userId: string, startDate?: Date, endDate?: Date): Promise<ReadinessScore[]> {
    let query = db
      .select()
      .from(readinessScores)
      .where(eq(readinessScores.userId, userId));

    if (startDate && endDate) {
      const result = await query.orderBy(desc(readinessScores.date));
      return result.filter(
        s => s.date >= startDate && s.date <= endDate
      );
    }

    return await query.orderBy(desc(readinessScores.date));
  }

  async getLatestReadinessScore(userId: string): Promise<ReadinessScore | undefined> {
    const result = await db
      .select()
      .from(readinessScores)
      .where(eq(readinessScores.userId, userId))
      .orderBy(desc(readinessScores.date))
      .limit(1);
    return result[0];
  }

  async getReadinessScoreForDate(userId: string, date: Date): Promise<ReadinessScore | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await db
      .select()
      .from(readinessScores)
      .where(
        and(
          eq(readinessScores.userId, userId),
          gte(readinessScores.date, startOfDay),
          lte(readinessScores.date, endOfDay)
        )
      )
      .orderBy(desc(readinessScores.createdAt))
      .limit(1);
    
    return result[0];
  }

  async getReadinessSettings(userId: string): Promise<ReadinessSettings | undefined> {
    const result = await db
      .select()
      .from(readinessSettings)
      .where(eq(readinessSettings.userId, userId))
      .limit(1);
    return result[0];
  }

  async upsertReadinessSettings(settings: InsertReadinessSettings): Promise<ReadinessSettings> {
    const existing = await this.getReadinessSettings(settings.userId);
    
    if (existing) {
      const result = await db
        .update(readinessSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(readinessSettings.userId, settings.userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(readinessSettings).values(settings).returning();
      return result[0];
    }
  }

  async getFitnessProfile(userId: string): Promise<FitnessProfile | undefined> {
    const result = await db
      .select()
      .from(fitnessProfiles)
      .where(eq(fitnessProfiles.userId, userId))
      .limit(1);
    return result[0];
  }

  async upsertFitnessProfile(profile: InsertFitnessProfile): Promise<FitnessProfile> {
    const existing = await this.getFitnessProfile(profile.userId);
    
    if (existing) {
      const result = await db
        .update(fitnessProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(fitnessProfiles.userId, profile.userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(fitnessProfiles).values(profile).returning();
      return result[0];
    }
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

  async deleteUser(id: string): Promise<void> {
    // Delete all user data with cascading deletes
    await Promise.all([
      db.delete(healthRecords).where(eq(healthRecords.userId, id)),
      db.delete(biomarkers).where(eq(biomarkers.userId, id)),
      db.delete(mealPlans).where(eq(mealPlans.userId, id)),
      db.delete(trainingSchedules).where(eq(trainingSchedules.userId, id)),
      db.delete(recommendations).where(eq(recommendations.userId, id)),
      db.delete(chatMessages).where(eq(chatMessages.userId, id)),
      db.delete(sleepSessions).where(eq(sleepSessions.userId, id)),
      db.delete(insights).where(eq(insights.userId, id)),
      db.delete(exerciseLogs).where(eq(exerciseLogs.userId, id)),
      db.delete(workoutSessions).where(eq(workoutSessions.userId, id)),
    ]);

    // Finally delete the user
    await db.delete(users).where(eq(users.id, id));
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

  async getMessageUsageForDate(userId: string, date: Date): Promise<{ userId: string; messageDate: Date; messageCount: number } | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await db
      .select()
      .from(messageUsage)
      .where(
        and(
          eq(messageUsage.userId, userId),
          gte(messageUsage.messageDate, startOfDay),
          lte(messageUsage.messageDate, endOfDay)
        )
      )
      .limit(1);
    
    return result[0] as { userId: string; messageDate: Date; messageCount: number } | undefined;
  }

  async incrementMessageUsage(userId: string, date: Date): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const existing = await this.getMessageUsageForDate(userId, date);
    
    if (existing) {
      // Increment existing count
      await db
        .update(messageUsage)
        .set({ 
          messageCount: existing.messageCount + 1,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(messageUsage.userId, userId),
            gte(messageUsage.messageDate, startOfDay)
          )
        );
    } else {
      // Create new record
      await db.insert(messageUsage).values({
        userId,
        messageDate: startOfDay,
        messageCount: 1,
      });
    }
  }

  async createInsight(insight: InsertInsight): Promise<Insight> {
    const result = await db.insert(insights).values(insight).returning();
    return result[0];
  }

  async getInsights(userId: string, limit: number = 10): Promise<Insight[]> {
    // Get insights that are not dismissed
    const allInsights = await db
      .select()
      .from(insights)
      .where(and(eq(insights.userId, userId), eq(insights.dismissed, 0)))
      .orderBy(desc(insights.createdAt))
      .limit(limit * 2); // Get more to account for filtering

    // Filter out insights that have been scheduled
    const scheduledInsightIds = await db
      .select({ insightId: scheduledInsights.insightId })
      .from(scheduledInsights)
      .where(eq(scheduledInsights.userId, userId));

    const scheduledIds = new Set(scheduledInsightIds.map(s => s.insightId).filter(Boolean));
    
    const filtered = allInsights.filter(insight => !scheduledIds.has(insight.id));
    
    // Return only the requested limit
    return filtered.slice(0, limit);
  }

  async getDailyInsights(userId: string, date: Date): Promise<Insight[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get insights that are not dismissed and not scheduled
    const allInsights = await db
      .select()
      .from(insights)
      .where(
        and(
          eq(insights.userId, userId),
          eq(insights.dismissed, 0),
          gte(insights.relevantDate, startOfDay),
          lte(insights.relevantDate, endOfDay)
        )
      )
      .orderBy(desc(insights.priority), desc(insights.createdAt));

    // Filter out insights that have been scheduled
    const scheduledInsightIds = await db
      .select({ insightId: scheduledInsights.insightId })
      .from(scheduledInsights)
      .where(eq(scheduledInsights.userId, userId));

    const scheduledIds = new Set(scheduledInsightIds.map(s => s.insightId).filter(Boolean));
    
    return allInsights.filter(insight => !scheduledIds.has(insight.id));
  }

  async dismissInsight(id: string, userId: string): Promise<void> {
    await db
      .update(insights)
      .set({ dismissed: 1 })
      .where(and(eq(insights.id, id), eq(insights.userId, userId)));
  }

  async createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession> {
    const result = await db.insert(workoutSessions).values(session).returning();
    return result[0];
  }

  async getWorkoutSessions(userId: string, startDate?: Date, endDate?: Date): Promise<WorkoutSession[]> {
    if (startDate && endDate) {
      return await db
        .select()
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            gte(workoutSessions.startTime, startDate),
            lte(workoutSessions.startTime, endDate)
          )
        )
        .orderBy(desc(workoutSessions.startTime));
    }
    
    return await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.startTime));
  }

  async getWorkoutSession(id: string, userId: string): Promise<WorkoutSession | undefined> {
    const result = await db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)));
    return result[0];
  }

  async matchWorkoutToSchedule(sessionId: string, scheduleId: string, userId: string): Promise<void> {
    // Update workout session with training schedule ID
    await db
      .update(workoutSessions)
      .set({ trainingScheduleId: scheduleId })
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));
    
    // Mark training schedule as completed
    await db
      .update(trainingSchedules)
      .set({ completed: 1, completedAt: new Date() })
      .where(and(eq(trainingSchedules.id, scheduleId), eq(trainingSchedules.userId, userId)));
  }

  async findMatchingSchedule(userId: string, workoutType: string, startTime: Date): Promise<TrainingSchedule | undefined> {
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startTime.getDay()];
    
    // Find incomplete training schedule for this day and workout type
    const result = await db
      .select()
      .from(trainingSchedules)
      .where(
        and(
          eq(trainingSchedules.userId, userId),
          eq(trainingSchedules.day, dayOfWeek),
          eq(trainingSchedules.workoutType, workoutType.toLowerCase()),
          eq(trainingSchedules.completed, 0)
        )
      )
      .limit(1);
    
    return result[0];
  }

  async createExerciseLog(log: InsertExerciseLog): Promise<ExerciseLog> {
    const result = await db.insert(exerciseLogs).values(log).returning();
    return result[0];
  }

  async getExerciseLogs(workoutSessionId: string): Promise<ExerciseLog[]> {
    return await db
      .select()
      .from(exerciseLogs)
      .where(eq(exerciseLogs.workoutSessionId, workoutSessionId))
      .orderBy(exerciseLogs.createdAt);
  }

  async getExercisesForSession(sessionId: string, userId: string): Promise<Exercise[]> {
    // Get unique exercise IDs from sets for this session
    const sets = await db
      .select()
      .from(exerciseSets)
      .where(
        and(
          eq(exerciseSets.workoutSessionId, sessionId),
          eq(exerciseSets.userId, userId)
        )
      );
    
    if (sets.length === 0) return [];
    
    const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];
    
    // Fetch the exercises using inArray
    const result = await db
      .select()
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));
    
    return result;
  }

  async getExerciseById(exerciseId: string): Promise<Exercise | undefined> {
    const result = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, exerciseId))
      .limit(1);
    
    return result[0];
  }

  async getAllExercises(): Promise<Exercise[]> {
    return await db
      .select()
      .from(exercises)
      .orderBy(exercises.name);
  }

  async swapExerciseInSession(
    sessionId: string,
    userId: string,
    oldExerciseId: string,
    newExerciseId: string
  ): Promise<{ success: boolean; setsUpdated: number }> {
    // Get all sets for the old exercise in this session
    const oldSets = await db
      .select()
      .from(exerciseSets)
      .where(
        and(
          eq(exerciseSets.workoutSessionId, sessionId),
          eq(exerciseSets.userId, userId),
          eq(exerciseSets.exerciseId, oldExerciseId)
        )
      );

    if (oldSets.length === 0) {
      return { success: false, setsUpdated: 0 };
    }

    // Get the new exercise details
    const newExercise = await this.getExerciseById(newExerciseId);
    if (!newExercise) {
      throw new Error("New exercise not found");
    }

    // Create new sets with the alternative exercise
    const newSets = oldSets.map(oldSet => ({
      workoutSessionId: sessionId,
      exerciseId: newExerciseId,
      userId,
      setIndex: oldSet.setIndex,
      targetRepsLow: oldSet.targetRepsLow,
      targetRepsHigh: oldSet.targetRepsHigh,
      weight: null, // Reset weight for new exercise
      reps: null, // Reset reps
      rpeLogged: null,
      completed: 0, // Reset completion status
      notes: null,
      restStartedAt: null,
      tempo: newExercise.tempoDefault || null,
    }));

    // Use transaction to ensure atomic swap
    // Delete first to avoid unique constraint conflicts on (workoutSessionId, setIndex)
    await db.transaction(async (tx) => {
      // Delete old sets first to free up setIndex slots
      await tx
        .delete(exerciseSets)
        .where(
          and(
            eq(exerciseSets.workoutSessionId, sessionId),
            eq(exerciseSets.userId, userId),
            eq(exerciseSets.exerciseId, oldExerciseId)
          )
        );
      
      // Insert new sets with freed setIndex values
      await tx.insert(exerciseSets).values(newSets);
    });

    return { success: true, setsUpdated: newSets.length };
  }

  async getSetsForSession(sessionId: string, userId: string): Promise<ExerciseSet[]> {
    return await db
      .select()
      .from(exerciseSets)
      .where(
        and(
          eq(exerciseSets.workoutSessionId, sessionId),
          eq(exerciseSets.userId, userId)
        )
      )
      .orderBy(exerciseSets.createdAt);
  }

  async updateExerciseSet(setId: string, userId: string, data: Partial<ExerciseSet>): Promise<ExerciseSet | undefined> {
    const result = await db
      .update(exerciseSets)
      .set(data)
      .where(
        and(
          eq(exerciseSets.id, setId),
          eq(exerciseSets.userId, userId)
        )
      )
      .returning();
    
    return result[0];
  }

  async addExerciseSet(sessionId: string, exerciseId: string, userId: string): Promise<ExerciseSet> {
    // Get the exercise details to determine tracking type and defaults
    const exercise = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, exerciseId))
      .limit(1);
    
    if (!exercise[0]) {
      throw new Error("Exercise not found");
    }

    // Get existing sets for this exercise in this session to calculate next setIndex
    const existingSets = await db
      .select()
      .from(exerciseSets)
      .where(
        and(
          eq(exerciseSets.workoutSessionId, sessionId),
          eq(exerciseSets.exerciseId, exerciseId),
          eq(exerciseSets.userId, userId)
        )
      )
      .orderBy(desc(exerciseSets.setIndex));
    
    const nextSetIndex = existingSets.length > 0 ? existingSets[0].setIndex + 1 : 1;
    
    // Build set data based on tracking type
    const trackingType = exercise[0].trackingType || 'weight_reps';
    const setData: any = {
      workoutSessionId: sessionId,
      exerciseId: exerciseId,
      userId,
      setIndex: nextSetIndex,
      completed: 0,
    };
    
    // Set type-specific fields - match the logic from workout session creation
    if (trackingType === 'weight_reps') {
      const isBodyweight = exercise[0].equipment === 'bodyweight';
      setData.weight = isBodyweight ? 0 : 20; // 0kg for bodyweight, 20kg default for weighted
      setData.reps = 8; // Default reps
      setData.targetRepsLow = 6;
      setData.targetRepsHigh = 12;
    } else if (trackingType === 'bodyweight_reps') {
      setData.weight = null;
      setData.reps = 8;
      setData.targetRepsLow = 6;
      setData.targetRepsHigh = 12;
    } else if (trackingType === 'distance_duration') {
      setData.distance = null;
      setData.duration = null;
      setData.weight = null;
      setData.reps = null;
    } else if (trackingType === 'duration_only') {
      setData.duration = null;
      setData.weight = null;
      setData.reps = null;
      setData.distance = null;
    }
    
    const result = await db.insert(exerciseSets).values(setData).returning();
    return result[0];
  }

  async getLastCompletedSetsForExercise(userId: string, exerciseId: string, limit: number = 5): Promise<ExerciseSet[]> {
    // Get the most recent completed workout sessions for this exercise
    const result = await db
      .select()
      .from(exerciseSets)
      .where(
        and(
          eq(exerciseSets.userId, userId),
          eq(exerciseSets.exerciseId, exerciseId),
          eq(exerciseSets.completed, 1)
        )
      )
      .orderBy(desc(exerciseSets.createdAt))
      .limit(limit);
    
    return result;
  }

  async calculateProgressiveOverload(
    userId: string,
    exerciseId: string
  ): Promise<{
    suggestedWeight: number | null;
    lastWeight: number | null;
    lastReps: number | null;
    reason: string;
  }> {
    // Get exercise details for increment step
    const exercise = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, exerciseId))
      .limit(1);
    
    if (!exercise[0]) {
      return {
        suggestedWeight: null,
        lastWeight: null,
        lastReps: null,
        reason: "Exercise not found"
      };
    }

    const incrementStep = exercise[0].incrementStep || 2.5;

    // Get last completed sets for this exercise
    const lastSets = await this.getLastCompletedSetsForExercise(userId, exerciseId, 10);
    
    if (lastSets.length === 0) {
      return {
        suggestedWeight: null,
        lastWeight: null,
        lastReps: null,
        reason: "No previous workout data"
      };
    }

    // Find the most recent session's sets
    const lastSessionId = lastSets[0].workoutSessionId;
    const lastSessionSets = lastSets.filter(s => s.workoutSessionId === lastSessionId);

    // Get the working sets (ignore warm-up sets - typically the heaviest sets)
    const maxWeight = Math.max(...lastSessionSets.map(s => s.weight || 0));
    const workingSets = lastSessionSets.filter(s => (s.weight || 0) >= maxWeight - incrementStep);

    if (workingSets.length === 0) {
      return {
        suggestedWeight: maxWeight,
        lastWeight: maxWeight,
        lastReps: lastSessionSets[0].reps || null,
        reason: "Use last weight"
      };
    }

    // Check if all working sets hit the top of the target range
    const allHitTopRange = workingSets.every(s => 
      s.reps !== null && 
      s.targetRepsHigh !== null && 
      s.reps >= s.targetRepsHigh
    );

    // Check average RPE of working sets
    const setsWithRPE = workingSets.filter(s => s.rpeLogged !== null);
    const avgRPE = setsWithRPE.length > 0
      ? setsWithRPE.reduce((sum, s) => sum + (s.rpeLogged || 0), 0) / setsWithRPE.length
      : null;

    const lastWeight = workingSets[0].weight || 0;
    const lastReps = workingSets[0].reps || null;

    // Double progression logic:
    // 1. If hit top of rep range on all sets AND RPE ≤ 8 (or no RPE data but hit top range), increase weight
    if (allHitTopRange) {
      if (avgRPE === null) {
        // No RPE data: use conservative approach - increase weight if hit top range on all sets
        return {
          suggestedWeight: lastWeight + incrementStep,
          lastWeight,
          lastReps,
          reason: `Hit ${workingSets[0].targetRepsHigh} reps on all sets`
        };
      } else if (avgRPE <= 8) {
        return {
          suggestedWeight: lastWeight + incrementStep,
          lastWeight,
          lastReps,
          reason: `Hit ${workingSets[0].targetRepsHigh} reps on all sets with RPE ≤ ${Math.round(avgRPE)}`
        };
      }
    }

    // 2. If struggling (RPE > 9 or not hitting bottom of range), suggest same weight
    const hitBottomRange = workingSets.some(s => 
      s.reps !== null && 
      s.targetRepsLow !== null && 
      s.reps >= s.targetRepsLow
    );

    if (!hitBottomRange || (avgRPE !== null && avgRPE > 9)) {
      return {
        suggestedWeight: lastWeight,
        lastWeight,
        lastReps,
        reason: avgRPE !== null && avgRPE > 9 
          ? "RPE too high, consolidate before progressing"
          : "Build reps before adding weight"
      };
    }

    // 3. Default: same weight, build more reps
    return {
      suggestedWeight: lastWeight,
      lastWeight,
      lastReps,
      reason: avgRPE === null 
        ? "Continue building reps in target range"
        : "Continue building reps in target range"
    };
  }

  async getTrainingLoad(userId: string, startDate: Date, endDate: Date): Promise<{
    weeklyLoad: number;
    monthlyLoad: number;
    weeklyHours: number;
  }> {
    const workouts = await this.getWorkoutSessions(userId, startDate, endDate);
    
    // Calculate intensity factor based on heart rate if available, otherwise use duration
    const calculateLoad = (workout: WorkoutSession) => {
      const baseLoad = workout.duration;
      const intensityFactor = workout.avgHeartRate 
        ? (workout.avgHeartRate / 140) // Normalize to average training HR
        : 1;
      return baseLoad * intensityFactor;
    };
    
    // Get current date info
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    // Calculate weekly load (last 7 days)
    const weeklyWorkouts = workouts.filter(w => w.startTime >= sevenDaysAgo);
    const weeklyLoad = Math.round(weeklyWorkouts.reduce((sum, w) => sum + calculateLoad(w), 0));
    
    // Calculate monthly load (last 30 days)
    const monthlyWorkouts = workouts.filter(w => w.startTime >= thirtyDaysAgo);
    const monthlyLoad = Math.round(monthlyWorkouts.reduce((sum, w) => sum + calculateLoad(w), 0));
    
    // Calculate weekly hours (last 7 days, in hours not minutes)
    const weeklyMinutes = weeklyWorkouts.reduce((sum, w) => sum + w.duration, 0);
    const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10; // Round to 1 decimal
    
    return {
      weeklyLoad,
      monthlyLoad,
      weeklyHours
    };
  }

  async getWorkoutStats(userId: string, startDate: Date, endDate: Date): Promise<{
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    byType: Array<{ type: string; count: number; duration: number; calories: number }>;
  }> {
    const workouts = await this.getWorkoutSessions(userId, startDate, endDate);
    
    const totalWorkouts = workouts.length;
    const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
    const totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    
    // Group by type
    const typeMap = new Map<string, { count: number; duration: number; calories: number }>();
    workouts.forEach(workout => {
      const current = typeMap.get(workout.workoutType) || { count: 0, duration: 0, calories: 0 };
      typeMap.set(workout.workoutType, {
        count: current.count + 1,
        duration: current.duration + workout.duration,
        calories: current.calories + (workout.calories || 0)
      });
    });
    const byType = Array.from(typeMap.entries())
      .map(([type, stats]) => ({ type, ...stats }))
      .sort((a, b) => b.count - a.count);
    
    return {
      totalWorkouts,
      totalDuration,
      totalCalories,
      byType
    };
  }

  async getWorkoutBiomarkerCorrelations(userId: string, startDate: Date, endDate: Date): Promise<{
    sleepQuality: { workoutDays: number; nonWorkoutDays: number; improvement: number };
    restingHR: { workoutDays: number; nonWorkoutDays: number; improvement: number };
  }> {
    const workouts = await this.getWorkoutSessions(userId, startDate, endDate);
    const sleepSessions = await this.getSleepSessions(userId, startDate, endDate);
    
    // Create set of workout dates (date only, no time)
    const workoutDates = new Set(
      workouts.map(w => w.startTime.toISOString().split('T')[0])
    );
    
    // Analyze sleep quality on workout days vs non-workout days
    const sleepOnWorkoutDays: number[] = [];
    const sleepOnNonWorkoutDays: number[] = [];
    
    sleepSessions.forEach(session => {
      const sessionDate = session.bedtime.toISOString().split('T')[0];
      if (workoutDates.has(sessionDate)) {
        if (session.sleepScore) sleepOnWorkoutDays.push(session.sleepScore);
      } else {
        if (session.sleepScore) sleepOnNonWorkoutDays.push(session.sleepScore);
      }
    });
    
    const avgSleepWorkout = sleepOnWorkoutDays.length > 0
      ? Math.round(sleepOnWorkoutDays.reduce((a, b) => a + b, 0) / sleepOnWorkoutDays.length)
      : 0;
    const avgSleepNonWorkout = sleepOnNonWorkoutDays.length > 0
      ? Math.round(sleepOnNonWorkoutDays.reduce((a, b) => a + b, 0) / sleepOnNonWorkoutDays.length)
      : 0;
    const sleepImprovement = avgSleepWorkout - avgSleepNonWorkout;
    
    // Analyze resting heart rate (using morning heart rate from biomarkers)
    const heartRateData = await db
      .select()
      .from(biomarkers)
      .where(
        and(
          eq(biomarkers.userId, userId),
          eq(biomarkers.type, 'heart-rate'),
          gte(biomarkers.recordedAt, startDate),
          lte(biomarkers.recordedAt, endDate)
        )
      );
    
    const hrOnWorkoutDays: number[] = [];
    const hrOnNonWorkoutDays: number[] = [];
    
    heartRateData.forEach(bm => {
      const bmDate = bm.recordedAt.toISOString().split('T')[0];
      if (workoutDates.has(bmDate)) {
        hrOnWorkoutDays.push(bm.value);
      } else {
        hrOnNonWorkoutDays.push(bm.value);
      }
    });
    
    const avgHRWorkout = hrOnWorkoutDays.length > 0
      ? Math.round(hrOnWorkoutDays.reduce((a, b) => a + b, 0) / hrOnWorkoutDays.length)
      : 0;
    const avgHRNonWorkout = hrOnNonWorkoutDays.length > 0
      ? Math.round(hrOnNonWorkoutDays.reduce((a, b) => a + b, 0) / hrOnNonWorkoutDays.length)
      : 0;
    const hrImprovement = avgHRNonWorkout - avgHRWorkout; // Lower HR is better
    
    return {
      sleepQuality: {
        workoutDays: avgSleepWorkout,
        nonWorkoutDays: avgSleepNonWorkout,
        improvement: sleepImprovement
      },
      restingHR: {
        workoutDays: avgHRWorkout,
        nonWorkoutDays: avgHRNonWorkout,
        improvement: hrImprovement
      }
    };
  }

  // Muscle Group Frequency Tracking implementation
  async recordMuscleGroupEngagement(
    userId: string,
    workoutSessionId: string,
    muscleGroup: string,
    engagementLevel: 'primary' | 'secondary',
    totalSets: number,
    totalVolume?: number
  ): Promise<void> {
    await db.insert(muscleGroupEngagements).values({
      userId,
      workoutSessionId,
      muscleGroup,
      engagementLevel,
      totalSets,
      totalVolume: totalVolume || null,
    });
  }

  async getMuscleGroupEngagements(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ muscleGroup: string; engagementLevel: string; totalSets: number; totalVolume: number | null; createdAt: Date }>> {
    const results = await db
      .select()
      .from(muscleGroupEngagements)
      .where(
        and(
          eq(muscleGroupEngagements.userId, userId),
          gte(muscleGroupEngagements.createdAt, startDate),
          lte(muscleGroupEngagements.createdAt, endDate)
        )
      )
      .orderBy(desc(muscleGroupEngagements.createdAt));
    
    return results.map(r => ({
      muscleGroup: r.muscleGroup,
      engagementLevel: r.engagementLevel,
      totalSets: r.totalSets,
      totalVolume: r.totalVolume,
      createdAt: r.createdAt,
    }));
  }

  async getMuscleGroupFrequency(
    userId: string,
    daysBack: number = 14
  ): Promise<Array<{ muscleGroup: string; lastTrained: Date | null; timesTrainedInPeriod: number; totalSets: number; totalVolume: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);
    
    const engagements = await db
      .select()
      .from(muscleGroupEngagements)
      .where(
        and(
          eq(muscleGroupEngagements.userId, userId),
          gte(muscleGroupEngagements.createdAt, startDate),
          lte(muscleGroupEngagements.createdAt, endDate)
        )
      )
      .orderBy(desc(muscleGroupEngagements.createdAt));
    
    // Group by muscle group, tracking distinct workout sessions
    const frequencyMap = new Map<string, { 
      lastTrained: Date; 
      workoutSessionIds: Set<string>; 
      sets: number; 
      volume: number 
    }>();
    
    engagements.forEach(eng => {
      const current = frequencyMap.get(eng.muscleGroup);
      if (!current) {
        frequencyMap.set(eng.muscleGroup, {
          lastTrained: eng.createdAt,
          workoutSessionIds: new Set([eng.workoutSessionId]),
          sets: eng.totalSets,
          volume: eng.totalVolume || 0,
        });
      } else {
        // Update if this is more recent
        if (eng.createdAt > current.lastTrained) {
          current.lastTrained = eng.createdAt;
        }
        // Track distinct workout sessions (avoid double-counting primary + secondary from same workout)
        current.workoutSessionIds.add(eng.workoutSessionId);
        current.sets += eng.totalSets;
        current.volume += (eng.totalVolume || 0);
      }
    });
    
    return Array.from(frequencyMap.entries()).map(([muscleGroup, data]) => ({
      muscleGroup,
      lastTrained: data.lastTrained,
      timesTrainedInPeriod: data.workoutSessionIds.size, // Count distinct sessions, not engagement records
      totalSets: data.sets,
      totalVolume: data.volume,
    }));
  }

  async getMuscleGroupLastTrainedDate(userId: string, muscleGroup: string): Promise<Date | null> {
    const result = await db
      .select()
      .from(muscleGroupEngagements)
      .where(
        and(
          eq(muscleGroupEngagements.userId, userId),
          eq(muscleGroupEngagements.muscleGroup, muscleGroup)
        )
      )
      .orderBy(desc(muscleGroupEngagements.createdAt))
      .limit(1);
    
    return result[0]?.createdAt || null;
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const result = await db.insert(goals).values(goal).returning();
    return result[0];
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  async getGoal(id: string, userId: string): Promise<Goal | undefined> {
    const result = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
    return result[0];
  }

  async updateGoal(id: string, userId: string, data: Partial<Goal>): Promise<Goal | undefined> {
    const result = await db
      .update(goals)
      .set(data)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    return result[0];
  }

  async updateGoalProgress(goalId: string, userId: string, currentValue: number): Promise<Goal | undefined> {
    const goal = await this.getGoal(goalId, userId);
    if (!goal) return undefined;

    const updateData: Partial<Goal> = {
      currentValue,
    };

    // Check if goal is achieved
    const isAchieved = currentValue >= goal.targetValue;
    if (isAchieved && goal.status !== 'achieved') {
      updateData.status = 'achieved';
      updateData.achievedAt = new Date();
    }

    const result = await db
      .update(goals)
      .set(updateData)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteGoal(id: string, userId: string): Promise<void> {
    await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  }

  async createAiAction(action: InsertAiAction): Promise<AiAction> {
    const result = await db.insert(aiActions).values(action).returning();
    return result[0];
  }

  async getAiActions(userId: string, limit: number = 100): Promise<AiAction[]> {
    return await db
      .select()
      .from(aiActions)
      .where(eq(aiActions.userId, userId))
      .orderBy(desc(aiActions.createdAt))
      .limit(limit);
  }

  async getAiActionsByType(userId: string, actionType: string): Promise<AiAction[]> {
    return await db
      .select()
      .from(aiActions)
      .where(and(eq(aiActions.userId, userId), eq(aiActions.actionType, actionType)))
      .orderBy(desc(aiActions.createdAt));
  }

  async createExerciseFeedback(feedback: InsertExerciseFeedback): Promise<ExerciseFeedback> {
    const result = await db.insert(exerciseFeedback).values(feedback).returning();
    return result[0];
  }

  async getExerciseFeedback(userId: string, limit?: number): Promise<ExerciseFeedback[]> {
    let query = db
      .select()
      .from(exerciseFeedback)
      .where(eq(exerciseFeedback.userId, userId))
      .orderBy(desc(exerciseFeedback.createdAt));
    
    if (limit) {
      query = query.limit(limit) as any;
    }
    
    return await query;
  }

  // Recovery Protocol methods
  async createRecoveryProtocol(protocol: InsertRecoveryProtocol): Promise<RecoveryProtocol> {
    const result = await db.insert(recoveryProtocols).values(protocol).returning();
    return result[0];
  }

  async getRecoveryProtocols(category?: string): Promise<RecoveryProtocol[]> {
    if (category) {
      return await db
        .select()
        .from(recoveryProtocols)
        .where(eq(recoveryProtocols.category, category))
        .orderBy(desc(recoveryProtocols.createdAt));
    }
    return await db
      .select()
      .from(recoveryProtocols)
      .orderBy(desc(recoveryProtocols.createdAt));
  }

  async getRecoveryProtocol(id: string): Promise<RecoveryProtocol | undefined> {
    const result = await db
      .select()
      .from(recoveryProtocols)
      .where(eq(recoveryProtocols.id, id));
    return result[0];
  }

  async getProtocolsByTargetFactor(targetFactor: string): Promise<RecoveryProtocol[]> {
    return await db
      .select()
      .from(recoveryProtocols)
      .where(sql`${targetFactor} = ANY(${recoveryProtocols.targetFactors})`)
      .orderBy(desc(recoveryProtocols.createdAt));
  }

  // User Protocol Preference methods
  async upsertUserProtocolPreference(preference: InsertUserProtocolPreference): Promise<UserProtocolPreference> {
    // Check if preference exists
    const existing = await db
      .select()
      .from(userProtocolPreferences)
      .where(
        and(
          eq(userProtocolPreferences.userId, preference.userId),
          eq(userProtocolPreferences.protocolId, preference.protocolId)
        )
      );

    if (existing.length > 0) {
      // Update existing
      const result = await db
        .update(userProtocolPreferences)
        .set({
          ...preference,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userProtocolPreferences.userId, preference.userId),
            eq(userProtocolPreferences.protocolId, preference.protocolId)
          )
        )
        .returning();
      return result[0];
    }

    // Insert new
    const result = await db.insert(userProtocolPreferences).values(preference).returning();
    return result[0];
  }

  async getUserProtocolPreferences(userId: string): Promise<UserProtocolPreference[]> {
    return await db
      .select()
      .from(userProtocolPreferences)
      .where(eq(userProtocolPreferences.userId, userId))
      .orderBy(desc(userProtocolPreferences.updatedAt));
  }

  async getUserProtocolPreference(userId: string, protocolId: string): Promise<UserProtocolPreference | undefined> {
    const result = await db
      .select()
      .from(userProtocolPreferences)
      .where(
        and(
          eq(userProtocolPreferences.userId, userId),
          eq(userProtocolPreferences.protocolId, protocolId)
        )
      );
    return result[0];
  }

  async getDownvotedProtocols(userId: string): Promise<string[]> {
    const result = await db
      .select({ protocolId: userProtocolPreferences.protocolId })
      .from(userProtocolPreferences)
      .where(
        and(
          eq(userProtocolPreferences.userId, userId),
          eq(userProtocolPreferences.preference, 'downvote')
        )
      );
    return result.map(r => r.protocolId);
  }

  // Supplement methods
  async createSupplement(supplement: InsertSupplement): Promise<Supplement> {
    const result = await db.insert(supplements).values(supplement).returning();
    return result[0];
  }

  async getSupplements(userId: string): Promise<Supplement[]> {
    return await db
      .select()
      .from(supplements)
      .where(and(eq(supplements.userId, userId), eq(supplements.active, 1)))
      .orderBy(supplements.timing, supplements.name);
  }

  async getActiveSupplement(userId: string, id: string): Promise<Supplement | undefined> {
    const result = await db
      .select()
      .from(supplements)
      .where(
        and(
          eq(supplements.id, id),
          eq(supplements.userId, userId),
          eq(supplements.active, 1)
        )
      );
    return result[0];
  }

  async updateSupplement(id: string, userId: string, data: Partial<Supplement>): Promise<Supplement | undefined> {
    const result = await db
      .update(supplements)
      .set(data)
      .where(and(eq(supplements.id, id), eq(supplements.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteSupplement(id: string, userId: string): Promise<void> {
    await db
      .update(supplements)
      .set({ active: 0 })
      .where(and(eq(supplements.id, id), eq(supplements.userId, userId)));
  }

  // Daily Reminder methods
  async createDailyReminder(reminder: InsertDailyReminder): Promise<DailyReminder> {
    const result = await db.insert(dailyReminders).values(reminder).returning();
    return result[0];
  }

  async getDailyReminders(userId: string): Promise<DailyReminder[]> {
    return await db
      .select()
      .from(dailyReminders)
      .where(and(eq(dailyReminders.userId, userId), eq(dailyReminders.active, 1)))
      .orderBy(dailyReminders.timeOfDay, dailyReminders.title);
  }

  async getActiveRemindersForToday(userId: string): Promise<DailyReminder[]> {
    return await db
      .select()
      .from(dailyReminders)
      .where(
        and(
          eq(dailyReminders.userId, userId),
          eq(dailyReminders.active, 1),
          eq(dailyReminders.frequency, 'daily')
        )
      )
      .orderBy(dailyReminders.timeOfDay);
  }

  async updateDailyReminder(id: string, userId: string, data: Partial<DailyReminder>): Promise<DailyReminder | undefined> {
    const result = await db
      .update(dailyReminders)
      .set(data)
      .where(and(eq(dailyReminders.id, id), eq(dailyReminders.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteDailyReminder(id: string, userId: string): Promise<void> {
    await db
      .update(dailyReminders)
      .set({ active: 0 })
      .where(and(eq(dailyReminders.id, id), eq(dailyReminders.userId, userId)));
  }

  // Reminder Completion methods
  async markReminderComplete(reminderId: string, userId: string, date: string): Promise<ReminderCompletion> {
    const result = await db
      .insert(reminderCompletions)
      .values({ reminderId, userId, date })
      .returning();
    return result[0];
  }

  async getReminderCompletions(userId: string, date?: string): Promise<ReminderCompletion[]> {
    if (date) {
      return await db
        .select()
        .from(reminderCompletions)
        .where(
          and(
            eq(reminderCompletions.userId, userId),
            eq(reminderCompletions.date, date)
          )
        );
    }
    return await db
      .select()
      .from(reminderCompletions)
      .where(eq(reminderCompletions.userId, userId))
      .orderBy(desc(reminderCompletions.completedAt));
  }

  async getReminderStreak(reminderId: string, userId: string): Promise<number> {
    const completions = await db
      .select({ date: reminderCompletions.date })
      .from(reminderCompletions)
      .where(
        and(
          eq(reminderCompletions.reminderId, reminderId),
          eq(reminderCompletions.userId, userId)
        )
      )
      .orderBy(desc(reminderCompletions.date));

    let streak = 0;
    let expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);

    for (const completion of completions) {
      const completionDate = new Date(completion.date);
      if (completionDate.toDateString() === expectedDate.toDateString()) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // Supplement Recommendation methods
  async createSupplementRecommendation(recommendation: InsertSupplementRecommendation): Promise<SupplementRecommendation> {
    const result = await db.insert(supplementRecommendations).values(recommendation).returning();
    return result[0];
  }

  async getSupplementRecommendations(userId: string, status?: string): Promise<SupplementRecommendation[]> {
    if (status) {
      return await db
        .select()
        .from(supplementRecommendations)
        .where(
          and(
            eq(supplementRecommendations.userId, userId),
            eq(supplementRecommendations.status, status)
          )
        )
        .orderBy(desc(supplementRecommendations.recommendedAt));
    }
    return await db
      .select()
      .from(supplementRecommendations)
      .where(eq(supplementRecommendations.userId, userId))
      .orderBy(desc(supplementRecommendations.recommendedAt));
  }

  async updateSupplementRecommendationStatus(id: string, userId: string, status: string): Promise<void> {
    await db
      .update(supplementRecommendations)
      .set({ status })
      .where(
        and(
          eq(supplementRecommendations.id, id),
          eq(supplementRecommendations.userId, userId)
        )
      );
  }

  // Scheduled Exercise Recommendation methods
  async createScheduledExerciseRecommendation(recommendation: InsertScheduledExerciseRecommendation): Promise<ScheduledExerciseRecommendation> {
    const result = await db.insert(scheduledExerciseRecommendations).values(recommendation).returning();
    return result[0];
  }

  async getScheduledExerciseRecommendations(userId: string, status?: string): Promise<ScheduledExerciseRecommendation[]> {
    if (status) {
      return await db
        .select()
        .from(scheduledExerciseRecommendations)
        .where(
          and(
            eq(scheduledExerciseRecommendations.userId, userId),
            eq(scheduledExerciseRecommendations.status, status)
          )
        )
        .orderBy(desc(scheduledExerciseRecommendations.recommendedAt));
    }
    return await db
      .select()
      .from(scheduledExerciseRecommendations)
      .where(eq(scheduledExerciseRecommendations.userId, userId))
      .orderBy(desc(scheduledExerciseRecommendations.recommendedAt));
  }

  async updateScheduledExerciseRecommendation(id: string, userId: string, updates: Partial<ScheduledExerciseRecommendation>): Promise<void> {
    await db
      .update(scheduledExerciseRecommendations)
      .set(updates)
      .where(
        and(
          eq(scheduledExerciseRecommendations.id, id),
          eq(scheduledExerciseRecommendations.userId, userId)
        )
      );
  }

  async deleteScheduledExerciseRecommendation(id: string, userId: string): Promise<void> {
    await db
      .delete(scheduledExerciseRecommendations)
      .where(
        and(
          eq(scheduledExerciseRecommendations.id, id),
          eq(scheduledExerciseRecommendations.userId, userId)
        )
      );
  }

  async getScheduledExerciseRecommendationsByIntent(userId: string, intent: string, status?: string): Promise<ScheduledExerciseRecommendation[]> {
    const conditions = [
      eq(scheduledExerciseRecommendations.userId, userId),
      eq(scheduledExerciseRecommendations.intent, intent)
    ];
    
    if (status) {
      conditions.push(eq(scheduledExerciseRecommendations.status, status));
    }
    
    return await db
      .select()
      .from(scheduledExerciseRecommendations)
      .where(and(...conditions))
      .orderBy(desc(scheduledExerciseRecommendations.recommendedAt));
  }

  async autoScheduleUserTaskExercise(id: string, userId: string, scheduledDates: string[]): Promise<void> {
    await db
      .update(scheduledExerciseRecommendations)
      .set({
        status: 'scheduled',
        scheduledDates: scheduledDates,
        scheduledAt: new Date(),
        userFeedback: 'accepted_auto'
      })
      .where(
        and(
          eq(scheduledExerciseRecommendations.id, id),
          eq(scheduledExerciseRecommendations.userId, userId)
        )
      );
  }

  async getScheduledExercisesForDateRange(userId: string, startDate: Date, endDate: Date): Promise<ScheduledExerciseRecommendation[]> {
    // Get all scheduled exercises for user
    const exercises = await db
      .select()
      .from(scheduledExerciseRecommendations)
      .where(
        and(
          eq(scheduledExerciseRecommendations.userId, userId),
          eq(scheduledExerciseRecommendations.status, 'scheduled')
        )
      );

    // Filter by date range in application logic (since we're storing dates as array)
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    return exercises.filter(ex => {
      if (!ex.scheduledDates || ex.scheduledDates.length === 0) return false;
      return ex.scheduledDates.some(date => {
        const dateStr = new Date(date).toISOString().split('T')[0];
        return dateStr >= startStr && dateStr <= endStr;
      });
    });
  }

  private getWeekKey(date: Date): string {
    // Get ISO week number
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }

  // Scheduled Insight methods
  async createScheduledInsight(insight: InsertScheduledInsight): Promise<ScheduledInsight> {
    const result = await db.insert(scheduledInsights).values(insight).returning();
    return result[0];
  }

  async getScheduledInsights(userId: string, status?: string): Promise<ScheduledInsight[]> {
    if (status) {
      return await db
        .select()
        .from(scheduledInsights)
        .where(
          and(
            eq(scheduledInsights.userId, userId),
            eq(scheduledInsights.status, status)
          )
        )
        .orderBy(desc(scheduledInsights.recommendedAt));
    }
    return await db
      .select()
      .from(scheduledInsights)
      .where(eq(scheduledInsights.userId, userId))
      .orderBy(desc(scheduledInsights.recommendedAt));
  }

  async updateScheduledInsight(id: string, userId: string, updates: Partial<ScheduledInsight>): Promise<void> {
    await db
      .update(scheduledInsights)
      .set(updates)
      .where(
        and(
          eq(scheduledInsights.id, id),
          eq(scheduledInsights.userId, userId)
        )
      );
  }

  async deleteScheduledInsight(id: string, userId: string): Promise<void> {
    await db
      .delete(scheduledInsights)
      .where(
        and(
          eq(scheduledInsights.id, id),
          eq(scheduledInsights.userId, userId)
        )
      );
  }

  // Insight Feedback methods
  async createInsightFeedback(feedback: InsertInsightFeedback): Promise<InsightFeedback> {
    const result = await db.insert(insightFeedback).values(feedback).returning();
    return result[0];
  }

  // Meal Library methods
  async createMealLibraryItem(meal: InsertMealLibrary): Promise<MealLibrary> {
    const result = await db.insert(mealLibrary).values(meal).returning();
    return result[0];
  }

  async getMealLibraryItems(filters?: { status?: string; cuisines?: string[]; diets?: string[]; }): Promise<MealLibrary[]> {
    let query = db.select().from(mealLibrary);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(mealLibrary.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(mealLibrary.importedAt));
  }

  async getMealLibraryItem(id: string): Promise<MealLibrary | undefined> {
    const result = await db.select().from(mealLibrary).where(eq(mealLibrary.id, id));
    return result[0];
  }

  async updateMealLibraryItem(id: string, updates: Partial<MealLibrary>): Promise<MealLibrary | undefined> {
    const result = await db
      .update(mealLibrary)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mealLibrary.id, id))
      .returning();
    return result[0];
  }

  async updateMealPerformance(id: string, incrementServed: boolean, feedback?: 'thumbs_up' | 'thumbs_down'): Promise<void> {
    const meal = await this.getMealLibraryItem(id);
    if (!meal) return;

    const updates: Partial<MealLibrary> = {};
    
    if (incrementServed) {
      updates.totalServed = (meal.totalServed || 0) + 1;
    }
    
    if (feedback === 'thumbs_up') {
      updates.thumbsUpCount = (meal.thumbsUpCount || 0) + 1;
    } else if (feedback === 'thumbs_down') {
      updates.thumbsDownCount = (meal.thumbsDownCount || 0) + 1;
    }

    // Calculate new conversion rate
    const totalServed = updates.totalServed || meal.totalServed || 1;
    const thumbsUp = updates.thumbsUpCount || meal.thumbsUpCount || 0;
    updates.conversionRate = totalServed > 0 ? thumbsUp / totalServed : 0;

    await this.updateMealLibraryItem(id, updates);
  }

  async deleteMealLibraryItem(id: string): Promise<void> {
    await db.delete(mealLibrary).where(eq(mealLibrary.id, id));
  }

  async getLowPerformingMeals(threshold: number): Promise<MealLibrary[]> {
    return await db
      .select()
      .from(mealLibrary)
      .where(
        and(
          eq(mealLibrary.status, 'active'),
          sql`${mealLibrary.totalServed} > 0`,
          sql`${mealLibrary.thumbsDownCount}::float / ${mealLibrary.totalServed} >= ${threshold}`
        )
      )
      .orderBy(desc(sql`${mealLibrary.thumbsDownCount}::float / ${mealLibrary.totalServed}`));
  }

  async createMealFeedback(feedback: InsertMealFeedback): Promise<MealFeedback> {
    const result = await db.insert(mealFeedback).values(feedback).returning();
    return result[0];
  }

  async getUserMealFeedback(userId: string): Promise<MealFeedback[]> {
    return await db
      .select()
      .from(mealFeedback)
      .where(eq(mealFeedback.userId, userId))
      .orderBy(desc(mealFeedback.createdAt));
  }

  async getMealFeedback(mealLibraryId: string): Promise<MealFeedback[]> {
    return await db
      .select()
      .from(mealFeedback)
      .where(eq(mealFeedback.mealLibraryId, mealLibraryId))
      .orderBy(desc(mealFeedback.createdAt));
  }

  async getPremiumUsersWhoLikedMeal(mealLibraryId: string): Promise<string[]> {
    const result = await db
      .select({ userId: mealFeedback.userId })
      .from(mealFeedback)
      .where(
        and(
          eq(mealFeedback.mealLibraryId, mealLibraryId),
          eq(mealFeedback.feedback, 'thumbs_up'),
          eq(mealFeedback.userWasPremium, 1)
        )
      );
    return result.map(r => r.userId);
  }

  async getMealLibrarySettings(userId: string): Promise<MealLibrarySettings | undefined> {
    const result = await db
      .select()
      .from(mealLibrarySettings)
      .where(eq(mealLibrarySettings.userId, userId));
    return result[0];
  }

  async upsertMealLibrarySettings(settings: InsertMealLibrarySettings): Promise<MealLibrarySettings> {
    const existing = await this.getMealLibrarySettings(settings.userId);
    
    if (existing) {
      const result = await db
        .update(mealLibrarySettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(mealLibrarySettings.userId, settings.userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(mealLibrarySettings).values(settings).returning();
      return result[0];
    }
  }

  async getFilteredMealLibraryItems(userId: string, filters: {
    mealType?: string;
    diet?: string;
    intolerances?: string[];
    maxCalories?: number;
    minCalories?: number;
    maxCarbs?: number;
    minProtein?: number;
    cuisines?: string[];
    count?: number;
  }): Promise<MealLibrary[]> {
    // Get user's meal feedback to exclude thumbs down and boost thumbs up
    const userFeedback = await this.getUserMealFeedback(userId);
    const thumbsDownIds = userFeedback
      .filter(f => f.feedback === 'thumbs_down')
      .map(f => f.mealLibraryId);
    const thumbsUpIds = userFeedback
      .filter(f => f.feedback === 'thumbs_up')
      .map(f => f.mealLibraryId);

    // Get active meals from library
    let query = db
      .select()
      .from(mealLibrary)
      .where(
        and(
          eq(mealLibrary.status, 'active'),
          // Exclude meals user disliked
          thumbsDownIds.length > 0 ? sql`${mealLibrary.id} NOT IN (${sql.join(thumbsDownIds.map(id => sql`${id}`), sql`, `)})` : undefined,
          // Filter out meals with <60% approval (approval = thumbs_up / total_served >= 0.6)
          sql`(${mealLibrary.totalServed} = 0 OR ${mealLibrary.thumbsUpCount}::float / ${mealLibrary.totalServed} >= 0.6)`
        )
      );

    // Apply filters
    const conditions = [];
    
    // Meal type filter (breakfast/lunch/dinner)
    if (filters.mealType) {
      conditions.push(
        sql`${filters.mealType.toLowerCase()} = ANY(${mealLibrary.mealTypes})`
      );
    }

    // Diet filter
    if (filters.diet) {
      conditions.push(
        sql`${filters.diet} = ANY(${mealLibrary.diets})`
      );
    }

    // Calorie filters
    if (filters.minCalories) {
      conditions.push(sql`${mealLibrary.calories} >= ${filters.minCalories}`);
    }
    if (filters.maxCalories) {
      conditions.push(sql`${mealLibrary.calories} <= ${filters.maxCalories}`);
    }

    // Macro filters
    if (filters.maxCarbs) {
      conditions.push(sql`${mealLibrary.carbs} <= ${filters.maxCarbs}`);
    }
    if (filters.minProtein) {
      conditions.push(sql`${mealLibrary.protein} >= ${filters.minProtein}`);
    }

    // Cuisine filter
    if (filters.cuisines && filters.cuisines.length > 0) {
      conditions.push(
        sql`${mealLibrary.cuisines} && ARRAY[${sql.join(filters.cuisines.map(c => sql`${c}`), sql`, `)}]::text[]`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Get all matching meals
    const allMeals = await query;

    if (allMeals.length === 0) {
      return [];
    }

    // Apply rotation weight: thumbs up meals get 2x chance using weighted random selection
    const requestedCount = filters.count || 5;
    const selectedMeals: MealLibrary[] = [];
    const mealPool = [...allMeals]; // Copy array to avoid modifying original
    
    // Build weight map: thumbs up meals have weight 2, others have weight 1
    const weights = mealPool.map(meal => 
      thumbsUpIds.includes(meal.id) ? 2 : 1
    );
    
    // Select meals using weighted random selection without replacement
    for (let i = 0; i < Math.min(requestedCount, mealPool.length); i++) {
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      
      for (let j = 0; j < mealPool.length; j++) {
        random -= weights[j];
        if (random <= 0) {
          selectedMeals.push(mealPool[j]);
          // Remove selected meal from pool to avoid duplicates
          mealPool.splice(j, 1);
          weights.splice(j, 1);
          break;
        }
      }
    }

    return selectedMeals;
  }

  // Proactive Suggestion implementations
  async checkUserMetrics(userId: string): Promise<Array<{ metricType: string; currentValue: number; targetValue: number; deficit: number; priority: string }>> {
    const { metricMonitor } = await import("./services/metricMonitor");
    const deficits = await metricMonitor.checkMetrics(userId);
    return deficits;
  }

  async generateProactiveSuggestion(userId: string, deficit: { metricType: string; currentValue: number; targetValue: number; deficit: number; priority: string }): Promise<any> {
    const { suggestionGenerator } = await import("./services/suggestionGenerator");
    const { metricMonitor } = await import("./services/metricMonitor");
    const { proactiveSuggestions, userResponsePatterns } = await import("@shared/schema");
    
    // Check if should intervene now
    const shouldIntervene = await metricMonitor.shouldIntervene(userId, deficit.metricType);
    if (!shouldIntervene) {
      return { message: "Not the optimal time to intervene yet" };
    }

    // Check if already have active suggestion for this metric
    const hasActive = await metricMonitor.hasActiveSuggestion(userId, deficit.metricType);
    if (hasActive) {
      return { message: "Already have an active suggestion for this metric" };
    }

    // Generate AI suggestion
    const suggestion = await suggestionGenerator.generateSuggestion(userId, deficit as any);
    
    // Calculate expiry (end of day)
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Save suggestion to database
    const [saved] = await db.insert(proactiveSuggestions).values({
      userId,
      metricType: deficit.metricType,
      currentValue: deficit.currentValue,
      targetValue: deficit.targetValue,
      deficit: deficit.deficit,
      suggestedActivity: suggestion.suggestedActivity,
      activityType: suggestion.activityType,
      duration: suggestion.duration,
      reasoning: suggestion.reasoning,
      priority: suggestion.priority,
      status: 'pending',
      expiresAt: endOfDay,
      notifiedAt: new Date(),
    }).returning();

    return saved;
  }

  async getActiveSuggestions(userId: string): Promise<any[]> {
    const { proactiveSuggestions } = await import("@shared/schema");
    const suggestions = await db.select()
      .from(proactiveSuggestions)
      .where(and(
        eq(proactiveSuggestions.userId, userId),
        eq(proactiveSuggestions.status, 'pending'),
        gte(proactiveSuggestions.expiresAt, new Date())
      ))
      .orderBy(desc(proactiveSuggestions.createdAt));
    
    return suggestions;
  }

  async respondToSuggestion(userId: string, suggestionId: string, response: string, scheduledFor?: Date): Promise<any> {
    const { proactiveSuggestions, userResponsePatterns, workoutSessions } = await import("@shared/schema");
    
    // Get the suggestion
    const [suggestion] = await db.select()
      .from(proactiveSuggestions)
      .where(and(
        eq(proactiveSuggestions.id, suggestionId),
        eq(proactiveSuggestions.userId, userId)
      ));

    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    // Update suggestion status
    const newStatus = response === 'accepted' ? 
      (scheduledFor ? 'scheduled' : 'accepted') : 
      (response === 'declined' ? 'declined' : 'expired');

    await db.update(proactiveSuggestions)
      .set({
        status: newStatus,
        scheduledFor: scheduledFor || null,
        respondedAt: new Date(),
      })
      .where(eq(proactiveSuggestions.id, suggestionId));

    // Record response pattern for learning
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour >= 6 && hour < 12 ? 'morning' :
                     hour >= 12 && hour < 17 ? 'afternoon' :
                     hour >= 17 && hour < 22 ? 'evening' : 'night';
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    await db.insert(userResponsePatterns).values({
      userId,
      suggestionId,
      metricType: suggestion.metricType,
      timeOfDay,
      hourOfDay: hour,
      dayOfWeek,
      response,
      deficitAmount: suggestion.deficit,
      activityType: suggestion.activityType,
    });

    // If accepted, create the activity/workout session
    if (response === 'accepted' && scheduledFor) {
      const startTime = scheduledFor;
      const endTime = new Date(startTime.getTime() + (suggestion.duration || 30) * 60000);
      
      await db.insert(workoutSessions).values({
        userId,
        workoutType: suggestion.activityType,
        sessionType: 'workout',
        startTime,
        endTime,
        duration: suggestion.duration || 30,
        sourceType: 'ai_suggested',
        notes: `AI suggested: ${suggestion.suggestedActivity}`,
      });
    }

    return {
      success: true,
      suggestion: { ...suggestion, status: newStatus },
      scheduled: response === 'accepted' && scheduledFor
    };
  }

  // Privacy & Compliance implementations
  async createUserConsent(consent: { userId: string; consentType: string; consentGiven: boolean; consentText?: string; ipAddress?: string; userAgent?: string }): Promise<any> {
    const { userConsents } = await import("@shared/schema");
    
    const [result] = await db.insert(userConsents).values({
      userId: consent.userId,
      consentType: consent.consentType,
      granted: consent.consentGiven ? 1 : 0, // Convert boolean to integer
      grantedAt: consent.consentGiven ? new Date() : null,
      ipAddress: consent.ipAddress || null,
      userAgent: consent.userAgent || null,
    }).returning();
    
    return result;
  }

  async getUserConsent(userId: string, consentType?: string): Promise<any[]> {
    const { userConsents } = await import("@shared/schema");
    
    if (consentType) {
      // Use and() to combine both conditions
      return await db.select()
        .from(userConsents)
        .where(and(
          eq(userConsents.userId, userId),
          eq(userConsents.consentType, consentType)
        ));
    }
    
    // Just user filter if no consent type specified
    return await db.select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId));
  }

  async createAuditLog(log: { userId: string; action: string; resourceType?: string; resourceId?: string; details?: any; ipAddress?: string; userAgent?: string }): Promise<void> {
    const { auditLogs } = await import("@shared/schema");
    
    await db.insert(auditLogs).values({
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType || null,
      resourceId: log.resourceId || null,
      metadata: log.details || null, // Use 'metadata' column name from schema
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
    });
  }

  async getAuditLogsForUser(userId: string, limit: number = 100): Promise<any[]> {
    const { auditLogs } = await import("@shared/schema");
    
    const logs = await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
    
    return logs;
  }
}

export const storage = new DbStorage();
