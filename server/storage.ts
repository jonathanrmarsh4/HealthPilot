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
  type WorkoutInstance,
  type InsertWorkoutInstance,
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
  type GoalMetric,
  type InsertGoalMetric,
  type GoalMilestone,
  type InsertGoalMilestone,
  type GoalPlan,
  type InsertGoalPlan,
  type GoalPlanSession,
  type InsertGoalPlanSession,
  type GoalConversation,
  type InsertGoalConversation,
  type ExerciseFeedback,
  type InsertExerciseFeedback,
  type RecoveryProtocol,
  type InsertRecoveryProtocol,
  type UserProtocolPreference,
  type InsertUserProtocolPreference,
  type UserProtocolCompletion,
  type InsertUserProtocolCompletion,
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
  type SymptomEvent,
  type InsertSymptomEvent,
  type MealLibrary,
  type InsertMealLibrary,
  type MealFeedback,
  type InsertMealFeedback,
  type MealLibrarySettings,
  type InsertMealLibrarySettings,
  type PageTilePreferences,
  type InsertPageTilePreferences,
  type VoiceSession,
  type InsertVoiceSession,
  type ChatFeedback,
  type InsertChatFeedback,
  type SafetyEscalation,
  type InsertSafetyEscalation,
  type CoachMemory,
  type InsertCoachMemory,
  type PreferenceVector,
  type InsertPreferenceVector,
  type Subscription,
  type InsertSubscription,
  type PromoCode,
  type InsertPromoCode,
  type Referral,
  type InsertReferral,
  type MedicalReport,
  type InsertMedicalReport,
  type InsertHkEventRaw,
  type SelectHkEventRaw,
  type LandingPageContent,
  type InsertLandingPageContent,
  type LandingPageFeature,
  type InsertLandingPageFeature,
  type LandingPageTestimonial,
  type InsertLandingPageTestimonial,
  type LandingPagePricingPlan,
  type InsertLandingPagePricingPlan,
  type LandingPageSocialLink,
  type InsertLandingPageSocialLink,
  type UserMealPreference,
  type InsertUserMealPreference,
  type UserBanditState,
  type InsertUserBanditState,
  type MealRecommendationHistory,
  type InsertMealRecommendationHistory,
  type CostBudget,
  type InsertCostBudget,
  type CostUserDaily,
  type CostGlobalDaily,
  type DailyMetric,
  type InsertDailyMetric,
  type Lab,
  type InsertLab,
  type DailyHealthInsight,
  type InsertDailyHealthInsight,
  type GeneratedWorkout,
  type InsertGeneratedWorkout,
  type SmartFuelGuidance,
  type InsertSmartFuelGuidance,
  type NotificationChannel,
  type InsertNotificationChannel,
  type Notification,
  type InsertNotification,
  type NotificationEvent,
  type InsertNotificationEvent,
  type ScheduledReminder,
  type InsertScheduledReminder,
  users,
  healthRecords,
  biomarkers,
  hkEventsRaw,
  medicalReports,
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
  workoutInstances,
  exerciseLogs,
  exercises,
  exerciseTemplates,
  exerciseSets,
  sessionPRs,
  muscleGroupEngagements,
  generatedWorkouts,
  goals,
  goalMetrics,
  goalMilestones,
  goalPlans,
  goalPlanSessions,
  goalConversations,
  aiActions,
  symptomEvents,
  exerciseFeedback,
  recoveryProtocols,
  userProtocolPreferences,
  userProtocolCompletions,
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
  voiceSessions,
  chatFeedback,
  safetyEscalations,
  coachMemory,
  preferenceVectors,
  trainingLoadSessions,
  landingPageContent,
  smartFuelGuidance,
  landingPageFeatures,
  landingPageTestimonials,
  landingPagePricingPlans,
  landingPageSocialLinks,
  userMealPreferences,
  userBanditState,
  mealRecommendationHistory,
  costBudgets,
  costUserDaily,
  costGlobalDaily,
  dailyMetrics,
  labs,
  dailyHealthInsights,
  mobileSessions,
  notificationChannels,
  notifications,
  notificationEvents,
  scheduledReminders,
} from "@shared/schema";
import { eq, desc, and, gte, lte, lt, sql, or, like, ilike, count, isNull, inArray, notInArray, not } from "drizzle-orm";

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
  
  // Mobile session management
  createMobileSession(data: { token: string, userId: string, expiresAt: Date }): Promise<void>;
  getUserByMobileToken(token: string): Promise<User | undefined>;
  deleteMobileSession(token: string): Promise<void>;
  
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
    healthKitSetupComplete: boolean;
  } | null>;
  updateOnboardingStep(userId: string, step: string): Promise<void>;
  updateOnboardingFlag(userId: string, flag: 'basicInfoComplete' | 'trainingSetupComplete' | 'mealsSetupComplete' | 'supplementsSetupComplete' | 'biomarkersSetupComplete' | 'healthKitSetupComplete', value: boolean): Promise<void>;
  completeHealthKitSetup(userId: string): Promise<void>;
  completeOnboarding(userId: string): Promise<void>;
  skipOnboardingStep(userId: string, currentStep: string, nextStep: string): Promise<boolean>;
  
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  getHealthRecords(userId: string): Promise<HealthRecord[]>;
  getHealthRecord(id: string, userId: string): Promise<HealthRecord | undefined>;
  getHealthRecordByFileId(fileId: string, userId: string): Promise<HealthRecord | undefined>;
  updateHealthRecord(id: string, userId: string, data: Partial<HealthRecord>): Promise<HealthRecord | undefined>;
  deleteHealthRecord(id: string, userId: string): Promise<void>;
  
  // Medical Reports (Interpreter)
  createMedicalReport(report: InsertMedicalReport): Promise<MedicalReport>;
  getMedicalReports(userId: string, limit?: number): Promise<MedicalReport[]>;
  getMedicalReport(id: string, userId: string): Promise<MedicalReport | undefined>;
  updateMedicalReportStatus(id: string, userId: string, data: Partial<MedicalReport>): Promise<MedicalReport | undefined>;
  deleteMedicalReport(id: string, userId: string): Promise<void>;
  
  createBiomarker(biomarker: InsertBiomarker): Promise<Biomarker>;
  upsertBiomarker(biomarker: InsertBiomarker): Promise<Biomarker>;
  batchUpsertBiomarkers(biomarkers: InsertBiomarker[]): Promise<number>;
  updateBiomarker(id: string, userId: string, data: Partial<InsertBiomarker>): Promise<Biomarker | undefined>;
  getBiomarkers(userId: string, type?: string): Promise<Biomarker[]>;
  getBiomarkersByTimeRange(userId: string, type: string, startDate: Date, endDate: Date): Promise<Biomarker[]>;
  getLatestBiomarkerByType(userId: string, type: string): Promise<Biomarker | undefined>;
  
  // Raw HealthKit events (universal ingest)
  insertHkEventRaw(event: InsertHkEventRaw): Promise<SelectHkEventRaw | null>;
  getHkEventsRaw(userId: string, type?: string, limit?: number): Promise<SelectHkEventRaw[]>;
  getHkEventStats(userId: string): Promise<Record<string, { count: number; latest: Date | null }>>;
  
  createNutritionProfile(profile: InsertNutritionProfile): Promise<NutritionProfile>;
  getNutritionProfile(userId: string): Promise<NutritionProfile | undefined>;
  updateNutritionProfile(userId: string, data: Partial<NutritionProfile>): Promise<NutritionProfile | undefined>;
  
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getMealPlans(userId: string): Promise<MealPlan[]>;
  updateMealFeedback(mealId: string, userId: string, feedback: string): Promise<MealPlan | undefined>;
  deletePastMealPlans(userId: string): Promise<number>; // Returns count of deleted meals
  deleteAllUserMealPlans(userId: string): Promise<number>; // Delete ALL meal plans for user
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
  saveWorkoutFeedback(workoutSessionId: string, userId: string, feedback: {
    overallDifficulty: number;
    fatigueLevel: number;
    enjoymentRating: number;
    exercisesTooEasy: string[];
    exercisesTooHard: string[];
    painOrDiscomfort: string;
    feedbackNotes: string;
  }): Promise<void>;
  getLastExerciseValues(userId: string, exerciseId: string): Promise<{
    weight: number | null;
    reps: number | null;
    distance: number | null;
    duration: number | null;
  } | null>;
  
  // Generated workout methods
  createGeneratedWorkout(workout: InsertGeneratedWorkout): Promise<GeneratedWorkout>;
  saveGeneratedWorkout(workout: InsertGeneratedWorkout): Promise<GeneratedWorkout>;
  getGeneratedWorkout(userId: string, date: string): Promise<GeneratedWorkout | undefined>;
  getGeneratedWorkoutById(id: string, userId: string): Promise<GeneratedWorkout | undefined>;
  getLatestGeneratedWorkout(userId: string): Promise<GeneratedWorkout | undefined>;
  getGeneratedWorkouts(userId: string, startDate?: string, endDate?: string): Promise<GeneratedWorkout[]>;
  getCompletedGeneratedWorkouts(userId: string, daysBack: number): Promise<GeneratedWorkout[]>;
  updateGeneratedWorkout(id: string, userId: string, data: Partial<GeneratedWorkout>): Promise<GeneratedWorkout | undefined>;
  updateGeneratedWorkoutStatus(id: string, status: string): Promise<void>;
  acceptGeneratedWorkout(id: string, userId: string): Promise<{ sessionId: string; instanceId: string }>;
  rejectGeneratedWorkout(id: string, userId: string): Promise<void>;
  
  createWorkoutInstance(instance: InsertWorkoutInstance): Promise<WorkoutInstance>;
  getWorkoutInstance(id: string, userId: string): Promise<WorkoutInstance | undefined>;
  
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
  
  // Exercise management
  getExerciseById(exerciseId: string): Promise<Exercise | undefined>;
  getAllExercises(): Promise<Exercise[]>;
  updateExerciseExternalId(exerciseId: string, externalId: string): Promise<Exercise | undefined>;
  getExerciseByName(name: string): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  
  // Exercise Templates (pattern-based system)
  getExerciseTemplateById(templateId: string): Promise<any | undefined>;

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
  getMonthlyMessageUsage(userId: string, year: number, month: number): Promise<number>;
  
  createGoal(goal: InsertGoal): Promise<Goal>;
  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: string, userId: string): Promise<Goal | undefined>;
  updateGoal(id: string, userId: string, data: Partial<Goal>): Promise<Goal | undefined>;
  updateGoalProgress(goalId: string, userId: string, currentValue: number): Promise<Goal | undefined>;
  deleteGoal(id: string, userId: string): Promise<void>;
  
  // Goals v2 - Natural Language Goals with Plans
  createGoalWithPlan(params: {
    goal: InsertGoal;
    metrics: InsertGoalMetric[];
    milestones: InsertGoalMilestone[];
    plans: InsertGoalPlan[];
  }): Promise<{
    goal: Goal;
    metrics: GoalMetric[];
    milestones: GoalMilestone[];
    plans: GoalPlan[];
  }>;
  getUserAvailableDataSources(userId: string): Promise<{
    healthkit: string[];
    oura: string[];
    whoop: string[];
    manual: string[];
  }>;
  
  createGoalMetric(metric: InsertGoalMetric): Promise<GoalMetric>;
  getGoalMetrics(goalId: string): Promise<GoalMetric[]>;
  updateGoalMetric(id: string, data: Partial<GoalMetric>): Promise<GoalMetric | undefined>;
  
  createGoalMilestone(milestone: InsertGoalMilestone): Promise<GoalMilestone>;
  getGoalMilestones(goalId: string): Promise<GoalMilestone[]>;
  updateGoalMilestone(id: string, data: Partial<GoalMilestone>): Promise<GoalMilestone | undefined>;
  
  createGoalPlan(plan: InsertGoalPlan): Promise<GoalPlan>;
  getGoalPlans(goalId: string, planType?: string): Promise<GoalPlan[]>;
  updateGoalPlan(id: string, data: Partial<GoalPlan>): Promise<GoalPlan | undefined>;
  
  // Goal Plan Sessions - Flattened sessions for workout scheduling
  createGoalPlanSession(session: InsertGoalPlanSession): Promise<GoalPlanSession>;
  getGoalPlanSessions(goalPlanId: string, status?: string): Promise<GoalPlanSession[]>;
  
  // Goal Conversations - Conversational goal creation
  createGoalConversation(conversation: InsertGoalConversation): Promise<GoalConversation>;
  getGoalConversation(id: string, userId: string): Promise<GoalConversation | undefined>;
  getActiveGoalConversation(userId: string): Promise<GoalConversation | undefined>;
  updateGoalConversation(id: string, userId: string, data: Partial<GoalConversation>): Promise<GoalConversation | undefined>;
  
  // Metric Standards
  getAllMetricStandards(filters?: {
    metricKey?: string;
    category?: string;
    evidenceLevel?: string;
  }): Promise<MetricStandard[]>;
  
  createAiAction(action: InsertAiAction): Promise<AiAction>;
  getAiActions(userId: string, limit?: number): Promise<AiAction[]>;
  getAiActionsByType(userId: string, actionType: string): Promise<AiAction[]>;
  
  // Symptom Tracking
  createSymptomEvent(event: InsertSymptomEvent): Promise<SymptomEvent>;
  getSymptomEvents(userId: string, limit?: number): Promise<SymptomEvent[]>;
  getActiveSymptomEpisodes(userId: string): Promise<SymptomEvent[]>;
  getSymptomEpisodeEvents(userId: string, episodeId: string): Promise<SymptomEvent[]>;
  updateSymptomEvent(id: string, userId: string, data: Partial<SymptomEvent>): Promise<SymptomEvent | undefined>;
  resolveSymptomEpisode(episodeId: string, userId: string, endedAt: Date): Promise<void>;
  
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
  
  // User Protocol Completion methods
  markProtocolComplete(completion: InsertUserProtocolCompletion): Promise<UserProtocolCompletion>;
  getProtocolCompletions(userId: string, date?: string): Promise<UserProtocolCompletion[]>;
  getProtocolCompletionsForProtocol(userId: string, protocolId: string): Promise<UserProtocolCompletion[]>;
  
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
  
  // Subscription methods
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscription(userId: string): Promise<Subscription | undefined>;
  getActiveSubscription(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  updateSubscription(stripeSubscriptionId: string, data: Partial<Subscription>): Promise<Subscription | undefined>;
  
  // Promo Code methods
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  getPromoCode(code: string): Promise<PromoCode | undefined>;
  getPromoCodes(isActive?: boolean): Promise<PromoCode[]>;
  updatePromoCodeUsage(code: string): Promise<PromoCode | undefined>;
  incrementPromoCodeUsage(id: string): Promise<void>;
  updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined>;
  
  // Referral methods
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferral(referralCode: string): Promise<Referral | undefined>;
  getReferralsByUser(userId: string): Promise<Referral[]>;
  updateReferralStatus(referralCode: string, status: string, convertedAt?: Date): Promise<Referral | undefined>;
  markReferralRewarded(referralCode: string): Promise<Referral | undefined>;
  generateReferralCode(userId: string): Promise<string>;
  
  // Voice Chat & Memory methods
  createVoiceSession(session: InsertVoiceSession): Promise<VoiceSession>;
  getVoiceSessions(userId: string, limit?: number): Promise<VoiceSession[]>;
  
  submitChatFeedback(feedback: InsertChatFeedback): Promise<ChatFeedback>;
  getChatFeedback(userId: string): Promise<ChatFeedback[]>;
  getChatFeedbackForMessage(messageId: string): Promise<ChatFeedback | undefined>;
  
  logSafetyEscalation(escalation: InsertSafetyEscalation): Promise<SafetyEscalation>;
  getSafetyEscalations(userId: string, limit?: number): Promise<SafetyEscalation[]>;
  
  addCoachMemory(memory: InsertCoachMemory): Promise<CoachMemory>;
  getCoachMemories(userId: string, memoryType?: string): Promise<CoachMemory[]>;
  getRelevantMemories(userId: string, queryEmbedding: number[], limit?: number): Promise<CoachMemory[]>;
  deleteCoachMemory(id: string, userId: string): Promise<void>;
  deleteAllCoachMemories(userId: string): Promise<void>;
  
  updatePreferenceVector(userId: string, preferenceType: string, weight: number): Promise<PreferenceVector>;
  getPreferenceVectors(userId: string): Promise<PreferenceVector[]>;
  
  resetUserMemory(userId: string): Promise<void>; // Forget Me - deletes all memories, preferences, voice sessions
  getWeeklyReflectionData(userId: string, startDate: Date, endDate: Date): Promise<{
    voiceSessions: VoiceSession[];
    memories: CoachMemory[];
    feedbackCount: number;
  }>;
  
  // Landing Page CMS
  getLandingPageContent(): Promise<LandingPageContent | undefined>;
  upsertLandingPageContent(content: Partial<InsertLandingPageContent>): Promise<LandingPageContent>;
  getLandingPageFeatures(section?: string): Promise<LandingPageFeature[]>;
  getLandingPageFeature(id: string): Promise<LandingPageFeature | undefined>;
  createLandingPageFeature(feature: InsertLandingPageFeature): Promise<LandingPageFeature>;
  updateLandingPageFeature(id: string, feature: Partial<InsertLandingPageFeature>): Promise<LandingPageFeature | undefined>;
  deleteLandingPageFeature(id: string): Promise<void>;
  getLandingPageTestimonials(): Promise<LandingPageTestimonial[]>;
  getLandingPageTestimonial(id: string): Promise<LandingPageTestimonial | undefined>;
  createLandingPageTestimonial(testimonial: InsertLandingPageTestimonial): Promise<LandingPageTestimonial>;
  updateLandingPageTestimonial(id: string, testimonial: Partial<InsertLandingPageTestimonial>): Promise<LandingPageTestimonial | undefined>;
  deleteLandingPageTestimonial(id: string): Promise<void>;
  getLandingPagePricingPlans(): Promise<LandingPagePricingPlan[]>;
  getLandingPagePricingPlan(id: string): Promise<LandingPagePricingPlan | undefined>;
  createLandingPagePricingPlan(plan: InsertLandingPagePricingPlan): Promise<LandingPagePricingPlan>;
  updateLandingPagePricingPlan(id: string, plan: Partial<InsertLandingPagePricingPlan>): Promise<LandingPagePricingPlan | undefined>;
  deleteLandingPagePricingPlan(id: string): Promise<void>;
  getLandingPageSocialLinks(): Promise<LandingPageSocialLink[]>;
  getLandingPageSocialLink(id: string): Promise<LandingPageSocialLink | undefined>;
  createLandingPageSocialLink(link: InsertLandingPageSocialLink): Promise<LandingPageSocialLink>;
  updateLandingPageSocialLink(id: string, link: Partial<InsertLandingPageSocialLink>): Promise<LandingPageSocialLink | undefined>;
  deleteLandingPageSocialLink(id: string): Promise<void>;
  
  // Meal preference and recommendation methods
  getUserBanditState(userId: string): Promise<UserBanditState[]>;
  updateUserBanditState(userId: string, armKey: string, alpha: number, beta: number): Promise<UserBanditState>;
  saveUserMealPreference(preference: InsertUserMealPreference): Promise<UserMealPreference>;
  getUserMealPreferences(userId: string, days: number): Promise<UserMealPreference[]>;
  saveMealRecommendationHistory(history: InsertMealRecommendationHistory): Promise<MealRecommendationHistory>;
  
  // Cost Control & Telemetry
  getCostSummary(days: number): Promise<{
    totalCost: number;
    totalJobs: number;
    totalAiCalls: number;
    totalTokensIn: number;
    totalTokensOut: number;
    dailyData: Array<{
      date: string;
      cost: number;
      jobs: number;
      aiCalls: number;
      tierBreakdown: Record<string, number>;
    }>;
  }>;
  getTopUsersByCost(days: number, limit: number): Promise<Array<{
    userId: string;
    user: User | null;
    totalCost: number;
    jobs: number;
    aiCalls: number;
    tier: string;
  }>>;
  getCostBudgets(): Promise<CostBudget[]>;
  upsertCostBudget(budget: InsertCostBudget): Promise<CostBudget>;

  // Daily Insights System
  createDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric>;
  getDailyMetrics(userId: string, metricName: string, startDate: Date, endDate: Date): Promise<DailyMetric[]>;
  getEligibleDailyMetrics(userId: string, metricName: string, startDate: Date, endDate: Date): Promise<DailyMetric[]>;
  createLab(lab: InsertLab): Promise<Lab>;
  getLabs(userId: string, marker: string, startDate: Date, endDate: Date): Promise<Lab[]>;
  getEligibleLabs(userId: string, marker: string, startDate: Date, endDate: Date): Promise<Lab[]>;
  createDailyHealthInsight(insight: InsertDailyHealthInsight): Promise<DailyHealthInsight>;
  getDailyHealthInsights(userId: string, date: Date): Promise<DailyHealthInsight[]>;
  getDailyHealthInsightsDateRange(userId: string, startDate: Date, endDate: Date): Promise<DailyHealthInsight[]>;
  updateDailyHealthInsightStatus(id: string, userId: string, status: string): Promise<void>;
  
  // SmartFuel™ Precision Nutrition Guidance
  createSmartFuelGuidance(guidance: InsertSmartFuelGuidance): Promise<SmartFuelGuidance>;
  getCurrentSmartFuelGuidance(userId: string): Promise<SmartFuelGuidance | undefined>;
  getSmartFuelGuidanceHistory(userId: string, limit?: number): Promise<SmartFuelGuidance[]>;
  supersedePreviousGuidance(userId: string, newGuidanceId: string): Promise<void>;
  
  // Notification Channel Preferences
  getNotificationChannels(userId: string): Promise<NotificationChannel[]>;
  upsertNotificationChannel(data: InsertNotificationChannel): Promise<NotificationChannel>;
  deleteNotificationChannel(userId: string, channel: string): Promise<void>;
  
  // Notifications
  createNotification(data: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, filters?: { status?: string, limit?: number }): Promise<Notification[]>;
  getNotificationById(id: string): Promise<Notification | null>;
  updateNotificationStatus(id: string, status: string, errorMessage?: string): Promise<void>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  
  // Notification Events (audit log)
  createNotificationEvent(data: InsertNotificationEvent): Promise<NotificationEvent>;
  
  // Scheduled Reminders
  createScheduledReminder(data: InsertScheduledReminder): Promise<ScheduledReminder>;
  getScheduledReminders(userId: string, type?: string): Promise<ScheduledReminder[]>;
  updateScheduledReminder(id: string, data: Partial<InsertScheduledReminder>): Promise<void>;
  deleteScheduledReminder(id: string): Promise<void>;
  getPendingReminders(): Promise<ScheduledReminder[]>;
  
  // Reminder Scheduler Methods (alternative names for scheduler service)
  getAllEnabledReminders(): Promise<ScheduledReminder[]>;
  createReminder(reminder: InsertScheduledReminder): Promise<ScheduledReminder>;
  updateReminder(id: string, updates: Partial<InsertScheduledReminder>): Promise<void>;
  updateReminderLastSent(id: string, sentAt: Date): Promise<void>;
  deleteReminder(id: string, userId: string): Promise<void>;
  getUserReminders(userId: string, type?: string): Promise<ScheduledReminder[]>;
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
      
      try {
        const [user] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, userData.id))
          .returning();
        return user;
      } catch (error: any) {
        // If email unique constraint violation, return existing user without update
        if (error.code === '23505') {
          console.warn(`⚠️ Email ${userData.email} already in use by another user. Returning existing user ${userData.id} without email update.`);
          return existingById[0];
        }
        throw error;
      }
    }
    
    // Check if user exists by email
    if (userData.email) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingByEmail.length > 0) {
        // Update existing user by email - PRESERVE existing role and ID
        const { id, ...updateDataWithoutId } = userData;
        const updateData: any = { ...updateDataWithoutId, updatedAt: new Date() };
        
        // Don't overwrite the role if the existing user already has one, unless we're explicitly setting it to admin
        if (existingByEmail[0].role && userData.role !== 'admin') {
          updateData.role = existingByEmail[0].role; // Preserve existing role
        }
        
        try {
          // Update by the existing user's ID, not email, to avoid any constraint issues
          const [user] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, existingByEmail[0].id))
            .returning();
          return user;
        } catch (error: any) {
          // If constraint violation on update, return existing user
          if (error.code === '23505') {
            console.warn(`⚠️ Constraint violation when updating user by email. Returning existing user.`);
            return existingByEmail[0];
          }
          throw error;
        }
      }
    }
    
    // Insert new user - wrap in try/catch to handle race conditions
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    } catch (error: any) {
      // If we get a unique constraint violation, it means another request created the user
      // Try one more time to fetch and return the existing user
      if (error.code === '23505') { // PostgreSQL unique violation error code
        const existingById = await db.select().from(users).where(eq(users.id, userData.id));
        if (existingById.length > 0) {
          return existingById[0];
        }
        if (userData.email) {
          const existingByEmail = await db.select().from(users).where(eq(users.email, userData.email));
          if (existingByEmail.length > 0) {
            return existingByEmail[0];
          }
        }
      }
      // If it's not a unique constraint violation or we still can't find the user, rethrow
      throw error;
    }
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

  async createMobileSession(data: { token: string, userId: string, expiresAt: Date }): Promise<void> {
    await db.insert(mobileSessions).values(data);
  }

  async getUserByMobileToken(token: string): Promise<User | undefined> {
    const result = await db
      .select({ user: users })
      .from(mobileSessions)
      .innerJoin(users, eq(mobileSessions.userId, users.id))
      .where(and(
        eq(mobileSessions.token, token),
        gte(mobileSessions.expiresAt, new Date())
      ))
      .limit(1);
    
    return result[0]?.user;
  }

  async deleteMobileSession(token: string): Promise<void> {
    await db.delete(mobileSessions).where(eq(mobileSessions.token, token));
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
    healthKitSetupComplete: boolean;
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
        biomarkers_setup_complete,
        health_kit_setup_complete
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
      healthKitSetupComplete: row.health_kit_setup_complete === 1,
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

  async updateOnboardingFlag(userId: string, flag: 'basicInfoComplete' | 'trainingSetupComplete' | 'mealsSetupComplete' | 'supplementsSetupComplete' | 'biomarkersSetupComplete' | 'healthKitSetupComplete', value: boolean): Promise<void> {
    const columnMap: Record<typeof flag, string> = {
      basicInfoComplete: 'basic_info_complete',
      trainingSetupComplete: 'training_setup_complete',
      mealsSetupComplete: 'meals_setup_complete',
      supplementsSetupComplete: 'supplements_setup_complete',
      biomarkersSetupComplete: 'biomarkers_setup_complete',
      healthKitSetupComplete: 'health_kit_setup_complete',
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

  async completeHealthKitSetup(userId: string): Promise<void> {
    await db.execute(
      sql`UPDATE users SET 
        health_kit_setup_complete = 1,
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

  // Medical Reports (Interpreter) methods
  async createMedicalReport(report: InsertMedicalReport): Promise<MedicalReport> {
    const result = await db.insert(medicalReports).values(report).returning();
    return result[0];
  }

  async getMedicalReports(userId: string, limit: number = 50): Promise<MedicalReport[]> {
    return await db
      .select()
      .from(medicalReports)
      .where(eq(medicalReports.userId, userId))
      .orderBy(desc(medicalReports.createdAt))
      .limit(limit);
  }

  async getMedicalReport(id: string, userId: string): Promise<MedicalReport | undefined> {
    const result = await db
      .select()
      .from(medicalReports)
      .where(and(eq(medicalReports.id, id), eq(medicalReports.userId, userId)));
    return result[0];
  }

  async updateMedicalReportStatus(id: string, userId: string, data: Partial<MedicalReport>): Promise<MedicalReport | undefined> {
    const result = await db
      .update(medicalReports)
      .set(data)
      .where(and(eq(medicalReports.id, id), eq(medicalReports.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteMedicalReport(id: string, userId: string): Promise<void> {
    // First verify the report exists and belongs to the user
    const report = await this.getMedicalReport(id, userId);
    if (!report) {
      return;
    }
    // Delete associated biomarkers first
    await db.delete(biomarkers).where(eq(biomarkers.recordId, id));
    // Then delete the medical report
    await db.delete(medicalReports).where(
      and(eq(medicalReports.id, id), eq(medicalReports.userId, userId))
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

  async batchUpsertBiomarkers(biomarkersToUpsert: InsertBiomarker[]): Promise<number> {
    if (biomarkersToUpsert.length === 0) return 0;
    
    // Use individual upserts to ensure proper deduplication
    // The unique index (userId, type, recordedAt, source) prevents duplicates
    let count = 0;
    for (const biomarker of biomarkersToUpsert) {
      try {
        await this.upsertBiomarker(biomarker);
        count++;
      } catch (e) {
        // Skip individual errors
      }
    }
    return count;
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

  // Raw HealthKit events implementation
  async insertHkEventRaw(event: InsertHkEventRaw): Promise<SelectHkEventRaw | null> {
    try {
      const result = await db.insert(hkEventsRaw).values(event).returning();
      return result[0];
    } catch (error: any) {
      // If duplicate (idempotency key collision), return null instead of throwing
      if (error.code === '23505') { // Unique violation
        return null;
      }
      throw error;
    }
  }

  async getHkEventsRaw(userId: string, type?: string, limit: number = 100): Promise<SelectHkEventRaw[]> {
    if (type) {
      return await db
        .select()
        .from(hkEventsRaw)
        .where(and(eq(hkEventsRaw.userId, userId), eq(hkEventsRaw.type, type)))
        .orderBy(desc(hkEventsRaw.receivedAtUtc))
        .limit(limit);
    }
    return await db
      .select()
      .from(hkEventsRaw)
      .where(eq(hkEventsRaw.userId, userId))
      .orderBy(desc(hkEventsRaw.receivedAtUtc))
      .limit(limit);
  }

  async getHkEventStats(userId: string): Promise<Record<string, { count: number; latest: Date | null }>> {
    const result = await db
      .select({
        type: hkEventsRaw.type,
        count: sql<number>`count(*)::int`,
        latest: sql<Date | null>`max(${hkEventsRaw.receivedAtUtc})`,
      })
      .from(hkEventsRaw)
      .where(eq(hkEventsRaw.userId, userId))
      .groupBy(hkEventsRaw.type);
    
    const stats: Record<string, { count: number; latest: Date | null }> = {};
    for (const row of result) {
      stats[row.type] = {
        count: row.count,
        latest: row.latest,
      };
    }
    return stats;
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
    
    // Get all permanently disliked meal IDs for this user
    const dislikedFeedback = await db
      .select({ mealPlanId: mealFeedback.mealPlanId })
      .from(mealFeedback)
      .where(
        and(
          eq(mealFeedback.userId, userId),
          eq(mealFeedback.feedback, "permanent_dislike"),
          eq(mealFeedback.feedbackType, "permanent")
        )
      );
    
    const dislikedMealIds = dislikedFeedback
      .filter(f => f.mealPlanId !== null)
      .map(f => f.mealPlanId as string);
    
    // Build the base query conditions
    const conditions = [
      eq(mealPlans.userId, userId),
      // Only return meals scheduled for today or future
      // If scheduledDate is null, include it (for backward compatibility)
      or(
        gte(mealPlans.scheduledDate, today),
        isNull(mealPlans.scheduledDate)
      )
    ];
    
    // Only add notInArray if we have disliked meals to filter
    if (dislikedMealIds.length > 0) {
      conditions.push(notInArray(mealPlans.id, dislikedMealIds));
    }
    
    return await db
      .select()
      .from(mealPlans)
      .where(and(...conditions))
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

  async deleteAllUserMealPlans(userId: string): Promise<number> {
    // Delete ALL meal plans for user (used when regenerating to ensure clean slate)
    const result = await db
      .delete(mealPlans)
      .where(eq(mealPlans.userId, userId))
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
    // Import debug logger
    const { logQuerySummary, dlog } = await import('./utils/sleepDebug');
    
    // Build query with proper SQL WHERE clause for date filtering
    let query = db
      .select()
      .from(sleepSessions)
      .where(eq(sleepSessions.userId, userId));

    if (startDate && endDate) {
      // Use SQL WHERE clause for efficient filtering (not in-memory)
      // Query by bedtime to find sleep sessions in the date range
      query = query.where(
        and(
          eq(sleepSessions.userId, userId),
          sql`${sleepSessions.bedtime} >= ${startDate.toISOString()}`,
          sql`${sleepSessions.bedtime} <= ${endDate.toISOString()}`
        )
      );
      
      dlog(`getSleepSessions query window: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    }

    const result = await query.orderBy(desc(sleepSessions.bedtime));
    
    // Log query results for debugging
    logQuerySummary({
      userId,
      queryWindow: {
        startDate,
        endDate
      },
      results: result,
      sqlGenerated: startDate && endDate 
        ? `bedtime >= '${startDate.toISOString()}' AND bedtime <= '${endDate.toISOString()}'`
        : 'no date filter'
    });
    
    return result;
  }

  async getLatestSleepSession(userId: string): Promise<SleepSession | undefined> {
    const result = await db
      .select()
      .from(sleepSessions)
      .where(
        and(
          eq(sleepSessions.userId, userId),
          or(
            eq(sleepSessions.episodeType, 'primary'),
            isNull(sleepSessions.episodeType) // Include legacy sessions without episode_type
          )
        )
      )
      .orderBy(desc(sleepSessions.waketime)) // Use waketime to get most recently completed sleep
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

  async getAllUsersForScheduler(): Promise<User[]> {
    // Simple method for scheduler - returns all users without pagination
    const result = await db.select().from(users);
    return result;
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

  async getMonthlyMessageUsage(userId: string, year: number, month: number): Promise<number> {
    // Create start and end dates for the month (month is 1-indexed)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
    
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${messageUsage.messageCount}), 0)` })
      .from(messageUsage)
      .where(
        and(
          eq(messageUsage.userId, userId),
          gte(messageUsage.messageDate, startDate),
          lte(messageUsage.messageDate, endDate)
        )
      );
    
    return Number(result[0]?.total || 0);
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

  async createWorkoutInstance(instance: InsertWorkoutInstance): Promise<WorkoutInstance> {
    const result = await db.insert(workoutInstances).values(instance).returning();
    return result[0];
  }

  async getWorkoutInstance(id: string, userId: string): Promise<WorkoutInstance | undefined> {
    const result = await db
      .select()
      .from(workoutInstances)
      .where(and(eq(workoutInstances.id, id), eq(workoutInstances.userId, userId)));
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

  async saveWorkoutFeedback(workoutSessionId: string, userId: string, feedback: {
    overallDifficulty: number;
    fatigueLevel: number;
    enjoymentRating: number;
    exercisesTooEasy: string[];
    exercisesTooHard: string[];
    painOrDiscomfort: string;
    feedbackNotes: string;
  }): Promise<void> {
    // Get the workout session to determine completion status
    const session = await this.getWorkoutSession(workoutSessionId, userId);
    if (!session) {
      throw new Error("Workout session not found");
    }

    // Check if a training load session already exists for this workout
    const existingLoadSession = await db.query.trainingLoadSessions.findFirst({
      where: and(
        eq(trainingLoadSessions.workoutSessionId, workoutSessionId),
        eq(trainingLoadSessions.userId, userId)
      )
    });

    const completionStatus = session.completedAt ? 'completed' : 'partial';

    if (existingLoadSession) {
      // Update existing record with all feedback fields and updated completion status
      await db.update(trainingLoadSessions)
        .set({
          overallDifficulty: feedback.overallDifficulty,
          fatigueLevel: feedback.fatigueLevel,
          enjoymentRating: feedback.enjoymentRating,
          exercisesTooEasy: feedback.exercisesTooEasy,
          exercisesTooHard: feedback.exercisesTooHard,
          painOrDiscomfort: feedback.painOrDiscomfort,
          feedbackNotes: feedback.feedbackNotes,
          completionStatus,
        })
        .where(eq(trainingLoadSessions.id, existingLoadSession.id));
    } else {
      // Create new training load session with feedback
      await db.insert(trainingLoadSessions).values({
        userId,
        workoutSessionId,
        overallDifficulty: feedback.overallDifficulty,
        fatigueLevel: feedback.fatigueLevel,
        enjoymentRating: feedback.enjoymentRating,
        exercisesTooEasy: feedback.exercisesTooEasy,
        exercisesTooHard: feedback.exercisesTooHard,
        painOrDiscomfort: feedback.painOrDiscomfort,
        feedbackNotes: feedback.feedbackNotes,
        completionStatus,
      });
    }
  }

  // Generated workout methods
  async createGeneratedWorkout(workout: InsertGeneratedWorkout): Promise<GeneratedWorkout> {
    const result = await db.insert(generatedWorkouts).values(workout).returning();
    return result[0];
  }

  async getGeneratedWorkout(userId: string, date: string): Promise<GeneratedWorkout | undefined> {
    const result = await db
      .select()
      .from(generatedWorkouts)
      .where(and(eq(generatedWorkouts.userId, userId), eq(generatedWorkouts.date, date)));
    return result[0];
  }

  async getGeneratedWorkoutById(id: string, userId: string): Promise<GeneratedWorkout | undefined> {
    const result = await db
      .select()
      .from(generatedWorkouts)
      .where(and(eq(generatedWorkouts.id, id), eq(generatedWorkouts.userId, userId)));
    return result[0];
  }

  async getGeneratedWorkouts(userId: string, startDate?: string, endDate?: string): Promise<GeneratedWorkout[]> {
    if (startDate && endDate) {
      return await db
        .select()
        .from(generatedWorkouts)
        .where(
          and(
            eq(generatedWorkouts.userId, userId),
            gte(generatedWorkouts.date, startDate),
            lte(generatedWorkouts.date, endDate)
          )
        )
        .orderBy(desc(generatedWorkouts.date));
    }
    
    return await db
      .select()
      .from(generatedWorkouts)
      .where(eq(generatedWorkouts.userId, userId))
      .orderBy(desc(generatedWorkouts.date));
  }

  async updateGeneratedWorkout(id: string, userId: string, data: Partial<GeneratedWorkout>): Promise<GeneratedWorkout | undefined> {
    const result = await db
      .update(generatedWorkouts)
      .set(data)
      .where(and(eq(generatedWorkouts.id, id), eq(generatedWorkouts.userId, userId)))
      .returning();
    return result[0];
  }

  async acceptGeneratedWorkout(id: string, userId: string): Promise<{ sessionId: string; instanceId: string }> {
    console.log(`💪 acceptGeneratedWorkout called - ID: ${id}, UserId: ${userId}`);
    
    // Get the generated workout by ID
    const workout = await this.getGeneratedWorkoutById(id, userId);
    console.log(`💪 getGeneratedWorkoutById result:`, workout ? `Found workout with status: ${workout.status}` : 'Not found');
    
    if (!workout) {
      throw new Error("Generated workout not found");
    }

    // If already accepted, check if session already exists and return it (idempotent)
    if (workout.status === 'accepted' && workout.acceptedSnapshot) {
      // Try to find existing session
      const existingSessions = await db
        .select()
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.sourceType, "ai_generated")
          )
        )
        .orderBy(desc(workoutSessions.startTime))
        .limit(10);
      
      // Find session that matches this workout date
      const workoutDate = new Date(workout.date);
      for (const session of existingSessions) {
        const sessionDate = new Date(session.startTime);
        if (
          sessionDate.getFullYear() === workoutDate.getFullYear() &&
          sessionDate.getMonth() === workoutDate.getMonth() &&
          sessionDate.getDate() === workoutDate.getDate()
        ) {
          console.log(`💪 Found existing session for accepted workout: ${session.id}`);
          // Find the workout instance for this session
          const instances = await db
            .select()
            .from(workoutInstances)
            .where(eq(workoutInstances.workoutSessionId, session.id))
            .limit(1);
          
          if (instances.length > 0) {
            console.log(`💪 Found existing instance: ${instances[0].id}`);
            return { sessionId: session.id, instanceId: instances[0].id };
          } else {
            console.warn(`💪 No instance found for session ${session.id}, will create new session`);
          }
        }
      }
    }

    const workoutData = workout.workoutData;
    
    // Handle both old format (main/accessories) and new format (blocks)
    let exercisesToProcess = workoutData.blocks 
      ? workoutData.blocks.map((block: any) => ({
          exercise: block.display_name || block.pattern,
          sets: block.sets,
          reps: block.reps,
          rest_seconds: block.rest_s,
          intensity: block.intensity?.scheme === 'rir' 
            ? `RIR ${block.intensity.target}` 
            : `${block.intensity?.target || ''}`,
          goal: block.preferred_modality || 'strength',
          template_id: block.template_id, // Store template_id, will resolve to exercise_id below
          exercise_id: block.exercise_id, // CRITICAL: Use saved exercise_id if it exists (from saveWorkout)
          pattern: block.pattern,
          modality: block.preferred_modality
        }))
      : [...(workoutData.main || []), ...(workoutData.accessories || [])];
    
    // Resolve template_ids to exercise_ids using templateExerciseBridge
    // ONLY if exercise_id wasn't already saved with the workout (avoids re-resolution)
    if (workoutData.blocks) {
      const { getOrCreateExerciseForTemplate } = await import("./services/templateExerciseBridge");
      
      for (const ex of exercisesToProcess) {
        if (ex.template_id && !ex.exercise_id) { // ← CRITICAL: Only resolve if not already set
          // Get the template from exercise_templates table
          const templateResult = await db
            .select()
            .from(exerciseTemplates)
            .where(eq(exerciseTemplates.id, ex.template_id))
            .limit(1);
          
          if (templateResult.length > 0) {
            const template = templateResult[0];
            // Resolve template → exercise using bridge
            const exerciseId = await getOrCreateExerciseForTemplate(this, {
              id: template.id,
              pattern: template.pattern as any,
              modality: template.modality as any,
              displayName: template.displayName,
              muscles: template.muscles
            });
            ex.exercise_id = exerciseId;
            console.log(`💪 Resolved template ${ex.template_id} → exercise ${exerciseId} (${template.displayName})`);
          } else {
            console.warn(`💪 Template not found: ${ex.template_id}`);
          }
        } else if (ex.exercise_id) {
          console.log(`💪 Using pre-saved exercise_id: ${ex.exercise_id} for ${ex.exercise}`);
        }
      }
    }
    
    console.log(`💪 Workout data:`, { 
      focus: workoutData.plan?.focus || workoutData.focus, 
      exerciseCount: exercisesToProcess.length,
      hasBlocks: !!workoutData.blocks
    });
    
    // Helper to match exercise name to library with improved fuzzy matching
    const matchExerciseByName = async (name: string) => {
      const nameLower = name.toLowerCase();
      const allExercises = await db.select().from(exercises);
      
      // Try exact match
      let match = allExercises.find(ex => ex.name.toLowerCase() === nameLower);
      if (match) return match;
      
      // Try partial match
      match = allExercises.find(ex => {
        const exNameLower = ex.name.toLowerCase();
        return exNameLower.includes(nameLower) || nameLower.includes(exNameLower);
      });
      if (match) return match;
      
      // Try normalized keyword matching (handles "Face Pull with Cables" → "Cable Face Pulls")
      const normalizeForMatch = (text: string) => {
        return text
          .toLowerCase()
          .replace(/\b(with|using|on|via|by|the|a|an)\b/g, '') // Remove connector words
          .replace(/[^\w\s]/g, '') // Remove punctuation
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim()
          .split(' ')
          .sort()
          .join(' ');
      };
      
      const normalizedInput = normalizeForMatch(name);
      match = allExercises.find(ex => {
        const normalizedEx = normalizeForMatch(ex.name);
        return normalizedEx === normalizedInput;
      });
      if (match) return match;
      
      // Try keyword similarity scoring (all keywords from input must be in exercise name)
      const inputKeywords = normalizeForMatch(name).split(' ').filter(w => w.length > 2);
      if (inputKeywords.length > 0) {
        const scoredMatches = allExercises
          .map(ex => {
            const exKeywords = normalizeForMatch(ex.name).split(' ').filter(w => w.length > 2);
            const matchingKeywords = inputKeywords.filter(kw => exKeywords.includes(kw));
            const score = matchingKeywords.length / inputKeywords.length;
            return { exercise: ex, score };
          })
          .filter(m => m.score >= 0.7) // At least 70% keyword match
          .sort((a, b) => b.score - a.score);
        
        if (scoredMatches.length > 0) {
          return scoredMatches[0].exercise;
        }
      }
      
      return match;
    };
    
    // Build accepted snapshot with FULL exercise objects from library
    const snapshotExercises = [];
    
    for (const ex of exercisesToProcess) {
      // CRITICAL FIX: Use the exercise_id from template mapping if available
      // The workout generator already resolved template_id → exercise_id
      let matched = null;
      
      if (ex.exercise_id) {
        // First try: Use the pre-resolved exercise_id from template mapping
        console.log(`💪 Using pre-mapped exercise_id: ${ex.exercise_id} for ${ex.exercise}`);
        const result = await db
          .select()
          .from(exercises)
          .where(eq(exercises.id, ex.exercise_id))
          .limit(1);
        matched = result[0];
      }
      
      // Fallback: Try fuzzy matching by name (for legacy workouts)
      if (!matched) {
        console.log(`💪 Falling back to fuzzy matching for: ${ex.exercise}`);
        matched = await matchExerciseByName(ex.exercise);
      }
      
      if (matched) {
        // Store full exercise object with workout-specific metadata
        snapshotExercises.push({
          // Full exercise data from library
          id: matched.id,
          name: matched.name,
          muscles: matched.muscles,
          target: matched.target,
          bodyPart: matched.bodyPart,
          equipment: matched.equipment,
          incrementStep: matched.incrementStep,
          tempoDefault: matched.tempoDefault,
          restDefault: matched.restDefault,
          instructions: matched.instructions,
          videoUrl: matched.videoUrl,
          difficulty: matched.difficulty,
          category: matched.category,
          trackingType: matched.trackingType,
          exercisedbId: matched.exercisedbId,
          // Workout-specific metadata from AI
          sets: ex.sets,
          reps: ex.reps,
          intensity: ex.intensity,
          rest_seconds: ex.rest_seconds,
          goal: ex.goal,
          block: 'main' // All exercises are main for now in blocks format
        });
      } else {
        // Create placeholder exercise object for unmatched exercises
        console.warn(`💪 Could not match exercise to library: ${ex.exercise} - creating placeholder`);
        snapshotExercises.push({
          id: ex.exercise_id || `unmatched-${ex.exercise.toLowerCase().replace(/\s+/g, '-')}`,
          name: ex.exercise,
          muscles: [],
          equipment: 'unknown',
          incrementStep: 2.5,
          restDefault: 90,
          category: 'compound',
          trackingType: 'weight_reps',
          // Workout-specific metadata
          sets: ex.sets,
          reps: ex.reps,
          intensity: ex.intensity,
          rest_seconds: ex.rest_seconds,
          goal: ex.goal,
          block: 'main' // All exercises are main for now in blocks format
        });
      }
    }
    
    const acceptedSnapshot = { exercises: snapshotExercises };

    console.log(`💪 Created accepted snapshot with ${acceptedSnapshot.exercises.length} exercises (matched to library):`, JSON.stringify(acceptedSnapshot.exercises.map(e => ({ id: e.id, name: e.name, sets: e.sets })), null, 2));
    
    // ⬇️ CRITICAL: Write snapshot to database FIRST to ensure atomicity
    console.log(`💪 Updating workout status to accepted with snapshot - ID: ${id}, UserId: ${userId}`);
    console.log(`💪 Snapshot being saved:`, { exerciseCount: acceptedSnapshot.exercises.length, snapshotSize: JSON.stringify(acceptedSnapshot).length });
    
    const updateResult = await db
      .update(generatedWorkouts)
      .set({ 
        status: 'accepted', 
        acceptedAt: new Date(),
        acceptedSnapshot: acceptedSnapshot as any
      })
      .where(and(eq(generatedWorkouts.id, id), eq(generatedWorkouts.userId, userId)))
      .returning();
      
    console.log(`💪 Update result:`, updateResult.length > 0 
      ? `✅ Success - status: ${updateResult[0].status}, snapshot saved: ${updateResult[0].acceptedSnapshot !== null}, exercises in snapshot: ${acceptedSnapshot.exercises.length}` 
      : '❌ No rows updated!');
    
    // Create a new workout session
    const session = await this.createWorkoutSession({
      userId,
      workoutType: workoutData.focus || "AI Generated Training",
      sessionType: "workout",
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour default
      duration: 60,
      sourceType: "ai_generated",
      notes: `AI-Generated Workout: ${workoutData.focus}`,
    });

    // Create workout instance with snapshot FIRST (contains ALL full exercise objects)
    // This ensures the tracker loads exercises from the snapshot, not the database
    const instance = await this.createWorkoutInstance({
      userId,
      workoutSessionId: session.id,
      workoutType: workoutData.focus || "AI Generated Training",
      sourceType: "ai_generated",
      sourceId: id, // Reference the generated workout ID
      snapshotData: acceptedSnapshot as any, // Store ALL exercises with full data in snapshot
    });
    
    console.log(`💪 Created workout instance: ${instance.id} with ${acceptedSnapshot.exercises.length} exercises in snapshot`);
    
    // Create sets for each exercise in the snapshot (only for matched library exercises)
    for (const exercise of acceptedSnapshot.exercises) {
      // Only create sets if this is a real library exercise (not a placeholder)
      if (!exercise.id.startsWith('unmatched-')) {
        // Verify the exercise exists in the database before creating sets
        const verifyExercise = await db
          .select()
          .from(exercises)
          .where(eq(exercises.id, exercise.id))
          .limit(1);
        
        if (!verifyExercise[0]) {
          console.error(`💪 ❌ Exercise ID ${exercise.id} (${exercise.name}) from snapshot not found in database! Skipping set creation.`);
          continue; // Skip this exercise instead of throwing error
        }
        
        console.log(`💪 Creating ${exercise.sets} sets for exercise: ${exercise.name} (ID: ${exercise.id})`);
        // Create sets for this exercise using its ID from the snapshot
        for (let i = 0; i < exercise.sets; i++) {
          await this.addExerciseSet(session.id, exercise.id, userId);
        }
      } else {
        console.warn(`💪 Skipping set creation for unmatched exercise: ${exercise.name} (placeholder in snapshot only)`);
      }
    }
    
    // Return both sessionId and instanceId so tracker can load from snapshot
    return { sessionId: session.id, instanceId: instance.id };
  }

  async rejectGeneratedWorkout(id: string, userId: string): Promise<void> {
    await db
      .update(generatedWorkouts)
      .set({ status: 'rejected' })
      .where(and(eq(generatedWorkouts.id, id), eq(generatedWorkouts.userId, userId)));
  }

  // New methods for test framework compatibility
  async saveGeneratedWorkout(workout: InsertGeneratedWorkout): Promise<GeneratedWorkout> {
    return this.createGeneratedWorkout(workout);
  }

  async getLatestGeneratedWorkout(userId: string): Promise<GeneratedWorkout | undefined> {
    const result = await db
      .select()
      .from(generatedWorkouts)
      .where(eq(generatedWorkouts.userId, userId))
      .orderBy(desc(generatedWorkouts.createdAt))
      .limit(1);
    return result[0];
  }

  async updateGeneratedWorkoutStatus(id: string, status: string): Promise<void> {
    await db
      .update(generatedWorkouts)
      .set({ status })
      .where(eq(generatedWorkouts.id, id));
  }

  async getCompletedGeneratedWorkouts(userId: string, daysBack: number): Promise<GeneratedWorkout[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    return await db
      .select()
      .from(generatedWorkouts)
      .where(
        and(
          eq(generatedWorkouts.userId, userId),
          eq(generatedWorkouts.status, 'completed'),
          gte(generatedWorkouts.date, cutoffDateStr)
        )
      )
      .orderBy(desc(generatedWorkouts.date));
  }

  async getRecentWorkoutFeedback(userId: string, limit: number = 10): Promise<Array<{
    workoutSessionId: string;
    workoutType: string;
    startTime: Date;
    overallDifficulty: number | null;
    fatigueLevel: number | null;
    enjoymentRating: number | null;
    exercisesTooEasy: string[];
    exercisesTooHard: string[];
    painOrDiscomfort: string | null;
    feedbackNotes: string | null;
  }>> {
    // Join training_load_sessions with workout_sessions to get recent feedback
    const results = await db
      .select({
        workoutSessionId: trainingLoadSessions.workoutSessionId,
        workoutType: workoutSessions.workoutType,
        startTime: workoutSessions.startTime,
        overallDifficulty: trainingLoadSessions.overallDifficulty,
        fatigueLevel: trainingLoadSessions.fatigueLevel,
        enjoymentRating: trainingLoadSessions.enjoymentRating,
        exercisesTooEasy: trainingLoadSessions.exercisesTooEasy,
        exercisesTooHard: trainingLoadSessions.exercisesTooHard,
        painOrDiscomfort: trainingLoadSessions.painOrDiscomfort,
        feedbackNotes: trainingLoadSessions.feedbackNotes,
      })
      .from(trainingLoadSessions)
      .innerJoin(workoutSessions, eq(trainingLoadSessions.workoutSessionId, workoutSessions.id))
      .where(eq(trainingLoadSessions.userId, userId))
      .orderBy(desc(workoutSessions.startTime))
      .limit(limit);

    return results;
  }

  async getLastExerciseValues(userId: string, exerciseId: string): Promise<{
    weight: number | null;
    reps: number | null;
    distance: number | null;
    duration: number | null;
  } | null> {
    // Query the most recent completed set for this exercise by this user
    // Use the index on (userId, exerciseId, createdAt) for efficient lookup
    const lastSet = await db
      .select()
      .from(exerciseSets)
      .where(
        and(
          eq(exerciseSets.userId, userId),
          eq(exerciseSets.exerciseId, exerciseId),
          eq(exerciseSets.completed, 1) // Only consider completed sets
        )
      )
      .orderBy(desc(exerciseSets.createdAt))
      .limit(1);

    if (lastSet.length === 0) {
      return null; // No previous data for this exercise
    }

    const set = lastSet[0];
    return {
      weight: set.weight,
      reps: set.reps,
      distance: set.distance,
      duration: set.duration,
    };
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

  async updateExerciseExternalId(exerciseId: string, externalId: string): Promise<Exercise | undefined> {
    const result = await db
      .update(exercises)
      .set({ exercisedbId: externalId })
      .where(eq(exercises.id, exerciseId))
      .returning();
    
    return result[0];
  }

  async getExerciseByName(name: string): Promise<Exercise | undefined> {
    const result = await db
      .select()
      .from(exercises)
      .where(eq(exercises.name, name))
      .limit(1);
    
    return result[0];
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const result = await db
      .insert(exercises)
      .values(exercise)
      .returning();
    
    return result[0];
  }

  async getExerciseTemplateById(templateId: string): Promise<any | undefined> {
    const result = await db
      .select()
      .from(exerciseTemplates)
      .where(eq(exerciseTemplates.id, templateId))
      .limit(1);
    
    return result[0];
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
      
      // Update workout instance snapshot if this session has an instance
      const instances = await tx
        .select()
        .from(workoutInstances)
        .where(eq(workoutInstances.workoutSessionId, sessionId))
        .limit(1);
      
      if (instances.length > 0) {
        const instance = instances[0];
        const snapshotData = instance.snapshotData as any;
        
        // Update the exercises array in the snapshot
        if (snapshotData && snapshotData.exercises) {
          snapshotData.exercises = snapshotData.exercises.map((ex: any) => 
            ex.id === oldExerciseId ? newExercise : ex
          );
          
          // Update the instance with the modified snapshot
          await tx
            .update(workoutInstances)
            .set({ snapshotData })
            .where(eq(workoutInstances.id, instance.id));
          
          console.log(`✅ Updated workout instance snapshot: swapped ${oldExerciseId} → ${newExerciseId}`);
        }
      }
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
    // Check if this is an unmatched exercise (placeholder ID)
    const isUnmatched = exerciseId.startsWith('unmatched-');
    const isTemplate = exerciseId.startsWith('tpl_');
    let trackingType = 'weight_reps';
    let equipment = 'other';
    let resolvedExerciseId = exerciseId;
    
    if (!isUnmatched && !isTemplate) {
      // Get the exercise details to determine tracking type and defaults
      const exercise = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, exerciseId))
        .limit(1);
      
      if (!exercise[0]) {
        throw new Error("Exercise not found");
      }
      
      trackingType = exercise[0].trackingType || 'weight_reps';
      equipment = exercise[0].equipment || 'other';
    } else if (isTemplate) {
      // This is a template_id, need to resolve it to an actual exercise
      const { getOrCreateExerciseForTemplate } = await import("./services/templateExerciseBridge");
      
      // Get the template from exercise_templates table
      const templateResult = await db
        .select()
        .from(exerciseTemplates)
        .where(eq(exerciseTemplates.id, exerciseId))
        .limit(1);
      
      if (templateResult.length === 0) {
        throw new Error(`Template not found: ${exerciseId}`);
      }
      
      const template = templateResult[0];
      // Resolve template → exercise using bridge
      resolvedExerciseId = await getOrCreateExerciseForTemplate(this, {
        id: template.id,
        pattern: template.pattern as any,
        modality: template.modality as any,
        displayName: template.displayName,
        muscles: template.muscles
      });
      
      console.log(`💪 Resolved template ${exerciseId} → exercise ${resolvedExerciseId} for add-set`);
      
      // Now get the exercise details
      const exercise = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, resolvedExerciseId))
        .limit(1);
      
      if (exercise[0]) {
        trackingType = exercise[0].trackingType || 'weight_reps';
        equipment = exercise[0].equipment || 'other';
      }
    }

    // Get existing sets for this exercise in this session to calculate next setIndex
    const existingSets = await db
      .select()
      .from(exerciseSets)
      .where(
        and(
          eq(exerciseSets.workoutSessionId, sessionId),
          eq(exerciseSets.exerciseId, resolvedExerciseId),
          eq(exerciseSets.userId, userId)
        )
      )
      .orderBy(desc(exerciseSets.setIndex));
    
    const nextSetIndex = existingSets.length > 0 ? existingSets[0].setIndex + 1 : 1;
    
    // Fetch last used values for this exercise to enable weight memory (progressive overload)
    // For unmatched exercises, this will return null
    const lastValues = isUnmatched ? null : await this.getLastExerciseValues(userId, resolvedExerciseId);
    
    // Build set data based on tracking type
    const setData: any = {
      workoutSessionId: sessionId,
      exerciseId: resolvedExerciseId,
      userId,
      setIndex: nextSetIndex,
      completed: 0,
    };
    
    // Set type-specific fields - use last values if available, otherwise use defaults
    if (trackingType === 'weight_reps') {
      const isBodyweight = equipment === 'bodyweight';
      // Use last weight if available, otherwise default
      setData.weight = lastValues?.weight !== null && lastValues?.weight !== undefined 
        ? lastValues.weight 
        : (isBodyweight ? 0 : 20); 
      // Use last reps if available, otherwise default to 8
      setData.reps = lastValues?.reps ?? 8;
      setData.targetRepsLow = 6;
      setData.targetRepsHigh = 12;
    } else if (trackingType === 'bodyweight_reps') {
      setData.weight = null;
      // Use last reps if available, otherwise default to 8
      setData.reps = lastValues?.reps ?? 8;
      setData.targetRepsLow = 6;
      setData.targetRepsHigh = 12;
    } else if (trackingType === 'distance_duration') {
      // Use last values if available for cardio
      setData.distance = lastValues?.distance ?? null;
      setData.duration = lastValues?.duration ?? null;
      setData.weight = null;
      setData.reps = null;
    } else if (trackingType === 'duration_only') {
      // Use last duration if available for holds
      setData.duration = lastValues?.duration ?? null;
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

  // Goals v2 - Transactional Creation
  async createGoalWithPlan(params: {
    goal: InsertGoal;
    metrics: InsertGoalMetric[];
    milestones: InsertGoalMilestone[];
    plans: InsertGoalPlan[];
  }): Promise<{
    goal: Goal;
    metrics: GoalMetric[];
    milestones: GoalMilestone[];
    plans: GoalPlan[];
  }> {
    return await db.transaction(async (tx) => {
      // 1. Create goal
      const [goal] = await tx.insert(goals).values(params.goal).returning();

      // 2. Create metrics with goal_id (only if not empty)
      let createdMetrics: GoalMetric[] = [];
      if (params.metrics.length > 0) {
        const metricsWithGoalId = params.metrics.map(m => ({ ...m, goalId: goal.id }));
        createdMetrics = await tx.insert(goalMetrics).values(metricsWithGoalId).returning();
      }

      // 3. Create milestones with goal_id (only if not empty)
      let createdMilestones: GoalMilestone[] = [];
      if (params.milestones.length > 0) {
        const milestonesWithGoalId = params.milestones.map(m => ({ ...m, goalId: goal.id }));
        createdMilestones = await tx.insert(goalMilestones).values(milestonesWithGoalId).returning();
      }

      // 4. Create plans with goal_id (only if not empty)
      let createdPlans: GoalPlan[] = [];
      if (params.plans.length > 0) {
        const plansWithGoalId = params.plans.map(p => ({ ...p, goalId: goal.id }));
        createdPlans = await tx.insert(goalPlans).values(plansWithGoalId).returning();
        
        // 5. Flatten v2.0 training plan sessions into goal_plan_sessions table for scheduling
        for (const plan of createdPlans) {
          if (plan.planType === 'training' && plan.version === 2) {
            try {
              // Import goal-plans module
              const goalPlansModule = await import('@shared/types/goal-plans');
              const flattenPlanToSessions = goalPlansModule.flattenPlanToSessions;
              const validateGoalPlanContent = goalPlansModule.validateGoalPlanContent;
              
              // Validate plan content
              const validation = validateGoalPlanContent(plan.contentJson);
              if (validation.success && validation.data) {
                // Flatten into individual sessions
                const flattenedSessions = flattenPlanToSessions(plan.id, validation.data);
                
                // Insert sessions into goal_plan_sessions table
                if (flattenedSessions.length > 0) {
                  const sessionInserts = flattenedSessions.map(s => ({
                    goalPlanId: s.goalPlanId,
                    sessionTemplateId: s.sessionTemplateId,
                    phaseNumber: s.phaseNumber,
                    phaseName: s.phaseName,
                    weekNumber: s.weekNumber,
                    weekLabel: s.weekLabel,
                    sessionData: s.sessionData as any, // JSONB field
                    status: 'pending' as const,
                    scheduledDate: null,
                    completedAt: null,
                  }));
                  
                  await tx.insert(goalPlanSessions).values(sessionInserts);
                  console.log(`✅ Flattened ${flattenedSessions.length} sessions from v2.0 plan ${plan.id}`);
                } else {
                  console.log(`ℹ️ v2.0 plan ${plan.id} has no sessions to flatten`);
                }
              } else {
                console.warn(`⚠️ v2.0 plan ${plan.id} failed validation:`, validation.error);
              }
            } catch (error) {
              console.error(`❌ Error flattening v2.0 plan ${plan.id}:`, error);
              // Continue transaction - don't fail goal creation if session flattening fails
            }
          }
        }
      }

      return {
        goal,
        metrics: createdMetrics,
        milestones: createdMilestones,
        plans: createdPlans,
      };
    });
  }

  // Goals v2 - Get user's available data sources (tracked metrics)
  async getUserAvailableDataSources(userId: string): Promise<{
    healthkit: string[];
    oura: string[];
    whoop: string[];
    manual: string[];
  }> {
    // Check which metrics the user has tracked in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // HealthKit metrics from biomarkers table
    const healthkitBiomarkers = await db
      .select()
      .from(biomarkers)
      .where(
        and(
          eq(biomarkers.userId, userId),
          eq(biomarkers.source, 'healthkit'),
          gte(biomarkers.recordedAt, thirtyDaysAgo)
        )
      )
      .limit(1000);

    // HealthKit metrics from hk_events_raw table
    const healthkitRawEvents = await db
      .select()
      .from(hkEventsRaw)
      .where(
        and(
          eq(hkEventsRaw.userId, userId),
          gte(hkEventsRaw.receivedAtUtc, thirtyDaysAgo)
        )
      )
      .limit(1000);

    // HealthKit workout-based metrics (running, cycling, swimming, etc.)
    const workoutSessionsData = await db
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startTime, thirtyDaysAgo),
          or(
            eq(workoutSessions.sourceType, 'apple_health'),
            eq(workoutSessions.sourceType, 'healthkit')
          )
        )
      )
      .limit(1000);

    // Map workout types to metric types
    const workoutMetrics: string[] = [];
    const uniqueWorkoutTypes = [...new Set(workoutSessionsData.map(w => w.workoutType))];
    
    for (const workoutType of uniqueWorkoutTypes) {
      const normalized = workoutType.toLowerCase();
      if (normalized.includes('run')) {
        workoutMetrics.push('running-distance');
      } else if (normalized.includes('cycl')) {
        workoutMetrics.push('cycling-distance');
      } else if (normalized.includes('swim')) {
        workoutMetrics.push('swimming-distance');
      } else if (normalized.includes('walk')) {
        workoutMetrics.push('walking-distance');
      }
    }

    // Combine all HealthKit sources and remove duplicates
    const healthkitFromBiomarkers = healthkitBiomarkers.map(b => b.type);
    const healthkitFromRaw = healthkitRawEvents.map(e => e.type);
    const healthkitMetrics = [...new Set([
      ...healthkitFromBiomarkers, 
      ...healthkitFromRaw,
      ...workoutMetrics
    ])];

    // Manual metrics
    const manualBiomarkers = await db
      .select()
      .from(biomarkers)
      .where(
        and(
          eq(biomarkers.userId, userId),
          eq(biomarkers.source, 'manual'),
          gte(biomarkers.recordedAt, thirtyDaysAgo)
        )
      )
      .limit(1000);

    const manualMetrics = [...new Set(manualBiomarkers.map(b => b.type))];

    // TODO: Add Oura and Whoop integration when available
    return {
      healthkit: healthkitMetrics,
      oura: [],
      whoop: [],
      manual: manualMetrics,
    };
  }

  // Goals v2 - Get workout-based metric values (running-distance, cycling-distance, etc.)
  async getWorkoutMetricValue(
    userId: string,
    workoutType: string, // 'running', 'cycling', 'swimming', 'walking'
    aggregation: 'max' | 'latest' = 'latest'
  ): Promise<number | null> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query workouts matching the type (case-insensitive to capture Running, running, RUNNING, etc.)
    const workouts = await db
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startTime, thirtyDaysAgo),
          ilike(workoutSessions.workoutType, `%${workoutType}%`)
        )
      )
      .orderBy(desc(workoutSessions.startTime))
      .limit(100);

    if (workouts.length === 0) return null;

    // Filter workouts with distance
    const workoutsWithDistance = workouts.filter(w => w.distance && w.distance > 0);
    if (workoutsWithDistance.length === 0) return null;

    if (aggregation === 'max') {
      // Return maximum distance
      const maxDistance = Math.max(...workoutsWithDistance.map(w => w.distance!));
      return maxDistance / 1000; // Convert meters to km
    } else {
      // Return latest distance
      return workoutsWithDistance[0].distance! / 1000; // Convert meters to km
    }
  }

  // Goals v2 - Metrics
  async createGoalMetric(metric: InsertGoalMetric): Promise<GoalMetric> {
    const result = await db.insert(goalMetrics).values(metric).returning();
    return result[0];
  }

  async getGoalMetrics(goalId: string): Promise<GoalMetric[]> {
    return await db
      .select()
      .from(goalMetrics)
      .where(eq(goalMetrics.goalId, goalId))
      .orderBy(goalMetrics.priority);
  }

  async updateGoalMetric(id: string, data: Partial<GoalMetric>): Promise<GoalMetric | undefined> {
    const result = await db
      .update(goalMetrics)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(goalMetrics.id, id))
      .returning();
    return result[0];
  }

  // Goals v2 - Milestones
  async createGoalMilestone(milestone: InsertGoalMilestone): Promise<GoalMilestone> {
    const result = await db.insert(goalMilestones).values(milestone).returning();
    return result[0];
  }

  async getGoalMilestones(goalId: string): Promise<GoalMilestone[]> {
    return await db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId))
      .orderBy(goalMilestones.dueDate);
  }

  async updateGoalMilestone(id: string, data: Partial<GoalMilestone>): Promise<GoalMilestone | undefined> {
    const result = await db
      .update(goalMilestones)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(goalMilestones.id, id))
      .returning();
    return result[0];
  }

  // Goals v2 - Plans
  async createGoalPlan(plan: InsertGoalPlan): Promise<GoalPlan> {
    const result = await db.insert(goalPlans).values(plan).returning();
    return result[0];
  }

  async getGoalPlans(goalId: string, planType?: string): Promise<GoalPlan[]> {
    const query = db
      .select()
      .from(goalPlans)
      .where(eq(goalPlans.goalId, goalId));

    if (planType) {
      return await query.where(and(eq(goalPlans.goalId, goalId), eq(goalPlans.planType, planType)));
    }

    return await query;
  }

  async updateGoalPlan(id: string, data: Partial<GoalPlan>): Promise<GoalPlan | undefined> {
    const result = await db
      .update(goalPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(goalPlans.id, id))
      .returning();
    return result[0];
  }

  // Goal Plan Sessions - Flattened sessions for workout scheduling
  async createGoalPlanSession(session: InsertGoalPlanSession): Promise<GoalPlanSession> {
    const result = await db.insert(goalPlanSessions).values(session).returning();
    return result[0];
  }

  async getGoalPlanSessions(goalPlanId: string, status?: string): Promise<GoalPlanSession[]> {
    const query = db
      .select()
      .from(goalPlanSessions)
      .where(eq(goalPlanSessions.goalPlanId, goalPlanId));

    if (status) {
      return await query.where(and(eq(goalPlanSessions.goalPlanId, goalPlanId), eq(goalPlanSessions.status, status)));
    }

    return await query.orderBy(goalPlanSessions.phaseNumber, goalPlanSessions.weekNumber);
  }

  // Goal Conversations - Conversational Goal Creation
  async createGoalConversation(conversation: InsertGoalConversation): Promise<GoalConversation> {
    const result = await db.insert(goalConversations).values(conversation).returning();
    return result[0];
  }

  async getGoalConversation(id: string, userId: string): Promise<GoalConversation | undefined> {
    const result = await db.select().from(goalConversations)
      .where(and(eq(goalConversations.id, id), eq(goalConversations.userId, userId)));
    return result[0];
  }

  async getActiveGoalConversation(userId: string): Promise<GoalConversation | undefined> {
    const result = await db.select().from(goalConversations)
      .where(and(eq(goalConversations.userId, userId), eq(goalConversations.status, 'active')))
      .orderBy(desc(goalConversations.createdAt))
      .limit(1);
    return result[0];
  }

  async updateGoalConversation(id: string, userId: string, data: Partial<GoalConversation>): Promise<GoalConversation | undefined> {
    const result = await db.update(goalConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(goalConversations.id, id), eq(goalConversations.userId, userId)))
      .returning();
    return result[0];
  }

  // Metric Standards
  async getAllMetricStandards(filters?: {
    metricKey?: string;
    category?: string;
    evidenceLevel?: string;
  }): Promise<MetricStandard[]> {
    let query = db.select().from(metricStandards);

    const conditions: any[] = [];
    
    if (filters?.metricKey) {
      conditions.push(eq(metricStandards.metricKey, filters.metricKey));
    }
    if (filters?.category) {
      conditions.push(eq(metricStandards.category, filters.category));
    }
    if (filters?.evidenceLevel) {
      conditions.push(eq(metricStandards.evidenceLevel, filters.evidenceLevel));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(metricStandards.usageCount));
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

  // Symptom Tracking methods
  async createSymptomEvent(event: InsertSymptomEvent): Promise<SymptomEvent> {
    const result = await db.insert(symptomEvents).values(event).returning();
    return result[0];
  }

  async getSymptomEvents(userId: string, limit: number = 100): Promise<SymptomEvent[]> {
    return await db
      .select()
      .from(symptomEvents)
      .where(eq(symptomEvents.userId, userId))
      .orderBy(desc(symptomEvents.recordedAt))
      .limit(limit);
  }

  async getActiveSymptomEpisodes(userId: string): Promise<SymptomEvent[]> {
    // Get the most recent event for each active episode (where status != 'resolved')
    const allEvents = await db
      .select()
      .from(symptomEvents)
      .where(
        and(
          eq(symptomEvents.userId, userId),
          sql`${symptomEvents.status} != 'resolved'`
        )
      )
      .orderBy(desc(symptomEvents.recordedAt));

    // Group by episodeId and take only the most recent event for each episode
    const episodeMap = new Map<string, SymptomEvent>();
    for (const event of allEvents) {
      if (!episodeMap.has(event.episodeId)) {
        episodeMap.set(event.episodeId, event);
      }
    }
    return Array.from(episodeMap.values());
  }

  async getSymptomEpisodeEvents(userId: string, episodeId: string): Promise<SymptomEvent[]> {
    return await db
      .select()
      .from(symptomEvents)
      .where(
        and(
          eq(symptomEvents.userId, userId),
          eq(symptomEvents.episodeId, episodeId)
        )
      )
      .orderBy(desc(symptomEvents.recordedAt));
  }

  async updateSymptomEvent(id: string, userId: string, data: Partial<SymptomEvent>): Promise<SymptomEvent | undefined> {
    const result = await db
      .update(symptomEvents)
      .set(data)
      .where(and(eq(symptomEvents.id, id), eq(symptomEvents.userId, userId)))
      .returning();
    return result[0];
  }

  async resolveSymptomEpisode(episodeId: string, userId: string, endedAt: Date): Promise<void> {
    // Update all events in this episode to status='resolved' and set endedAt
    await db
      .update(symptomEvents)
      .set({
        status: 'resolved',
        endedAt,
        severity: null,
        trend: null,
      })
      .where(
        and(
          eq(symptomEvents.userId, userId),
          eq(symptomEvents.episodeId, episodeId)
        )
      );
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

  // User Protocol Completion methods
  async markProtocolComplete(completion: InsertUserProtocolCompletion): Promise<UserProtocolCompletion> {
    const result = await db.insert(userProtocolCompletions).values(completion).returning();
    return result[0];
  }

  async getProtocolCompletions(userId: string, date?: string): Promise<UserProtocolCompletion[]> {
    if (date) {
      return await db
        .select()
        .from(userProtocolCompletions)
        .where(
          and(
            eq(userProtocolCompletions.userId, userId),
            eq(userProtocolCompletions.date, date)
          )
        )
        .orderBy(desc(userProtocolCompletions.completedAt));
    }
    return await db
      .select()
      .from(userProtocolCompletions)
      .where(eq(userProtocolCompletions.userId, userId))
      .orderBy(desc(userProtocolCompletions.completedAt));
  }

  async getProtocolCompletionsForProtocol(userId: string, protocolId: string): Promise<UserProtocolCompletion[]> {
    return await db
      .select()
      .from(userProtocolCompletions)
      .where(
        and(
          eq(userProtocolCompletions.userId, userId),
          eq(userProtocolCompletions.protocolId, protocolId)
        )
      )
      .orderBy(desc(userProtocolCompletions.completedAt));
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
    console.log(`🔍 getFilteredMealLibraryItems called with filters:`, JSON.stringify(filters, null, 2));
    
    // Get user's meal feedback to exclude ALL dislike types and boost thumbs up
    const userFeedback = await this.getUserMealFeedback(userId);
    const dislikedMealIds = userFeedback
      .filter(f => f.feedback === 'thumbs_down' || f.feedback === 'permanent_dislike' || f.feedback === 'dislike')
      .map(f => f.mealLibraryId)
      .filter(id => id != null); // Filter out null IDs
    const thumbsUpIds = userFeedback
      .filter(f => f.feedback === 'thumbs_up')
      .map(f => f.mealLibraryId)
      .filter(id => id != null);
    
    console.log(`📊 Disliked meal IDs: ${dislikedMealIds.length}, Thumbs up IDs: ${thumbsUpIds.length}`);

    // Get active meals from library
    let query = db
      .select()
      .from(mealLibrary)
      .where(
        and(
          eq(mealLibrary.status, 'active'),
          // Exclude ALL meals user disliked (permanent_dislike, thumbs_down, dislike)
          dislikedMealIds.length > 0 ? sql`${mealLibrary.id} NOT IN (${sql.join(dislikedMealIds.map(id => sql`${id}`), sql`, `)})` : undefined
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

    // Diet filter - map common diet names to Spoonacular values
    if (filters.diet) {
      const validSpoonacularDiets = [
        'ketogenic', 'vegetarian', 'vegan', 'pescatarian', 'paleo',
        'whole 30', 'gluten free', 'dairy free', 'lacto ovo vegetarian',
        'fodmap friendly', 'primal', 'paleolithic'
      ];
      
      // Map common diet names to Spoonacular equivalents
      let dietToSearch = filters.diet.toLowerCase();
      console.log(`🥗 Original diet filter: "${filters.diet}" → "${dietToSearch}"`);
      
      if (dietToSearch === 'low-carb') {
        dietToSearch = 'ketogenic'; // Map low-carb to ketogenic
        console.log(`🔄 Mapped "low-carb" → "ketogenic"`);
      } else if (dietToSearch === 'whole30') {
        dietToSearch = 'whole 30';
        console.log(`🔄 Mapped "whole30" → "whole 30"`);
      }
      
      // Only apply filter if it's a valid Spoonacular diet type
      if (validSpoonacularDiets.includes(dietToSearch)) {
        console.log(`✅ Diet "${dietToSearch}" is valid, adding to SQL conditions`);
        conditions.push(
          sql`${dietToSearch} = ANY(${mealLibrary.diets})`
        );
      } else {
        console.log(`⚠️ Diet "${dietToSearch}" is NOT valid, skipping diet filter`);
      }
    }

    // Calorie filters - only apply if meal has calories data
    if (filters.minCalories) {
      conditions.push(sql`(${mealLibrary.calories} IS NULL OR ${mealLibrary.calories} >= ${filters.minCalories})`);
    }
    if (filters.maxCalories) {
      conditions.push(sql`(${mealLibrary.calories} IS NULL OR ${mealLibrary.calories} <= ${filters.maxCalories})`);
    }

    // Macro filters - only apply if meal has macro data
    if (filters.maxCarbs) {
      conditions.push(sql`(${mealLibrary.carbs} IS NULL OR ${mealLibrary.carbs} <= ${filters.maxCarbs})`);
    }
    if (filters.minProtein) {
      conditions.push(sql`(${mealLibrary.protein} IS NULL OR ${mealLibrary.protein} >= ${filters.minProtein})`);
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

    console.log(`🔎 SQL conditions applied: ${conditions.length} total`);
    
    // Get all matching meals
    const allMeals = await query;

    console.log(`📊 SQL query returned ${allMeals.length} meals`);
    
    if (allMeals.length === 0) {
      console.log(`❌ No meals found matching filters`);
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

  // Subscription implementations
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const { subscriptions } = await import("@shared/schema");
    const [result] = await db.insert(subscriptions).values(subscription).returning();
    return result;
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const { subscriptions } = await import("@shared/schema");
    const results = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return results[0];
  }

  async getActiveSubscription(userId: string): Promise<Subscription | undefined> {
    const { subscriptions } = await import("@shared/schema");
    const results = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return results[0];
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const { subscriptions } = await import("@shared/schema");
    const results = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return results[0];
  }

  async updateSubscription(stripeSubscriptionId: string, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const { subscriptions } = await import("@shared/schema");
    const [result] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .returning();
    return result;
  }

  // Promo Code implementations
  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const { promoCodes } = await import("@shared/schema");
    const [result] = await db.insert(promoCodes).values(promoCode).returning();
    return result;
  }

  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    const { promoCodes } = await import("@shared/schema");
    // Case-insensitive search
    const results = await db.select().from(promoCodes).where(sql`LOWER(${promoCodes.code}) = LOWER(${code})`);
    return results[0];
  }

  async getPromoCodes(isActive?: boolean): Promise<PromoCode[]> {
    const { promoCodes } = await import("@shared/schema");
    if (isActive !== undefined) {
      return await db.select().from(promoCodes).where(eq(promoCodes.isActive, isActive ? 1 : 0));
    }
    return await db.select().from(promoCodes);
  }

  async updatePromoCodeUsage(code: string): Promise<PromoCode | undefined> {
    const { promoCodes } = await import("@shared/schema");
    const [result] = await db
      .update(promoCodes)
      .set({ 
        currentUses: sql`${promoCodes.currentUses} + 1`,
        updatedAt: new Date()
      })
      .where(sql`LOWER(${promoCodes.code}) = LOWER(${code})`)
      .returning();
    return result;
  }

  async updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const { promoCodes } = await import("@shared/schema");
    const [result] = await db
      .update(promoCodes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(promoCodes.id, id))
      .returning();
    return result;
  }

  async incrementPromoCodeUsage(id: string): Promise<void> {
    const { promoCodes } = await import("@shared/schema");
    await db
      .update(promoCodes)
      .set({ 
        usedCount: sql`${promoCodes.usedCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(promoCodes.id, id));
  }

  // Referral implementations
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const { referrals } = await import("@shared/schema");
    const [result] = await db.insert(referrals).values(referral).returning();
    return result;
  }

  async getReferral(referralCode: string): Promise<Referral | undefined> {
    const { referrals } = await import("@shared/schema");
    const results = await db.select().from(referrals).where(eq(referrals.referralCode, referralCode));
    return results[0];
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    const { referrals } = await import("@shared/schema");
    return await db.select().from(referrals).where(eq(referrals.referrerUserId, userId));
  }

  async updateReferralStatus(referralCode: string, status: string, convertedAt?: Date): Promise<Referral | undefined> {
    const { referrals } = await import("@shared/schema");
    const updateData: any = { status, updatedAt: new Date() };
    if (convertedAt) {
      updateData.convertedAt = convertedAt;
    }
    const [result] = await db
      .update(referrals)
      .set(updateData)
      .where(eq(referrals.referralCode, referralCode))
      .returning();
    return result;
  }

  async markReferralRewarded(referralCode: string): Promise<Referral | undefined> {
    const { referrals } = await import("@shared/schema");
    const [result] = await db
      .update(referrals)
      .set({ 
        rewardGranted: 1,
        rewardedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(referrals.referralCode, referralCode))
      .returning();
    return result;
  }

  async generateReferralCode(userId: string): Promise<string> {
    // Generate a unique referral code like "JOHN-A3B9"
    const user = await this.getUser(userId);
    const firstName = user?.firstName?.toUpperCase()?.substring(0, 6) || "USER";
    
    // Generate random 4-character suffix
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing characters like 0/O, 1/I
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const referralCode = `${firstName}-${suffix}`;
    
    // Check if code already exists (rare collision)
    const existing = await this.getReferral(referralCode);
    if (existing) {
      // Recursively try again with different suffix
      return this.generateReferralCode(userId);
    }
    
    // Update user with their referral code
    await db.update(users).set({ referralCode }).where(eq(users.id, userId));
    
    return referralCode;
  }
  
  // Voice Chat & Memory implementations
  async createVoiceSession(session: InsertVoiceSession): Promise<VoiceSession> {
    const [result] = await db.insert(voiceSessions).values(session).returning();
    return result;
  }
  
  async getVoiceSessions(userId: string, limit: number = 50): Promise<VoiceSession[]> {
    return await db
      .select()
      .from(voiceSessions)
      .where(eq(voiceSessions.userId, userId))
      .orderBy(desc(voiceSessions.createdAt))
      .limit(limit);
  }
  
  async submitChatFeedback(feedback: InsertChatFeedback): Promise<ChatFeedback> {
    const [result] = await db.insert(chatFeedback).values(feedback).returning();
    return result;
  }
  
  async getChatFeedback(userId: string): Promise<ChatFeedback[]> {
    return await db
      .select()
      .from(chatFeedback)
      .where(eq(chatFeedback.userId, userId))
      .orderBy(desc(chatFeedback.createdAt));
  }
  
  async getChatFeedbackForMessage(messageId: string): Promise<ChatFeedback | undefined> {
    const results = await db
      .select()
      .from(chatFeedback)
      .where(eq(chatFeedback.messageId, messageId));
    return results[0];
  }
  
  async logSafetyEscalation(escalation: InsertSafetyEscalation): Promise<SafetyEscalation> {
    const [result] = await db.insert(safetyEscalations).values(escalation).returning();
    return result;
  }
  
  async getSafetyEscalations(userId: string, limit: number = 100): Promise<SafetyEscalation[]> {
    return await db
      .select()
      .from(safetyEscalations)
      .where(eq(safetyEscalations.userId, userId))
      .orderBy(desc(safetyEscalations.createdAt))
      .limit(limit);
  }
  
  async addCoachMemory(memory: InsertCoachMemory): Promise<CoachMemory> {
    const [result] = await db.insert(coachMemory).values(memory).returning();
    return result;
  }
  
  async getCoachMemories(userId: string, memoryType?: string): Promise<CoachMemory[]> {
    const query = memoryType
      ? db.select().from(coachMemory).where(and(eq(coachMemory.userId, userId), eq(coachMemory.memoryType, memoryType)))
      : db.select().from(coachMemory).where(eq(coachMemory.userId, userId));
    
    return await query.orderBy(desc(coachMemory.createdAt));
  }
  
  async getRelevantMemories(userId: string, queryEmbedding: number[], limit: number = 5): Promise<CoachMemory[]> {
    // Defensive check: ensure queryEmbedding is valid
    if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.warn("getRelevantMemories: Invalid queryEmbedding provided");
      return [];
    }
    
    // Get all memories for the user
    const userMemories = await db
      .select()
      .from(coachMemory)
      .where(eq(coachMemory.userId, userId));
    
    // Calculate cosine similarity for each memory with embedding
    const memoriesWithSimilarity = userMemories
      .filter(m => {
        // Only include memories with valid embeddings that match queryEmbedding length
        if (!m.embedding || !Array.isArray(m.embedding)) return false;
        const memoryEmbedding = m.embedding as number[];
        if (memoryEmbedding.length !== queryEmbedding.length) {
          console.warn(`getRelevantMemories: Embedding length mismatch for memory ${m.id}`);
          return false;
        }
        return true;
      })
      .map(memory => {
        const memoryEmbedding = memory.embedding as number[];
        const similarity = this.cosineSimilarity(queryEmbedding, memoryEmbedding);
        return { ...memory, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    return memoriesWithSimilarity;
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  async deleteCoachMemory(id: string, userId: string): Promise<void> {
    await db
      .delete(coachMemory)
      .where(and(eq(coachMemory.id, id), eq(coachMemory.userId, userId)));
  }
  
  async deleteAllCoachMemories(userId: string): Promise<void> {
    await db.delete(coachMemory).where(eq(coachMemory.userId, userId));
  }
  
  async updatePreferenceVector(userId: string, preferenceType: string, weight: number): Promise<PreferenceVector> {
    // Use upsert pattern: try to insert, on conflict update
    const [result] = await db
      .insert(preferenceVectors)
      .values({ userId, preferenceType, weight, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [preferenceVectors.userId, preferenceVectors.preferenceType],
        set: { weight, updatedAt: new Date() }
      })
      .returning();
    return result;
  }
  
  async getPreferenceVectors(userId: string): Promise<PreferenceVector[]> {
    return await db
      .select()
      .from(preferenceVectors)
      .where(eq(preferenceVectors.userId, userId));
  }
  
  async resetUserMemory(userId: string): Promise<void> {
    // Delete all coach memories, preference vectors, voice sessions, and chat feedback
    // Use transaction to ensure all-or-nothing deletion (prevent partial data clearing)
    await db.transaction(async (tx) => {
      await Promise.all([
        tx.delete(coachMemory).where(eq(coachMemory.userId, userId)),
        tx.delete(preferenceVectors).where(eq(preferenceVectors.userId, userId)),
        tx.delete(voiceSessions).where(eq(voiceSessions.userId, userId)),
        tx.delete(chatFeedback).where(eq(chatFeedback.userId, userId)),
      ]);
    });
  }
  
  async getWeeklyReflectionData(userId: string, startDate: Date, endDate: Date): Promise<{
    voiceSessions: VoiceSession[];
    memories: CoachMemory[];
    feedbackCount: number;
  }> {
    const [sessions, memories, feedbackResults] = await Promise.all([
      db.select()
        .from(voiceSessions)
        .where(and(
          eq(voiceSessions.userId, userId),
          gte(voiceSessions.createdAt, startDate),
          lte(voiceSessions.createdAt, endDate)
        ))
        .orderBy(desc(voiceSessions.createdAt)),
      
      db.select()
        .from(coachMemory)
        .where(and(
          eq(coachMemory.userId, userId),
          gte(coachMemory.createdAt, startDate),
          lte(coachMemory.createdAt, endDate)
        ))
        .orderBy(desc(coachMemory.createdAt)),
      
      db.select({ count: count() })
        .from(chatFeedback)
        .where(and(
          eq(chatFeedback.userId, userId),
          gte(chatFeedback.createdAt, startDate),
          lte(chatFeedback.createdAt, endDate)
        ))
    ]);
    
    return {
      voiceSessions: sessions,
      memories,
      feedbackCount: feedbackResults[0]?.count || 0,
    };
  }
  
  // ===== LANDING PAGE CMS =====
  
  async getLandingPageContent(): Promise<LandingPageContent | undefined> {
    const result = await db.select().from(landingPageContent).limit(1);
    return result[0];
  }
  
  async upsertLandingPageContent(content: Partial<InsertLandingPageContent>): Promise<LandingPageContent> {
    const existing = await this.getLandingPageContent();
    
    if (existing) {
      const [updated] = await db.update(landingPageContent)
        .set({ ...content, updatedAt: new Date() })
        .where(eq(landingPageContent.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(landingPageContent)
        .values(content as InsertLandingPageContent)
        .returning();
      return created;
    }
  }
  
  async getLandingPageFeatures(section?: string): Promise<LandingPageFeature[]> {
    if (section) {
      return await db.select()
        .from(landingPageFeatures)
        .where(eq(landingPageFeatures.section, section))
        .orderBy(landingPageFeatures.order);
    }
    return await db.select()
      .from(landingPageFeatures)
      .orderBy(landingPageFeatures.section, landingPageFeatures.order);
  }
  
  async getLandingPageFeature(id: string): Promise<LandingPageFeature | undefined> {
    const result = await db.select()
      .from(landingPageFeatures)
      .where(eq(landingPageFeatures.id, id));
    return result[0];
  }
  
  async createLandingPageFeature(feature: InsertLandingPageFeature): Promise<LandingPageFeature> {
    const [created] = await db.insert(landingPageFeatures)
      .values(feature)
      .returning();
    return created;
  }
  
  async updateLandingPageFeature(id: string, feature: Partial<InsertLandingPageFeature>): Promise<LandingPageFeature | undefined> {
    const [updated] = await db.update(landingPageFeatures)
      .set({ ...feature, updatedAt: new Date() })
      .where(eq(landingPageFeatures.id, id))
      .returning();
    return updated;
  }
  
  async deleteLandingPageFeature(id: string): Promise<void> {
    await db.delete(landingPageFeatures).where(eq(landingPageFeatures.id, id));
  }
  
  async getLandingPageTestimonials(): Promise<LandingPageTestimonial[]> {
    return await db.select()
      .from(landingPageTestimonials)
      .orderBy(landingPageTestimonials.order);
  }
  
  async getLandingPageTestimonial(id: string): Promise<LandingPageTestimonial | undefined> {
    const result = await db.select()
      .from(landingPageTestimonials)
      .where(eq(landingPageTestimonials.id, id));
    return result[0];
  }
  
  async createLandingPageTestimonial(testimonial: InsertLandingPageTestimonial): Promise<LandingPageTestimonial> {
    const [created] = await db.insert(landingPageTestimonials)
      .values(testimonial)
      .returning();
    return created;
  }
  
  async updateLandingPageTestimonial(id: string, testimonial: Partial<InsertLandingPageTestimonial>): Promise<LandingPageTestimonial | undefined> {
    const [updated] = await db.update(landingPageTestimonials)
      .set({ ...testimonial, updatedAt: new Date() })
      .where(eq(landingPageTestimonials.id, id))
      .returning();
    return updated;
  }
  
  async deleteLandingPageTestimonial(id: string): Promise<void> {
    await db.delete(landingPageTestimonials).where(eq(landingPageTestimonials.id, id));
  }
  
  async getLandingPagePricingPlans(): Promise<LandingPagePricingPlan[]> {
    return await db.select()
      .from(landingPagePricingPlans)
      .orderBy(landingPagePricingPlans.order);
  }
  
  async getLandingPagePricingPlan(id: string): Promise<LandingPagePricingPlan | undefined> {
    const result = await db.select()
      .from(landingPagePricingPlans)
      .where(eq(landingPagePricingPlans.id, id));
    return result[0];
  }
  
  async createLandingPagePricingPlan(plan: InsertLandingPagePricingPlan): Promise<LandingPagePricingPlan> {
    const [created] = await db.insert(landingPagePricingPlans)
      .values(plan)
      .returning();
    return created;
  }
  
  async updateLandingPagePricingPlan(id: string, plan: Partial<InsertLandingPagePricingPlan>): Promise<LandingPagePricingPlan | undefined> {
    const [updated] = await db.update(landingPagePricingPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(landingPagePricingPlans.id, id))
      .returning();
    return updated;
  }
  
  async deleteLandingPagePricingPlan(id: string): Promise<void> {
    await db.delete(landingPagePricingPlans).where(eq(landingPagePricingPlans.id, id));
  }
  
  async getLandingPageSocialLinks(): Promise<LandingPageSocialLink[]> {
    return await db.select()
      .from(landingPageSocialLinks)
      .orderBy(landingPageSocialLinks.order);
  }
  
  async getLandingPageSocialLink(id: string): Promise<LandingPageSocialLink | undefined> {
    const result = await db.select()
      .from(landingPageSocialLinks)
      .where(eq(landingPageSocialLinks.id, id));
    return result[0];
  }
  
  async createLandingPageSocialLink(link: InsertLandingPageSocialLink): Promise<LandingPageSocialLink> {
    const [created] = await db.insert(landingPageSocialLinks)
      .values(link)
      .returning();
    return created;
  }
  
  async updateLandingPageSocialLink(id: string, link: Partial<InsertLandingPageSocialLink>): Promise<LandingPageSocialLink | undefined> {
    const [updated] = await db.update(landingPageSocialLinks)
      .set({ ...link, updatedAt: new Date() })
      .where(eq(landingPageSocialLinks.id, id))
      .returning();
    return updated;
  }
  
  async deleteLandingPageSocialLink(id: string): Promise<void> {
    await db.delete(landingPageSocialLinks).where(eq(landingPageSocialLinks.id, id));
  }
  
  // Meal preference and recommendation methods implementation
  async getUserBanditState(userId: string): Promise<UserBanditState[]> {
    return await db.select()
      .from(userBanditState)
      .where(eq(userBanditState.userId, userId));
  }
  
  async updateUserBanditState(userId: string, armKey: string, alpha: number, beta: number): Promise<UserBanditState> {
    // Try to update existing state
    const existing = await db.select()
      .from(userBanditState)
      .where(and(
        eq(userBanditState.userId, userId),
        eq(userBanditState.armKey, armKey)
      ));
    
    if (existing.length > 0) {
      // Update existing state (incrementally)
      const [updated] = await db.update(userBanditState)
        .set({ 
          alpha: existing[0].alpha + alpha,
          beta: existing[0].beta + beta,
          lastUpdated: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(userBanditState.userId, userId),
          eq(userBanditState.armKey, armKey)
        ))
        .returning();
      return updated;
    } else {
      // Create new state
      const [created] = await db.insert(userBanditState)
        .values({
          userId,
          armKey,
          alpha: 1.0 + alpha, // Start with prior of 1,1
          beta: 1.0 + beta
        })
        .returning();
      return created;
    }
  }
  
  async saveUserMealPreference(preference: InsertUserMealPreference): Promise<UserMealPreference> {
    const [created] = await db.insert(userMealPreferences)
      .values(preference)
      .returning();
    return created;
  }
  
  async getUserMealPreferences(userId: string, days: number): Promise<UserMealPreference[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return await db.select()
      .from(userMealPreferences)
      .where(and(
        eq(userMealPreferences.userId, userId),
        gte(userMealPreferences.timestamp, since)
      ))
      .orderBy(desc(userMealPreferences.timestamp));
  }
  
  async saveMealRecommendationHistory(history: InsertMealRecommendationHistory): Promise<MealRecommendationHistory> {
    const [created] = await db.insert(mealRecommendationHistory)
      .values(history)
      .returning();
    return created;
  }
  
  // Cost Control & Telemetry implementations
  async getCostSummary(days: number): Promise<{
    totalCost: number;
    totalJobs: number;
    totalAiCalls: number;
    totalTokensIn: number;
    totalTokensOut: number;
    dailyData: Array<{
      date: string;
      cost: number;
      jobs: number;
      aiCalls: number;
      tierBreakdown: Record<string, number>;
    }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Get daily aggregates
    const dailyRecords = await db.select()
      .from(costGlobalDaily)
      .where(gte(costGlobalDaily.date, startDateStr))
      .orderBy(desc(costGlobalDaily.date));
    
    let totalCost = 0;
    let totalJobs = 0;
    let totalAiCalls = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    
    const dailyData = dailyRecords.map(record => {
      const cost = parseFloat(record.costUsd as string);
      totalCost += cost;
      totalJobs += record.jobs || 0;
      totalAiCalls += record.aiCalls || 0;
      totalTokensIn += Number(record.tokensIn) || 0;
      totalTokensOut += Number(record.tokensOut) || 0;
      
      return {
        date: record.date,
        cost,
        jobs: record.jobs || 0,
        aiCalls: record.aiCalls || 0,
        tierBreakdown: (record.tierBreakdownJson as Record<string, number>) || {},
      };
    });
    
    return {
      totalCost,
      totalJobs,
      totalAiCalls,
      totalTokensIn,
      totalTokensOut,
      dailyData,
    };
  }
  
  async getTopUsersByCost(days: number, limit: number): Promise<Array<{
    userId: string;
    user: User | null;
    totalCost: number;
    jobs: number;
    aiCalls: number;
    tier: string;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Aggregate user costs
    const userCosts = await db.execute<{
      user_id: string;
      tier: string;
      total_cost: string;
      jobs: string;
      ai_calls: string;
    }>(sql`
      SELECT 
        user_id,
        tier,
        SUM(cost_usd)::text as total_cost,
        SUM(jobs)::text as jobs,
        SUM(ai_calls)::text as ai_calls
      FROM cost_user_daily
      WHERE date >= ${startDateStr}
      GROUP BY user_id, tier
      ORDER BY SUM(cost_usd) DESC
      LIMIT ${limit}
    `);
    
    const results = [];
    for (const row of userCosts.rows) {
      const user = await this.getUser(row.user_id);
      results.push({
        userId: row.user_id,
        user,
        totalCost: parseFloat(row.total_cost),
        jobs: parseInt(row.jobs),
        aiCalls: parseInt(row.ai_calls),
        tier: row.tier,
      });
    }
    
    return results;
  }
  
  async getCostBudgets(): Promise<CostBudget[]> {
    return await db.select().from(costBudgets).orderBy(desc(costBudgets.updatedAt));
  }
  
  async upsertCostBudget(budget: InsertCostBudget): Promise<CostBudget> {
    // Check if budget exists for this scope
    const existing = await db.select()
      .from(costBudgets)
      .where(eq(costBudgets.applyScope, budget.applyScope));
    
    if (existing.length > 0) {
      // Update existing budget
      const [updated] = await db.update(costBudgets)
        .set({
          ...budget,
          updatedAt: new Date(),
        })
        .where(eq(costBudgets.applyScope, budget.applyScope))
        .returning();
      return updated;
    } else {
      // Create new budget
      const [created] = await db.insert(costBudgets)
        .values({
          ...budget,
          updatedAt: new Date(),
        })
        .returning();
      return created;
    }
  }

  // Daily Insights System Implementations
  async createDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric> {
    const [created] = await db.insert(dailyMetrics).values(metric).returning();
    return created;
  }

  async getDailyMetrics(userId: string, metricName: string, startDate: Date, endDate: Date): Promise<DailyMetric[]> {
    return await db.select()
      .from(dailyMetrics)
      .where(
        and(
          eq(dailyMetrics.userId, userId),
          eq(dailyMetrics.name, metricName),
          gte(dailyMetrics.observedAt, startDate),
          lte(dailyMetrics.observedAt, endDate)
        )
      )
      .orderBy(desc(dailyMetrics.observedAt));
  }

  async getEligibleDailyMetrics(userId: string, metricName: string, startDate: Date, endDate: Date): Promise<DailyMetric[]> {
    return await db.select()
      .from(dailyMetrics)
      .where(
        and(
          eq(dailyMetrics.userId, userId),
          eq(dailyMetrics.name, metricName),
          eq(dailyMetrics.isBaselineEligible, true),
          gte(dailyMetrics.observedAt, startDate),
          lte(dailyMetrics.observedAt, endDate)
        )
      )
      .orderBy(desc(dailyMetrics.observedAt));
  }

  async createLab(lab: InsertLab): Promise<Lab> {
    const [created] = await db.insert(labs).values(lab).returning();
    return created;
  }

  async getLabs(userId: string, marker: string, startDate: Date, endDate: Date): Promise<Lab[]> {
    return await db.select()
      .from(labs)
      .where(
        and(
          eq(labs.userId, userId),
          eq(labs.marker, marker),
          gte(labs.observedAt, startDate),
          lte(labs.observedAt, endDate)
        )
      )
      .orderBy(desc(labs.observedAt));
  }

  async getEligibleLabs(userId: string, marker: string, startDate: Date, endDate: Date): Promise<Lab[]> {
    return await db.select()
      .from(labs)
      .where(
        and(
          eq(labs.userId, userId),
          eq(labs.marker, marker),
          eq(labs.isBaselineEligible, true),
          gte(labs.observedAt, startDate),
          lte(labs.observedAt, endDate)
        )
      )
      .orderBy(desc(labs.observedAt));
  }

  async createDailyHealthInsight(insight: InsertDailyHealthInsight): Promise<DailyHealthInsight> {
    const [created] = await db.insert(dailyHealthInsights).values(insight).returning();
    return created;
  }

  async getDailyHealthInsights(userId: string, date: Date): Promise<DailyHealthInsight[]> {
    const dateStr = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
    return await db.select()
      .from(dailyHealthInsights)
      .where(
        and(
          eq(dailyHealthInsights.userId, userId),
          eq(dailyHealthInsights.date, dateStr)
        )
      )
      .orderBy(desc(dailyHealthInsights.score));
  }

  async getDailyHealthInsightsDateRange(userId: string, startDate: Date, endDate: Date): Promise<DailyHealthInsight[]> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    return await db.select()
      .from(dailyHealthInsights)
      .where(
        and(
          eq(dailyHealthInsights.userId, userId),
          gte(dailyHealthInsights.date, startDateStr),
          lte(dailyHealthInsights.date, endDateStr)
        )
      )
      .orderBy(desc(dailyHealthInsights.date), desc(dailyHealthInsights.score));
  }

  async updateDailyHealthInsightStatus(id: string, userId: string, status: string): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'acknowledged') {
      updateData.acknowledgedAt = new Date();
    } else if (status === 'dismissed') {
      updateData.dismissedAt = new Date();
    }

    await db.update(dailyHealthInsights)
      .set(updateData)
      .where(
        and(
          eq(dailyHealthInsights.id, id),
          eq(dailyHealthInsights.userId, userId)
        )
      );
  }

  // SmartFuel™ Precision Nutrition Guidance methods
  async createSmartFuelGuidance(guidance: InsertSmartFuelGuidance): Promise<SmartFuelGuidance> {
    const result = await db.insert(smartFuelGuidance).values(guidance).returning();
    return result[0];
  }

  async getCurrentSmartFuelGuidance(userId: string): Promise<SmartFuelGuidance | undefined> {
    const result = await db
      .select()
      .from(smartFuelGuidance)
      .where(
        and(
          eq(smartFuelGuidance.userId, userId),
          eq(smartFuelGuidance.status, 'active')
        )
      )
      .orderBy(desc(smartFuelGuidance.generatedAt))
      .limit(1);
    
    return result[0];
  }

  async getSmartFuelGuidanceHistory(userId: string, limit: number = 10): Promise<SmartFuelGuidance[]> {
    return await db
      .select()
      .from(smartFuelGuidance)
      .where(eq(smartFuelGuidance.userId, userId))
      .orderBy(desc(smartFuelGuidance.generatedAt))
      .limit(limit);
  }

  async supersedePreviousGuidance(userId: string, newGuidanceId: string): Promise<void> {
    // Mark all previous active guidance as superseded (excluding the new guidance)
    await db
      .update(smartFuelGuidance)
      .set({
        status: 'superseded',
        supersededBy: newGuidanceId
      })
      .where(
        and(
          eq(smartFuelGuidance.userId, userId),
          eq(smartFuelGuidance.status, 'active'),
          not(eq(smartFuelGuidance.id, newGuidanceId))  // Don't supersede the new guidance!
        )
      );
  }

  // Notification Channel Preferences
  async getNotificationChannels(userId: string): Promise<NotificationChannel[]> {
    return await db
      .select()
      .from(notificationChannels)
      .where(eq(notificationChannels.userId, userId));
  }

  async upsertNotificationChannel(data: InsertNotificationChannel): Promise<NotificationChannel> {
    const existing = await db
      .select()
      .from(notificationChannels)
      .where(
        and(
          eq(notificationChannels.userId, data.userId),
          eq(notificationChannels.channel, data.channel)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(notificationChannels)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(notificationChannels.userId, data.userId),
            eq(notificationChannels.channel, data.channel)
          )
        )
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(notificationChannels)
        .values(data)
        .returning();
      return created;
    }
  }

  async deleteNotificationChannel(userId: string, channel: string): Promise<void> {
    await db
      .delete(notificationChannels)
      .where(
        and(
          eq(notificationChannels.userId, userId),
          eq(notificationChannels.channel, channel)
        )
      );
  }

  // Notifications
  async createNotification(data: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(data)
      .returning();
    return created;
  }

  async getNotifications(userId: string, filters?: { status?: string; limit?: number }): Promise<Notification[]> {
    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    if (filters?.status) {
      query = query.where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.status, filters.status)
        )
      );
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  async getNotificationById(id: string): Promise<Notification | null> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return result[0] || null;
  }

  async updateNotificationStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'sent') {
      updateData.sentAt = new Date();
    }
    
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await db
      .update(notifications)
      .set(updateData)
      .where(eq(notifications.id, id));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ readAt: new Date(), status: 'read' })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ readAt: new Date(), status: 'read' })
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt)
        )
      );
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt)
        )
      );
    return result[0]?.count || 0;
  }

  // Notification Events (audit log)
  async createNotificationEvent(data: InsertNotificationEvent): Promise<NotificationEvent> {
    const [created] = await db
      .insert(notificationEvents)
      .values(data)
      .returning();
    return created;
  }

  // Scheduled Reminders
  async createScheduledReminder(data: InsertScheduledReminder): Promise<ScheduledReminder> {
    const [created] = await db
      .insert(scheduledReminders)
      .values(data)
      .returning();
    return created;
  }

  async getScheduledReminders(userId: string, type?: string): Promise<ScheduledReminder[]> {
    let query = db
      .select()
      .from(scheduledReminders)
      .where(eq(scheduledReminders.userId, userId));

    if (type) {
      query = query.where(
        and(
          eq(scheduledReminders.userId, userId),
          eq(scheduledReminders.type, type)
        )
      );
    }

    return await query.orderBy(desc(scheduledReminders.createdAt));
  }

  async updateScheduledReminder(id: string, data: Partial<InsertScheduledReminder>): Promise<void> {
    await db
      .update(scheduledReminders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scheduledReminders.id, id));
  }

  async deleteScheduledReminder(id: string): Promise<void> {
    await db
      .delete(scheduledReminders)
      .where(eq(scheduledReminders.id, id));
  }

  async getPendingReminders(): Promise<ScheduledReminder[]> {
    return await db
      .select()
      .from(scheduledReminders)
      .where(eq(scheduledReminders.enabled, true))
      .orderBy(scheduledReminders.lastSentAt);
  }

  // Reminder Scheduler Methods (alternative names for scheduler service)
  async getAllEnabledReminders(): Promise<ScheduledReminder[]> {
    return await db
      .select()
      .from(scheduledReminders)
      .where(eq(scheduledReminders.enabled, true));
  }

  async createReminder(reminder: InsertScheduledReminder): Promise<ScheduledReminder> {
    const [created] = await db
      .insert(scheduledReminders)
      .values(reminder)
      .returning();
    return created;
  }

  async updateReminder(id: string, updates: Partial<InsertScheduledReminder>): Promise<void> {
    await db
      .update(scheduledReminders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scheduledReminders.id, id));
  }

  async updateReminderLastSent(id: string, sentAt: Date): Promise<void> {
    await db
      .update(scheduledReminders)
      .set({ lastSentAt: sentAt })
      .where(eq(scheduledReminders.id, id));
  }

  async deleteReminder(id: string, userId: string): Promise<void> {
    await db
      .delete(scheduledReminders)
      .where(
        and(
          eq(scheduledReminders.id, id),
          eq(scheduledReminders.userId, userId)
        )
      );
  }

  async getUserReminders(userId: string, type?: string): Promise<ScheduledReminder[]> {
    if (type) {
      return await db
        .select()
        .from(scheduledReminders)
        .where(
          and(
            eq(scheduledReminders.userId, userId),
            eq(scheduledReminders.type, type)
          )
        );
    }
    return await db
      .select()
      .from(scheduledReminders)
      .where(eq(scheduledReminders.userId, userId));
  }
}

export const storage = new DbStorage();
