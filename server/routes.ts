import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import multer from "multer";
import { insertBiomarkerSchema, insertHealthRecordSchema, insertScheduledExerciseRecommendationSchema, insertFitnessProfileSchema, insertExerciseSetSchema, biomarkers, sleepSessions, healthRecords, mealPlans, trainingSchedules, recommendations, readinessScores, exerciseSets, exercises, users, referrals } from "@shared/schema";
import { listHealthDocuments, downloadFile, getFileMetadata } from "./services/googleDrive";
import { analyzeHealthDocument, generateMealPlan, generateTrainingSchedule, generateHealthRecommendations, chatWithHealthCoach, generateDailyInsights, generateRecoveryInsights, generateTrendPredictions, generatePeriodComparison, generateDailyTrainingRecommendation, generateMacroRecommendations } from "./services/ai";
import { buildGuardrailsSystemPrompt } from "./config/guardrails";
import { calculatePhenoAge, getBiomarkerDisplayName, getBiomarkerUnit, getBiomarkerSource } from "./services/phenoAge";
import { calculateReadinessScore } from "./services/readiness";
import { parseISO, isValid, subDays } from "date-fns";
import { eq, and, gte, or, inArray } from "drizzle-orm";
import { isAuthenticated, isAdmin, webhookAuth } from "./replitAuth";
import { checkMessageLimit, incrementMessageCount, requirePremium, PremiumFeature, isPremiumUser, filterHistoricalData, canAddBiomarkerType } from "./premiumMiddleware";
import { z } from "zod";
import { spoonacularService } from "./spoonacular";
import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";

// Zod schema for admin user updates
const adminUserUpdateSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  subscriptionTier: z.enum(["free", "premium", "enterprise"]).optional(),
  subscriptionStatus: z.enum(["active", "inactive", "cancelled", "past_due"]).optional(),
});

// Zod schemas for voice chat endpoints
const chatFeedbackSchema = z.object({
  messageId: z.string(),
  feedbackType: z.enum(["thumbs_up", "thumbs_down"]),
  context: z.string().nullable().optional(),
});

const voiceSessionSchema = z.object({
  summary: z.string(),
  embedding: z.array(z.number()).nullable().optional(),
});

const safetyEscalationSchema = z.object({
  triggerKeyword: z.string(),
  context: z.string().nullable().optional(),
});

// Helper function to parse biomarker dates with fallback
function parseBiomarkerDate(dateStr: string | undefined, documentDate: string | undefined, fileDate: Date | undefined): Date {
  // Try the biomarker's specific date first
  if (dateStr) {
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn(`Failed to parse biomarker date: ${dateStr}`);
    }
  }
  
  // Fall back to document-level date from AI
  if (documentDate) {
    try {
      const parsed = parseISO(documentDate);
      if (isValid(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn(`Failed to parse document date: ${documentDate}`);
    }
  }
  
  // Fall back to file metadata date
  if (fileDate && isValid(fileDate)) {
    return fileDate;
  }
  
  // Last resort: current date
  console.warn('No valid date found for biomarker, using current date');
  return new Date();
}

// Helper function to estimate workout intensity based on heart rate and perceived effort
function estimateIntensity(avgHeartRate?: number | null, perceivedEffort?: number | null): "Low" | "Moderate" | "High" {
  // Prioritize perceived effort if available (RPE 1-10 scale)
  if (perceivedEffort) {
    if (perceivedEffort <= 3) return "Low";
    if (perceivedEffort <= 6) return "Moderate";
    return "High";
  }
  
  // Fall back to heart rate zones (rough estimation)
  if (avgHeartRate) {
    // Assuming max HR of 180 for rough estimation
    const percentMax = (avgHeartRate / 180) * 100;
    if (percentMax < 60) return "Low";
    if (percentMax < 80) return "Moderate";
    return "High";
  }
  
  // Default to moderate if no data
  return "Moderate";
}

// Helper function to calculate scheduled dates based on frequency (timezone-safe)
function calculateScheduledDates(frequency: string): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Helper to format date as YYYY-MM-DD in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Parse frequency (e.g., "3x_week", "5x_week", "daily", "specific_day")
  if (frequency === "daily") {
    // Schedule for next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(formatLocalDate(date));
    }
  } else if (frequency.includes("x_week")) {
    const timesPerWeek = parseInt(frequency.split("x")[0]);
    // Distribute evenly across the week
    const interval = Math.floor(7 / timesPerWeek);
    for (let i = 0; i < timesPerWeek; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + (i * interval));
      dates.push(formatLocalDate(date));
    }
  } else if (frequency === "specific_day") {
    // Will be handled by manual scheduling
    return [];
  }
  
  return dates;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/plain'
];

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, PNG, and TXT files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/auth/user", async (req, res) => {
    // Completely disable caching and ETags for Safari iOS
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    // Disable ETag generation
    req.app.set('etag', false);
    
    try {
      if (!req.isAuthenticated()) {
        // Send with explicit no-cache and without ETag
        return res.status(200).send('null');
      }

      const user = req.user as any;
      if (!user.claims?.sub) {
        return res.status(200).send('null');
      }

      let dbUser = await storage.getUser(user.claims.sub);
      if (!dbUser) {
        return res.status(200).send('null');
      }

      // Generate referral code if user doesn't have one
      if (!dbUser.referralCode) {
        try {
          const referralCode = await storage.generateReferralCode(dbUser.id);
          dbUser = { ...dbUser, referralCode }; // Update local copy
        } catch (error: any) {
          console.error("Error generating referral code:", error);
          // Continue without referral code - non-critical
        }
      }

      // Send JSON with timestamp to prevent caching - Safari iOS is very aggressive
      const responseData = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
        role: dbUser.role,
        subscriptionTier: dbUser.subscriptionTier,
        subscriptionStatus: dbUser.subscriptionStatus,
        referralCode: dbUser.referralCode, // Include referral code
        _timestamp: Date.now(), // Force unique response to prevent 304
      };
      res.set('Content-Type', 'application/json');
      res.status(200).send(JSON.stringify(responseData));
    } catch (error: any) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string | undefined;

      const result = await storage.getAllUsers(limit, offset, search);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting users:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error: any) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body with Zod
      const validationResult = adminUserUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid update data", 
          details: validationResult.error.format() 
        });
      }

      const updates = validationResult.data;
      const updatedUser = await storage.updateUserAdminFields(id, updates);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = (req.user as any).claims.sub;
      
      // Prevent admins from deleting themselves
      if (id === currentUserId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Delete user and all associated data
      await storage.deleteUser(id);
      console.log(`Admin ${currentUserId} deleted user ${id} (${user.email})`);
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting admin stats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Promo Code Management
  app.get("/api/admin/promo-codes", isAdmin, async (req, res) => {
    try {
      const promoCodes = await storage.getPromoCodes();
      res.json(promoCodes);
    } catch (error: any) {
      console.error("Error getting promo codes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/promo-codes", isAdmin, async (req, res) => {
    try {
      const { code, discountPercent, maxUses, tierRestriction, description, expiresAt, isActive } = req.body;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Code is required" });
      }

      if (!discountPercent || typeof discountPercent !== "number" || discountPercent < 1 || discountPercent > 100) {
        return res.status(400).json({ error: "Discount percent must be between 1 and 100" });
      }

      // Check if code already exists
      const existing = await storage.getPromoCode(code.toUpperCase());
      if (existing) {
        return res.status(409).json({ error: "Promo code already exists" });
      }

      const promoCode = await storage.createPromoCode({
        code: code.toUpperCase(),
        discountPercent,
        maxUses: maxUses || null,
        tierRestriction: tierRestriction || null,
        description: description || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive ? 1 : 0,
        usedCount: 0,
      });

      res.json(promoCode);
    } catch (error: any) {
      console.error("Error creating promo code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/promo-codes/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const promoCode = await storage.updatePromoCode(id, {
        isActive: isActive ? 1 : 0,
        updatedAt: new Date(),
      });

      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      res.json(promoCode);
    } catch (error: any) {
      console.error("Error updating promo code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/promo-codes/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Delete promo code using raw DB query since deletePromoCode doesn't exist yet
      await db.delete(promoCodes).where(eq(promoCodes.id, parseInt(id)));

      res.json({ success: true, message: "Promo code deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Privacy & Data Control Routes
  app.post("/api/privacy/export", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Gather ALL user data for export (GDPR Article 15 - Right to Access)
      const [
        user, biomarkers, workouts, meals, goals, insights, 
        recommendations, chatMessages, sleepSessions, fitnessProfile,
        nutritionProfile, supplements, healthRecords
      ] = await Promise.all([
        storage.getUser(userId),
        storage.getBiomarkers(userId),
        storage.getWorkoutSessions(userId),
        storage.getMealPlans(userId),
        storage.getGoals(userId),
        storage.getInsights(userId),
        storage.getRecommendations(userId),
        storage.getChatMessages(userId),
        storage.getSleepSessions(userId),
        storage.getFitnessProfile(userId),
        storage.getNutritionProfile(userId),
        storage.getSupplements(userId),
        storage.getHealthRecords(userId),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        exportFormat: "JSON",
        dataProtection: {
          encryption: "AES-256",
          compliance: ["HIPAA", "GDPR", "PIPEDA", "Australia Privacy Act"],
        },
        user: {
          id: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          dateOfBirth: user?.dateOfBirth,
          gender: user?.gender,
          height: user?.height,
          location: user?.location,
          timezone: user?.timezone,
          subscriptionTier: user?.subscriptionTier,
          createdAt: user?.createdAt,
        },
        healthData: {
          biomarkers,
          healthRecords,
          fitnessProfile,
        },
        trainingData: {
          workouts,
          goals,
        },
        nutritionData: {
          meals,
          nutritionProfile,
          supplements,
        },
        insights: {
          aiInsights: insights,
          recommendations,
        },
        interactions: {
          chatMessages,
        },
        sleepAndRecovery: {
          sleepSessions,
        },
        metadata: {
          totalBiomarkers: biomarkers.length,
          totalWorkouts: workouts.length,
          totalMeals: meals.length,
          totalInsights: insights.length,
        }
      };

      // Audit log the data export (HIPAA requirement)
      await storage.createAuditLog({
        userId,
        action: "DATA_EXPORT",
        resourceType: "user_data",
        resourceId: userId,
        details: { 
          exportDate: exportData.exportDate,
          recordCount: {
            biomarkers: biomarkers.length,
            workouts: workouts.length,
            meals: meals.length,
            insights: insights.length,
          }
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(exportData);
    } catch (error: any) {
      console.error("Error exporting user data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/privacy/delete-account", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Mark account for deletion with 30-day grace period (GDPR Article 17 - Right to Erasure)
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);
      
      await storage.updateUser(userId, {
        deletionScheduledAt: deletionDate,
      });

      // Audit log the deletion request (HIPAA requirement)
      await storage.createAuditLog({
        userId,
        action: "ACCOUNT_DELETION_REQUESTED",
        resourceType: "user_account",
        resourceId: userId,
        details: { 
          scheduledDeletionDate: deletionDate.toISOString(),
          gracePeriodDays: 30,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      console.log(`User ${userId} scheduled account deletion for ${deletionDate.toISOString()}`);

      res.json({
        success: true,
        message: "Account deletion scheduled",
        deletionDate: deletionDate.toISOString(),
        gracePeriodDays: 30,
        note: "You can cancel deletion by logging in within 30 days",
      });
    } catch (error: any) {
      console.error("Error scheduling account deletion:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/privacy/audit-log", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const auditLogs = await storage.getAuditLogsForUser(userId, 100);
      
      res.json({
        logs: auditLogs,
        total: auditLogs.length,
        compliance: {
          standard: "HIPAA requires 6-year retention",
          coverage: "All health data access is logged with timestamps and IP addresses",
        },
      });
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/privacy/consent", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const consents = await storage.getUserConsent(userId);
      
      // Transform to a more frontend-friendly format
      const consentMap: Record<string, any> = {};
      consents.forEach((consent: any) => {
        consentMap[consent.consentType] = {
          granted: consent.granted === 1,
          grantedAt: consent.grantedAt,
          revokedAt: consent.revokedAt,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
        };
      });

      res.json({
        consents: consentMap,
        total: consents.length,
      });
    } catch (error: any) {
      console.error("Error fetching user consents:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/privacy/consent", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { consents } = req.body;

    try {
      // Save each consent
      const results = await Promise.all(
        Object.entries(consents).map(async ([consentType, consentGiven]) => {
          return storage.createUserConsent({
            userId,
            consentType,
            consentGiven: Boolean(consentGiven),
            consentText: `User ${consentGiven ? 'granted' : 'revoked'} consent for ${consentType}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
        })
      );

      // Also update user consent timestamp when all required consents are given
      const allRequiredConsentsGiven = Object.values(consents).every(c => c === true);
      if (allRequiredConsentsGiven) {
        await storage.updateUser(userId, {
          consentGivenAt: new Date(),
        });
      }

      // Audit log the consent update
      await storage.createAuditLog({
        userId,
        action: "CONSENT_UPDATED",
        resourceType: "user_consent",
        resourceId: userId,
        details: { consents },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        message: "Consent preferences saved",
        consents: results,
      });
    } catch (error: any) {
      console.error("Error saving consent:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Usage Tracking Routes
  
  // Get current month's message usage
  app.get("/api/usage", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get current month and year
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // JavaScript months are 0-indexed

      // Get monthly usage
      const messagesUsed = await storage.getMonthlyMessageUsage(userId, year, month);
      
      // Only active premium/enterprise users get unlimited messages
      const hasActivePremium = (user.subscriptionTier === "premium" || user.subscriptionTier === "enterprise") && user.subscriptionStatus === "active";
      const limit = hasActivePremium ? -1 : 50; // -1 means unlimited
      
      // Reset date is first day of next month (UTC)
      const resetDate = new Date(Date.UTC(year, month, 1)); // month is already 1-indexed, so this gives us next month

      res.json({
        messagesUsed,
        limit,
        resetDate: resetDate.toISOString(),
        tier: user.subscriptionTier,
        hasUnlimited: limit === -1,
      });
    } catch (error: any) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Referral Program Routes
  
  // Apply referral code - link a user to a referrer
  app.post("/api/referrals/apply", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { referralCode } = req.body;

      if (!referralCode || typeof referralCode !== "string") {
        return res.status(400).json({ error: "Referral code is required" });
      }

      // Check if user already has a referrer
      const existingReferral = await db.select().from(referrals).where(eq(referrals.referredUserId, userId)).limit(1);
      if (existingReferral.length > 0) {
        return res.status(400).json({ error: "You have already been referred by someone" });
      }

      // Find the referrer by their code
      const referrer = await db.select().from(users).where(eq(users.referralCode, referralCode.toUpperCase())).limit(1);
      if (!referrer[0]) {
        return res.status(404).json({ error: "Invalid referral code" });
      }

      // Can't refer yourself
      if (referrer[0].id === userId) {
        return res.status(400).json({ error: "You cannot refer yourself" });
      }

      // Create referral record
      await storage.createReferral({
        referrerUserId: referrer[0].id,
        referredUserId: userId,
        referralCode: referralCode.toUpperCase(),
        status: "pending", // Will be marked as "converted" when referred user subscribes
      });

      res.json({
        success: true,
        message: `Successfully applied referral code from ${referrer[0].firstName || 'user'}`,
        referrerName: referrer[0].firstName,
      });
    } catch (error: any) {
      console.error("Error applying referral code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's referral stats
  app.get("/api/referrals/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Get all referrals where this user is the referrer
      const userReferrals = await storage.getReferralsByUser(userId);
      
      const pending = userReferrals.filter(r => r.status === "pending").length;
      const converted = userReferrals.filter(r => r.status === "converted").length;
      const rewardedCount = userReferrals.filter(r => r.rewardGranted).length;
      const totalEarnings = rewardedCount * 20; // $20 per rewarded referral

      res.json({
        pending,
        converted,
        totalEarnings, // Total $ earned
        rewardedCount, // Number of rewarded referrals
        referrals: userReferrals,
      });
    } catch (error: any) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's subscription details
  app.get("/api/subscriptions", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Get user to check subscription tier
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If free tier, return basic info
      if (user.subscriptionTier === "free") {
        return res.json({
          tier: "free",
          status: "active",
          billingCycle: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          trialStart: null,
          trialEnd: null,
        });
      }

      // Get subscription from database
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(sql`${subscriptions.createdAt} DESC`)
        .limit(1);

      if (!subscription[0]) {
        // User has premium/enterprise tier but no subscription record - might be legacy data
        return res.json({
          tier: user.subscriptionTier,
          status: user.subscriptionStatus,
          billingCycle: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          trialStart: null,
          trialEnd: null,
        });
      }

      const sub = subscription[0];
      res.json({
        tier: sub.tier,
        status: sub.status,
        billingCycle: sub.billingCycle,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd === 1,
        canceledAt: sub.canceledAt,
        trialStart: sub.trialStart,
        trialEnd: sub.trialEnd,
        stripePriceId: sub.stripePriceId,
      });
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel subscription - sets cancel_at_period_end to true
  app.post("/api/subscriptions/cancel", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const subscription = await storage.getActiveSubscription(userId);
      
      if (!subscription) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-11-20",
      });

      // Update Stripe subscription to cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update local database
      await storage.updateSubscription(subscription.stripeSubscriptionId, {
        cancelAtPeriodEnd: 1,
        canceledAt: new Date(),
      });

      res.json({ 
        success: true, 
        message: "Subscription will cancel at period end",
        currentPeriodEnd: subscription.currentPeriodEnd,
      });
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reactivate subscription - removes cancel_at_period_end flag
  app.post("/api/subscriptions/reactivate", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const subscription = await storage.getActiveSubscription(userId);
      
      if (!subscription || !subscription.cancelAtPeriodEnd) {
        return res.status(400).json({ error: "Subscription is not scheduled for cancellation" });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-11-20",
      });

      // Update Stripe subscription to NOT cancel
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update local database
      await storage.updateSubscription(subscription.stripeSubscriptionId, {
        cancelAtPeriodEnd: 0,
        canceledAt: null,
      });

      res.json({ success: true, message: "Subscription reactivated" });
    } catch (error: any) {
      console.error("Error reactivating subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Customer Portal for payment method management
  app.post("/api/stripe/create-portal-session", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No Stripe customer found" });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-11-20",
      });

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/billing`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Payment Routes
  
  // Promo code validation endpoint
  app.post("/api/checkout/validate-promo", isAuthenticated, async (req, res) => {
    try {
      const { code, tier } = req.body;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Promo code is required" });
      }

      // Get promo code from database
      const promoCode = await storage.getPromoCode(code.toUpperCase());

      if (!promoCode) {
        return res.status(404).json({ error: "Invalid promo code", valid: false });
      }

      // Check if promo code is active
      if (!promoCode.isActive) {
        return res.status(400).json({ error: "This promo code is no longer active", valid: false });
      }

      // Check if expired
      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This promo code has expired", valid: false });
      }

      // Check usage limit
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return res.status(400).json({ error: "This promo code has reached its usage limit", valid: false });
      }

      // Check tier restrictions
      if (tier && promoCode.tierRestriction && promoCode.tierRestriction !== tier) {
        return res.status(400).json({ 
          error: `This promo code is only valid for ${promoCode.tierRestriction} tier`, 
          valid: false 
        });
      }

      // Return valid promo code info
      res.json({
        valid: true,
        code: promoCode.code,
        discountPercent: promoCode.discountPercent,
        description: promoCode.description,
      });
    } catch (error: any) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stripe/create-checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { tier, billingCycle, promoCode } = req.body;

      if (!tier || (tier !== "premium" && tier !== "enterprise")) {
        return res.status(400).json({ error: "Invalid subscription tier" });
      }

      if (!billingCycle || (billingCycle !== "monthly" && billingCycle !== "annual")) {
        return res.status(400).json({ error: "Invalid billing cycle. Must be 'monthly' or 'annual'" });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-11-20",
      });

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate promo code if provided
      let validatedPromoCode = null;
      if (promoCode) {
        const dbPromoCode = await storage.getPromoCode(promoCode.toUpperCase());
        
        if (!dbPromoCode || !dbPromoCode.isActive) {
          return res.status(400).json({ error: "Invalid or inactive promo code" });
        }

        if (dbPromoCode.expiresAt && new Date(dbPromoCode.expiresAt) < new Date()) {
          return res.status(400).json({ error: "Promo code has expired" });
        }

        if (dbPromoCode.maxUses && dbPromoCode.usedCount >= dbPromoCode.maxUses) {
          return res.status(400).json({ error: "Promo code has reached its usage limit" });
        }

        if (dbPromoCode.tierRestriction && dbPromoCode.tierRestriction !== tier) {
          return res.status(400).json({ error: `Promo code is only valid for ${dbPromoCode.tierRestriction} tier` });
        }

        validatedPromoCode = dbPromoCode;
      }

      // Pricing structure with 20% annual discount
      const pricing = {
        premium: {
          monthly: 1999,  // $19.99/month
          annual: 19188,  // $191.88/year (20% off $239.88)
        },
        enterprise: {
          monthly: 9999,  // $99.99/month
          annual: 95988,  // $959.88/year (20% off $1199.88)
        },
      };

      const unitAmount = pricing[tier as "premium" | "enterprise"][billingCycle as "monthly" | "annual"];
      const interval = billingCycle === "monthly" ? "month" : "year";

      // Product description with billing cycle info
      const description = tier === "premium" 
        ? `Unlimited AI chat, meal plans, biological age, and more${billingCycle === "annual" ? " (20% off annual)" : ""}`
        : `Enterprise features with team management and custom integrations${billingCycle === "annual" ? " (20% off annual)" : ""}`;

      // Create or get Stripe coupon if promo code is valid
      let stripeCouponId = null;
      if (validatedPromoCode) {
        // Check if Stripe coupon already exists for this promo code
        if (validatedPromoCode.stripeCouponId) {
          stripeCouponId = validatedPromoCode.stripeCouponId;
        } else {
          // Create new Stripe coupon
          const coupon = await stripe.coupons.create({
            percent_off: validatedPromoCode.discountPercent,
            duration: "once", // Apply discount to first payment only
            name: validatedPromoCode.description || validatedPromoCode.code,
          });
          stripeCouponId = coupon.id;

          // Update promo code with Stripe coupon ID
          await storage.updatePromoCode(validatedPromoCode.id, {
            stripeCouponId: coupon.id,
          });
        }
      }

      // Create Stripe checkout session
      const sessionConfig: any = {
        customer_email: user.email,
        client_reference_id: userId,
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: !validatedPromoCode, // Disable if we're applying a code
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: tier === "premium" ? "HealthPilot Premium" : "HealthPilot Enterprise",
                description,
              },
              recurring: {
                interval,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: 7, // 7-day free trial for all new subscriptions
        },
        success_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/?upgrade=success`,
        cancel_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/pricing?upgrade=cancelled`,
        metadata: {
          userId,
          tier,
          billingCycle,
          promoCode: validatedPromoCode?.code || null,
        },
      };

      // Apply discount if promo code is valid
      if (stripeCouponId) {
        sessionConfig.discounts = [{
          coupon: stripeCouponId,
        }];
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      res.json({ sessionUrl: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook handler for subscription events
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-11-20",
      });

      const sig = req.headers["stripe-signature"];
      if (!sig) {
        console.error("❌ Missing Stripe signature");
        return res.status(400).json({ error: "Missing Stripe signature" });
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("❌ STRIPE_WEBHOOK_SECRET not configured");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      // Verify webhook signature
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        console.error(`❌ Webhook signature verification failed: ${err.message}`);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      console.log(`✅ Received Stripe webhook: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          const userId = session.client_reference_id || session.metadata?.userId;
          const tier = session.metadata?.tier;
          const billingCycle = session.metadata?.billingCycle || "monthly";
          const promoCode = session.metadata?.promoCode;

          if (userId && tier && session.subscription) {
            // Fetch full subscription details from Stripe
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            
            // Check if subscription already exists (idempotency check for Stripe retries)
            const existingSubscription = await storage.getSubscriptionByStripeId(subscription.id);
            
            if (!existingSubscription) {
              // Update user tier and status
              await storage.updateUserAdminFields(userId, {
                subscriptionTier: tier as "premium" | "enterprise",
                subscriptionStatus: "active",
                stripeCustomerId: session.customer as string,
              });

              // Create subscription record in database
              await storage.createSubscription({
                userId,
                stripeSubscriptionId: subscription.id,
                stripePriceId: subscription.items.data[0].price.id,
                tier,
                billingCycle,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
                trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
                trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
              });

              // Track promo code usage if one was applied
              if (promoCode) {
                await storage.updatePromoCodeUsage(promoCode);
                console.log(`📊 Promo code ${promoCode} usage tracked`);
              }

              console.log(`✅ User ${userId} upgraded to ${tier} (${billingCycle})`);
            } else {
              console.log(`✓ Subscription ${subscription.id} already exists (idempotent check)`);
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as any;
          
          // Try to get userId from subscription metadata or customer
          let userId = subscription.metadata?.userId;
          if (!userId && subscription.customer) {
            // Fallback: look up user by Stripe customer ID
            const user = await db.select().from(users).where(eq(users.stripeCustomerId, subscription.customer)).limit(1);
            if (user[0]) {
              userId = user[0].id;
            }
          }

          if (userId) {
            const status = subscription.status;
            const mappedStatus = status === "active" ? "active" : 
                                status === "past_due" ? "past_due" : 
                                status === "canceled" ? "cancelled" : "inactive";
            
            // Update user status
            await storage.updateUserAdminFields(userId, {
              subscriptionStatus: mappedStatus,
            });

            // Update subscription record
            await storage.updateSubscription(subscription.id, {
              status: subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
              canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
            });

            console.log(`✅ Updated subscription status for user ${userId}: ${status}`);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;
          
          // Try to get userId from subscription metadata or customer
          let userId = subscription.metadata?.userId;
          if (!userId && subscription.customer) {
            const user = await db.select().from(users).where(eq(users.stripeCustomerId, subscription.customer)).limit(1);
            if (user[0]) {
              userId = user[0].id;
            }
          }

          if (userId) {
            // Downgrade user to free tier
            await storage.updateUserAdminFields(userId, {
              subscriptionTier: "free",
              subscriptionStatus: "cancelled",
            });

            // Update subscription record
            await storage.updateSubscription(subscription.id, {
              status: "canceled",
              canceledAt: new Date(),
            });

            console.log(`✅ User ${userId} subscription cancelled, downgraded to free`);
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as any;
          
          // Check if this is for a referred user's first payment
          if (invoice.subscription && invoice.billing_reason === "subscription_create") {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            let userId = subscription.metadata?.userId;
            
            if (!userId && subscription.customer) {
              const user = await db.select().from(users).where(eq(users.stripeCustomerId, subscription.customer as string)).limit(1);
              if (user[0]) {
                userId = user[0].id;
              }
            }

            if (userId) {
              // Check if user was referred
              const referral = await db.select().from(referrals).where(eq(referrals.referredUserId, userId)).limit(1);
              if (referral[0] && referral[0].status === "pending" && !referral[0].rewardGranted) {
                // Mark referral as converted
                await storage.updateReferralStatus(referral[0].referralCode, "converted", new Date());
                
                // Award referrer with $20 credit (one month premium equivalent)
                const referrer = await storage.getUser(referral[0].referrerUserId);
                if (referrer && referrer.stripeCustomerId) {
                  try {
                    // Create a balance credit for the referrer
                    await stripe.customers.createBalanceTransaction(referrer.stripeCustomerId, {
                      amount: -2000, // -$20.00 credit (negative = credit to customer)
                      currency: "usd",
                      description: `Referral credit for referring ${userId}`,
                    });
                    
                    // Mark referral as rewarded
                    await storage.markReferralRewarded(referral[0].referralCode);
                    
                    console.log(`🎉 Referral converted! Awarded $20 credit to ${referrer.email}`);
                  } catch (stripeError: any) {
                    console.error(`Failed to create Stripe credit for referrer ${referrer.id}:`, stripeError.message);
                    // Still mark as converted even if credit fails - can be manually handled
                  }
                } else {
                  console.log(`🎉 Referral converted! User ${userId} was referred by ${referral[0].referrerUserId} (no Stripe customer yet)`);
                }
              }
            }
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            let userId = subscription.metadata?.userId;
            
            if (!userId && subscription.customer) {
              const user = await db.select().from(users).where(eq(users.stripeCustomerId, subscription.customer as string)).limit(1);
              if (user[0]) {
                userId = user[0].id;
              }
            }

            if (userId) {
              await storage.updateUserAdminFields(userId, {
                subscriptionStatus: "past_due",
              });
              console.log(`⚠️ Payment failed for user ${userId}, marked as past_due`);
            }
          }
          break;
        }

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Error processing Stripe webhook:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Meal Library Admin Routes
  app.post("/api/admin/meal-library/import", isAdmin, async (req, res) => {
    try {
      const { count, cuisines, diets, mealTypes, maxReadyTime } = req.body;
      
      // Import recipes from Spoonacular
      const { bulkImportToMealLibrary } = await import("./spoonacular");
      const importResult = await bulkImportToMealLibrary({
        count: count || 100,
        cuisines,
        diets,
        mealTypes,
        maxReadyTime,
      });

      // Save recipes to meal library
      const savedRecipes = [];
      for (const recipe of importResult.recipes) {
        // Helper to round nutritional values to integers
        const roundNutrient = (nutrientName: string): number | null => {
          const value = recipe.nutrition?.nutrients?.find(n => n.name === nutrientName)?.amount;
          return value !== undefined ? Math.round(value) : null;
        };

        const mealData = {
          spoonacularRecipeId: recipe.id,
          title: recipe.title,
          description: recipe.summary?.replace(/<[^>]*>/g, ''), // Strip HTML tags
          imageUrl: recipe.image,
          sourceUrl: recipe.sourceUrl,
          readyInMinutes: recipe.readyInMinutes,
          servings: recipe.servings,
          calories: roundNutrient('Calories'),
          protein: roundNutrient('Protein'),
          carbs: roundNutrient('Carbohydrates'),
          fat: roundNutrient('Fat'),
          ingredients: recipe.extendedIngredients,
          instructions: recipe.analyzedInstructions?.[0]?.steps?.map(s => s.step).join(' ') || '',
          extendedIngredients: recipe.extendedIngredients,
          cuisines: recipe.cuisines || [],
          dishTypes: recipe.dishTypes || [],
          diets: recipe.diets || [],
          mealTypes: recipe.dishTypes?.filter(t => ['breakfast', 'lunch', 'dinner', 'snack'].includes(t.toLowerCase())) || [],
          difficulty: recipe.readyInMinutes < 30 ? 'easy' : recipe.readyInMinutes < 60 ? 'medium' : 'hard',
        };

        try {
          const saved = await storage.createMealLibraryItem(mealData);
          savedRecipes.push(saved);
        } catch (error: any) {
          console.error(`Failed to save recipe ${recipe.id}:`, error);
        }
      }

      res.json({
        success: true,
        imported: savedRecipes.length,
        requested: count,
        errors: importResult.errors,
        recipes: savedRecipes,
      });
    } catch (error: any) {
      console.error("Error importing meals:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/meal-library", isAdmin, async (req, res) => {
    try {
      const { status, cuisine, diet } = req.query;
      
      const meals = await storage.getMealLibraryItems({
        status: status as string,
        cuisines: cuisine ? [cuisine as string] : undefined,
        diets: diet ? [diet as string] : undefined,
      });

      res.json(meals);
    } catch (error: any) {
      console.error("Error getting meal library:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/meal-library/low-performing", isAdmin, async (req, res) => {
    try {
      const threshold = parseFloat(req.query.threshold as string) || 0.4;
      const meals = await storage.getLowPerformingMeals(threshold);
      
      // Check for premium user protection
      const mealsWithProtection = await Promise.all(meals.map(async (meal) => {
        const premiumUsers = await storage.getPremiumUsersWhoLikedMeal(meal.id);
        return {
          ...meal,
          hasPremiumUserProtection: premiumUsers.length > 0,
          premiumUsersCount: premiumUsers.length,
        };
      }));

      res.json(mealsWithProtection);
    } catch (error: any) {
      console.error("Error getting low performing meals:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/meal-library/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMealLibraryItem(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting meal:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/meal-library/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = await storage.updateMealLibraryItem(id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating meal:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/meal-library/settings", isAdmin, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const settings = await storage.getMealLibrarySettings(userId);
      res.json(settings || null);
    } catch (error: any) {
      console.error("Error getting meal library settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/meal-library/settings", isAdmin, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const settings = await storage.upsertMealLibrarySettings({
        userId,
        ...req.body,
      });
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating meal library settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // User Meal Feedback Route (supports both meal library and meal plan swipe feedback)
  app.post("/api/meal-feedback", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { 
        mealLibraryId, 
        mealPlanId, 
        feedback, 
        swipeDirection,
        notes,
        mealName,
        mealType,
        cuisines,
        dishTypes,
        calories
      } = req.body;
      
      // Get user subscription status
      const user = await storage.getUser(userId);
      const userWasPremium = user?.subscriptionTier === 'premium' || user?.subscriptionTier === 'enterprise' ? 1 : 0;
      
      // Determine feedback type: session_skip is temporary, others are permanent
      const feedbackType = feedback === 'session_skip' ? 'session' : 'permanent';
      
      // Create feedback
      const feedbackRecord = await storage.createMealFeedback({
        userId,
        mealLibraryId,
        mealPlanId,
        feedback,
        feedbackType,
        swipeDirection,
        userWasPremium,
        notes,
        mealName,
        mealType,
        cuisines,
        dishTypes,
        calories,
      });

      // Update meal performance metrics only for meal library feedback
      if (mealLibraryId) {
        await storage.updateMealPerformance(mealLibraryId, true, feedback);
      }

      res.json(feedbackRecord);
    } catch (error: any) {
      console.error("Error creating meal feedback:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user meal feedback history
  app.get("/api/meal-feedback", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const feedbackHistory = await storage.getUserMealFeedback(userId);
      res.json(feedbackHistory);
    } catch (error: any) {
      console.error("Error getting meal feedback:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get latest weight from biomarkers
      const biomarkers = await storage.getBiomarkers(userId, "weight");
      const latestWeight = biomarkers.length > 0 
        ? biomarkers.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0] 
        : null;

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        stripeCustomerId: user.stripeCustomerId,
        timezone: user.timezone,
        height: user.height,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bloodType: user.bloodType,
        activityLevel: user.activityLevel,
        location: user.location,
        eulaAcceptedAt: user.eulaAcceptedAt,
        latestWeight: latestWeight ? { value: latestWeight.value, unit: latestWeight.unit } : null,
      });
    } catch (error: any) {
      console.error("Error getting profile:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    
    try {
      const profileSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        height: z.number().nullable().optional(),
        dateOfBirth: z.string().transform(str => {
          if (!str) return null;
          const date = new Date(str);
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date format");
          }
          return date;
        }).nullable().optional(),
        gender: z.string().nullable().optional(),
        bloodType: z.string().nullable().optional(),
        activityLevel: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        timezone: z.string().nullable().optional(),
      });

      const validationResult = profileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid profile data", 
          details: validationResult.error.format() 
        });
      }

      const updates = validationResult.data;
      const updatedUser = await storage.updateUserProfile(userId, updates as any);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/user/accept-eula", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    
    try {
      await storage.acceptEula(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error accepting EULA:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/google-drive/files", isAuthenticated, async (req, res) => {
    // SECURITY: Google Drive uses workspace-level connection (shared across all users)
    // To prevent users from seeing other users' files, we disable file browsing
    // Users can still upload files locally via the file upload feature
    // TODO: Implement per-user Google Drive OAuth for secure file browsing
    
    res.json([]);
  });

  app.post("/api/health-records/analyze/:fileId", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { fileId } = req.params;
      
      // Check if a record with this fileId already exists
      const existingRecord = await storage.getHealthRecordByFileId(fileId, userId);
      if (existingRecord) {
        return res.json(existingRecord);
      }
      
      const metadata = await getFileMetadata(fileId);
      const fileBuffer = await downloadFile(fileId);
      
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      
      // Create record with 'processing' status
      const processingRecord = await storage.createHealthRecord({
        userId,
        name: metadata.name || 'Uploaded Document',
        fileId: fileId,
        fileUrl: metadata.webViewLink || '',
        type: 'Lab Results',
        status: 'processing',
      });
      
      try {
        const fileText = fileBuffer.toString('utf-8');
        
        // Pass file creation date to AI for fallback
        const fileCreatedDate = metadata.createdTime ? new Date(metadata.createdTime) : undefined;
        const analysis = await analyzeHealthDocument(fileText, metadata.name || 'Unknown', fileCreatedDate);
        
        // Check if record was deleted during analysis
        const stillExists = await storage.getHealthRecordByFileId(fileId, userId);
        if (!stillExists) {
          // Record was deleted during analysis, don't update or create biomarkers
          return res.status(410).json({ error: 'Record was deleted during analysis' });
        }
        
        // Update record with completed status and analysis results
        const record = await storage.updateHealthRecord(processingRecord.id, userId, {
          status: 'completed',
          aiAnalysis: analysis,
          extractedData: analysis.biomarkers,
          analyzedAt: new Date(),
          errorMessage: null,
        });

        if (record && analysis.biomarkers && Array.isArray(analysis.biomarkers)) {
          for (const biomarker of analysis.biomarkers) {
            // Special handling for blood pressure values in "X/Y" format
            if (biomarker.type === 'blood-pressure' && typeof biomarker.value === 'string' && biomarker.value.includes('/')) {
              const parts = biomarker.value.split('/');
              const systolic = parseFloat(parts[0]);
              const diastolic = parseFloat(parts[1]);
              
              if (!isNaN(systolic) && !isNaN(diastolic)) {
                // Create separate biomarkers for systolic and diastolic
                await storage.createBiomarker({
                  userId,
                  type: 'blood-pressure-systolic',
                  value: systolic,
                  unit: biomarker.unit || 'mmHg',
                  source: 'ai-extracted',
                  recordId: record.id,
                  recordedAt: parseBiomarkerDate(biomarker.date, analysis.documentDate, fileCreatedDate),
                });
                
                await storage.createBiomarker({
                  userId,
                  type: 'blood-pressure-diastolic',
                  value: diastolic,
                  unit: biomarker.unit || 'mmHg',
                  source: 'ai-extracted',
                  recordId: record.id,
                  recordedAt: parseBiomarkerDate(biomarker.date, analysis.documentDate, fileCreatedDate),
                });
              }
              continue; // Skip the regular insert for this biomarker
            }
            
            // Skip invalid values
            if (typeof biomarker.value !== 'number' || isNaN(biomarker.value)) {
              console.warn(`Skipping invalid biomarker value: ${biomarker.type} = ${biomarker.value}`);
              continue;
            }
            
            await storage.createBiomarker({
              userId,
              type: biomarker.type,
              value: biomarker.value,
              unit: biomarker.unit,
              source: 'ai-extracted',
              recordId: record.id,
              recordedAt: parseBiomarkerDate(biomarker.date, analysis.documentDate, fileCreatedDate),
            });
          }
        }

        res.json(record);
      } catch (analysisError: any) {
        // Update record with failed status and error message
        await storage.updateHealthRecord(processingRecord.id, userId, {
          status: 'failed',
          errorMessage: analysisError.message || 'Unknown error during analysis',
        });
        throw analysisError;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(499).json({ error: 'Request cancelled' });
      }
      console.error("Error analyzing document:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/health-records/:id/retry", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { id } = req.params;
      
      const record = await storage.getHealthRecord(id, userId);
      if (!record) {
        return res.status(404).json({ error: 'Health record not found' });
      }
      
      if (record.status !== 'failed') {
        return res.status(400).json({ error: 'Only failed records can be retried' });
      }
      
      if (!record.fileId) {
        return res.status(400).json({ error: 'No Google Drive file associated with this record' });
      }
      
      // Verify file still exists in Google Drive
      const metadata = await getFileMetadata(record.fileId);
      const fileBuffer = await downloadFile(record.fileId);
      
      // Update status to processing
      await storage.updateHealthRecord(id, userId, {
        status: 'processing',
        errorMessage: null,
      });
      
      try {
        const fileText = fileBuffer.toString('utf-8');
        const fileCreatedDate = metadata.createdTime ? new Date(metadata.createdTime) : undefined;
        const analysis = await analyzeHealthDocument(fileText, record.name, fileCreatedDate);
        
        // Update record with completed status and analysis results
        const updatedRecord = await storage.updateHealthRecord(id, userId, {
          status: 'completed',
          aiAnalysis: analysis,
          extractedData: analysis.biomarkers,
          analyzedAt: new Date(),
          errorMessage: null,
        });

        if (updatedRecord && analysis.biomarkers && Array.isArray(analysis.biomarkers)) {
          for (const biomarker of analysis.biomarkers) {
            // Special handling for blood pressure values in "X/Y" format
            if (biomarker.type === 'blood-pressure' && typeof biomarker.value === 'string' && biomarker.value.includes('/')) {
              const parts = biomarker.value.split('/');
              const systolic = parseFloat(parts[0]);
              const diastolic = parseFloat(parts[1]);
              
              if (!isNaN(systolic) && !isNaN(diastolic)) {
                // Create separate biomarkers for systolic and diastolic
                await storage.createBiomarker({
                  userId,
                  type: 'blood-pressure-systolic',
                  value: systolic,
                  unit: biomarker.unit || 'mmHg',
                  source: 'ai-extracted',
                  recordId: updatedRecord.id,
                  recordedAt: parseBiomarkerDate(biomarker.date, analysis.documentDate, fileCreatedDate),
                });
                
                await storage.createBiomarker({
                  userId,
                  type: 'blood-pressure-diastolic',
                  value: diastolic,
                  unit: biomarker.unit || 'mmHg',
                  source: 'ai-extracted',
                  recordId: updatedRecord.id,
                  recordedAt: parseBiomarkerDate(biomarker.date, analysis.documentDate, fileCreatedDate),
                });
              }
              continue; // Skip the regular insert for this biomarker
            }
            
            // Skip invalid values
            if (typeof biomarker.value !== 'number' || isNaN(biomarker.value)) {
              console.warn(`Skipping invalid biomarker value: ${biomarker.type} = ${biomarker.value}`);
              continue;
            }
            
            await storage.createBiomarker({
              userId,
              type: biomarker.type,
              value: biomarker.value,
              unit: biomarker.unit,
              source: 'ai-extracted',
              recordId: updatedRecord.id,
              recordedAt: parseBiomarkerDate(biomarker.date, analysis.documentDate, fileCreatedDate),
            });
          }
        }

        res.json(updatedRecord);
      } catch (analysisError: any) {
        // Update record with failed status and error message
        await storage.updateHealthRecord(id, userId, {
          status: 'failed',
          errorMessage: analysisError.message || 'Unknown error during analysis',
        });
        throw analysisError;
      }
    } catch (error: any) {
      console.error("Error retrying analysis:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/health-records/upload", isAuthenticated, upload.single('file'), async (req, res) => {
    const userId = (req.user as any).claims.sub;
    
    console.log(`🔥 UPLOAD REQUEST RECEIVED! User: ${userId}, Has file: ${!!req.file}`);
    
    // Increase timeout for this specific route to handle large file processing
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes
    
    try {
      if (!req.file) {
        console.log(`❌ No file in request for user ${userId}`);
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileSizeKB = (req.file.size / 1024).toFixed(1);
      console.log(`📄 Processing health record: ${req.file.originalname} (${fileSizeKB} KB) for user ${userId}`);

      // Extract text based on file type
      let fileText: string;
      const fileExtension = req.file.originalname.toLowerCase().split('.').pop();
      
      if (fileExtension === 'pdf') {
        // Use pdf-parse for PDF files
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: req.file.buffer });
        const textResult = await parser.getText();
        fileText = textResult.text;
        console.log(`📝 Extracted ${fileText.length} characters from PDF (${textResult.pages.length} pages)`);
      } else {
        // For text-based files, use simple string conversion
        fileText = req.file.buffer.toString('utf-8');
        console.log(`📝 Document text length: ${fileText.length} characters`);
      }
      
      const analysis = await analyzeHealthDocument(fileText, req.file.originalname);
      
      console.log(`🔍 AI Analysis Results:`, {
        hasBiomarkers: !!analysis.biomarkers,
        biomarkerCount: analysis.biomarkers?.length || 0,
        documentDate: analysis.documentDate,
        summary: analysis.summary?.substring(0, 100) + '...',
      });

      const record = await storage.createHealthRecord({
        userId,
        name: req.file.originalname,
        type: req.body.type || 'Lab Results',
        status: 'completed',
        aiAnalysis: analysis,
        extractedData: analysis.biomarkers,
        analyzedAt: new Date(),
      });

      if (analysis.biomarkers && Array.isArray(analysis.biomarkers)) {
        console.log(`✅ Extracted ${analysis.biomarkers.length} biomarkers from ${req.file.originalname}`);
        
        let savedCount = 0;
        let skippedCount = 0;
        
        for (const biomarker of analysis.biomarkers) {
          // Skip biomarkers without required fields
          if (!biomarker.type || biomarker.value === null || biomarker.value === undefined || !biomarker.unit) {
            console.warn(`⚠️ Skipping biomarker with missing data:`, { 
              type: biomarker.type, 
              value: biomarker.value, 
              unit: biomarker.unit 
            });
            skippedCount++;
            continue;
          }
          
          // Parse value to number, skip if invalid (e.g., "<100", ">50")
          const numericValue = typeof biomarker.value === 'number' ? biomarker.value : parseFloat(biomarker.value);
          if (isNaN(numericValue)) {
            console.warn(`⚠️ Skipping biomarker with non-numeric value:`, { 
              type: biomarker.type, 
              value: biomarker.value, 
              unit: biomarker.unit 
            });
            skippedCount++;
            continue;
          }
          
          await storage.createBiomarker({
            userId,
            type: biomarker.type,
            value: numericValue,
            unit: biomarker.unit,
            source: 'ai-extracted',
            recordId: record.id,
            recordedAt: parseBiomarkerDate(biomarker.date, analysis.documentDate, undefined),
          });
          savedCount++;
        }
        
        console.log(`💾 Saved ${savedCount} biomarkers, skipped ${skippedCount} incomplete ones`);
      } else {
        console.warn(`⚠️ No biomarkers extracted from ${req.file.originalname}. Analysis may have failed.`);
      }

      res.json(record);
    } catch (error: any) {
      console.error("❌ Error uploading file:", error.message || error);
      
      // Handle specific error cases with user-friendly messages
      if (error.message?.includes('prompt is too long')) {
        return res.status(400).json({ 
          error: "Document is too large to process. Please try splitting it into smaller files or upload a document under 3MB."
        });
      }
      
      if (error.status === 400 || error.error?.type === 'invalid_request_error') {
        return res.status(400).json({ 
          error: "Unable to process this document. The file may be too large or contain unsupported content. Please try a smaller file."
        });
      }

      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        return res.status(408).json({ 
          error: "Processing timed out. Large documents may require splitting into smaller files. Please try again with a smaller file."
        });
      }
      
      res.status(500).json({ 
        error: error.message || "Failed to analyze document. Please try again."
      });
    }
  });

  app.get("/api/health-records", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const records = await storage.getHealthRecords(userId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/health-records/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { id } = req.params;
      await storage.deleteHealthRecord(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/biomarkers", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Check biomarker type limit for free users
      const biomarkerType = req.body.type;
      const { allowed, current, limit } = await canAddBiomarkerType(userId, biomarkerType);
      
      if (!allowed) {
        return res.status(403).json({
          error: "Biomarker type limit reached",
          feature: PremiumFeature.UNLIMITED_BIOMARKERS,
          message: `You've reached your limit of ${limit} biomarker types. Upgrade to premium for unlimited biomarker tracking.`,
          current,
          limit,
          upgradeUrl: "/pricing",
        });
      }
      
      const validatedData = insertBiomarkerSchema.parse({
        ...req.body,
        userId,
      });
      const biomarker = await storage.createBiomarker(validatedData);
      
      // Mark biomarkers setup as complete when first biomarker is added
      const onboardingStatus = await storage.getOnboardingStatus(userId);
      if (onboardingStatus && !onboardingStatus.biomarkersSetupComplete) {
        await storage.updateOnboardingFlag(userId, 'biomarkersSetupComplete', true);
      }
      
      res.json(biomarker);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/biomarkers", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { type } = req.query;
      const biomarkers = await storage.getBiomarkers(
        userId,
        type as string | undefined
      );
      
      // Apply historical data filtering for free users
      const isPremium = await isPremiumUser(userId);
      const filteredBiomarkers = filterHistoricalData(biomarkers, userId, isPremium);
      
      res.json(filteredBiomarkers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/biomarkers/chart/:type", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { type } = req.params;
      let { days = '7' } = req.query;
      
      // Enforce historical data limits for free users
      const isPremium = await isPremiumUser(userId);
      const requestedDays = parseInt(days as string);
      
      if (!isPremium && requestedDays > 7) {
        return res.status(403).json({
          error: "Historical data limit exceeded",
          feature: PremiumFeature.UNLIMITED_HISTORY,
          message: `Free users can only access 7 days of historical data. Upgrade to premium for unlimited historical access.`,
          upgradeUrl: "/pricing",
        });
      }
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - requestedDays);
      
      const biomarkers = await storage.getBiomarkersByTimeRange(
        userId,
        type,
        startDate,
        endDate
      );
      
      // Transform to chart data format with unit information
      const chartData = biomarkers.map(b => ({
        date: b.recordedAt.toISOString(),
        value: b.value,
        unit: b.unit, // Include the stored unit for proper conversion
      }));
      
      res.json(chartData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/biomarkers/latest/:type", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { type } = req.params;
      const latestBiomarker = await storage.getLatestBiomarkerByType(userId, type);
      
      if (!latestBiomarker) {
        return res.status(404).json({ error: "No biomarker found for this type" });
      }
      
      res.json(latestBiomarker);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/biological-age", isAuthenticated, requirePremium(PremiumFeature.BIOLOGICAL_AGE), async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Get user's date of birth to calculate chronological age
      const user = await storage.getUser(userId);
      if (!user || !user.dateOfBirth) {
        return res.status(400).json({ error: "Date of birth not set. Please update your profile." });
      }

      const today = new Date();
      const birthDate = new Date(user.dateOfBirth);
      let chronologicalAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        chronologicalAge--;
      }

      // Fetch latest values for all PhenoAge biomarkers
      const biomarkerTypes = {
        albumin: 'albumin',
        creatinine: 'creatinine',
        glucose: 'blood-glucose', // Maps to blood-glucose type
        crp: 'crp',
        lymphocytePercent: 'lymphocytes', // % format
        mcv: 'mcv',
        rdw: 'rdw',
        alp: 'alp',
        wbc: 'wbc'
      };

      const biomarkerValues: any = {};
      
      for (const [key, type] of Object.entries(biomarkerTypes)) {
        const latest = await storage.getLatestBiomarkerByType(userId, type);
        if (latest) {
          let value = latest.value;
          const unit = latest.unit;
          const originalValue = value;
          
          // Convert units to match PhenoAge requirements (METRIC units!)
          // PhenoAge expects: g/L (albumin), µmol/L (creatinine), mmol/L (glucose)
          if (key === 'albumin') {
            // Convert albumin to g/L if needed
            if (unit === 'g/dL') {
              value = value * 10; // g/dL to g/L
              console.log(`🔄 Converted albumin: ${originalValue} ${unit} → ${value} g/L`);
            }
          } else if (key === 'glucose') {
            // Convert glucose to mmol/L if needed
            if (unit === 'mg/dL') {
              value = value / 18.016; // mg/dL to mmol/L
              console.log(`🔄 Converted glucose: ${originalValue} ${unit} → ${value} mmol/L`);
            }
          } else if (key === 'creatinine') {
            // Convert creatinine to µmol/L if needed
            if (unit === 'mg/dL') {
              value = value * 88.4; // mg/dL to µmol/L
              console.log(`🔄 Converted creatinine: ${originalValue} ${unit} → ${value} µmol/L`);
            }
          } else if (key === 'lymphocytePercent') {
            // Convert lymphocyte absolute count to percentage if needed
            if (unit === 'x10⁹/L' || unit === 'K/μL') {
              // Need WBC to calculate percentage - fetch it first
              const wbcBiomarker = await storage.getLatestBiomarkerByType(userId, 'wbc');
              if (wbcBiomarker) {
                // Lymphocyte % = (Lymphocyte absolute / WBC) * 100
                // If lymph is in x10⁹/L and WBC is in K/μL, they're the same unit
                value = (value / wbcBiomarker.value) * 100;
                console.log(`🔄 Converted lymphocytes: ${originalValue} ${unit} → ${value}% (WBC: ${wbcBiomarker.value})`);
              }
            }
          }
          
          console.log(`📌 ${key}: ${value} (original: ${originalValue} ${unit})`);
          biomarkerValues[key] = value;
        }
      }

      // Calculate PhenoAge
      console.log("📊 Biomarker values for PhenoAge calculation:", biomarkerValues);
      console.log("📅 Chronological age:", chronologicalAge);
      
      const result = calculatePhenoAge(biomarkerValues, chronologicalAge);
      
      console.log("🧬 PhenoAge calculation result:", result);
      
      if (!result) {
        return res.status(500).json({ error: "Failed to calculate biological age" });
      }

      // Add user-friendly biomarker info to missing/available lists
      const missingWithInfo = result.missingBiomarkers.map(key => ({
        key,
        name: getBiomarkerDisplayName(key),
        unit: getBiomarkerUnit(key),
        source: getBiomarkerSource(key)
      }));

      const availableWithInfo = result.availableBiomarkers.map(key => ({
        key,
        name: getBiomarkerDisplayName(key),
        unit: getBiomarkerUnit(key),
        value: biomarkerValues[key]
      }));

      res.json({
        ...result,
        missingBiomarkers: missingWithInfo,
        availableBiomarkers: availableWithInfo,
        canCalculate: result.missingBiomarkers.length === 0
      });
    } catch (error: any) {
      console.error("Error calculating biological age:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/meal-plans/generate", isAuthenticated, requirePremium(PremiumFeature.MEAL_PLANS), async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Step 1: Get user's nutrition profile for dietary preferences
      const nutritionProfile = await storage.getNutritionProfile(userId);
      
      // Step 2: Get recent biomarkers for health-based filtering
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const allBiomarkers = await storage.getBiomarkers(userId);
      const recentBiomarkers = allBiomarkers.filter(b => new Date(b.recordedAt) >= sevenDaysAgo);
      
      // Analyze biomarkers for health concerns
      const latestGlucose = recentBiomarkers.filter(b => b.type === 'blood_glucose').sort((a, b) => 
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      )[0];
      
      const latestCholesterol = recentBiomarkers.filter(b => b.type === 'total_cholesterol').sort((a, b) => 
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      )[0];
      
      const latestTriglycerides = recentBiomarkers.filter(b => b.type === 'triglycerides').sort((a, b) => 
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      )[0];
      
      // Determine health-based meal modifications
      const healthFilters: string[] = [];
      let healthContext = '';
      
      // High blood glucose: recommend low glycemic index meals
      if (latestGlucose && latestGlucose.value > 100) {
        healthContext += `🩸 High blood glucose (${latestGlucose.value} mg/dL) - prioritizing low-sugar, low-GI recipes\n`;
      }
      
      // High cholesterol: recommend heart-healthy meals
      if (latestCholesterol && latestCholesterol.value > 200) {
        healthContext += `❤️ High cholesterol (${latestCholesterol.value} mg/dL) - prioritizing heart-healthy recipes\n`;
      }
      
      // High triglycerides: recommend low-carb meals
      if (latestTriglycerides && latestTriglycerides.value > 150) {
        healthContext += `🧪 High triglycerides (${latestTriglycerides.value} mg/dL) - prioritizing low-carb recipes\n`;
      }
      
      // Step 3: Get active goals for calorie/macro adjustments
      const allGoals = await storage.getGoals(userId);
      const activeGoals = allGoals.filter(goal => goal.status === 'active');
      
      let calorieModifier = 0;
      let proteinBoost = false;
      
      activeGoals.forEach(goal => {
        if (goal.metricType === 'weight') {
          const targetWeight = goal.targetValue;
          const currentWeight = goal.currentValue;
          
          if (currentWeight && targetWeight) {
            if (targetWeight < currentWeight) {
              // Weight loss goal: reduce calories by 500/day
              calorieModifier = -500;
              healthContext += `🎯 Weight loss goal: reducing daily calories by 500\n`;
            } else if (targetWeight > currentWeight) {
              // Weight gain goal: increase calories by 500/day
              calorieModifier = 500;
              healthContext += `🎯 Weight gain goal: increasing daily calories by 500\n`;
            }
          }
        }
        
        if (goal.metricType === 'lean_body_mass') {
          proteinBoost = true;
          healthContext += `💪 Muscle building goal: prioritizing high-protein recipes\n`;
        }
      });
      
      // Step 3.5: Analyze user's meal feedback to learn preferences
      const mealFeedback = await storage.getUserMealFeedback(userId);
      const dislikedCuisines = new Set<string>();
      const dislikedDishTypes = new Set<string>();
      const dislikedMealNames = new Set<string>();
      const preferredCuisines = new Set<string>();
      const preferredDishTypes = new Set<string>();
      
      // Analyze feedback patterns (only consider permanent feedback, ignore session-based skips)
      mealFeedback.forEach(feedback => {
        // Only process permanent feedback (ignore session_skip which is temporary)
        if (feedback.feedbackType === 'permanent') {
          if (feedback.feedback === 'permanent_dislike') {
            // Track what user permanently dislikes to never suggest again
            if (feedback.mealName) {
              dislikedMealNames.add(feedback.mealName.toLowerCase());
            }
            if (feedback.cuisines) {
              feedback.cuisines.forEach(c => dislikedCuisines.add(c));
            }
            if (feedback.dishTypes) {
              feedback.dishTypes.forEach(d => dislikedDishTypes.add(d));
            }
          } else if (feedback.feedback === 'dislike') {
            // Old dislike feedback (also permanent)
            if (feedback.cuisines) {
              feedback.cuisines.forEach(c => dislikedCuisines.add(c));
            }
            if (feedback.dishTypes) {
              feedback.dishTypes.forEach(d => dislikedDishTypes.add(d));
            }
          }
        } else if (feedback.feedback === 'skip') {
          // Old skip feedback (neutral-positive) - slightly prefer these
          if (feedback.cuisines) {
            feedback.cuisines.forEach(c => preferredCuisines.add(c));
          }
          if (feedback.dishTypes) {
            feedback.dishTypes.forEach(d => preferredDishTypes.add(d));
          }
        }
      });
      
      // Build feedback context for logging
      let feedbackContext = '';
      if (dislikedCuisines.size > 0) {
        feedbackContext += `🚫 Avoiding cuisines: ${Array.from(dislikedCuisines).join(', ')}\n`;
      }
      if (dislikedDishTypes.size > 0) {
        feedbackContext += `🚫 Avoiding dish types: ${Array.from(dislikedDishTypes).join(', ')}\n`;
      }
      if (preferredCuisines.size > 0) {
        feedbackContext += `👍 Preferring cuisines: ${Array.from(preferredCuisines).join(', ')}\n`;
      }
      if (preferredDishTypes.size > 0) {
        feedbackContext += `👍 Preferring dish types: ${Array.from(preferredDishTypes).join(', ')}\n`;
      }
      
      // Step 4: Delete ALL existing meal plans before generating new ones
      // This ensures disliked meals don't persist in regenerated plans
      const deletedCount = await storage.deleteAllUserMealPlans(userId);
      console.log(`🗑️ Deleted ${deletedCount} existing meal plan(s) for user ${userId} before regeneration`);
      
      // Step 5: Check existing meals to determine start date
      const existingMeals = await storage.getMealPlans(userId);
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      // If there are existing future meals, start from tomorrow
      if (existingMeals.length > 0) {
        startDate.setDate(startDate.getDate() + 1);
      }
      
      // Step 6: Generate meal plan using Spoonacular with intelligent filtering
      const savedPlans = [];
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      const daysToGenerate = 4; // Generate 4 days of meals
      
      // Build dietary restrictions from nutrition profile
      const diet = nutritionProfile?.dietaryPreferences?.[0]; // Use first preference as main diet
      const intolerances = nutritionProfile?.allergies?.join(',') || '';
      
      // Calculate intelligent calorie targets
      const baseCalorieTarget = nutritionProfile?.calorieTarget || 2000;
      const adjustedDailyCalories = baseCalorieTarget + calorieModifier;
      const targetCaloriesPerMeal = Math.round(adjustedDailyCalories / 3);
      
      console.log(`🍽️ Intelligent meal generation:`);
      console.log(`   Diet: ${diet || 'none'}, Intolerances: ${intolerances || 'none'}`);
      console.log(`   Base calories: ${baseCalorieTarget}, Adjusted: ${adjustedDailyCalories} (modifier: ${calorieModifier})`);
      if (healthContext) console.log(`   Health context:\n${healthContext}`);
      if (feedbackContext) console.log(`   User preferences from feedback:\n${feedbackContext}`);
      
      for (let day = 0; day < daysToGenerate; day++) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(startDate.getDate() + day);
        
        for (const mealType of mealTypes) {
          try {
            // Build intelligent search parameters for meal library
            const libraryFilters: any = {
              mealType,
              diet: diet as string,
              maxCalories: targetCaloriesPerMeal + 200,
              minCalories: targetCaloriesPerMeal - 200,
              count: 1, // Request only 1 meal - weighted selection happens in storage layer
            };
            
            // Apply health-based filters
            if (latestGlucose && latestGlucose.value > 100) {
              // High glucose: limit carbs (proxy for low-GI)
              libraryFilters.maxCarbs = Math.round(targetCaloriesPerMeal * 0.40 / 4); // 40% of calories from carbs
            }
            
            if (latestTriglycerides && latestTriglycerides.value > 150) {
              // High triglycerides: lower carbs
              libraryFilters.maxCarbs = Math.round(targetCaloriesPerMeal * 0.35 / 4); // 35% of calories from carbs
            }
            
            // Apply goal-based filters
            if (proteinBoost) {
              // Muscle building: boost protein
              libraryFilters.minProtein = Math.round(targetCaloriesPerMeal * 0.30 / 4); // 30% of calories from protein
            }
            
            // First, try to get meals from local library with smart filtering
            const libraryMeals = await storage.getFilteredMealLibraryItems(userId, libraryFilters);
            
            let recipeToUse = null;
            let isFromLibrary = false;
            
            // Apply feedback-based filtering to library meals
            if (libraryMeals.length > 0) {
              const filteredLibraryMeals = libraryMeals.filter(meal => {
                // Exclude permanently disliked meals by name
                if (meal.title && dislikedMealNames.has(meal.title.toLowerCase())) {
                  return false;
                }
                // Exclude meals with disliked cuisines
                if (meal.cuisines && meal.cuisines.some((c: string) => dislikedCuisines.has(c))) {
                  return false;
                }
                // Exclude meals with disliked dish types
                if (meal.dishTypes && meal.dishTypes.some((d: string) => dislikedDishTypes.has(d))) {
                  return false;
                }
                
                // CRITICAL: Validate dietary restrictions (vegetarian/vegan)
                if (diet) {
                  const meatTerms = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'steak', 'bacon', 'sausage', 'ham', 'duck', 'veal', 'meat', 'seafood', 'prosciutto', 'pepperoni', 'anchovy', 'cod', 'tilapia', 'mahi', 'halibut'];
                  const animalProductTerms = ['milk', 'cheese', 'butter', 'egg', 'cream', 'yogurt', 'honey'];
                  
                  const textToCheck = `${meal.title || ''} ${JSON.stringify(meal.ingredients || [])}`.toLowerCase();
                  
                  if (diet === 'vegetarian' || diet === 'vegan') {
                    // Check for meat in title or ingredients
                    const hasMeat = meatTerms.some(term => textToCheck.includes(term));
                    if (hasMeat) {
                      console.log(`🚫 Filtered out non-vegetarian library meal: ${meal.title} (contains meat)`);
                      return false;
                    }
                  }
                  
                  if (diet === 'vegan') {
                    // Additionally check for animal products
                    const hasAnimalProducts = animalProductTerms.some(term => textToCheck.includes(term));
                    if (hasAnimalProducts) {
                      console.log(`🚫 Filtered out non-vegan library meal: ${meal.title} (contains animal products)`);
                      return false;
                    }
                  }
                }
                
                return true;
              });
              
              if (filteredLibraryMeals.length > 0) {
                // Prioritize meals with preferred cuisines/dish types
                const rankedLibraryMeals = filteredLibraryMeals.sort((a, b) => {
                  let scoreA = 0;
                  let scoreB = 0;
                  
                  // Boost score for preferred cuisines
                  if (a.cuisines) {
                    scoreA += a.cuisines.filter((c: string) => preferredCuisines.has(c)).length * 2;
                  }
                  if (b.cuisines) {
                    scoreB += b.cuisines.filter((c: string) => preferredCuisines.has(c)).length * 2;
                  }
                  
                  // Boost score for preferred dish types
                  if (a.dishTypes) {
                    scoreA += a.dishTypes.filter((d: string) => preferredDishTypes.has(d)).length;
                  }
                  if (b.dishTypes) {
                    scoreB += b.dishTypes.filter((d: string) => preferredDishTypes.has(d)).length;
                  }
                  
                  return scoreB - scoreA; // Higher score first
                });
                
                // Use the top-ranked meal from the library
                recipeToUse = rankedLibraryMeals[0];
                isFromLibrary = true;
                console.log(`📚 Using meal from library: ${recipeToUse.title}`);
              } else {
                console.log(`🚫 All library meals filtered by user feedback, falling back to Spoonacular...`);
              }
            }
            
            if (!recipeToUse) {
              console.log(`🌐 No suitable library meals found, falling back to Spoonacular...`);
              
              // Fall back to Spoonacular API
              const searchParams: any = {
                type: mealType,
                diet: diet as string,
                intolerances: intolerances,
                maxCalories: targetCaloriesPerMeal + 200,
                minCalories: targetCaloriesPerMeal - 200,
                number: 10, // Request more to allow filtering
                sort: 'random',
                addRecipeInformation: true,
              };
              
              // Apply user feedback preferences for cuisines
              if (dislikedCuisines.size > 0) {
                searchParams.excludeCuisine = Array.from(dislikedCuisines).join(',');
              }
              if (preferredCuisines.size > 0) {
                searchParams.cuisine = Array.from(preferredCuisines).join(',');
              }
              
              // Apply health-based filters for Spoonacular
              if (latestGlucose && latestGlucose.value > 100) {
                searchParams.maxSugar = 15; // Max 15g sugar per meal
              }
              
              if (latestCholesterol && latestCholesterol.value > 200) {
                searchParams.maxSaturatedFat = 5; // Max 5g saturated fat per meal
              }
              
              if (latestTriglycerides && latestTriglycerides.value > 150) {
                searchParams.maxCarbs = Math.round(targetCaloriesPerMeal * 0.35 / 4);
              }
              
              if (proteinBoost) {
                searchParams.minProtein = Math.round(targetCaloriesPerMeal * 0.30 / 4);
              }
              
              // Search for recipes matching nutritional requirements
              let searchResults = await spoonacularService.searchRecipes(searchParams);

              // If feedback filters excluded all results, retry without feedback constraints
              if (!searchResults.results || searchResults.results.length === 0) {
                console.log(`⚠️ Feedback filters excluded all Spoonacular results, retrying without cuisine constraints...`);
                const relaxedParams = { ...searchParams };
                delete relaxedParams.excludeCuisine;
                delete relaxedParams.cuisine;
                searchResults = await spoonacularService.searchRecipes(relaxedParams);
                
                // If still no results, do a minimal search with just meal type and calorie range
                // CRITICAL: Preserve dietary restrictions (diet) and intolerances - these are NON-NEGOTIABLE
                if (!searchResults.results || searchResults.results.length === 0) {
                  console.log(`⚠️ Still no results, retrying with minimal constraints (preserving dietary restrictions)...`);
                  const minimalParams: any = {
                    type: mealType,
                    maxCalories: targetCaloriesPerMeal + 300,
                    minCalories: targetCaloriesPerMeal - 300,
                    number: 10,
                    sort: 'random',
                    addRecipeInformation: true,
                  };
                  // NEVER compromise on dietary restrictions (vegetarian, vegan, etc.)
                  if (diet) {
                    minimalParams.diet = diet;
                  }
                  // NEVER compromise on intolerances/allergies
                  if (intolerances) {
                    minimalParams.intolerances = intolerances;
                  }
                  searchResults = await spoonacularService.searchRecipes(minimalParams);
                }
              }

              if (searchResults.results && searchResults.results.length > 0) {
                // Filter results by dish type and meal name feedback (post-query filtering)
                let filteredResults = searchResults.results.filter((recipe: any) => {
                  // Exclude permanently disliked meals by name
                  if (recipe.title && dislikedMealNames.has(recipe.title.toLowerCase())) {
                    return false;
                  }
                  // Exclude recipes with disliked dish types
                  if (recipe.dishTypes && recipe.dishTypes.some((d: string) => dislikedDishTypes.has(d))) {
                    return false;
                  }
                  
                  // CRITICAL: Validate dietary restrictions (vegetarian/vegan)
                  // Spoonacular's API sometimes returns non-compliant meals, so we must validate
                  if (diet) {
                    const meatTerms = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'steak', 'bacon', 'sausage', 'ham', 'duck', 'veal', 'meat', 'seafood', 'prosciutto', 'pepperoni', 'anchovy', 'cod', 'tilapia', 'mahi', 'halibut'];
                    const animalProductTerms = ['milk', 'cheese', 'butter', 'egg', 'cream', 'yogurt', 'honey'];
                    
                    const textToCheck = `${recipe.title || ''} ${JSON.stringify(recipe.extendedIngredients || [])}`.toLowerCase();
                    
                    if (diet === 'vegetarian' || diet === 'vegan') {
                      // Check for meat in title or ingredients
                      const hasMeat = meatTerms.some(term => textToCheck.includes(term));
                      if (hasMeat) {
                        console.log(`🚫 Filtered out non-vegetarian meal: ${recipe.title} (contains meat)`);
                        return false;
                      }
                    }
                    
                    if (diet === 'vegan') {
                      // Additionally check for animal products
                      const hasAnimalProducts = animalProductTerms.some(term => textToCheck.includes(term));
                      if (hasAnimalProducts) {
                        console.log(`🚫 Filtered out non-vegan meal: ${recipe.title} (contains animal products)`);
                        return false;
                      }
                    }
                  }
                  
                  return true;
                });
                
                // CRITICAL: Only relax dish type filtering if no meal-specific dislikes were filtered
                // NEVER re-add meals that user explicitly disliked by name
                if (filteredResults.length === 0) {
                  // Check if we filtered out meal-specific dislikes
                  const hasDislikedMealNames = searchResults.results.some((recipe: any) => 
                    recipe.title && dislikedMealNames.has(recipe.title.toLowerCase())
                  );
                  
                  if (!hasDislikedMealNames) {
                    // Only dish types were filtered - we can relax this constraint
                    console.log(`⚠️ All results filtered by dish type feedback only, relaxing dish type constraint...`);
                    filteredResults = searchResults.results.filter((recipe: any) => {
                      // Still exclude permanently disliked meals by name (non-negotiable)
                      if (recipe.title && dislikedMealNames.has(recipe.title.toLowerCase())) {
                        return false;
                      }
                      return true;
                    });
                  } else {
                    // User explicitly disliked specific meals - do NOT re-add them
                    console.log(`🚫 All results contain permanently disliked meals - skipping this meal slot`);
                    filteredResults = []; // Keep empty to skip this meal
                  }
                }
                
                // Rank results by preferred cuisines and dish types
                const rankedResults = filteredResults.sort((a: any, b: any) => {
                  let scoreA = 0;
                  let scoreB = 0;
                  
                  // Boost for preferred cuisines
                  if (a.cuisines) {
                    scoreA += a.cuisines.filter((c: string) => preferredCuisines.has(c)).length * 3;
                  }
                  if (b.cuisines) {
                    scoreB += b.cuisines.filter((c: string) => preferredCuisines.has(c)).length * 3;
                  }
                  
                  // Boost for preferred dish types
                  if (a.dishTypes) {
                    scoreA += a.dishTypes.filter((d: string) => preferredDishTypes.has(d)).length * 2;
                  }
                  if (b.dishTypes) {
                    scoreB += b.dishTypes.filter((d: string) => preferredDishTypes.has(d)).length * 2;
                  }
                  
                  return scoreB - scoreA; // Higher score first
                });
                
                // Pick top-ranked recipe
                const recipe = rankedResults[0];
                
                // Get full recipe details including ingredients and instructions
                const recipeDetails = await spoonacularService.getRecipeDetails(recipe.id);
                
                recipeToUse = recipeDetails;
                isFromLibrary = false;
              } else {
                console.log(`❌ CRITICAL: All Spoonacular fallback tiers exhausted for ${mealType} on day ${day + 1}`);
                console.log(`   - Tried with full constraints: 0 results`);
                console.log(`   - Tried without cuisine constraints: 0 results`);
                console.log(`   - Tried with minimal constraints: 0 results`);
                console.log(`   - Skipping this meal slot - user will see incomplete meal plan`);
              }
            }
            
            // Process the selected recipe (from library or Spoonacular)
            if (recipeToUse) {
              if (isFromLibrary) {
                // Increment served count for library meal
                await storage.updateMealPerformance(recipeToUse.id, true);
                
                // Save meal plan from library
                const saved = await storage.createMealPlan({
                  userId,
                  mealType: mealType.charAt(0).toUpperCase() + mealType.slice(1),
                  name: recipeToUse.title,
                  description: recipeToUse.description || '',
                  calories: recipeToUse.calories || 0,
                  protein: recipeToUse.protein || 0,
                  carbs: recipeToUse.carbs || 0,
                  fat: recipeToUse.fat || 0,
                  prepTime: recipeToUse.readyInMinutes || 30,
                  servings: recipeToUse.servings || 1,
                  ingredients: Array.isArray(recipeToUse.ingredients) ? recipeToUse.ingredients : [],
                  detailedRecipe: recipeToUse.instructions || '',
                  recipe: recipeToUse.instructions || '',
                  tags: recipeToUse.diets || [],
                  imageUrl: recipeToUse.imageUrl,
                  spoonacularRecipeId: recipeToUse.spoonacularRecipeId,
                  scheduledDate,
                  sourceUrl: recipeToUse.sourceUrl,
                  readyInMinutes: recipeToUse.readyInMinutes,
                  healthScore: recipeToUse.healthScore || null,
                  dishTypes: recipeToUse.dishTypes || [],
                  diets: recipeToUse.diets || [],
                  cuisines: recipeToUse.cuisines || [],
                  extendedIngredients: recipeToUse.extendedIngredients || null,
                  analyzedInstructions: recipeToUse.analyzedInstructions || null,
                  nutritionData: null,
                  mealLibraryId: recipeToUse.id, // Link to library meal
                });
                
                savedPlans.push(saved);
                console.log(`✅ Added ${mealType} from library for day ${day + 1}: ${recipeToUse.title}`);
              } else {
                // Extract ingredients list from Spoonacular
                const ingredients = recipeToUse.extendedIngredients?.map((ing: any) => 
                  ing.original || `${ing.amount} ${ing.unit} ${ing.name}`
                ) || [];
                
                // Extract step-by-step instructions
                let detailedInstructions = '';
                if (recipeToUse.analyzedInstructions && recipeToUse.analyzedInstructions.length > 0) {
                  const steps = recipeToUse.analyzedInstructions[0].steps || [];
                  detailedInstructions = steps
                    .map((step: any, index: number) => `${index + 1}. ${step.step}`)
                    .join('\n\n');
                }
                
                // Calculate macros from nutrition data
                const nutrition = recipeToUse.nutrition;
                const calories = nutrition?.nutrients?.find((n: any) => n.name === 'Calories')?.amount || 0;
                const protein = nutrition?.nutrients?.find((n: any) => n.name === 'Protein')?.amount || 0;
                const carbs = nutrition?.nutrients?.find((n: any) => n.name === 'Carbohydrates')?.amount || 0;
                const fat = nutrition?.nutrients?.find((n: any) => n.name === 'Fat')?.amount || 0;
                
                // Save meal plan with Spoonacular data
                const recipeData = recipeToUse as any;
                const saved = await storage.createMealPlan({
                  userId,
                  mealType: mealType.charAt(0).toUpperCase() + mealType.slice(1),
                  name: recipeToUse.title,
                  description: recipeToUse.summary?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
                  calories: Math.round(calories),
                  protein: Math.round(protein),
                  carbs: Math.round(carbs),
                  fat: Math.round(fat),
                  prepTime: recipeToUse.readyInMinutes || 30,
                  servings: recipeToUse.servings || 1,
                  ingredients,
                  detailedRecipe: detailedInstructions || recipeData.instructions || '',
                  recipe: recipeData.instructions || '',
                  tags: recipeData.diets || [],
                  imageUrl: recipeToUse.image,
                  spoonacularRecipeId: recipeToUse.id,
                  scheduledDate,
                  sourceUrl: recipeToUse.sourceUrl,
                  readyInMinutes: recipeToUse.readyInMinutes,
                  healthScore: recipeToUse.healthScore,
                  dishTypes: recipeToUse.dishTypes || [],
                  diets: recipeToUse.diets || [],
                  cuisines: recipeToUse.cuisines || [],
                  extendedIngredients: recipeToUse.extendedIngredients || null,
                  analyzedInstructions: recipeToUse.analyzedInstructions || null,
                  nutritionData: recipeToUse.nutrition || null,
                });
                
                savedPlans.push(saved);
                console.log(`✅ Added ${mealType} from Spoonacular for day ${day + 1}: ${recipeToUse.title}`);
              }
            }
          } catch (error: any) {
            console.error(`Error generating ${mealType} for day ${day + 1}:`, error);
            
            // If it's a Spoonacular API error, log it but continue with other meals
            if (error.message === 'SPOONACULAR_PAYMENT_REQUIRED' || error.message === 'SPOONACULAR_QUOTA_EXCEEDED') {
              console.warn('⚠️ Spoonacular API unavailable - meal generation will be limited');
            }
            // Continue with other meals even if one fails
          }
        }
      }
      
      // Step 5: Enforce 7-day maximum - delete any meals beyond 7 days from today
      const maxDate = new Date();
      maxDate.setHours(0, 0, 0, 0);
      maxDate.setDate(maxDate.getDate() + 7);
      
      const cappedCount = await storage.deleteFutureMealsBeyondDate(userId, maxDate);
      if (cappedCount > 0) {
        console.log(`🔒 Enforced 7-day cap: deleted ${cappedCount} meal(s) beyond ${maxDate.toISOString().split('T')[0]}`);
      }
      
      console.log(`✅ Generated ${savedPlans.length} Spoonacular meals for ${daysToGenerate} days starting ${startDate.toISOString().split('T')[0]}`);
      res.json(savedPlans);
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/meal-plans", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const plans = await storage.getMealPlans(userId);
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/meal-plans/:id/feedback", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    const { feedback } = req.body; // "liked" or "disliked"

    try {
      const updated = await storage.updateMealFeedback(id, userId, feedback);
      
      if (!updated) {
        return res.status(404).json({ error: 'Meal plan not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Nutrition Profile Routes
  app.get("/api/nutrition-profile", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const profile = await storage.getNutritionProfile(userId);
      res.json(profile || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/nutrition-profile", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const profile = await storage.createNutritionProfile({
        ...req.body,
        userId,
      });
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/nutrition-profile", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const profile = await storage.updateNutritionProfile(userId, req.body);
      
      if (!profile) {
        return res.status(404).json({ error: 'Nutrition profile not found' });
      }
      
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/nutrition-profile/ai-recommendations", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Gather user data for AI analysis
      const [goals, biomarkers, trainingSchedules, profile] = await Promise.all([
        storage.getGoals(userId),
        storage.getBiomarkers(userId),
        storage.getTrainingSchedules(userId),
        storage.getNutritionProfile(userId)
      ]);

      // Get latest key biomarkers
      const latestWeight = biomarkers
        .filter(b => b.type === 'weight')
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
      
      const latestBodyFat = biomarkers
        .filter(b => b.type === 'body_fat_percentage')
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

      // Build context for AI
      const context = {
        goals: goals.filter(g => g.status === 'active').map(g => ({
          metric: g.metricType,
          current: g.currentValue,
          target: g.targetValue,
          unit: g.unit,
          deadline: g.deadline
        })),
        currentWeight: latestWeight ? { value: latestWeight.value, unit: latestWeight.unit } : null,
        currentBodyFat: latestBodyFat ? { value: latestBodyFat.value, unit: latestBodyFat.unit } : null,
        trainingDays: trainingSchedules.length,
        dietaryPreferences: profile?.dietaryPreferences || [],
        mealsPerDay: profile?.mealsPerDay || 3,
        snacksPerDay: profile?.snacksPerDay || 1
      };

      const recommendations = await generateMacroRecommendations(context);
      
      res.json(recommendations);
    } catch (error: any) {
      console.error("Error generating macro recommendations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Recipe Search Routes
  app.get("/api/recipes/search", isAuthenticated, async (req, res) => {
    try {
      const {
        query,
        diet,
        intolerances,
        cuisine,
        type,
        maxReadyTime,
        minProtein,
        maxCalories,
        minCalories,
        number,
        offset,
        sort
      } = req.query;

      const results = await spoonacularService.searchRecipes({
        query: query as string,
        diet: diet as string,
        intolerances: intolerances as string,
        cuisine: cuisine as string,
        type: type as string,
        maxReadyTime: maxReadyTime ? parseInt(maxReadyTime as string) : undefined,
        minProtein: minProtein ? parseInt(minProtein as string) : undefined,
        maxCalories: maxCalories ? parseInt(maxCalories as string) : undefined,
        minCalories: minCalories ? parseInt(minCalories as string) : undefined,
        number: number ? parseInt(number as string) : 10,
        offset: offset ? parseInt(offset as string) : 0,
        sort: sort as string,
      });

      res.json(results);
    } catch (error: any) {
      console.error("Error searching recipes:", error);
      
      // Handle Spoonacular payment/quota errors with user-friendly messages
      if (error.message === 'SPOONACULAR_PAYMENT_REQUIRED') {
        return res.status(503).json({ 
          error: "Recipe search is temporarily unavailable. Try asking the AI Health Coach for personalized meal recommendations instead!",
          errorType: "SPOONACULAR_UNAVAILABLE"
        });
      }
      
      if (error.message === 'SPOONACULAR_QUOTA_EXCEEDED') {
        return res.status(503).json({ 
          error: "Recipe search limit reached. Try asking the AI Health Coach for personalized meal suggestions!",
          errorType: "SPOONACULAR_UNAVAILABLE"
        });
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recipes/:id", isAuthenticated, async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const recipe = await spoonacularService.getRecipeDetails(recipeId, true);
      res.json(recipe);
    } catch (error: any) {
      console.error("Error fetching recipe:", error);
      
      // Handle Spoonacular payment/quota errors with user-friendly messages
      if (error.message === 'SPOONACULAR_PAYMENT_REQUIRED' || error.message === 'SPOONACULAR_QUOTA_EXCEEDED') {
        return res.status(503).json({ 
          error: "Recipe details are temporarily unavailable. Try asking the AI Health Coach for meal suggestions!",
          errorType: "SPOONACULAR_UNAVAILABLE"
        });
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  // Favorite Recipes Routes
  app.get("/api/favorites", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const favorites = await storage.getFavoriteRecipes(userId);
      res.json(favorites);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/favorites", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Check if already favorited
      const existing = await storage.getFavoriteRecipeBySpoonacularId(
        userId,
        req.body.spoonacularRecipeId
      );

      if (existing) {
        return res.status(400).json({ error: 'Recipe already favorited' });
      }

      const favorite = await storage.createFavoriteRecipe({
        ...req.body,
        userId,
      });
      res.json(favorite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/favorites/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      await storage.deleteFavoriteRecipe(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/favorites/:id/notes", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const favorite = await storage.updateFavoriteRecipeNotes(
        req.params.id,
        userId,
        req.body.notes
      );
      
      if (!favorite) {
        return res.status(404).json({ error: 'Favorite not found' });
      }
      
      res.json(favorite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/training-schedules/generate", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const userProfile = req.body;
      
      const chatHistory = await storage.getChatMessages(userId);
      const chatContext = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Fetch active goals to incorporate into training planning
      const allGoals = await storage.getGoals(userId);
      const activeGoals = allGoals.filter(goal => goal.status === 'active');
      
      const schedules = await generateTrainingSchedule({
        ...userProfile,
        chatContext,
        activeGoals
      });
      
      const savedSchedules = [];
      for (const schedule of schedules) {
        const saved = await storage.createTrainingSchedule({
          ...schedule,
          userId,
          completed: 0,
          exercises: schedule.exercises || [], // Ensure exercises is never null
        });
        savedSchedules.push(saved);
      }
      
      res.json(savedSchedules);
    } catch (error: any) {
      console.error("Error generating training schedule:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/training-schedules", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const schedules = await storage.getTrainingSchedules(userId);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/training-schedules/:id/complete", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { id } = req.params;
      const { completed } = req.body;
      
      const updated = await storage.updateTrainingSchedule(id, userId, {
        completed: completed ? 1 : 0,
        completedAt: completed ? new Date() : null,
      });
      
      if (!updated) {
        return res.status(404).json({ error: 'Training schedule not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/training-schedules/:id/schedule", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { id } = req.params;
      const { scheduledFor } = req.body;
      
      const updated = await storage.updateTrainingSchedule(id, userId, {
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      });
      
      if (!updated) {
        return res.status(404).json({ error: 'Training schedule not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/training/readiness", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    
    try {
      // Check if we already calculated readiness today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingScore = await storage.getReadinessScoreForDate(userId, today);
      
      if (existingScore) {
        // Return cached score from today
        return res.json({
          score: existingScore.score,
          quality: existingScore.quality,
          recommendation: existingScore.recommendation,
          reasoning: existingScore.reasoning,
          factors: {
            sleep: { 
              score: existingScore.sleepScore || 50, 
              weight: 0.40, 
              value: existingScore.sleepValue || undefined 
            },
            hrv: { 
              score: existingScore.hrvScore || 50, 
              weight: 0.30, 
              value: existingScore.hrvValue || undefined 
            },
            restingHR: { 
              score: existingScore.restingHRScore || 50, 
              weight: 0.15, 
              value: existingScore.restingHRValue || undefined 
            },
            workloadRecovery: { 
              score: existingScore.workloadScore || 50, 
              weight: 0.15 
            }
          }
        });
      }
      
      // Calculate fresh readiness score
      const readinessScore = await calculateReadinessScore(userId, storage, today);
      
      // Save the score for today
      await storage.createReadinessScore({
        userId,
        date: today,
        score: readinessScore.score,
        quality: readinessScore.quality,
        recommendation: readinessScore.recommendation,
        reasoning: readinessScore.reasoning,
        sleepScore: readinessScore.factors.sleep.score,
        sleepValue: readinessScore.factors.sleep.value || null,
        hrvScore: readinessScore.factors.hrv.score,
        hrvValue: readinessScore.factors.hrv.value || null,
        restingHRScore: readinessScore.factors.restingHR.score,
        restingHRValue: readinessScore.factors.restingHR.value || null,
        workloadScore: readinessScore.factors.workloadRecovery.score,
      });
      
      res.json(readinessScore);
    } catch (error: any) {
      console.error("Error calculating readiness score:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Force recalculation of readiness score (deletes cached score)
  app.delete("/api/training/readiness/recalculate", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Delete today's cached readiness score
      await db.delete(readinessScores).where(
        and(
          eq(readinessScores.userId, userId),
          gte(readinessScores.date, today)
        )
      );
      
      res.json({ success: true, message: "Readiness score cache cleared. Refresh to recalculate." });
    } catch (error: any) {
      console.error("Error clearing readiness cache:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get readiness settings
  app.get("/api/training/readiness/settings", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      let settings = await storage.getReadinessSettings(userId);
      
      // Return defaults if no settings exist
      if (!settings) {
        settings = {
          id: '',
          userId,
          sleepWeight: 0.40,
          hrvWeight: 0.30,
          restingHRWeight: 0.15,
          workloadWeight: 0.15,
          alertThreshold: 50,
          alertsEnabled: 1,
          usePersonalBaselines: 0,
          personalHrvBaseline: null,
          personalRestingHrBaseline: null,
          personalSleepHoursBaseline: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching readiness settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update readiness settings
  app.post("/api/training/readiness/settings", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { 
        sleepWeight, 
        hrvWeight, 
        restingHRWeight, 
        workloadWeight, 
        alertThreshold, 
        alertsEnabled,
        usePersonalBaselines,
        personalHrvBaseline,
        personalRestingHrBaseline,
        personalSleepHoursBaseline
      } = req.body;
      
      // Validate weights sum to 1.0
      const totalWeight = sleepWeight + hrvWeight + restingHRWeight + workloadWeight;
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        return res.status(400).json({ error: "Weights must sum to 100%" });
      }
      
      const settings = await storage.upsertReadinessSettings({
        userId,
        sleepWeight,
        hrvWeight,
        restingHRWeight,
        workloadWeight,
        alertThreshold,
        alertsEnabled,
        usePersonalBaselines: usePersonalBaselines ?? 0,
        personalHrvBaseline: personalHrvBaseline ?? null,
        personalRestingHrBaseline: personalRestingHrBaseline ?? null,
        personalSleepHoursBaseline: personalSleepHoursBaseline ?? null,
      });
      
      // Clear cached readiness scores to force recalculation with new weights
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await db.delete(readinessScores).where(
        and(
          eq(readinessScores.userId, userId),
          gte(readinessScores.date, today)
        )
      );
      
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating readiness settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-calculate personal baselines from 30-day historical data
  app.get("/api/training/readiness/auto-calculate-baselines", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      // Get HRV data from last 30 days
      const biomarkers = await storage.getBiomarkers(userId);
      const hrvData = biomarkers
        .filter(b => b.type === 'hrv' && new Date(b.recordedAt) >= thirtyDaysAgo)
        .map(b => b.value);
      
      // Get Resting HR data from last 30 days
      const rhrData = biomarkers
        .filter(b => b.type === 'heart-rate' && new Date(b.recordedAt) >= thirtyDaysAgo)
        .map(b => b.value);
      
      // Get Sleep data from last 30 days
      const sleepSessions = await storage.getSleepSessions(userId);
      const sleepData = sleepSessions
        .filter(s => new Date(s.bedtime) >= thirtyDaysAgo && s.totalMinutes)
        .map(s => s.totalMinutes / 60); // Convert to hours
      
      // Calculate averages (or return null if no data)
      const calculateAverage = (data: number[]) => {
        if (data.length === 0) return null;
        return Math.round((data.reduce((sum, val) => sum + val, 0) / data.length) * 10) / 10; // Round to 1 decimal
      };
      
      const baselines = {
        personalHrvBaseline: calculateAverage(hrvData),
        personalRestingHrBaseline: calculateAverage(rhrData),
        personalSleepHoursBaseline: calculateAverage(sleepData),
        dataPoints: {
          hrv: hrvData.length,
          restingHR: rhrData.length,
          sleep: sleepData.length
        }
      };
      
      res.json(baselines);
    } catch (error: any) {
      console.error("Error auto-calculating baselines:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Fitness Profile Endpoints

  // Get fitness profile
  app.get("/api/fitness-profile", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const profile = await storage.getFitnessProfile(userId);
      res.json(profile);
    } catch (error: any) {
      console.error("Error fetching fitness profile:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update fitness profile
  app.post("/api/fitness-profile", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      // Validate request body with Zod schema
      const validation = insertFitnessProfileSchema.safeParse({
        userId,  // Server-side binding to prevent tampering
        ...req.body
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid fitness profile data", 
          details: validation.error.errors 
        });
      }

      const profile = await storage.upsertFitnessProfile(validation.data);
      res.json(profile);
    } catch (error: any) {
      console.error("Error updating fitness profile:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Recovery Protocol Endpoints
  
  // Get all recovery protocols or filter by category
  app.get("/api/recovery-protocols", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const protocols = await storage.getRecoveryProtocols(category);
      res.json(protocols);
    } catch (error: any) {
      console.error("Error fetching recovery protocols:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get recommended recovery protocols based on readiness score
  app.get("/api/recovery-protocols/recommendations", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      // Get today's readiness score
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const readinessScore = await calculateReadinessScore(userId, storage, today);
      
      // Get downvoted protocols to exclude
      const downvotedProtocols = await storage.getDownvotedProtocols(userId);
      
      // Determine which factors are low and need attention
      const lowFactors: string[] = [];
      if (readinessScore.factors.sleep.score < 60) lowFactors.push('sleep');
      if (readinessScore.factors.hrv.score < 60) lowFactors.push('hrv');
      if (readinessScore.factors.restingHR.score < 60) lowFactors.push('resting_hr');
      if (readinessScore.factors.workloadRecovery.score < 60) lowFactors.push('workload');
      
      // Get protocols that target the low factors
      const allRecommendations: any[] = [];
      
      for (const factor of lowFactors) {
        const protocols = await storage.getProtocolsByTargetFactor(factor);
        allRecommendations.push(...protocols);
      }
      
      // Filter out downvoted protocols
      const filteredRecommendations = allRecommendations.filter(
        p => !downvotedProtocols.includes(p.id)
      );
      
      // Remove duplicates and limit to top 3
      const uniqueRecommendations = Array.from(
        new Map(filteredRecommendations.map(p => [p.id, p])).values()
      ).slice(0, 3);
      
      // Get user preferences for these protocols
      const preferences = await storage.getUserProtocolPreferences(userId);
      const preferencesMap = new Map(preferences.map(p => [p.protocolId, p.preference]));
      
      const response = {
        readinessScore: readinessScore.score,
        lowFactors,
        recommendations: uniqueRecommendations.map(p => ({
          ...p,
          userPreference: preferencesMap.get(p.id) || 'neutral'
        }))
      };
      
      res.json(response);
    } catch (error: any) {
      console.error("Error generating recovery recommendations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vote on a recovery protocol (upvote/downvote)
  app.post("/api/recovery-protocols/:protocolId/vote", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { protocolId } = req.params;
    const { preference } = req.body; // 'upvote', 'downvote', or 'neutral'
    
    try {
      if (!['upvote', 'downvote', 'neutral'].includes(preference)) {
        return res.status(400).json({ error: "Invalid preference. Must be 'upvote', 'downvote', or 'neutral'" });
      }
      
      // Get current readiness score for context
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const readinessScore = await calculateReadinessScore(userId, storage, today);
      
      const result = await storage.upsertUserProtocolPreference({
        userId,
        protocolId,
        preference,
        context: {
          readinessScore: readinessScore.score,
          factors: readinessScore.factors,
          votedAt: new Date().toISOString(),
        },
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error voting on protocol:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's protocol preferences
  app.get("/api/recovery-protocols/preferences", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const preferences = await storage.getUserProtocolPreferences(userId);
      res.json(preferences);
    } catch (error: any) {
      console.error("Error fetching protocol preferences:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Supplement Endpoints
  
  // Get all supplements for the current user
  app.get("/api/supplements", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const supplements = await storage.getSupplements(userId);
      res.json(supplements);
    } catch (error: any) {
      console.error("Error fetching supplements:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new supplement
  app.post("/api/supplements", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const supplement = await storage.createSupplement({
        userId,
        ...req.body
      });
      
      // Mark supplements setup as complete when first supplement is added
      const onboardingStatus = await storage.getOnboardingStatus(userId);
      if (onboardingStatus && !onboardingStatus.supplementsSetupComplete) {
        await storage.updateOnboardingFlag(userId, 'supplementsSetupComplete', true);
      }
      
      res.json(supplement);
    } catch (error: any) {
      console.error("Error creating supplement:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update a supplement
  app.patch("/api/supplements/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      const supplement = await storage.updateSupplement(id, userId, req.body);
      if (!supplement) {
        return res.status(404).json({ error: "Supplement not found" });
      }
      res.json(supplement);
    } catch (error: any) {
      console.error("Error updating supplement:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a supplement (soft delete)
  app.delete("/api/supplements/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      await storage.deleteSupplement(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting supplement:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Daily Reminder Endpoints
  
  // Get all daily reminders for the current user
  app.get("/api/daily-reminders", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const reminders = await storage.getDailyReminders(userId);
      res.json(reminders);
    } catch (error: any) {
      console.error("Error fetching daily reminders:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active reminders for today
  app.get("/api/daily-reminders/today", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const reminders = await storage.getActiveRemindersForToday(userId);
      
      // Get today's completions
      const today = new Date().toISOString().split('T')[0];
      const completions = await storage.getReminderCompletions(userId, today);
      const completedIds = new Set(completions.map(c => c.reminderId));
      
      // Add streak info and completion status
      const remindersWithInfo = await Promise.all(
        reminders.map(async (reminder) => {
          const streak = await storage.getReminderStreak(reminder.id, userId);
          return {
            ...reminder,
            streak,
            completedToday: completedIds.has(reminder.id)
          };
        })
      );
      
      res.json(remindersWithInfo);
    } catch (error: any) {
      console.error("Error fetching today's reminders:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new daily reminder
  app.post("/api/daily-reminders", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const reminder = await storage.createDailyReminder({
        userId,
        ...req.body
      });
      res.json(reminder);
    } catch (error: any) {
      console.error("Error creating daily reminder:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mark a reminder as complete for today
  app.post("/api/daily-reminders/:id/complete", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      const today = new Date().toISOString().split('T')[0];
      const completion = await storage.markReminderComplete(id, userId, today);
      res.json(completion);
    } catch (error: any) {
      console.error("Error marking reminder complete:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Supplement Recommendation Endpoints
  
  // Get all supplement recommendations
  app.get("/api/supplement-recommendations", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const status = req.query.status as string | undefined;
    try {
      const recommendations = await storage.getSupplementRecommendations(userId, status);
      res.json(recommendations);
    } catch (error: any) {
      console.error("Error fetching supplement recommendations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Accept a supplement recommendation (adds to user's stack)
  app.post("/api/supplement-recommendations/:id/accept", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      // Get the recommendation
      const recommendations = await storage.getSupplementRecommendations(userId);
      const recommendation = recommendations.find(r => r.id === id);
      
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      // Add to supplement stack
      const supplement = await storage.createSupplement({
        userId,
        name: recommendation.supplementName,
        dosage: recommendation.dosage,
        timing: 'morning', // Default timing
        purpose: recommendation.reason,
        active: 1
      });

      // Create daily reminder
      await storage.createDailyReminder({
        userId,
        type: 'supplement',
        title: `Take ${recommendation.supplementName}`,
        description: `${recommendation.dosage} - ${recommendation.reason}`,
        frequency: 'daily',
        timeOfDay: 'morning',
        linkedRecordId: supplement.id,
        active: 1
      });

      // Update recommendation status
      await storage.updateSupplementRecommendationStatus(id, userId, 'accepted');

      res.json({ supplement, accepted: true });
    } catch (error: any) {
      console.error("Error accepting supplement recommendation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Decline a supplement recommendation
  app.post("/api/supplement-recommendations/:id/decline", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      await storage.updateSupplementRecommendationStatus(id, userId, 'declined');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error declining supplement recommendation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Scheduled Exercise Recommendation Endpoints
  
  // Create a new exercise recommendation (from AI)
  app.post("/api/exercise-recommendations", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      // Validate request body
      const validatedData = insertScheduledExerciseRecommendationSchema.parse({
        ...req.body,
        userId
      });
      
      const recommendation = await storage.createScheduledExerciseRecommendation(validatedData);
      res.json(recommendation);
    } catch (error: any) {
      console.error("Error creating exercise recommendation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid recommendation data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get all exercise recommendations (AI Insights page - only proactive insights)
  app.get("/api/exercise-recommendations", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const status = req.query.status as string | undefined;
    try {
      // Only show proactive insights on AI Insights page (user tasks go directly to Training page)
      const recommendations = await storage.getScheduledExerciseRecommendationsByIntent(userId, 'proactive_insight', status);
      res.json(recommendations);
    } catch (error: any) {
      console.error("Error fetching exercise recommendations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-schedule an exercise recommendation at AI-recommended frequency
  app.post("/api/exercise-recommendations/:id/auto-schedule", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    
    try {
      const recommendations = await storage.getScheduledExerciseRecommendations(userId);
      const recommendation = recommendations.find(r => r.id === id);
      
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      // Parse frequency and calculate scheduled dates
      const scheduledDates = calculateScheduledDates(recommendation.frequency);
      
      // Update recommendation with scheduled dates
      await storage.updateScheduledExerciseRecommendation(id, userId, {
        status: 'scheduled',
        scheduledDates,
        scheduledAt: new Date(),
        userFeedback: 'accepted_auto'
      });

      res.json({ success: true, scheduledDates });
    } catch (error: any) {
      console.error("Error auto-scheduling exercise:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Schedule exercise on specific day(s)
  app.post("/api/exercise-recommendations/:id/schedule-manual", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    const { dates } = req.body; // Array of ISO date strings
    
    try {
      await storage.updateScheduledExerciseRecommendation(id, userId, {
        status: 'scheduled',
        scheduledDates: dates,
        scheduledAt: new Date(),
        userFeedback: 'accepted_manual'
      });

      res.json({ success: true, scheduledDates: dates });
    } catch (error: any) {
      console.error("Error manually scheduling exercise:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Decline an exercise recommendation
  app.post("/api/exercise-recommendations/:id/decline", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    const { reason } = req.body;
    
    try {
      await storage.updateScheduledExerciseRecommendation(id, userId, {
        status: 'declined',
        userFeedback: 'declined',
        declineReason: reason || null
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error declining exercise recommendation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get scheduled activities for calendar view (workouts, exercises, recovery)
  app.get("/api/schedule/calendar", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { startDate, endDate } = req.query;
    
    try {
      // Default to current month if no dates provided
      const now = new Date();
      const start = startDate ? new Date(startDate as string) : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date(now.getFullYear(), now.getMonth() + 2, 0); // End of next month
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date range" });
      }

      // Get all scheduled items for the date range
      const [exercises, workouts, supplements] = await Promise.all([
        storage.getScheduledExercisesForDateRange(userId, start, end),
        storage.getTrainingSchedules(userId),
        storage.getSupplements(userId)
      ]);

      // Filter workouts for date range
      const filteredWorkouts = workouts.filter(wo => {
        if (!wo.scheduledFor) return false;
        const woDate = new Date(wo.scheduledFor);
        return woDate >= start && woDate <= end;
      });

      // Format response with counts per day
      const calendar: Record<string, { exercises: number; workouts: number; supplements: number }> = {};
      
      // Helper to format date as YYYY-MM-DD in local timezone
      const formatDateKey = (date: Date | string): string => {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Count exercises per day
      exercises.forEach((ex: any) => {
        if (ex.scheduledDates) {
          ex.scheduledDates.forEach((date: string) => {
            // If date is already YYYY-MM-DD format, use directly
            const dateKey = date.match(/^\d{4}-\d{2}-\d{2}$/) ? date : formatDateKey(date);
            if (!calendar[dateKey]) calendar[dateKey] = { exercises: 0, workouts: 0, supplements: 0 };
            calendar[dateKey].exercises++;
          });
        }
      });

      // Count workouts per day
      filteredWorkouts.forEach((wo: any) => {
        if (wo.scheduledFor) {
          const dateKey = formatDateKey(wo.scheduledFor);
          if (!calendar[dateKey]) calendar[dateKey] = { exercises: 0, workouts: 0, supplements: 0 };
          calendar[dateKey].workouts++;
        }
      });

      // Supplements are daily, so add to all days in range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = formatDateKey(currentDate);
        if (!calendar[dateKey]) calendar[dateKey] = { exercises: 0, workouts: 0, supplements: 0 };
        calendar[dateKey].supplements = supplements.filter((s: any) => s.active === 1).length;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      res.json({ calendar, exercises, workouts: filteredWorkouts });
    } catch (error: any) {
      console.error("Error fetching calendar data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Daily Training Recommendation Endpoint (AI-powered, safety-first)
  app.get("/api/training/daily-recommendation", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 1. Get readiness score (use cached if available)
      let readinessData = await storage.getReadinessScoreForDate(userId, today);
      
      if (!readinessData) {
        // Calculate fresh readiness score if not cached
        const readinessScore = await calculateReadinessScore(userId, storage, today);
        
        // Save it for caching and retrieve the saved record with all fields
        readinessData = await storage.createReadinessScore({
          userId,
          date: today,
          score: readinessScore.score,
          quality: readinessScore.quality,
          recommendation: readinessScore.recommendation,
          reasoning: readinessScore.reasoning,
          sleepScore: readinessScore.factors.sleep.score,
          sleepValue: readinessScore.factors.sleep.value || null,
          hrvScore: readinessScore.factors.hrv.score,
          hrvValue: readinessScore.factors.hrv.value || null,
          restingHRScore: readinessScore.factors.restingHR.score,
          restingHRValue: readinessScore.factors.restingHR.value || null,
          workloadScore: readinessScore.factors.workloadRecovery.score,
        });
      }
      
      // 2. Check if user has already completed a workout today
      const allWorkoutSessions = await storage.getWorkoutSessions(userId);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const completedTodayWorkouts = allWorkoutSessions.filter(w => {
        if (w.completed !== 1 || !w.completedAt) return false;
        const completedDate = new Date(w.completedAt);
        return completedDate >= today && completedDate <= todayEnd;
      });
      
      const hasCompletedWorkoutToday = completedTodayWorkouts.length > 0;
      
      // 3. Get recent workout history (last 7 days) for AI context
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentWorkouts = allWorkoutSessions
        .filter(w => new Date(w.startTime) >= sevenDaysAgo && new Date(w.startTime) < today)
        .map(w => ({
          type: w.workoutType,
          duration: w.duration || 0,
          startTime: new Date(w.startTime),
        }));
      
      // 4. Fetch latest biomarkers for guardrails (last 30 days)
      const allBiomarkers = await storage.getBiomarkers(userId);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get most recent values for each biomarker type
      const biomarkerMap = new Map<string, { value: number; date: Date }>();
      allBiomarkers
        .filter(b => new Date(b.recordedAt) >= thirtyDaysAgo)
        .forEach(b => {
          const existing = biomarkerMap.get(b.type);
          if (!existing || new Date(b.recordedAt) > existing.date) {
            biomarkerMap.set(b.type, { value: b.value, date: new Date(b.recordedAt) });
          }
        });
      
      const biomarkers = {
        cortisolAm: biomarkerMap.get('cortisol_am')?.value || biomarkerMap.get('cortisol')?.value,
        crpHs: biomarkerMap.get('crp_hs')?.value || biomarkerMap.get('crp')?.value,
        testosteroneTotal: biomarkerMap.get('testosterone_total')?.value || biomarkerMap.get('testosterone')?.value,
        glucoseFasting: biomarkerMap.get('glucose_fasting')?.value || biomarkerMap.get('glucose')?.value,
        hba1c: biomarkerMap.get('hba1c')?.value,
        vitaminD: biomarkerMap.get('vitamin_d')?.value || biomarkerMap.get('vitamin_d_25oh')?.value,
      };
      
      // 5. Get user profile data for guardrails
      const user = await storage.getUser(userId);
      const fitnessProfile = await storage.getFitnessProfile(userId);
      
      const userProfile = {
        age: user?.age,
        trainingAgeYears: fitnessProfile?.trainingExperience,
        injuries: fitnessProfile?.injuries || [],
        medicalConditions: user?.medicalConditions || [],
      };
      
      // Pass complete fitness profile to AI for personalized recommendations
      const fullFitnessProfile = fitnessProfile ? {
        fitnessLevel: fitnessProfile.fitnessLevel,
        trainingExperience: fitnessProfile.trainingExperience,
        currentTrainingFrequency: fitnessProfile.currentTrainingFrequency,
        hasGymAccess: fitnessProfile.hasGymAccess,
        gymType: fitnessProfile.gymType,
        homeEquipment: fitnessProfile.homeEquipment,
        specialFacilities: fitnessProfile.specialFacilities,
        recoveryEquipment: fitnessProfile.recoveryEquipment,
        primaryGoal: fitnessProfile.primaryGoal,
        secondaryGoals: fitnessProfile.secondaryGoals,
        preferredWorkoutTypes: fitnessProfile.preferredWorkoutTypes,
        preferredDuration: fitnessProfile.preferredDuration,
        preferredIntensity: fitnessProfile.preferredIntensity,
        availableDays: fitnessProfile.availableDays,
        injuries: fitnessProfile.injuries,
        movementLimitations: fitnessProfile.movementLimitations,
      } : undefined;
      
      // 6. Fetch muscle group frequency data (last 14 days) for balanced training
      let muscleGroupFrequency;
      try {
        muscleGroupFrequency = await storage.getMuscleGroupFrequency(userId, 14);
        console.log(`📊 Fetched muscle group frequency for user ${userId}:`, muscleGroupFrequency.length, 'muscle groups');
      } catch (error) {
        console.error("Error fetching muscle group frequency:", error);
        muscleGroupFrequency = undefined;
      }
      
      // 7. Fetch recent workout feedback for AI-driven exercise selection and progression
      let recentFeedback;
      try {
        recentFeedback = await storage.getRecentWorkoutFeedback(userId, 10);
        console.log(`💭 Fetched workout feedback for user ${userId}:`, recentFeedback.length, 'feedback entries');
      } catch (error) {
        console.error("Error fetching workout feedback:", error);
        recentFeedback = undefined;
      }
      
      // 8. Generate AI recommendation with safety-first logic, guardrails, and feedback-driven personalization
      let aiRecommendation = await generateDailyTrainingRecommendation({
        readinessScore: readinessData!.score,
        readinessRecommendation: readinessData!.recommendation as "ready" | "caution" | "rest",
        readinessFactors: {
          sleep: { 
            score: readinessData!.sleepScore || 50, 
            value: readinessData!.sleepValue || undefined 
          },
          hrv: { 
            score: readinessData!.hrvScore || 50, 
            value: readinessData!.hrvValue || undefined 
          },
          restingHR: { 
            score: readinessData!.restingHRScore || 50, 
            value: readinessData!.restingHRValue || undefined 
          },
          workloadRecovery: { 
            score: readinessData!.workloadScore || 50 
          },
        },
        recentWorkouts,
        biomarkers,
        userProfile,
        fitnessProfile: fullFitnessProfile,
        muscleGroupFrequency,
        recentFeedback,
      });
      
      // Fallback recommendation if AI generation fails
      if (!aiRecommendation) {
        console.warn("AI training recommendation generation failed. Providing fallback recommendation.");
        const readinessScore = readinessData!.score;
        
        // Create a simple readiness-based fallback
        if (readinessScore >= 75) {
          aiRecommendation = {
            primaryPlan: {
              title: "High Intensity Strength Training",
              exercises: [
                { name: "Squats", sets: 4, reps: "8-10", duration: null, intensity: "high", notes: "Focus on form and controlled descent" },
                { name: "Bench Press", sets: 4, reps: "8-10", duration: null, intensity: "high", notes: "Keep core tight throughout" },
                { name: "Deadlifts", sets: 3, reps: "6-8", duration: null, intensity: "high", notes: "Maintain neutral spine" },
                { name: "Pull-ups", sets: 3, reps: "8-12", duration: null, intensity: "high", notes: "Full range of motion" }
              ],
              totalDuration: 60,
              intensity: "high",
              calorieEstimate: 450
            },
            alternatePlan: {
              title: "Moderate Cardio Session",
              exercises: [
                { name: "Jogging", sets: null, reps: null, duration: "20 min", intensity: "moderate", notes: "Comfortable pace" },
                { name: "Cycling", sets: null, reps: null, duration: "10 min", intensity: "moderate", notes: "Steady effort" }
              ],
              totalDuration: 30,
              intensity: "moderate",
              calorieEstimate: 250
            },
            restDayOption: {
              title: "Active Recovery",
              activities: ["Gentle stretching", "Light walk", "Foam rolling"],
              duration: 20,
              benefits: "Promote recovery while staying active"
            },
            aiReasoning: `Your readiness score of ${readinessScore} indicates you're well-recovered and ready for high-intensity training. This workout includes compound movements to maximize strength gains.`,
            safetyNote: null,
            adjustmentsMade: {
              intensityReduced: false,
              durationReduced: false,
              exercisesModified: false,
              reason: "No adjustments needed - excellent recovery state"
            }
          };
        } else if (readinessScore >= 40) {
          aiRecommendation = {
            primaryPlan: {
              title: "Moderate Intensity Training",
              exercises: [
                { name: "Bodyweight Squats", sets: 3, reps: "12-15", duration: null, intensity: "moderate", notes: "Focus on form" },
                { name: "Push-ups", sets: 3, reps: "10-12", duration: null, intensity: "moderate", notes: "Modify as needed" },
                { name: "Lunges", sets: 3, reps: "10 per leg", duration: null, intensity: "moderate", notes: "Controlled movement" },
                { name: "Plank", sets: 3, reps: null, duration: "30-45 sec", intensity: "moderate", notes: "Maintain alignment" }
              ],
              totalDuration: 60,
              intensity: "moderate",
              calorieEstimate: 300
            },
            alternatePlan: {
              title: "Light Cardio",
              exercises: [
                { name: "Walking", sets: null, reps: null, duration: "20 min", intensity: "light", notes: "Easy pace" },
                { name: "Stretching", sets: null, reps: null, duration: "10 min", intensity: "light", notes: "Full body" }
              ],
              totalDuration: 30,
              intensity: "light",
              calorieEstimate: 150
            },
            restDayOption: {
              title: "Full Rest Day",
              activities: ["Gentle stretching", "Meditation", "Light walk (optional)"],
              duration: 15,
              benefits: "Allow your body to recover fully"
            },
            aiReasoning: `Your readiness score of ${readinessScore} suggests moderate recovery. This workout uses lighter intensity to maintain fitness while respecting your recovery needs.`,
            safetyNote: "Listen to your body - rest if you feel unusually fatigued",
            adjustmentsMade: {
              intensityReduced: true,
              durationReduced: false,
              exercisesModified: true,
              reason: "Reduced intensity due to moderate readiness score"
            }
          };
        } else {
          aiRecommendation = {
            primaryPlan: {
              title: "Active Recovery",
              exercises: [
                { name: "Light walking", sets: null, reps: null, duration: "15 min", intensity: "light", notes: "Very easy pace" },
                { name: "Gentle stretching", sets: null, reps: null, duration: "10 min", intensity: "light", notes: "Focus on tight areas" },
                { name: "Breathing exercises", sets: null, reps: null, duration: "5 min", intensity: "light", notes: "Deep, slow breaths" }
              ],
              totalDuration: 30,
              intensity: "light",
              calorieEstimate: 100
            },
            alternatePlan: {
              title: "Complete Rest",
              exercises: [
                { name: "Meditation", sets: null, reps: null, duration: "10 min", intensity: "light", notes: "Relaxation focus" },
                { name: "Light stretching", sets: null, reps: null, duration: "5 min", intensity: "light", notes: "Gentle only" }
              ],
              totalDuration: 15,
              intensity: "light",
              calorieEstimate: 30
            },
            restDayOption: {
              title: "Full Rest Recommended",
              activities: ["Sleep", "Hydration", "Nutrition focus", "Stress management"],
              duration: 0,
              benefits: "Your body needs recovery - take the day off to restore energy"
            },
            aiReasoning: `Your readiness score of ${readinessScore} indicates you need rest. Prioritize recovery today to avoid overtraining and allow your body to adapt.`,
            safetyNote: "Low readiness suggests you need rest. Consider taking a full rest day.",
            adjustmentsMade: {
              intensityReduced: true,
              durationReduced: true,
              exercisesModified: true,
              reason: "Low readiness score - prioritizing recovery"
            }
          };
        }
      }
      
      res.json({
        readinessScore: readinessData!.score,
        readinessRecommendation: readinessData!.recommendation,
        recommendation: aiRecommendation,
        hasCompletedWorkoutToday,
        completedWorkoutsToday: completedTodayWorkouts.map(w => ({
          id: w.id,
          workoutType: w.workoutType,
          completedAt: w.completedAt,
          duration: w.duration
        }))
      });
    } catch (error: any) {
      console.error("Error generating daily training recommendation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/workout-sessions/recovery", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { sessionType, duration, notes } = req.body;
      
      if (!sessionType || !['sauna', 'cold_plunge'].includes(sessionType)) {
        return res.status(400).json({ error: 'Invalid session type. Must be "sauna" or "cold_plunge"' });
      }
      
      const now = new Date();
      const workoutType = sessionType === 'sauna' ? 'Sauna Session' : 'Cold Plunge Session';
      
      const session = await storage.createWorkoutSession({
        userId,
        workoutType,
        sessionType,
        startTime: now,
        endTime: new Date(now.getTime() + (duration || 20) * 60000),
        duration: duration || 20,
        sourceType: 'manual',
        notes: notes || '',
      });
      
      res.json(session);
    } catch (error: any) {
      console.error("Error logging recovery session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Start a new workout session from daily recommendation
  app.post("/api/workout-sessions/start", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { workoutPlan } = req.body;
      
      if (!workoutPlan || !workoutPlan.title || !workoutPlan.exercises) {
        return res.status(400).json({ error: 'Invalid workout plan data' });
      }
      
      console.log('🏋️ Starting workout session:', {
        title: workoutPlan.title,
        exerciseCount: workoutPlan.exercises?.length || 0,
        exercises: workoutPlan.exercises?.map((e: any) => e.name)
      });
      
      const now = new Date();
      
      // Create the workout session
      const session = await storage.createWorkoutSession({
        userId,
        workoutType: workoutPlan.title,
        sessionType: 'workout',
        startTime: now,
        endTime: now, // Will be updated when workout is finished
        duration: workoutPlan.totalDuration || 60,
        sourceType: 'manual',
        notes: '',
      });
      
      // Get all exercises from database to match with workout plan
      const allExercises = await storage.getAllExercises();
      console.log(`📚 Found ${allExercises.length} exercises in database`);
      
      // Fuzzy matching helper function with improved scoring
      const findBestMatch = (planName: string, dbExercises: any[]) => {
        const planLower = planName.toLowerCase();
        
        // 1. Try exact match first
        let match = dbExercises.find(ex => ex.name.toLowerCase() === planLower);
        if (match) return { exercise: match, score: 100 };
        
        // 2. Try partial contains match (e.g., "Row" matches "Bent-Over Dumbbell Rows")
        match = dbExercises.find(ex => ex.name.toLowerCase().includes(planLower) || planLower.includes(ex.name.toLowerCase()));
        if (match) return { exercise: match, score: 80 };
        
        // 3. Try word-based matching with improved scoring
        const planWords = planLower.split(/[\s-]+/).filter(w => w.length > 2); // Skip short words like "or"
        
        const matches = dbExercises.map(ex => {
          const dbWords = ex.name.toLowerCase().split(/[\s-]+/).filter(w => w.length > 2);
          
          // Count matching words (including partial matches)
          const matchingWords = planWords.filter(pw => dbWords.some(dw => dw.includes(pw) || pw.includes(dw)));
          
          // Score based on: 1) number of matching words, 2) percentage of total words
          const matchCount = matchingWords.length;
          const matchRatio = matchCount / Math.min(planWords.length, dbWords.length);
          
          // Give higher weight to match count to favor exercises with key word matches
          const score = (matchRatio * 40) + (matchCount * 15);
          
          return { exercise: ex, score };
        });
        
        // Return best match if score is decent (> 10 for at least 1 word match)
        const bestMatch = matches.sort((a, b) => b.score - a.score)[0];
        return bestMatch && bestMatch.score > 10 ? bestMatch : null;
      };
      
      let setsCreated = 0;
      let exercisesNotFound: string[] = [];
      let exercisesCreated: string[] = [];
      
      // Create exercise sets for each exercise in the plan
      for (let i = 0; i < workoutPlan.exercises.length; i++) {
        const planExercise = workoutPlan.exercises[i];
        
        // Find best matching exercise using fuzzy matching
        const matchResult = findBestMatch(planExercise.name, allExercises);
        
        let matchedExercise;
        
        if (matchResult && matchResult.score >= 30) {
          // Good match found
          matchedExercise = matchResult.exercise;
          console.log(`✅ Matched "${planExercise.name}" to database exercise "${matchedExercise.name}" (score: ${matchResult.score})`);
        } else {
          // No good match - create exercise on-the-fly
          console.log(`⚠️ No good match for "${planExercise.name}" (best score: ${matchResult?.score || 0}). Creating new exercise...`);
          
          // Determine likely equipment and muscle groups based on exercise name
          const nameLower = planExercise.name.toLowerCase();
          let equipment = 'other';
          let muscles: string[] = ['full_body'];
          let category = 'strength';
          let trackingType: 'weight_reps' | 'bodyweight_reps' | 'distance_duration' | 'duration_only' = 'weight_reps';
          
          // Category and tracking type detection (most specific first)
          // Cardio exercises (distance_duration)
          // Cardio exercises with distance + duration tracking
          if (nameLower.includes('running') || nameLower.includes('jogging') || nameLower.includes('run') || nameLower.includes('jog')) {
            category = 'cardio';
            trackingType = 'distance_duration';
            equipment = 'bodyweight';
          }
          else if (nameLower.includes('walking') || nameLower.includes('walk')) {
            category = 'cardio';
            trackingType = 'distance_duration';
            equipment = 'bodyweight';
          }
          else if (nameLower.includes('cycling') || nameLower.includes('bike') || nameLower.includes('biking')) {
            category = 'cardio';
            trackingType = 'distance_duration';
            equipment = 'machine';
          }
          else if (nameLower.includes('rowing') || nameLower.includes('row machine')) {
            category = 'cardio';
            trackingType = 'distance_duration';
            equipment = 'machine';
          }
          else if (nameLower.includes('swim')) {
            category = 'cardio';
            trackingType = 'distance_duration';
            equipment = 'other';
          }
          else if (nameLower.includes('elliptical')) {
            category = 'cardio';
            trackingType = 'distance_duration';
            equipment = 'machine';
          }
          // Isometric holds and flexibility exercises (duration_only)
          else if (nameLower.includes('plank')) {
            category = 'strength';
            trackingType = 'duration_only';
            equipment = 'bodyweight';
          }
          else if (nameLower.includes('wall sit')) {
            category = 'strength';
            trackingType = 'duration_only';
            equipment = 'bodyweight';
          }
          else if (nameLower.includes('hollow hold') || nameLower.includes('dead hang')) {
            category = 'strength';
            trackingType = 'duration_only';
            equipment = 'bodyweight';
          }
          else if (nameLower.includes('stretch') || nameLower.includes('yoga') || nameLower.includes('mobility')) {
            category = 'flexibility';
            trackingType = 'duration_only';
            equipment = 'bodyweight';
          }
          // Bodyweight strength exercises (bodyweight_reps)
          else if (nameLower.includes('push-up') || nameLower.includes('pushup') || nameLower.includes('pull-up') || nameLower.includes('pullup') || 
                   nameLower.includes('chin-up') || nameLower.includes('dip') || nameLower.includes('sit-up') || nameLower.includes('situp') ||
                   nameLower.includes('crunch') || nameLower.includes('bodyweight')) {
            category = 'strength';
            trackingType = 'bodyweight_reps';
            equipment = 'bodyweight';
          }
          // Weighted strength exercises (weight_reps) - default
          else {
            category = 'strength';
            trackingType = 'weight_reps';
            
            // Equipment detection for weighted exercises
            if (nameLower.includes('barbell')) equipment = 'barbell';
            else if (nameLower.includes('dumbbell')) equipment = 'dumbbell';
            else if (nameLower.includes('cable')) equipment = 'cable';
            else if (nameLower.includes('machine')) equipment = 'machine';
            else if (nameLower.includes('kettlebell')) equipment = 'kettlebell';
            else if (nameLower.includes('band')) equipment = 'band';
          }
          
          // Muscle group detection
          if (nameLower.includes('chest') || nameLower.includes('press') || nameLower.includes('push')) muscles = ['chest'];
          else if (nameLower.includes('back') || nameLower.includes('row') || nameLower.includes('pull')) muscles = ['back'];
          else if (nameLower.includes('shoulder') || nameLower.includes('lateral') || nameLower.includes('overhead')) muscles = ['shoulders'];
          else if (nameLower.includes('bicep') || nameLower.includes('curl')) muscles = ['biceps'];
          else if (nameLower.includes('tricep') || nameLower.includes('extension')) muscles = ['triceps'];
          else if (nameLower.includes('leg') || nameLower.includes('squat') || nameLower.includes('lunge')) muscles = ['legs'];
          else if (nameLower.includes('quad')) muscles = ['quadriceps'];
          else if (nameLower.includes('hamstring') || nameLower.includes('deadlift')) muscles = ['hamstrings'];
          else if (nameLower.includes('calf')) muscles = ['calves'];
          else if (nameLower.includes('ab') || nameLower.includes('core') || nameLower.includes('plank')) muscles = ['abs'];
          
          const newExercise = await db.insert(exercises).values({
            name: planExercise.name,
            muscles,
            equipment,
            incrementStep: equipment === 'bodyweight' ? 0 : 2.5,
            tempoDefault: '3-1-1',
            restDefault: 90,
            difficulty: 'intermediate',
            category,
            trackingType,
          }).returning();
          
          matchedExercise = newExercise[0];
          exercisesCreated.push(planExercise.name);
          console.log(`✨ Created new exercise: "${planExercise.name}" (equipment: ${equipment}, muscles: ${muscles.join(', ')})`);
          
          // Add to allExercises for subsequent matches
          allExercises.push(matchedExercise);
        }
        
        // Parse sets and reps (e.g., "3 sets" -> 3, "8-12 reps" -> 8-12)
        const sets = planExercise.sets || 3;
        const repsMatch = planExercise.reps?.match(/(\d+)-?(\d+)?/);
        const repsLow = repsMatch ? parseInt(repsMatch[1]) : 8;
        const repsHigh = repsMatch && repsMatch[2] ? parseInt(repsMatch[2]) : repsLow;
        
        // Create sets for this exercise with values appropriate for tracking type
        const trackingType = matchedExercise.trackingType || 'weight_reps';
        
        for (let setIndex = 0; setIndex < sets; setIndex++) {
          // Build set data based on tracking type
          const setData: any = {
            workoutSessionId: session.id,
            exerciseId: matchedExercise.id,
            userId,
            setIndex: setIndex + 1,
            completed: 0,
          };
          
          // Set type-specific fields
          if (trackingType === 'weight_reps') {
            // Strength training with weight
            const isBodyweight = matchedExercise.equipment === 'bodyweight';
            setData.weight = isBodyweight ? 0 : 20; // 0kg for bodyweight (BW button), 20kg default for weighted
            setData.reps = repsHigh;
            setData.targetRepsLow = repsLow;
            setData.targetRepsHigh = repsHigh;
          } else if (trackingType === 'bodyweight_reps') {
            // Bodyweight exercises - no weight tracking
            setData.weight = null; // No weight for bodyweight exercises
            setData.reps = repsHigh;
            setData.targetRepsLow = repsLow;
            setData.targetRepsHigh = repsHigh;
          } else if (trackingType === 'distance_duration') {
            // Cardio - track distance and duration
            setData.distance = null; // User will fill in
            setData.duration = null; // User will fill in (stored as seconds)
            setData.weight = null;
            setData.reps = null;
          } else if (trackingType === 'duration_only') {
            // Flexibility/stretching - only duration
            setData.duration = null; // User will fill in (stored as seconds)
            setData.weight = null;
            setData.reps = null;
            setData.distance = null;
          }
          
          await db.insert(exerciseSets).values(setData);
          setsCreated++;
        }
      }
      
      if (exercisesCreated.length > 0) {
        console.log(`✨ Created ${exercisesCreated.length} new exercises: ${exercisesCreated.join(', ')}`);
      }
      
      console.log(`📊 Created ${setsCreated} sets for workout session ${session.id}`);
      res.json(session);
    } catch (error: any) {
      console.error("Error starting workout session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Workout Sessions Endpoint
  app.get("/api/workout-sessions", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { days = '30' } = req.query;
      const endDate = new Date();
      const startDate = days === 'all' ? undefined : new Date();
      if (startDate) {
        startDate.setDate(startDate.getDate() - parseInt(days as string));
      }
      
      const sessions = await storage.getWorkoutSessions(userId, startDate, endDate);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single workout session
  app.get("/api/workout-sessions/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    
    try {
      const session = await storage.getWorkoutSession(id, userId);
      if (!session) {
        return res.status(404).json({ error: "Workout session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get exercises for a workout session
  app.get("/api/workout-sessions/:id/exercises", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    
    try {
      const exercises = await storage.getExercisesForSession(id, userId);
      res.json(exercises);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get sets for a workout session
  app.get("/api/workout-sessions/:id/sets", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    
    try {
      const sets = await storage.getSetsForSession(id, userId);
      res.json(sets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add a set to an exercise in a workout session
  app.post("/api/workout-sessions/:sessionId/exercises/:exerciseId/add-set", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { sessionId, exerciseId } = req.params;
    
    try {
      // Verify the session exists and belongs to the user
      const session = await storage.getWorkoutSession(sessionId, userId);
      if (!session) {
        return res.status(404).json({ error: "Workout session not found" });
      }
      
      // Verify the exercise exists in this session
      const sessionExercises = await storage.getExercisesForSession(sessionId, userId);
      const exerciseInSession = sessionExercises.find(ex => ex.id === exerciseId);
      if (!exerciseInSession) {
        return res.status(400).json({ error: "Exercise not found in this workout session" });
      }
      
      // Add the new set
      const newSet = await storage.addExerciseSet(sessionId, exerciseId, userId);
      res.json(newSet);
    } catch (error: any) {
      console.error("Error adding exercise set:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Finish a workout session
  app.post("/api/workout-sessions/:id/finish", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    
    try {
      // Get the workout session to ensure it exists
      const session = await storage.getWorkoutSession(id, userId);
      if (!session) {
        return res.status(404).json({ error: "Workout session not found" });
      }
      
      // Import muscle group tracking utility
      const { recordWorkoutMuscleGroupEngagements } = await import("./utils/muscleGroupTracking");
      
      // Record muscle group engagements based on completed exercises
      await recordWorkoutMuscleGroupEngagements(storage, userId, id);
      
      console.log(`✅ Workout session ${id} finished and muscle groups recorded`);
      
      res.json({ success: true, message: "Workout finished and muscle groups recorded" });
    } catch (error: any) {
      console.error("Error finishing workout session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Submit workout feedback after completion
  app.post("/api/workout-sessions/:id/feedback", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    
    try {
      // Validate the feedback payload
      const feedbackSchema = z.object({
        overallDifficulty: z.number().min(1).max(5),
        fatigueLevel: z.number().min(1).max(5),
        enjoymentRating: z.number().min(1).max(5),
        exercisesTooEasy: z.array(z.string()).default([]),
        exercisesTooHard: z.array(z.string()).default([]),
        painOrDiscomfort: z.string().default(""),
        feedbackNotes: z.string().default(""),
      });

      const feedback = feedbackSchema.parse(req.body);

      // Use storage layer to save feedback (handles IDOR check, upsert logic, and completionStatus)
      await storage.saveWorkoutFeedback(id, userId, feedback);

      console.log(`✅ Workout feedback saved for session ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving workout feedback:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid feedback data", details: error.errors });
      }
      if (error.message === "Workout session not found") {
        return res.status(404).json({ message: "Workout session not found" });
      }
      res.status(500).json({ message: error.message || "Failed to save workout feedback" });
    }
  });

  // Update exercise set
  app.patch("/api/exercise-sets/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    
    try {
      // Custom validation schema for exercise set updates with proper constraints
      const updateSetSchema = z.object({
        weight: z.union([z.number().nonnegative(), z.null()]).optional(), // Allow null for bodyweight
        reps: z.union([z.number().int().positive(), z.null()]).optional(), // Allow null for unlogged
        rpeLogged: z.number().int().min(1).max(10).nullable().optional(),
        completed: z.union([z.literal(0), z.literal(1)]).optional(),
        notes: z.string().nullable().optional(),
        restStartedAt: z.string().datetime().nullable().optional(),
        tempo: z.string().nullable().optional(),
      }).strict(); // Reject unknown fields
      
      const validatedData = updateSetSchema.parse(req.body);
      
      // Ensure at least one field is being updated
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ error: "At least one field must be provided for update" });
      }
      
      // Convert restStartedAt string to Date if present
      const dataToUpdate = {
        ...validatedData,
        restStartedAt: validatedData.restStartedAt ? new Date(validatedData.restStartedAt) : undefined,
      };
      
      const updatedSet = await storage.updateExerciseSet(id, userId, dataToUpdate);
      if (!updatedSet) {
        return res.status(404).json({ error: "Exercise set not found" });
      }
      res.json(updatedSet);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request body", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get last used values for an exercise (weight memory for progressive overload)
  app.get("/api/exercises/:exerciseId/last-values", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { exerciseId } = req.params;
    
    try {
      const lastValues = await storage.getLastExerciseValues(userId, exerciseId);
      res.json(lastValues || { weight: null, reps: null, distance: null, duration: null });
    } catch (error: any) {
      console.error("Error fetching last exercise values:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get progressive overload suggestion for an exercise
  app.get("/api/exercises/:exerciseId/progressive-overload", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { exerciseId } = req.params;
    
    try {
      const suggestion = await storage.calculateProgressiveOverload(userId, exerciseId);
      res.json(suggestion);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get AI-suggested exercise alternatives
  app.get("/api/exercises/:exerciseId/alternatives", isAuthenticated, async (req, res) => {
    const { exerciseId } = req.params;
    const { limit = '3' } = req.query;
    
    try {
      // Get the current exercise
      const currentExercise = await storage.getExerciseById(exerciseId);
      if (!currentExercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }

      // Get all exercises and prefilter for performance
      const allExercises = await storage.getAllExercises();
      
      // Prefilter: Only include exercises that share at least one muscle group
      // This reduces token cost and improves AI response quality
      const candidateExercises = allExercises.filter(e => {
        if (e.id === exerciseId) return false; // Exclude current exercise
        
        // Safety check: Ensure muscles arrays exist and are valid
        if (!Array.isArray(e.muscles) || !Array.isArray(currentExercise.muscles)) {
          return false;
        }
        
        if (e.muscles.length === 0 || currentExercise.muscles.length === 0) {
          return false;
        }
        
        // Check if at least one muscle overlaps
        const hasOverlap = e.muscles.some(muscle => 
          currentExercise.muscles.includes(muscle)
        );
        
        return hasOverlap;
      });

      // If prefiltering left us with too few options, fallback to all exercises
      const otherExercises = candidateExercises.length >= 5 
        ? candidateExercises 
        : allExercises.filter(e => e.id !== exerciseId);

      // Use AI to select the best alternatives
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ 
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const prompt = `Given the following exercise:
Name: ${currentExercise.name}
Muscles: ${Array.isArray(currentExercise.muscles) ? currentExercise.muscles.join(", ") : "unknown"}
Equipment: ${currentExercise.equipment}
Category: ${currentExercise.category}
Difficulty: ${currentExercise.difficulty || "intermediate"}

Suggest ${limit} alternative exercises from this list that work similar muscles and can be used as substitutes:

${otherExercises.map((e, i) => `${i}. ${e.name} (${Array.isArray(e.muscles) ? e.muscles.join(", ") : "unknown"}, ${e.equipment}, ${e.category}, ${e.difficulty || "intermediate"})`).join("\n")}

Return ONLY a JSON array of exercise indices (numbers) from the list above, ordered by how good of an alternative they are. Format: [0, 5, 12]`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content?.trim() || "[]";
      let selectedIndices: number[] = [];
      
      try {
        selectedIndices = JSON.parse(content);
      } catch {
        // Fallback: extract numbers from response
        const matches = content.match(/\d+/g);
        selectedIndices = matches ? matches.map(Number).slice(0, parseInt(limit as string)) : [];
      }

      // Get the suggested exercises
      const alternatives = selectedIndices
        .filter(i => i >= 0 && i < otherExercises.length)
        .map(i => otherExercises[i])
        .slice(0, parseInt(limit as string));

      res.json(alternatives);
    } catch (error: any) {
      console.error("Error getting exercise alternatives:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Swap exercise in a workout session
  app.post("/api/workout-sessions/:sessionId/swap-exercise", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { sessionId } = req.params;
    const { oldExerciseId, newExerciseId } = req.body;

    try {
      const result = await storage.swapExerciseInSession(sessionId, userId, oldExerciseId, newExerciseId);
      res.json(result);
    } catch (error: any) {
      console.error("Error swapping exercise:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Completed Workouts (Last 7 Days)
  app.get("/api/workouts/completed", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const sessions = await storage.getWorkoutSessions(userId, startDate, endDate);
      
      // Transform to match frontend CompletedWorkout interface
      const completedWorkouts = sessions.map(session => ({
        id: session.id,
        date: session.startTime.toISOString(),
        workoutType: session.workoutType,
        duration: session.duration,
        caloriesEstimate: session.calories || 0,
        intensity: estimateIntensity(session.avgHeartRate, session.perceivedEffort)
      }));
      
      res.json(completedWorkouts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Training Analytics Endpoints
  app.get("/api/analytics/training-load", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { days = '30' } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));
      
      const trainingLoad = await storage.getTrainingLoad(userId, startDate, endDate);
      res.json(trainingLoad);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/workout-stats", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { days = '30' } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));
      
      const stats = await storage.getWorkoutStats(userId, startDate, endDate);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/correlations", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { days = '30' } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));
      
      const correlations = await storage.getWorkoutBiomarkerCorrelations(userId, startDate, endDate);
      res.json(correlations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Muscle Group Frequency Analytics
  app.get("/api/analytics/muscle-group-frequency", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { daysBack = '14' } = req.query;
      const frequency = await storage.getMuscleGroupFrequency(userId, parseInt(daysBack as string));
      res.json(frequency);
    } catch (error: any) {
      console.error("Error fetching muscle group frequency:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/muscle-group-engagements", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { days = '30' } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));
      
      const engagements = await storage.getMuscleGroupEngagements(userId, startDate, endDate);
      res.json(engagements);
    } catch (error: any) {
      console.error("Error fetching muscle group engagements:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/recovery-insights", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { days = '30' } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));
      
      const [trainingLoad, workoutStats, correlations] = await Promise.all([
        storage.getTrainingLoad(userId, startDate, endDate),
        storage.getWorkoutStats(userId, startDate, endDate),
        storage.getWorkoutBiomarkerCorrelations(userId, startDate, endDate)
      ]);
      
      // Provide safe defaults if storage returns null/undefined
      const safeTrainingLoad = trainingLoad || { weeklyLoad: 0, monthlyLoad: 0, weeklyHours: 0 };
      const safeWorkoutStats = workoutStats || { totalWorkouts: 0, totalDuration: 0, totalCalories: 0, byType: [] };
      const safeCorrelations = correlations || {
        sleepQuality: { workoutDays: 0, nonWorkoutDays: 0, improvement: 0 },
        restingHR: { workoutDays: 0, nonWorkoutDays: 0, improvement: 0 }
      };
      
      const insights = await generateRecoveryInsights({
        trainingLoad: safeTrainingLoad,
        workoutStats: safeWorkoutStats,
        correlations: safeCorrelations,
        timeframeDays: parseInt(days as string)
      });
      
      res.json(insights);
    } catch (error: any) {
      console.error("Error generating recovery insights:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper function to get unit from metric type
  const getMetricUnit = (metricType: string): string => {
    const metricUnits: Record<string, string> = {
      "weight": "kg",
      "lean-body-mass": "kg",
      "body-fat-percentage": "%",
      "heart-rate": "bpm",
      "blood-pressure": "mmHg",
      "blood-glucose": "mg/dL",
      "cholesterol": "mg/dL",
      "steps": "steps",
      "sleep-hours": "hours",
    };
    return metricUnits[metricType] || "unit";
  };

  // Goals API endpoints
  app.post("/api/goals", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const goalData = req.body;
      
      // Convert deadline string to Date object if present
      if (goalData.deadline) {
        goalData.deadline = new Date(goalData.deadline);
      }
      
      // Auto-derive unit from metricType if not provided
      if (!goalData.unit && goalData.metricType) {
        goalData.unit = getMetricUnit(goalData.metricType);
      }
      
      const goal = await storage.createGoal({
        ...goalData,
        userId,
      });
      res.json(goal);
    } catch (error: any) {
      console.error("Error creating goal:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/goals", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const goals = await storage.getGoals(userId);
      res.json(goals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/goals/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      const goal = await storage.getGoal(id, userId);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/goals/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      const updateData = req.body;
      
      // Convert deadline string to Date object if present
      if (updateData.deadline) {
        updateData.deadline = new Date(updateData.deadline);
      }
      
      // Auto-derive unit from metricType if not provided
      if (!updateData.unit && updateData.metricType) {
        updateData.unit = getMetricUnit(updateData.metricType);
      }
      
      const goal = await storage.updateGoal(id, userId, updateData);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/goals/:id/progress", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    const { currentValue } = req.body;
    try {
      const goal = await storage.updateGoalProgress(id, userId, currentValue);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/goals/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      await storage.deleteGoal(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Exercise Feedback API
  app.post("/api/exercise-feedback", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { exerciseName, feedback, context } = req.body;
      
      if (!exerciseName || !feedback || !['up', 'down'].includes(feedback)) {
        return res.status(400).json({ error: "Invalid request. exerciseName and feedback ('up' or 'down') are required." });
      }
      
      const result = await storage.createExerciseFeedback({
        userId,
        exerciseName,
        feedback,
        context: context || null,
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error saving exercise feedback:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/exercise-feedback", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { limit = '50' } = req.query;
      const feedback = await storage.getExerciseFeedback(userId, parseInt(limit as string));
      res.json(feedback);
    } catch (error: any) {
      console.error("Error fetching exercise feedback:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Insights API endpoints
  app.post("/api/insights/trend-predictions", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { biomarkerType, timeframeWeeks = 4 } = req.body;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90); // Last 90 days of data
      
      const historicalData = await storage.getBiomarkersByTimeRange(userId, biomarkerType, startDate, endDate);
      
      if (historicalData.length < 3) {
        return res.status(400).json({ error: "Insufficient data for prediction. Need at least 3 data points." });
      }
      
      const prediction = await generateTrendPredictions({
        biomarkerType,
        historicalData: historicalData.map(b => ({ value: b.value, date: b.recordedAt })),
        timeframeWeeks,
      });
      
      res.json(prediction);
    } catch (error: any) {
      console.error("Error generating trend prediction:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/insights/period-comparison", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { metricType, period1Start, period1End, period2Start, period2End } = req.body;
      
      const p1Start = new Date(period1Start);
      const p1End = new Date(period1End);
      const p2Start = new Date(period2Start);
      const p2End = new Date(period2End);
      
      const [period1Data, period2Data] = await Promise.all([
        storage.getBiomarkersByTimeRange(userId, metricType, p1Start, p1End),
        storage.getBiomarkersByTimeRange(userId, metricType, p2Start, p2End),
      ]);
      
      if (period1Data.length === 0 || period2Data.length === 0) {
        return res.status(400).json({ error: "Insufficient data in one or both periods." });
      }
      
      const comparison = await generatePeriodComparison({
        metricType,
        period1: { start: p1Start, end: p1End, data: period1Data },
        period2: { start: p2Start, end: p2End, data: period2Data },
      });
      
      res.json(comparison);
    } catch (error: any) {
      console.error("Error generating period comparison:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recommendations/generate", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Get all biomarkers and filter to most recent value per type to reduce token usage
      const allBiomarkers = await storage.getBiomarkers(userId);
      
      // Group by type and keep only the most recent value per type
      const biomarkersByType = new Map<string, any>();
      allBiomarkers.forEach(biomarker => {
        const existing = biomarkersByType.get(biomarker.type);
        if (!existing || new Date(biomarker.recordedAt) > new Date(existing.recordedAt)) {
          biomarkersByType.set(biomarker.type, biomarker);
        }
      });
      
      // Also include previous value for each type for trend analysis
      const biomarkersWithTrends: any[] = [];
      Array.from(biomarkersByType.entries()).forEach(([type, latest]) => {
        // Add the latest value
        biomarkersWithTrends.push(latest);
        
        // Find the second most recent value for trend analysis
        const typeValues = allBiomarkers
          .filter(b => b.type === type && b.id !== latest.id)
          .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        
        if (typeValues.length > 0) {
          biomarkersWithTrends.push(typeValues[0]); // Add second most recent
        }
      });
      
      // Limit chat context to last 10 messages to reduce tokens
      const chatHistory = await storage.getChatMessages(userId);
      const recentChatHistory = chatHistory.slice(-10);
      const chatContext = recentChatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Get recent sleep sessions (last 7 days instead of 30 to reduce tokens)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sleepSessions = await storage.getSleepSessions(userId, sevenDaysAgo, new Date());
      
      // Get recent AI insights for context
      const recentInsights = await storage.getInsights(userId, 10);
      
      const recommendations = await generateHealthRecommendations({
        biomarkers: biomarkersWithTrends,
        sleepSessions,
        recentInsights,
        healthGoals: req.body.healthGoals || [],
        chatContext
      });
      
      const savedRecs = [];
      for (const rec of recommendations) {
        const saved = await storage.createRecommendation({
          ...rec,
          userId,
        });
        savedRecs.push(saved);
      }
      
      res.json(savedRecs);
    } catch (error: any) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recommendations", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const recommendations = await storage.getRecommendations(userId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/recommendations/:id/dismiss", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { id } = req.params;
      await storage.dismissRecommendation(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recommendations/:id/complete", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { id } = req.params;
      
      // Get the recommendation
      const recommendations = await storage.getRecommendations(userId);
      const recommendation = recommendations.find(r => r.id === id);
      
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      // Extract workout type from title or category
      const workoutType = recommendation.category?.toLowerCase() || 
                         (recommendation.title.toLowerCase().includes('cardio') ? 'cardio' :
                          recommendation.title.toLowerCase().includes('strength') ? 'strength' :
                          recommendation.title.toLowerCase().includes('yoga') ? 'yoga' :
                          recommendation.title.toLowerCase().includes('hiit') ? 'hiit' :
                          recommendation.title.toLowerCase().includes('mobility') ? 'mobility' :
                          recommendation.title.toLowerCase().includes('stretching') ? 'stretching' :
                          'other');

      // Estimate duration based on workout type (default 45 minutes)
      const estimatedDuration = workoutType === 'hiit' ? 30 : 
                                workoutType === 'yoga' ? 60 :
                                workoutType === 'mobility' ? 20 :
                                workoutType === 'stretching' ? 15 : 45;

      // Estimate perceived effort based on workout type (for intensity calculation)
      const estimatedEffort = workoutType === 'hiit' ? 8 :
                              workoutType === 'strength' ? 7 :
                              workoutType === 'cardio' ? 6 :
                              workoutType === 'yoga' ? 4 :
                              workoutType === 'mobility' ? 3 :
                              workoutType === 'stretching' ? 2 : 5;

      const now = new Date();
      const startTime = new Date(now.getTime() - estimatedDuration * 60 * 1000);

      // Create workout session entry with estimated effort for intensity calculation
      await storage.createWorkoutSession({
        userId,
        workoutType,
        sessionType: 'workout',
        startTime,
        endTime: now,
        duration: estimatedDuration,
        sourceType: 'manual',
        trainingScheduleId: recommendation.trainingScheduleId || undefined,
        notes: recommendation.description,
        perceivedEffort: estimatedEffort,
      });

      // Dismiss the recommendation
      await storage.dismissRecommendation(id, userId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error completing recommendation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recommendations/:id/schedule", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { id } = req.params;
      const { date, action } = req.body;

      if (!date || !action || !['add', 'replace'].includes(action)) {
        return res.status(400).json({ error: "Invalid request. Provide date and action (add/replace)" });
      }

      const targetDate = new Date(date);
      const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      let trainingScheduleId: string | null = null;

      if (action === 'replace') {
        // Find optional/recovery workout for that day to replace
        const schedules = await storage.getTrainingSchedules(userId);
        const replaceableWorkout = schedules.find(s => 
          s.day === dayOfWeek && 
          (s.isOptional === 1 || s.coreProgram === 0)
        );

        if (replaceableWorkout) {
          // Delete the optional workout to make room for recommendation
          await storage.updateTrainingSchedule(replaceableWorkout.id, userId, { 
            completed: 1, 
            completedAt: new Date() 
          });
          trainingScheduleId = replaceableWorkout.id;
        } else {
          return res.status(400).json({ 
            error: "No optional or recovery workout found for that day. Core workouts cannot be replaced." 
          });
        }
      }

      // Mark recommendation as scheduled
      await storage.scheduleRecommendation(id, userId, targetDate, trainingScheduleId);
      
      res.json({ 
        success: true, 
        action,
        scheduledFor: targetDate,
        replacedWorkoutId: trainingScheduleId 
      });
    } catch (error: any) {
      console.error("Error scheduling recommendation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recommendations/:id/feedback", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { id } = req.params;
      const { feedback, reason } = req.body;

      if (!feedback || !['positive', 'negative'].includes(feedback)) {
        return res.status(400).json({ error: "Invalid feedback. Must be 'positive' or 'negative'" });
      }

      await storage.recordRecommendationFeedback(id, userId, feedback, reason);
      
      res.json({ success: true, feedback });
    } catch (error: any) {
      console.error("Error recording recommendation feedback:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recommendations/scheduled", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const recommendations = await storage.getScheduledRecommendations(userId);
      res.json(recommendations);
    } catch (error: any) {
      console.error("Error fetching scheduled recommendations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recommendations/today", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const today = new Date();
      const recommendations = await storage.getTodayScheduledRecommendations(userId, today);
      res.json(recommendations);
    } catch (error: any) {
      console.error("Error fetching today's scheduled recommendations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/recommendations/:id/reschedule", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { id } = req.params;
      const { date } = req.body;

      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }

      const newDate = new Date(date);
      await storage.rescheduleRecommendation(id, userId, newDate);
      
      res.json({ success: true, scheduledFor: newDate });
    } catch (error: any) {
      console.error("Error rescheduling recommendation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/insights/generate", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const userSettings = await storage.getUserSettings(userId);
      const timezone = userSettings.timezone || 'UTC';
      
      // Get last 7 days of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const biomarkers = await storage.getBiomarkers(userId);
      const sleepSessions = await storage.getSleepSessions(userId, startDate, endDate);
      const chatHistory = await storage.getChatMessages(userId);
      const chatContext = chatHistory.slice(-10).map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Fetch active goals to provide goal-driven insights
      const allGoals = await storage.getGoals(userId);
      const activeGoals = allGoals.filter(goal => goal.status === 'active');
      
      const insights = await generateDailyInsights({
        biomarkers: biomarkers.slice(0, 50), // Last 50 biomarkers
        sleepSessions,
        chatContext,
        timezone,
        activeGoals
      });
      
      const savedInsights = [];
      for (const insight of insights) {
        const saved = await storage.createInsight({
          ...insight,
          userId,
          relevantDate: new Date(),
        });
        savedInsights.push(saved);
      }
      
      res.json(savedInsights);
    } catch (error: any) {
      console.error("Error generating insights:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/insights/daily", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const insights = await storage.getDailyInsights(userId, date);
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/insights", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const insights = await storage.getInsights(userId, limit);
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/insights/:id/dismiss", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { id } = req.params;
      await storage.dismissInsight(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Insight feedback endpoint
  app.post("/api/insights/feedback", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { insightId, feedback } = req.body;
      
      if (!insightId || !feedback) {
        return res.status(400).json({ error: "insightId and feedback are required" });
      }

      if (feedback !== 'thumbs_up' && feedback !== 'thumbs_down') {
        return res.status(400).json({ error: "feedback must be 'thumbs_up' or 'thumbs_down'" });
      }

      await storage.createInsightFeedback({
        userId,
        insightId,
        feedback,
        context: null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving insight feedback:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Schedule an insight
  app.post("/api/insights/schedule", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const { insightId, frequency, scheduledDates } = req.body;
      
      if (!insightId || !frequency) {
        return res.status(400).json({ error: "insightId and frequency are required" });
      }

      // Get the original insight to extract details
      const insights = await storage.getInsights(userId, 100);
      const originalInsight = insights.find(i => i.id === insightId);
      
      if (!originalInsight) {
        return res.status(404).json({ error: "Insight not found" });
      }

      // Calculate scheduled dates based on frequency
      let dates: string[] = [];
      if (frequency === 'custom' && scheduledDates) {
        dates = scheduledDates;
      } else if (frequency === 'one_time') {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dates = [`${year}-${month}-${day}`];
      } else if (frequency === 'after_workout') {
        dates = [];
      } else {
        dates = calculateScheduledDates(frequency);
      }

      // Create scheduled insight
      const scheduledInsight = await storage.createScheduledInsight({
        userId,
        insightId,
        title: originalInsight.title,
        description: originalInsight.description,
        category: originalInsight.category || 'wellness',
        activityType: originalInsight.category || 'general',
        duration: null,
        frequency,
        contextTrigger: frequency === 'after_workout' ? 'after_workout' : null,
        recommendedBy: 'ai',
        reason: originalInsight.description,
        priority: originalInsight.priority || 'medium',
        status: 'scheduled',
        scheduledDates: dates,
        userFeedback: null,
        feedbackNote: null,
      });

      res.json({ success: true, scheduledInsight });
    } catch (error: any) {
      console.error("Error scheduling insight:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get scheduled insights
  app.get("/api/scheduled-insights", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const status = req.query.status as string | undefined;
      const insights = await storage.getScheduledInsights(userId, status);
      res.json(insights);
    } catch (error: any) {
      console.error("Error fetching scheduled insights:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Complete a scheduled insight
  app.post("/api/scheduled-insights/:id/complete", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      await storage.updateScheduledInsight(id, userId, {
        status: 'completed',
        completedAt: new Date(),
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error completing scheduled insight:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get scheduled exercise recommendations (includes both scheduled and completed)
  app.get("/api/scheduled-exercises", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      // Don't filter by status - return all scheduled and completed exercises
      const exercises = await storage.getScheduledExerciseRecommendations(userId);
      res.json(exercises);
    } catch (error: any) {
      console.error("Error fetching scheduled exercises:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Complete a scheduled exercise
  app.post("/api/scheduled-exercises/:id/complete", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      await storage.updateScheduledExerciseRecommendation(id, userId, {
        status: 'completed',
        completedAt: new Date(),
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error completing scheduled exercise:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a scheduled exercise
  app.delete("/api/scheduled-exercises/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      await storage.deleteScheduledExerciseRecommendation(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting scheduled exercise:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a scheduled insight
  app.delete("/api/scheduled-insights/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    try {
      await storage.deleteScheduledInsight(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting scheduled insight:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Proactive Suggestions endpoints
  
  // Check metrics and generate suggestions
  app.post("/api/proactive/check-metrics", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const deficits = await storage.checkUserMetrics(userId);
      res.json({ deficits });
    } catch (error: any) {
      console.error("Error checking metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate proactive suggestion
  app.post("/api/proactive/generate-suggestion", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { metricType, currentValue, targetValue, deficit, priority } = req.body;
    
    try {
      const suggestion = await storage.generateProactiveSuggestion(userId, {
        metricType,
        currentValue,
        targetValue,
        deficit,
        priority
      });
      res.json(suggestion);
    } catch (error: any) {
      console.error("Error generating suggestion:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active suggestions for user
  app.get("/api/proactive/suggestions", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const suggestions = await storage.getActiveSuggestions(userId);
      res.json(suggestions);
    } catch (error: any) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Respond to suggestion (accept/decline)
  app.post("/api/proactive/suggestions/:id/respond", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { id } = req.params;
    const { response, scheduledFor } = req.body; // response: 'accepted' | 'declined'
    
    try {
      const result = await storage.respondToSuggestion(userId, id, response, scheduledFor);
      res.json(result);
    } catch (error: any) {
      console.error("Error responding to suggestion:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Audit Log endpoints
  app.get("/api/ai-actions", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const actions = await storage.getAiActions(userId, limit);
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ai-actions/by-type/:type", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { type } = req.params;
    try {
      const actions = await storage.getAiActionsByType(userId, type);
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", isAuthenticated, checkMessageLimit, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { message, currentPage } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const userMessage = await storage.createChatMessage({
        userId,
        role: "user",
        content: message,
      });
      
      // Increment message count for free tier tracking
      await incrementMessageCount(userId);

      const chatHistory = await storage.getChatMessages(userId);
      
      const conversationHistory = chatHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      // Gather comprehensive context for AI - full user history for complete visibility
      const now = new Date();
      
      // Get ALL biomarkers (no time filter) for complete health history analysis
      const allBiomarkers = await storage.getBiomarkers(userId);
      
      // Get comprehensive insights (increased from 5 to 20)
      const recentInsights = await storage.getInsights(userId, 20);
      
      // Get ALL sleep sessions for complete sleep pattern analysis
      const allSleepSessions = await storage.getSleepSessions(userId);
      
      // Get ALL workout sessions for complete training history
      const allWorkoutSessions = await storage.getWorkoutSessions(userId);
      
      // Get ALL training schedules for complete training plan visibility
      const allTrainingSchedules = await storage.getTrainingSchedules(userId);
      
      // Get historical readiness scores (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const historicalReadiness = await storage.getReadinessScores(userId, thirtyDaysAgo, now);
      
      // Get health records for medical context
      const healthRecords = await storage.getHealthRecords(userId);
      
      // Get supplements for current supplement stack visibility
      const supplements = await storage.getSupplements(userId);
      
      // Get meal plans for nutrition context
      const mealPlans = await storage.getMealPlans(userId);
      
      const user = await storage.getUser(userId);
      
      // Get onboarding status - contextual approach with granular flags
      const onboardingStatus = await storage.getOnboardingStatus(userId);
      const needsBasicInfo = onboardingStatus ? !onboardingStatus.basicInfoComplete : true;
      
      // Fetch ALL goals (not just active) for complete goal visibility
      const allGoals = await storage.getGoals(userId);
      const activeGoals = allGoals.filter(goal => goal.status === 'active');

      // Fetch latest readiness score for training context
      const today = new Date();
      const readinessScore = await storage.getReadinessScoreForDate(userId, today);

      // Fetch downvoted recovery protocols to avoid suggesting them
      const downvotedProtocolIds = await storage.getDownvotedProtocols(userId);
      const downvotedProtocols: string[] = [];
      
      if (downvotedProtocolIds.length > 0) {
        for (const protocolId of downvotedProtocolIds) {
          const protocol = await storage.getRecoveryProtocol(protocolId);
          if (protocol) {
            downvotedProtocols.push(protocol.name);
          }
        }
      }

      // Load user's fitness profile for personalized recommendations
      const fitnessProfile = await storage.getFitnessProfile(userId);
      
      // Load user's nutrition profile for personalized meal recommendations
      const nutritionProfile = await storage.getNutritionProfile(userId);

      // Retrieve relevant coach memories using semantic search
      let relevantMemories: any[] = [];
      try {
        const { generateEmbedding } = await import("./services/embeddings");
        const messageEmbedding = await generateEmbedding(message);
        relevantMemories = await storage.getRelevantMemories(userId, messageEmbedding, 5);
      } catch (memoryError) {
        console.error("Error retrieving memories:", memoryError);
        // Continue without memories if retrieval fails
      }

      const context = {
        // Full biomarker history for complete health analysis
        allBiomarkers,
        
        // Comprehensive insights
        recentInsights,
        
        // Complete sleep history for pattern analysis
        allSleepSessions,
        
        // Full workout history for training analysis
        allWorkoutSessions,
        
        // All training schedules for program visibility
        allTrainingSchedules,
        
        // Historical readiness for trend analysis
        historicalReadiness,
        
        // Health records for medical context
        healthRecords,
        
        // Current supplement stack
        supplements,
        
        // Meal plans for nutrition context
        mealPlans,
        
        // All goals for complete goal management
        allGoals,
        
        // Active goals for current focus
        activeGoals,
        
        // Current page and user info
        currentPage,
        userTimezone: user?.timezone || undefined,
        needsBasicInfo,
        onboardingStatus,
        
        // Today's readiness
        readinessScore: readinessScore || undefined,
        
        // User preferences
        downvotedProtocols: downvotedProtocols.length > 0 ? downvotedProtocols : undefined,
        fitnessProfile: fitnessProfile || undefined,
        nutritionProfile: nutritionProfile || undefined,
        
        // Personal memories for relationship building
        personalMemories: user?.personalContext || undefined,
        
        // Coach memories for personalized context (semantic search)
        coachMemories: relevantMemories.length > 0 ? relevantMemories.map(m => ({
          type: m.memoryType,
          summary: m.summary,
          date: m.createdAt
        })) : undefined,
      };

      const aiResponse = await chatWithHealthCoach(conversationHistory, context);

      // 🐛 DEBUG: Log full AI response to see if markers are being generated
      console.log("🤖 FULL AI RESPONSE (first 1000 chars):", aiResponse.substring(0, 1000));
      console.log("🔍 Searching for SAVE_EXERCISE markers...");

      // Strip all markers from the response before showing to user
      let cleanResponse = aiResponse;
      cleanResponse = cleanResponse.replace(/<<<SAVE_TRAINING_PLAN>>>[\s\S]*?<<<END_SAVE_TRAINING_PLAN>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<SAVE_MEAL_PLAN>>>[\s\S]*?<<<END_SAVE_MEAL_PLAN>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<SAVE_GOAL>>>[\s\S]*?<<<END_SAVE_GOAL>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<SAVE_SUPPLEMENT>>>[\s\S]*?<<<END_SAVE_SUPPLEMENT>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<SAVE_EXERCISE>>>[\s\S]*?<<<END_SAVE_EXERCISE>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<SAVE_RECOVERY_PROTOCOL>>>[\s\S]*?<<<END_SAVE_RECOVERY_PROTOCOL>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<UPDATE_USER_PROFILE>>>[\s\S]*?<<<END_UPDATE_USER_PROFILE>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<UPDATE_FITNESS_PROFILE>>>[\s\S]*?<<<END_UPDATE_FITNESS_PROFILE>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<UPDATE_GOAL>>>[\s\S]*?<<<END_UPDATE_GOAL>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<CREATE_GOAL>>>[\s\S]*?<<<END_CREATE_GOAL>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<UPDATE_BIOMARKER>>>[\s\S]*?<<<END_UPDATE_BIOMARKER>>>/g, '');
      cleanResponse = cleanResponse.replace(/<<<SAVE_PERSONAL_MEMORY>>>[\s\S]*?<<<END_SAVE_PERSONAL_MEMORY>>>/g, '');
      cleanResponse = cleanResponse.trim();

      const assistantMessage = await storage.createChatMessage({
        userId,
        role: "assistant",
        content: cleanResponse,
      });

      // Check if AI response contains a training plan to save
      let trainingPlanSaved = false;
      const trainingPlanMatch = aiResponse.match(/<<<SAVE_TRAINING_PLAN>>>([\s\S]*?)<<<END_SAVE_TRAINING_PLAN>>>/);
      
      if (trainingPlanMatch) {
        console.log("🏋️ Training plan markers found! Extracting JSON...");
        try {
          const trainingPlanJson = trainingPlanMatch[1].trim();
          console.log("📋 Training plan JSON:", trainingPlanJson);
          const trainingPlans = JSON.parse(trainingPlanJson);
          console.log("✅ Parsed training plans:", trainingPlans.length, "workouts");
          
          // Save each workout from the plan
          for (const plan of trainingPlans) {
            console.log("💾 Saving workout:", plan.day, "-", plan.workoutType);
            try {
              const schedule = await storage.createTrainingSchedule({
                userId,
                day: plan.day,
                workoutType: plan.workoutType,
                sessionType: "workout", // Required field - default type is workout
                duration: plan.duration,
                intensity: plan.intensity,
                description: plan.description || null,
                exercises: plan.exercises,
                coreProgram: 1, // AI-generated plans are core programs by default
                completed: 0,
              });
              console.log("✅ Workout saved successfully with ID:", schedule.id);
            } catch (saveError) {
              console.error("❌ Failed to save individual workout:", {
                day: plan.day,
                error: saveError,
                planData: plan
              });
              throw saveError; // Re-throw to trigger outer catch
            }
          }
          
          trainingPlanSaved = true;
          console.log("✨ Training plan saved successfully!");
          
          // Mark training setup as complete when first training plan is saved
          if (onboardingStatus && !onboardingStatus.trainingSetupComplete) {
            await storage.updateOnboardingFlag(userId, 'trainingSetupComplete', true);
          }
        } catch (e) {
          console.error("❌ Failed to parse and save training plan:", e);
          console.error("Raw JSON that failed:", trainingPlanMatch[1].trim());
        }
      } else {
        console.log("ℹ️ No training plan markers found in AI response");
      }

      // Check if AI response contains a meal plan to save
      let mealPlanSaved = false;
      const mealPlanMatch = aiResponse.match(/<<<SAVE_MEAL_PLAN>>>([\s\S]*?)<<<END_SAVE_MEAL_PLAN>>>/);
      
      if (mealPlanMatch) {
        console.log("🍽️ Meal plan markers found! Extracting JSON...");
        try {
          const mealPlanJson = mealPlanMatch[1].trim();
          console.log("📋 Meal plan JSON:", mealPlanJson);
          const mealPlans = JSON.parse(mealPlanJson);
          console.log("✅ Parsed meal plans:", mealPlans.length, "meals");
          
          // Save each meal from the plan
          for (const plan of mealPlans) {
            // Use 'meal' or 'name' field for meal name (AI might use either)
            const mealName = plan.name || plan.meal || "Meal Plan";
            console.log("💾 Saving meal:", mealName);
            await storage.createMealPlan({
              userId,
              name: mealName,
              description: plan.description || null,
              mealType: plan.mealType || "Meal",
              calories: plan.calories || 0,
              protein: plan.protein || 0,
              carbs: plan.carbs || 0,
              fat: plan.fat || 0,
              prepTime: plan.prepTime || 30,
              recipe: plan.recipe || JSON.stringify(plan.items || []),
              tags: plan.tags || [],
            });
          }
          
          mealPlanSaved = true;
          console.log("✨ Meal plan saved successfully!");
          
          // Mark meals setup as complete when first meal plan is saved
          if (onboardingStatus && !onboardingStatus.mealsSetupComplete) {
            await storage.updateOnboardingFlag(userId, 'mealsSetupComplete', true);
          }
        } catch (e) {
          console.error("❌ Failed to parse and save meal plan:", e);
        }
      } else {
        console.log("ℹ️ No meal plan markers found in AI response");
      }

      // Check if AI response contains a goal to save
      let goalSaved = false;
      const goalMatch = aiResponse.match(/<<<SAVE_GOAL>>>([\s\S]*?)<<<END_SAVE_GOAL>>>/);
      
      if (goalMatch) {
        console.log("🎯 Goal markers found! Extracting JSON...");
        try {
          const goalJson = goalMatch[1].trim();
          console.log("📋 Goal JSON:", goalJson);
          const parsedData = JSON.parse(goalJson);
          
          // Normalize to array (AI might send single object or array)
          const goalDataArray = Array.isArray(parsedData) ? parsedData : [parsedData];
          console.log("✅ Parsed goals:", goalDataArray.length);
          
          // Process each goal
          for (const goalData of goalDataArray) {
            console.log("💾 Processing goal:", goalData.metricType);
            
            // Fetch latest biomarker value to auto-populate start and current values
            // If biomarker lookup fails, use AI-provided values or null
            let startValue = goalData.startValue ?? null;
            let currentValue = goalData.currentValue ?? null;
            
            try {
              const latestBiomarker = await storage.getLatestBiomarkerByType(userId, goalData.metricType);
              if (latestBiomarker) {
                // Override with latest biomarker data (more current than AI-provided values)
                startValue = latestBiomarker.value;
                currentValue = latestBiomarker.value;
                console.log(`📊 Auto-populated from latest ${goalData.metricType}: ${latestBiomarker.value}`);
              }
            } catch (e) {
              console.log("⚠️ Could not fetch latest biomarker, using AI-provided or null values");
            }
            
            // Convert deadline string to Date object
            const deadline = typeof goalData.deadline === 'string' 
              ? new Date(goalData.deadline) 
              : goalData.deadline;
            
            // Auto-derive unit from metricType
            const unit = getMetricUnit(goalData.metricType);
            
            // Create the goal with auto-populated values
            await storage.createGoal({
              userId,
              metricType: goalData.metricType,
              targetValue: goalData.targetValue,
              startValue,
              currentValue,
              deadline,
              unit,
              createdByAI: 1, // Mark as AI-created
            });
            
            goalSaved = true;
          }
          
          console.log("✨ Goal(s) saved successfully!");
        } catch (e) {
          console.error("❌ Failed to parse and save goal:", e);
        }
      } else {
        console.log("ℹ️ No goal markers found in AI response");
      }

      // Check if AI response contains supplement recommendations to save
      let supplementSaved = false;
      const supplementMatch = aiResponse.match(/<<<SAVE_SUPPLEMENT>>>([\s\S]*?)<<<END_SAVE_SUPPLEMENT>>>/);
      
      if (supplementMatch) {
        console.log("💊 Supplement markers found! Extracting JSON...");
        try {
          const supplementJson = supplementMatch[1].trim();
          console.log("📋 Supplement JSON:", supplementJson);
          const supplements = JSON.parse(supplementJson);
          
          // Normalize to array (AI might send single object or array)
          const supplementArray = Array.isArray(supplements) ? supplements : [supplements];
          console.log("✅ Parsed supplements:", supplementArray.length);
          
          // Process each supplement recommendation
          for (const supp of supplementArray) {
            console.log("💾 Saving supplement recommendation:", supp.supplementName);
            
            await storage.createSupplementRecommendation({
              userId,
              supplementName: supp.supplementName,
              dosage: supp.dosage,
              reason: supp.reason,
              biomarkerLinked: supp.biomarkerLinked || null,
              status: 'pending',
            });
            
            supplementSaved = true;
          }
          
          console.log("✨ Supplement recommendation(s) saved successfully!");
        } catch (e) {
          console.error("❌ Failed to parse and save supplement recommendations:", e);
        }
      } else {
        console.log("ℹ️ No supplement markers found in AI response");
      }

      // Check if AI response contains exercise recommendations to save
      let exerciseSaved = false;
      const exerciseMatches = [...aiResponse.matchAll(/<<<SAVE_EXERCISE>>>([\s\S]*?)<<<END_SAVE_EXERCISE>>>/g)];
      
      if (exerciseMatches.length > 0) {
        console.log(`🏃 Exercise markers found! Found ${exerciseMatches.length} exercise(s) to save...`);
        
        for (const exerciseMatch of exerciseMatches) {
          try {
            const exerciseJson = exerciseMatch[1].trim();
            console.log("📋 Exercise JSON:", exerciseJson);
            const exercise = JSON.parse(exerciseJson);
            
            // Classify exercise: workout (training plan) vs recovery (schedule calendar)
            // Recovery types: mobility, stretching, yoga, sauna, cold plunge, meditation, etc.
            const exerciseTypeLower = (exercise.exerciseType || '').toLowerCase();
            const exerciseNameLower = (exercise.exerciseName || '').toLowerCase();
            
            const recoveryTypes = ['mobility', 'stretching', 'recovery', 'yoga', 'sauna', 'cold_plunge', 'cold plunge', 'meditation', 'foam_rolling', 'ice_bath', 'ice bath'];
            const isRecoveryActivity = recoveryTypes.includes(exerciseTypeLower) || 
                                      exerciseNameLower.includes('sauna') || 
                                      exerciseNameLower.includes('cold plunge') || 
                                      exerciseNameLower.includes('ice bath') ||
                                      exerciseNameLower.includes('meditation') ||
                                      exerciseNameLower.includes('foam roll');
            
            console.log("🔍 Exercise type:", exercise.exerciseType, "| Is recovery:", isRecoveryActivity);
            
            if (isRecoveryActivity) {
              // Recovery activities go to schedule calendar (scheduled_exercise_recommendations)
              console.log("🧘 Routing to schedule calendar (recovery)");
              
              const intent = exercise.intent || 'proactive_insight';
              const isUserTask = intent === 'user_task' && exercise.scheduledDates && Array.isArray(exercise.scheduledDates) && exercise.scheduledDates.length > 0;
              
              const createdExercise = await storage.createScheduledExerciseRecommendation({
                userId,
                exerciseName: exercise.exerciseName,
                exerciseType: exercise.exerciseType,
                description: exercise.description,
                duration: exercise.duration || null,
                frequency: exercise.frequency,
                recommendedBy: 'ai',
                reason: exercise.reason,
                isSupplementary: 1,
                intent: intent,
                status: isUserTask ? 'scheduled' : 'pending',
                scheduledDates: isUserTask ? exercise.scheduledDates : null,
                userFeedback: isUserTask ? 'accepted_auto' : null,
                declineReason: null,
              });
              
              if (isUserTask) {
                await storage.autoScheduleUserTaskExercise(createdExercise.id, userId, exercise.scheduledDates);
                console.log("✨ Recovery activity auto-scheduled in schedule calendar!");
              }
            } else {
              // Workout exercises go to training plan (trainingSchedules)
              console.log("💪 Routing to workout plan (exercise)");
              
              // Parse scheduled date from scheduledDates array (normalize string to Date)
              let scheduledDate: Date | undefined;
              if (exercise.scheduledDates && Array.isArray(exercise.scheduledDates) && exercise.scheduledDates.length > 0) {
                const dateStr = exercise.scheduledDates[0];
                scheduledDate = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
                console.log("📅 Parsed scheduled date:", scheduledDate);
              }
              
              await storage.saveWorkoutExerciseFromAI(userId, {
                exerciseName: exercise.exerciseName,
                exerciseType: exercise.exerciseType,
                description: exercise.description,
                duration: exercise.duration,
                scheduledDate,
                intensity: exercise.intensity || 'moderate',
              });
              
              console.log("✨ Workout exercise saved to training plan!");
            }
            
            exerciseSaved = true;
            console.log("✨ Exercise saved successfully!");
          } catch (e) {
            console.error("❌ Failed to parse and save exercise:", e);
          }
        }
      } else {
        console.log("ℹ️ No exercise markers found in AI response");
      }

      // Check if AI response contains recovery protocol to save
      let recoveryProtocolSaved = false;
      const recoveryProtocolMatch = aiResponse.match(/<<<SAVE_RECOVERY_PROTOCOL>>>([\s\S]*?)<<<END_SAVE_RECOVERY_PROTOCOL>>>/);
      
      if (recoveryProtocolMatch) {
        console.log("🧘 Recovery protocol markers found! Extracting JSON...");
        try {
          const protocolJson = recoveryProtocolMatch[1].trim();
          console.log("📋 Recovery protocol JSON:", protocolJson);
          const protocol = JSON.parse(protocolJson);
          
          console.log("💾 Saving recovery protocol:", protocol.name);
          
          await storage.createRecoveryProtocol({
            name: protocol.name,
            category: protocol.category,
            description: protocol.description,
            duration: protocol.duration || null,
            difficulty: protocol.difficulty || 'beginner',
            benefits: protocol.benefits || [],
            instructions: protocol.instructions || null,
            targetFactors: protocol.targetFactors || [],
            tags: protocol.tags || [],
          });
          
          recoveryProtocolSaved = true;
          console.log("✨ Recovery protocol saved successfully!");
        } catch (e) {
          console.error("❌ Failed to parse and save recovery protocol:", e);
        }
      } else {
        console.log("ℹ️ No recovery protocol markers found in AI response");
      }

      // Check if AI response contains fitness profile updates
      let fitnessProfileUpdated = false;
      const fitnessProfileMatch = aiResponse.match(/<<<UPDATE_FITNESS_PROFILE>>>([\s\S]*?)<<<END_UPDATE_FITNESS_PROFILE>>>/);
      
      if (fitnessProfileMatch) {
        console.log("💪 Fitness profile update markers found! Extracting JSON...");
        try {
          const profileJson = fitnessProfileMatch[1].trim();
          console.log("📋 Fitness profile JSON:", profileJson);
          const profileData = JSON.parse(profileJson);
          
          // Get existing profile to merge with updates
          const existingProfile = await storage.getFitnessProfile(userId);
          
          // Merge new data with existing profile (partial updates)
          const mergedProfile = {
            userId,
            fitnessLevel: profileData.fitnessLevel ?? existingProfile?.fitnessLevel ?? 'intermediate',
            trainingExperience: profileData.trainingExperience ?? existingProfile?.trainingExperience ?? null,
            currentTrainingFrequency: profileData.currentTrainingFrequency ?? existingProfile?.currentTrainingFrequency ?? null,
            // Handle hasGymAccess with backward compatibility for gymAccess boolean
            hasGymAccess: profileData.hasGymAccess !== undefined 
              ? profileData.hasGymAccess 
              : profileData.gymAccess !== undefined 
                ? (profileData.gymAccess ? 1 : 0) 
                : existingProfile?.hasGymAccess ?? 0,
            gymType: profileData.gymType ?? existingProfile?.gymType ?? null,
            homeEquipment: profileData.homeEquipment ?? profileData.equipment ?? existingProfile?.homeEquipment ?? [],
            specialFacilities: profileData.specialFacilities ?? existingProfile?.specialFacilities ?? [],
            recoveryEquipment: profileData.recoveryEquipment ?? existingProfile?.recoveryEquipment ?? [],
            primaryGoal: profileData.primaryGoal ?? profileData.goal ?? existingProfile?.primaryGoal ?? null,
            secondaryGoals: profileData.secondaryGoals ?? profileData.goals ?? existingProfile?.secondaryGoals ?? [],
            preferredWorkoutTypes: profileData.preferredWorkoutTypes ?? profileData.workoutPreferences ?? existingProfile?.preferredWorkoutTypes ?? [],
            preferredDuration: profileData.preferredDuration ?? existingProfile?.preferredDuration ?? null,
            preferredIntensity: profileData.preferredIntensity ?? existingProfile?.preferredIntensity ?? null,
            availableDays: profileData.availableDays ?? existingProfile?.availableDays ?? [],
            injuries: profileData.injuries ?? existingProfile?.injuries ?? [],
            limitations: profileData.limitations ?? existingProfile?.limitations ?? [],
            medicalConditions: profileData.medicalConditions ?? existingProfile?.medicalConditions ?? [],
          };
          
          // Validate with Zod schema
          const validation = insertFitnessProfileSchema.safeParse(mergedProfile);
          
          if (!validation.success) {
            console.error("❌ Fitness profile validation failed:", validation.error.errors);
            throw new Error("Invalid fitness profile data from AI");
          }
          
          console.log("💾 Updating fitness profile with validated data...");
          await storage.upsertFitnessProfile(validation.data);
          
          fitnessProfileUpdated = true;
          console.log("✨ Fitness profile updated successfully!");
        } catch (e) {
          console.error("❌ Failed to parse and update fitness profile:", e);
        }
      } else {
        console.log("ℹ️ No fitness profile update markers found in AI response");
      }

      // Check if AI response contains user profile updates
      let userProfileUpdated = false;
      const userProfileMatch = aiResponse.match(/<<<UPDATE_USER_PROFILE>>>([\s\S]*?)<<<END_UPDATE_USER_PROFILE>>>/);
      
      if (userProfileMatch) {
        console.log("👤 User profile update markers found! Extracting JSON...");
        try {
          const profileJson = userProfileMatch[1].trim();
          console.log("📋 User profile JSON:", profileJson);
          const profileData = JSON.parse(profileJson);
          
          // Prepare update data - only include fields that are provided
          const updateData: any = {};
          
          if (profileData.dateOfBirth) {
            updateData.dateOfBirth = new Date(profileData.dateOfBirth);
          }
          if (profileData.height !== undefined) {
            updateData.height = Number(profileData.height);
          }
          if (profileData.gender) {
            updateData.gender = profileData.gender;
          }
          if (profileData.activityLevel) {
            updateData.activityLevel = profileData.activityLevel;
          }
          
          console.log("💾 Updating user profile with validated data...");
          await storage.updateUserProfile(userId, updateData);
          
          // Mark basic info as complete if we have key fields
          if (profileData.dateOfBirth || profileData.height || profileData.gender || profileData.activityLevel) {
            await storage.updateOnboardingFlag(userId, 'basicInfoComplete', true);
          }
          
          userProfileUpdated = true;
          console.log("✨ User profile updated successfully!");
        } catch (e) {
          console.error("❌ Failed to parse and update user profile:", e);
        }
      } else {
        console.log("ℹ️ No user profile update markers found in AI response");
      }

      // Check if AI response contains goal update instructions
      let goalUpdated = false;
      const updateGoalMatch = aiResponse.match(/<<<UPDATE_GOAL>>>([\s\S]*?)<<<END_UPDATE_GOAL>>>/);
      
      if (updateGoalMatch) {
        console.log("🎯 Goal update markers found! Extracting JSON...");
        try {
          const updateJson = updateGoalMatch[1].trim();
          const updateData = JSON.parse(updateJson);
          
          // Get the goal before update for audit trail
          let goalBefore;
          let goalId = updateData.goalId;
          
          // Handle "existing" goalId by finding the goal based on context
          if (goalId === 'existing') {
            console.log("📌 Resolving 'existing' goalId based on target type or metric...");
            const allGoals = await storage.getGoals(userId);
            
            // Try to find by metric type if provided
            if (updateData.metricType) {
              goalBefore = allGoals.find(g => g.metricType === updateData.metricType && g.status === 'active');
            } else if (updateData.targetValue !== undefined) {
              // If we have target_type info, try to match weight/steps/etc
              // Look for weight goal if updating weight
              goalBefore = allGoals.find(g => 
                (g.metricType === 'weight' || g.metricType === 'steps') && g.status === 'active'
              );
            }
            
            if (!goalBefore && allGoals.length > 0) {
              // Fallback: use the most recent active goal
              goalBefore = allGoals.filter(g => g.status === 'active').sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
            }
            
            if (goalBefore) {
              goalId = goalBefore.id;
              console.log(`✅ Resolved 'existing' to goal ID: ${goalId}`);
            }
          } else {
            goalBefore = await storage.getGoal(goalId, userId);
          }
          
          if (goalBefore && goalId) {
            // Update goal with new data
            const updatedGoal = await storage.updateGoal(goalId, userId, {
              targetValue: updateData.targetValue ?? goalBefore.targetValue,
              currentValue: updateData.currentValue ?? goalBefore.currentValue,
              status: updateData.status ?? goalBefore.status,
              notes: updateData.notes ?? goalBefore.notes,
            });
            
            if (updatedGoal) {
              // Log to audit trail
              await storage.createAiAction({
                userId,
                actionType: 'UPDATE_GOAL',
                targetTable: 'goals',
                targetId: goalId,
                changesBefore: goalBefore,
                changesAfter: updatedGoal,
                reasoning: updateData.reasoning || 'AI updated goal based on user conversation',
                conversationContext: message,
                success: 1,
              });
              
              goalUpdated = true;
              console.log("✨ Goal updated and logged to audit trail!");
            }
          } else {
            console.error("❌ Could not find goal to update");
          }
        } catch (e) {
          console.error("❌ Failed to update goal:", e);
          await storage.createAiAction({
            userId,
            actionType: 'UPDATE_GOAL',
            targetTable: 'goals',
            targetId: null,
            changesBefore: null,
            changesAfter: null,
            reasoning: 'Failed to update goal',
            conversationContext: message,
            success: 0,
            errorMessage: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // Check if AI response contains new goal creation
      let goalCreated = false;
      const createGoalMatch = aiResponse.match(/<<<CREATE_GOAL>>>([\s\S]*?)<<<END_CREATE_GOAL>>>/);
      
      if (createGoalMatch) {
        console.log("🎯 Goal creation markers found! Extracting JSON...");
        try {
          const goalJson = createGoalMatch[1].trim();
          const goalData = JSON.parse(goalJson);
          
          // Create new goal
          const newGoal = await storage.createGoal({
            userId,
            metricType: goalData.metricType,
            targetValue: goalData.targetValue,
            currentValue: goalData.currentValue ?? null,
            startValue: goalData.startValue ?? goalData.currentValue ?? null,
            unit: goalData.unit,
            deadline: new Date(goalData.deadline),
            status: 'active',
            notes: goalData.notes || null,
          });
          
          // Log to audit trail
          await storage.createAiAction({
            userId,
            actionType: 'CREATE_GOAL',
            targetTable: 'goals',
            targetId: newGoal.id,
            changesBefore: null,
            changesAfter: newGoal,
            reasoning: goalData.reasoning || 'AI created goal based on user conversation',
            conversationContext: message,
            success: 1,
          });
          
          goalCreated = true;
          console.log("✨ Goal created and logged to audit trail!");
        } catch (e) {
          console.error("❌ Failed to create goal:", e);
          await storage.createAiAction({
            userId,
            actionType: 'CREATE_GOAL',
            targetTable: 'goals',
            targetId: null,
            changesBefore: null,
            changesAfter: null,
            reasoning: 'Failed to create goal',
            conversationContext: message,
            success: 0,
            errorMessage: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // Check if AI response contains biomarker update
      let biomarkerUpdated = false;
      const updateBiomarkerMatch = aiResponse.match(/<<<UPDATE_BIOMARKER>>>([\s\S]*?)<<<END_UPDATE_BIOMARKER>>>/);
      
      if (updateBiomarkerMatch) {
        console.log("📊 Biomarker update markers found! Extracting JSON...");
        try {
          const updateJson = updateBiomarkerMatch[1].trim();
          const updateData = JSON.parse(updateJson);
          
          // Find the biomarker to update
          const biomarkers = await storage.getBiomarkers(userId, updateData.type);
          const biomarkerToUpdate = biomarkers.find(b => 
            b.id === updateData.biomarkerId || 
            (new Date(b.recordedAt).toDateString() === new Date(updateData.recordedAt).toDateString() && b.type === updateData.type)
          );
          
          if (biomarkerToUpdate) {
            const biomarkerBefore = { ...biomarkerToUpdate };
            
            // Update the biomarker with corrected values
            const updatedBiomarker = await storage.updateBiomarker(
              biomarkerToUpdate.id,
              userId,
              {
                type: updateData.type ?? biomarkerToUpdate.type,
                value: updateData.value ?? biomarkerToUpdate.value,
                unit: updateData.unit ?? biomarkerToUpdate.unit,
                recordedAt: updateData.recordedAt ? new Date(updateData.recordedAt) : biomarkerToUpdate.recordedAt,
                source: updateData.source ?? biomarkerToUpdate.source,
              }
            );
            
            if (updatedBiomarker) {
              // Log to audit trail
              await storage.createAiAction({
                userId,
                actionType: 'UPDATE_BIOMARKER',
                targetTable: 'biomarkers',
                targetId: updatedBiomarker.id,
                changesBefore: biomarkerBefore,
                changesAfter: updatedBiomarker,
                reasoning: updateData.reasoning || 'AI updated biomarker based on user conversation',
                conversationContext: message,
                success: 1,
              });
              
              biomarkerUpdated = true;
              console.log("✨ Biomarker updated and logged to audit trail!");
            }
          }
        } catch (e) {
          console.error("❌ Failed to update biomarker:", e);
          await storage.createAiAction({
            userId,
            actionType: 'UPDATE_BIOMARKER',
            targetTable: 'biomarkers',
            targetId: null,
            changesBefore: null,
            changesAfter: null,
            reasoning: 'Failed to update biomarker',
            conversationContext: message,
            success: 0,
            errorMessage: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // Check if AI response contains personal memory to save
      let personalMemorySaved = false;
      const saveMemoryMatch = aiResponse.match(/<<<SAVE_PERSONAL_MEMORY>>>([\s\S]*?)<<<END_SAVE_PERSONAL_MEMORY>>>/);
      
      if (saveMemoryMatch) {
        console.log("🧠 Personal memory markers found! Extracting JSON...");
        try {
          const memoryJson = saveMemoryMatch[1].trim();
          const memoryData = JSON.parse(memoryJson);
          
          // Get current user's personal context
          const currentUser = await storage.getUserById(userId);
          const currentMemories = currentUser?.personalContext as any[] || [];
          
          // Add new memory with timestamp and ID
          const newMemory = {
            id: `mem-${Date.now()}`,
            category: memoryData.category,
            memory: memoryData.memory,
            context: memoryData.context,
            emotionalWeight: memoryData.emotionalWeight,
            savedAt: new Date().toISOString(),
          };
          
          // Add to memories array
          const updatedMemories = [...currentMemories, newMemory];
          
          // Update user's personal context
          await storage.updateUser(userId, {
            personalContext: updatedMemories as any,
          });
          
          // Log to audit trail
          await storage.createAiAction({
            userId,
            actionType: 'SAVE_PERSONAL_MEMORY',
            targetTable: 'users',
            targetId: userId,
            changesBefore: { personalContext: currentMemories },
            changesAfter: { personalContext: updatedMemories },
            reasoning: memoryData.reasoning || 'AI saved personal memory to build relationship',
            conversationContext: message,
            success: 1,
          });
          
          personalMemorySaved = true;
          console.log("✨ Personal memory saved and logged to audit trail!");
        } catch (e) {
          console.error("❌ Failed to save personal memory:", e);
          await storage.createAiAction({
            userId,
            actionType: 'SAVE_PERSONAL_MEMORY',
            targetTable: 'users',
            targetId: userId,
            changesBefore: null,
            changesAfter: null,
            reasoning: 'Failed to save personal memory',
            conversationContext: message,
            success: 0,
            errorMessage: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // Contextual onboarding - no automatic step progression
      // Each section handles its own completion flag when relevant data is saved
      
      // Detect if contextual onboarding was triggered for UI clearing
      const contextualOnboardingTriggered = 
        currentPage && onboardingStatus && (
          (currentPage === 'Training' && !onboardingStatus.trainingSetupComplete) ||
          (currentPage === 'Meal Plans' && !onboardingStatus.mealsSetupComplete) ||
          (currentPage === 'Biomarkers' && !onboardingStatus.biomarkersSetupComplete) ||
          (currentPage === 'Supplement Stack' && !onboardingStatus.supplementsSetupComplete)
        );

      res.json({
        userMessage,
        assistantMessage,
        trainingPlanSaved,
        mealPlanSaved,
        goalSaved,
        supplementSaved,
        exerciseSaved,
        fitnessProfileUpdated,
        userProfileUpdated,
        goalUpdated,
        goalCreated,
        biomarkerUpdated,
        personalMemorySaved,
        contextualOnboardingTriggered: contextualOnboardingTriggered || false,
      });
    } catch (error: any) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/chat/history", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/chat/history", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      await storage.clearChatHistory(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const biomarkers = await storage.getBiomarkers(userId);
      const records = await storage.getHealthRecords(userId);
      const recommendations = await storage.getRecommendations(userId);
      
      const latestByType: Record<string, any> = {};
      biomarkers.forEach(b => {
        if (!latestByType[b.type] || new Date(b.recordedAt) > new Date(latestByType[b.type].recordedAt)) {
          latestByType[b.type] = b;
        }
      });

      const getPreviousValue = (type: string, currentDate: Date) => {
        const filtered = biomarkers
          .filter(b => b.type === type && new Date(b.recordedAt) < currentDate)
          .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        return filtered.length > 0 ? filtered[0].value : null;
      };

      const calculateTrend = (current: number, previous: number | null) => {
        if (previous === null || previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      const formatLastUpdated = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
      };

      const heartRate = latestByType['heart-rate'];
      const bloodGlucose = latestByType['blood-glucose'];
      const weight = latestByType['weight'];
      const steps = latestByType['steps'];
      const calories = latestByType['calories'];
      
      res.json({
        dailySteps: steps ? steps.value : 0,
        restingHR: heartRate ? heartRate.value : 0,
        activeDays: 5,
        calories: calories ? calories.value : 0,
        heartRate: heartRate ? {
          value: heartRate.value,
          trend: calculateTrend(heartRate.value, getPreviousValue('heart-rate', new Date(heartRate.recordedAt))),
          lastUpdated: formatLastUpdated(heartRate.recordedAt)
        } : { value: 0, trend: 0, lastUpdated: 'Never' },
        bloodGlucose: bloodGlucose ? {
          value: bloodGlucose.value,
          trend: calculateTrend(bloodGlucose.value, getPreviousValue('blood-glucose', new Date(bloodGlucose.recordedAt))),
          lastUpdated: formatLastUpdated(bloodGlucose.recordedAt)
        } : { value: 0, trend: 0, lastUpdated: 'Never' },
        weight: weight ? {
          value: weight.value,
          trend: calculateTrend(weight.value, getPreviousValue('weight', new Date(weight.recordedAt))),
          lastUpdated: formatLastUpdated(weight.recordedAt)
        } : { value: 0, trend: 0, lastUpdated: 'Never' },
        totalRecords: records.length,
        analyzedRecords: records.filter(r => r.analyzedAt).length,
        activeRecommendations: recommendations.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sleep endpoints
  app.get("/api/sleep/stats", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const latest = await storage.getLatestSleepSession(userId);
      
      if (!latest) {
        return res.json({
          hasData: false,
          sleepScore: 0,
          totalSleepMinutes: 0,
          quality: 'No data',
          lastNight: null,
        });
      }

      res.json({
        hasData: true,
        sleepScore: latest.sleepScore || 0,
        totalSleepMinutes: latest.totalMinutes,
        quality: latest.quality || 'Unknown',
        lastNight: {
          bedtime: latest.bedtime,
          waketime: latest.waketime,
          totalMinutes: latest.totalMinutes,
          awakeMinutes: latest.awakeMinutes || 0,
          lightMinutes: latest.lightMinutes || 0,
          deepMinutes: latest.deepMinutes || 0,
          remMinutes: latest.remMinutes || 0,
          sleepScore: latest.sleepScore || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sleep/sessions", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const days = parseInt(req.query.days as string) || 30;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sessions = await storage.getSleepSessions(userId, startDate, endDate);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sleep/latest", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const latest = await storage.getLatestSleepSession(userId);
      if (!latest) {
        return res.status(404).json({ error: "No sleep data found" });
      }
      res.json(latest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Health Score endpoint
  app.get("/api/dashboard/health-score", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      // Get sleep data (30% of score)
      const sleepSessions = await storage.getSleepSessions(userId, startDate, endDate);
      const avgSleepScore = sleepSessions.length > 0
        ? sleepSessions.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / sleepSessions.length
        : 0;
      const sleepComponent = (avgSleepScore / 100) * 30;

      // Get activity data (25% of score)
      const biomarkers = await storage.getBiomarkers(userId);
      const recentSteps = biomarkers
        .filter(b => b.type === 'steps' && new Date(b.recordedAt) >= startDate)
        .map(b => b.value);
      const avgSteps = recentSteps.length > 0
        ? recentSteps.reduce((sum, val) => sum + val, 0) / recentSteps.length
        : 0;
      
      const workouts = await storage.getWorkoutSessions(userId, startDate, endDate);
      const workoutDays = new Set(workouts.map(w => w.startTime.toISOString().split('T')[0])).size;
      
      // Activity score: 10k steps = 50%, 5+ workout days = 50%
      const stepsScore = Math.min((avgSteps / 10000) * 50, 50);
      const workoutScore = Math.min((workoutDays / 5) * 50, 50);
      const activityComponent = ((stepsScore + workoutScore) / 100) * 25;

      // Get biomarker health (45% of score)
      const latestByType: Record<string, any> = {};
      biomarkers.forEach(b => {
        if (!latestByType[b.type] || new Date(b.recordedAt) > new Date(latestByType[b.type].recordedAt)) {
          latestByType[b.type] = b;
        }
      });

      let biomarkerScore = 0;
      let biomarkerCount = 0;

      // Heart rate: 60-100 bpm is optimal
      const hr = latestByType['heart-rate'];
      if (hr) {
        if (hr.value >= 60 && hr.value <= 80) biomarkerScore += 100;
        else if (hr.value > 80 && hr.value <= 100) biomarkerScore += 70;
        else biomarkerScore += 40;
        biomarkerCount++;
      }

      // Blood glucose: <100 mg/dL is optimal
      const glucose = latestByType['blood-glucose'];
      if (glucose) {
        if (glucose.value < 100) biomarkerScore += 100;
        else if (glucose.value < 126) biomarkerScore += 70;
        else biomarkerScore += 40;
        biomarkerCount++;
      }

      // Weight trend: stable or improving
      const weight = latestByType['weight'];
      if (weight) {
        const oldWeights = biomarkers
          .filter(b => b.type === 'weight' && new Date(b.recordedAt) < new Date(weight.recordedAt))
          .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
          .slice(0, 5);
        
        if (oldWeights.length > 0) {
          const avgOldWeight = oldWeights.reduce((sum, w) => sum + w.value, 0) / oldWeights.length;
          const change = Math.abs(weight.value - avgOldWeight);
          if (change < 2) biomarkerScore += 100; // Stable
          else if (change < 5) biomarkerScore += 80;
          else biomarkerScore += 60;
          biomarkerCount++;
        }
      }

      const biomarkerComponent = biomarkerCount > 0
        ? ((biomarkerScore / biomarkerCount) / 100) * 45
        : 0;

      // Calculate final score - ensure we don't return NaN
      const totalScore = Math.round(sleepComponent + activityComponent + biomarkerComponent) || 0;
      
      // Determine quality label
      let quality = 'Poor';
      if (totalScore >= 80) quality = 'Excellent';
      else if (totalScore >= 60) quality = 'Good';
      else if (totalScore >= 40) quality = 'Fair';

      res.json({
        score: totalScore,
        quality,
        components: {
          sleep: Math.round(sleepComponent),
          activity: Math.round(activityComponent),
          biomarkers: Math.round(biomarkerComponent),
        },
        details: {
          avgSleepScore: Math.round(avgSleepScore),
          avgDailySteps: Math.round(avgSteps),
          workoutDays,
          biomarkerCount,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Data Insights endpoint
  app.get("/api/dashboard/data-insights", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const biomarkers = await storage.getBiomarkers(userId);
      const correlations = await storage.getWorkoutBiomarkerCorrelations(userId, startDate, endDate);
      
      const insights = [];

      // Analyze biomarker trends
      const analyzeMetric = (type: string, label: string, lowerIsBetter: boolean = false) => {
        const metricData = biomarkers
          .filter(b => b.type === type && new Date(b.recordedAt) >= startDate)
          .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
        
        if (metricData.length >= 3) {
          const recent = metricData.slice(-3).reduce((sum, b) => sum + b.value, 0) / 3;
          const older = metricData.slice(0, 3).reduce((sum, b) => sum + b.value, 0) / 3;
          const change = older !== 0 ? ((recent - older) / older) * 100 : 0;
          
          if (Math.abs(change) > 5) {
            const improving = lowerIsBetter ? change < 0 : change > 0;
            insights.push({
              type: improving ? 'positive' : 'negative',
              title: `${label} ${improving ? 'Improving' : 'Declining'}`,
              description: `${Math.abs(change).toFixed(1)}% ${change > 0 ? 'increase' : 'decrease'} over the last 30 days`,
              metric: type,
            });
          }
        }
      };

      analyzeMetric('heart-rate', 'Resting Heart Rate', true);
      analyzeMetric('blood-glucose', 'Blood Glucose', true);
      analyzeMetric('weight', 'Weight');
      analyzeMetric('steps', 'Daily Steps');

      // Add workout-biomarker correlations
      if (correlations.sleepQuality.improvement !== 0) {
        insights.push({
          type: correlations.sleepQuality.improvement > 0 ? 'positive' : 'neutral',
          title: 'Exercise & Sleep Quality',
          description: `Exercise ${correlations.sleepQuality.improvement > 0 ? 'improves' : 'impacts'} sleep quality by ${Math.abs(correlations.sleepQuality.improvement)} points`,
          metric: 'sleep-workout-correlation',
        });
      }

      if (correlations.restingHR.improvement !== 0) {
        insights.push({
          type: correlations.restingHR.improvement > 0 ? 'positive' : 'neutral',
          title: 'Exercise & Heart Rate',
          description: `Workout days show ${Math.abs(correlations.restingHR.improvement)} bpm ${correlations.restingHR.improvement > 0 ? 'improvement' : 'difference'} in resting heart rate`,
          metric: 'hr-workout-correlation',
        });
      }

      // 7-day activity summary
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const workouts = await storage.getWorkoutSessions(userId, last7Days, endDate);
      const totalWorkouts = workouts.length;
      const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
      
      if (totalWorkouts > 0) {
        insights.push({
          type: 'info',
          title: '7-Day Activity Summary',
          description: `${totalWorkouts} workout${totalWorkouts > 1 ? 's' : ''} completed, ${Math.round(totalDuration / 60)} hours total training time`,
          metric: 'activity-summary',
        });
      }

      res.json({ insights });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user/settings", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/user/settings", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { timezone } = req.body;
      if (!timezone) {
        return res.status(400).json({ error: "Timezone is required" });
      }
      await storage.updateUserSettings(userId, { timezone });
      res.json({ success: true, timezone });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user/dashboard-preferences", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const preferences = await storage.getDashboardPreferences(userId);
      res.json(preferences || { visible: [], order: [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/user/dashboard-preferences", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { visible, order, ...otherPrefs } = req.body;
      
      // Validate visible and order if provided
      if (visible !== undefined && !Array.isArray(visible)) {
        return res.status(400).json({ error: "visible must be an array" });
      }
      if (order !== undefined && !Array.isArray(order)) {
        return res.status(400).json({ error: "order must be an array" });
      }
      
      // Merge with existing preferences to preserve all fields
      const existingPrefs = await storage.getDashboardPreferences(userId) || {};
      const updatedPrefs = {
        ...existingPrefs,
        ...(visible !== undefined && { visible }),
        ...(order !== undefined && { order }),
        ...otherPrefs // Include any additional fields like reminderPreferences
      };
      
      await storage.saveDashboardPreferences(userId, updatedPrefs);
      res.json({ success: true, ...updatedPrefs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Page tile preferences routes
  app.get("/api/user/tile-preferences/:page", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { page } = req.params;

    try {
      const preferences = await storage.getPageTilePreferences(userId, page);
      if (!preferences) {
        // Return default empty preferences
        return res.json({ visible: [], order: [] });
      }
      res.json({ visible: preferences.visible, order: preferences.order });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/user/tile-preferences/:page", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { page } = req.params;

    try {
      const { visible, order } = req.body;
      
      if (!Array.isArray(visible) || !Array.isArray(order)) {
        return res.status(400).json({ error: "visible and order must be arrays" });
      }

      const preferences = await storage.savePageTilePreferences(userId, page, { visible, order });
      res.json({ success: true, visible: preferences.visible, order: preferences.order });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Onboarding routes - using granular contextual flags
  app.get("/api/onboarding/status", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const status = await storage.getOnboardingStatus(userId);
      
      if (!status) {
        // No onboarding record, create with default flags
        const defaultStatus = {
          basicInfoComplete: false,
          trainingSetupComplete: false,
          mealsSetupComplete: false,
          supplementsSetupComplete: false,
          biomarkersSetupComplete: false,
          startedAt: new Date(),
        };
        res.json(defaultStatus);
      } else {
        // Return existing status with all granular flags
        res.json({
          basicInfoComplete: status.basicInfoComplete || false,
          trainingSetupComplete: status.trainingSetupComplete || false,
          mealsSetupComplete: status.mealsSetupComplete || false,
          supplementsSetupComplete: status.supplementsSetupComplete || false,
          biomarkersSetupComplete: status.biomarkersSetupComplete || false,
          startedAt: status.startedAt,
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Note: Onboarding now uses granular flags (basicInfoComplete, trainingSetupComplete, etc.)
  // Completion flags are set automatically when users add data to each section
  // No manual step progression needed

  app.get("/api/user/webhook-credentials", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const webhookSecret = process.env.WEBHOOK_SECRET || "dev-webhook-secret-12345";
      res.json({
        userId,
        webhookSecret,
        webhookUrl: `${req.protocol}://${req.get('host')}/api/health-auto-export/ingest`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/biomarkers/cleanup-duplicates", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      console.log("🧹 Starting duplicate cleanup...");
      
      // First, delete the bad weight spike
      const badWeightId = '21d7e29c-713b-4c1c-97d0-657548ef41ad';
      await db.delete(biomarkers).where(eq(biomarkers.id, badWeightId));
      console.log("✅ Deleted bad weight spike");
      
      // Now delete all duplicates keeping only the first occurrence
      const allBiomarkers = await db.select().from(biomarkers).where(eq(biomarkers.userId, userId));
      console.log(`📊 Total biomarkers: ${allBiomarkers.length}`);
      
      const seen = new Set<string>();
      const toDelete: string[] = [];
      
      // Sort by ID to ensure consistent "first" record
      const sorted = [...allBiomarkers].sort((a, b) => a.id.localeCompare(b.id));
      
      for (const biomarker of sorted) {
        const key = `${biomarker.type}-${biomarker.recordedAt.toISOString()}-${biomarker.source}`;
        
        if (seen.has(key)) {
          toDelete.push(biomarker.id);
        } else {
          seen.add(key);
        }
      }
      
      console.log(`🗑️  Found ${toDelete.length} duplicates to delete`);
      
      // Delete in batches
      for (const id of toDelete) {
        await db.delete(biomarkers).where(eq(biomarkers.id, id));
      }
      
      console.log("✅ Cleanup complete");
      
      res.json({ 
        success: true, 
        message: `Cleaned up ${toDelete.length + 1} biomarkers (including bad spike)`,
        deletedCount: toDelete.length + 1,
        details: {
          duplicatesRemoved: toDelete.length,
          badSpikeRemoved: 1
        }
      });
    } catch (error: any) {
      console.error("Error cleaning up duplicates:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Diagnostic endpoint - logs ALL incoming webhook attempts before authentication
  app.post("/api/health-auto-export/ingest", (req, res, next) => {
    console.log("🔍 WEBHOOK DEBUG - Incoming request to /api/health-auto-export/ingest");
    console.log("📋 Headers:", JSON.stringify(req.headers, null, 2));
    console.log("📦 Body preview:", JSON.stringify(req.body, null, 2).substring(0, 500));
    next();
  }, webhookAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      console.log("📥 Received Health Auto Export webhook");
      console.log("📋 Full payload structure:", JSON.stringify(req.body, null, 2));
      console.log("🔑 Payload keys:", Object.keys(req.body));
      
      // Support multiple payload formats from Health Auto Export
      let metrics: any[] = [];
      
      // Format 1: { data: { metrics: [...] } } - Standard format
      if (req.body.data && req.body.data.metrics && Array.isArray(req.body.data.metrics)) {
        metrics = req.body.data.metrics;
        console.log("✅ Using format 1: data.metrics array");
      }
      // Format 2: { metrics: [...] } - Direct metrics array
      else if (req.body.metrics && Array.isArray(req.body.metrics)) {
        metrics = req.body.metrics;
        console.log("✅ Using format 2: direct metrics array");
      }
      // Format 3: Direct array at root - [...]
      else if (Array.isArray(req.body)) {
        metrics = req.body;
        console.log("✅ Using format 3: root array");
      }
      // Format 4: { data: [...] } - Data as direct array
      else if (req.body.data && Array.isArray(req.body.data)) {
        metrics = req.body.data;
        console.log("✅ Using format 4: data array");
      }
      // Format 5: Single metric object - wrap it in array
      else if (req.body.name || req.body.type) {
        metrics = [req.body];
        console.log("✅ Using format 5: single metric object");
      }
      // Format 6: Try to extract arrays from ANY top-level property
      else {
        console.log("⚠️ Trying flexible extraction...");
        const bodyKeys = Object.keys(req.body || {});
        console.log("🔍 Available keys:", bodyKeys);
        
        // Try to find ANY array in the payload
        for (const key of bodyKeys) {
          const value = req.body[key];
          if (Array.isArray(value) && value.length > 0) {
            metrics = value;
            console.log(`✅ Using format 6: extracted array from '${key}' property`);
            break;
          }
          // Check nested objects for arrays
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const nestedKeys = Object.keys(value);
            for (const nestedKey of nestedKeys) {
              if (Array.isArray(value[nestedKey]) && value[nestedKey].length > 0) {
                metrics = value[nestedKey];
                console.log(`✅ Using format 6: extracted array from '${key}.${nestedKey}' property`);
                break;
              }
            }
            if (metrics.length > 0) break;
          }
        }
        
        // If still no metrics found, return detailed error
        if (metrics.length === 0) {
          console.log("❌ No array data found in payload");
          console.log("📊 Body structure:", {
            hasData: !!req.body.data,
            dataType: typeof req.body.data,
            hasMetrics: !!req.body.metrics,
            metricsType: typeof req.body.metrics,
            bodyKeys: Object.keys(req.body || {}),
            isArray: Array.isArray(req.body)
          });
          return res.status(400).json({ 
            error: "Invalid data format",
            details: "Expected formats: {data: {metrics: [...]}}, {metrics: [...]}, [...], {data: [...]}, or single metric object",
            received: {
              keys: Object.keys(req.body || {}),
              structure: typeof req.body,
              fullPayload: JSON.stringify(req.body).substring(0, 500) // First 500 chars for debugging
            }
          });
        }
      }

      if (metrics.length === 0) {
        console.log("⚠️ No metrics found in payload");
        return res.status(400).json({ 
          error: "No metrics found",
          details: "Payload contained no metric data to process"
        });
      }

      console.log(`📊 Processing ${metrics.length} metric(s)`);
      metrics.forEach((m, i) => console.log(`  ${i + 1}. ${m.name || m.type || 'unknown'}: ${Array.isArray(m.data) ? m.data.length : 1} data point(s)`));

      // Helper function to convert incoming units to standardized storage units
      const convertToStorageUnit = (value: number, incomingUnit: string, biomarkerType: string): { value: number; unit: string } => {
        const normalizedUnit = incomingUnit?.toLowerCase().trim() || "";
        
        // Weight conversions - store in lbs
        if (biomarkerType === "weight") {
          if (normalizedUnit === "kg" || normalizedUnit === "kilogram") {
            return { value: value * 2.20462, unit: "lbs" };
          }
          return { value, unit: "lbs" };
        }
        
        // Lean body mass conversions - store in lbs (same as weight)
        if (biomarkerType === "lean-body-mass") {
          if (normalizedUnit === "kg" || normalizedUnit === "kilogram") {
            return { value: value * 2.20462, unit: "lbs" };
          }
          return { value, unit: "lbs" };
        }
        
        // Blood glucose conversions - store in mg/dL
        if (biomarkerType === "blood-glucose") {
          if (normalizedUnit === "mmol/l" || normalizedUnit === "mmol") {
            return { value: value * 18.018, unit: "mg/dL" };
          }
          return { value, unit: "mg/dL" };
        }
        
        // Temperature conversions - store in °F
        if (biomarkerType === "body-temperature") {
          if (normalizedUnit === "°c" || normalizedUnit === "c" || normalizedUnit === "celsius") {
            return { value: (value * 9/5) + 32, unit: "°F" };
          }
          return { value, unit: "°F" };
        }
        
        // Default units for other types
        const defaultUnits: Record<string, string> = {
          "heart-rate": "bpm",
          "hrv": "ms",
          "steps": "steps",
          "calories": "kcal",
          "blood-pressure-systolic": "mmHg",
          "blood-pressure-diastolic": "mmHg",
          "oxygen-saturation": "%",
          "sleep-hours": "hours",
          "lean-body-mass": "lbs",
        };
        
        return { value, unit: defaultUnits[biomarkerType] || incomingUnit || "" };
      };

      const metricMapping: Record<string, string> = {
        "Heart Rate": "heart-rate",
        "heart_rate": "heart-rate",
        "Resting Heart Rate": "heart-rate",
        "resting_heart_rate": "heart-rate",
        "Heart Rate Variability SDNN": "hrv",
        "heart_rate_variability_sdnn": "hrv",
        "Heart Rate Variability": "hrv",
        "heart_rate_variability": "hrv",
        "HRV": "hrv",
        "hrv": "hrv",
        "Blood Glucose": "blood-glucose",
        "blood_glucose": "blood-glucose",
        "Weight": "weight",
        "weight": "weight",
        "weight_body_mass": "weight",
        "Lean Body Mass": "lean-body-mass",
        "lean_body_mass": "lean-body-mass",
        "Steps": "steps",
        "step_count": "steps",
        "Active Energy": "calories",
        "active_energy": "calories",
        "Active Energy Burned": "calories",
        "active_energy_burned": "calories",
        "Blood Pressure Systolic": "blood-pressure-systolic",
        "blood_pressure_systolic": "blood-pressure-systolic",
        "Blood Pressure Diastolic": "blood-pressure-diastolic",
        "blood_pressure_diastolic": "blood-pressure-diastolic",
        "Oxygen Saturation": "oxygen-saturation",
        "oxygen_saturation": "oxygen-saturation",
        "Body Temperature": "body-temperature",
        "body_temperature": "body-temperature",
        "Sleep Analysis": "sleep-hours",
        "sleep_analysis": "sleep-hours",
      };

      let insertedCount = 0;
      let sleepSessionsCount = 0;
      let workoutSessionsCount = 0;
      const insertedBiomarkerTypes = new Set<string>(); // Track biomarker types for goal updates

      for (const metric of metrics) {
        // Check if this metric object IS a workout (no .data field, but has workout fields)
        const isWorkoutObject = metric.start || metric.startDate || metric.duration || metric.activeEnergyBurned || metric.totalEnergyBurned;
        
        // If metric IS a workout object, wrap it in a data array
        if (isWorkoutObject && !metric.data) {
          metric.data = [metric]; // Wrap the workout object in an array
          console.log(`🔧 Wrapped workout object in data array for: "${metric.name}"`);
        }
        
        // Special handling for workout sessions - check multiple possible field names
        const metricName = (metric.name || metric.type || "").toLowerCase();
        const nameBasedWorkout = metricName === "workout" || metricName === "workouts" || metricName.includes("workout") || metricName.includes("cycling") || metricName.includes("running");
        
        // Debug: Log metric structure
        console.log(`🔬 Analyzing metric: "${metric.name}"`, {
          hasData: !!metric.data,
          isArray: Array.isArray(metric.data),
          dataLength: metric.data?.length,
          firstItemKeys: metric.data?.[0] ? Object.keys(metric.data[0]) : []
        });
        
        // Also detect workouts by checking if data has workout-specific fields
        const hasWorkoutFields = metric.data && Array.isArray(metric.data) && metric.data.length > 0 && 
          metric.data[0] && (
            metric.data[0].workoutType || 
            metric.data[0].workout_type ||
            (metric.data[0].startDate && metric.data[0].totalEnergyBurned) ||
            (metric.data[0].start_date && metric.data[0].total_energy_burned) ||
            (metric.data[0].start && metric.data[0].duration) ||
            (metric.data[0].start && metric.data[0].activeEnergyBurned)
          );
        
        const isWorkout = nameBasedWorkout || hasWorkoutFields;
        console.log(`🎯 Workout detection for "${metric.name}": ${isWorkout} (nameBasedWorkout: ${nameBasedWorkout}, hasWorkoutFields: ${hasWorkoutFields})`);
        
        if (isWorkout && metric.data && Array.isArray(metric.data)) {
          console.log(`🏋️ Processing ${metric.data.length} workout(s)`);
          
          // Batch process workout sessions in parallel
          const workoutPromises = [];
          
          for (const workout of metric.data) {
            console.log("📋 Workout data keys:", Object.keys(workout));
            
            // Support multiple field name variations for dates
            const startDate = workout.startDate || workout.start_date || workout.startTime || workout.start;
            const endDate = workout.endDate || workout.end_date || workout.endTime || workout.end;
            
            console.log("🔍 Extracted dates:", { startDate, endDate });
            
            if (startDate && endDate) {
              const startTime = new Date(startDate);
              const endTime = new Date(endDate);
              const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
              
              console.log(`⏱️  Duration: ${duration} minutes (${startTime.toISOString()} → ${endTime.toISOString()})`);
              
              // Map Apple Health workout types to our standard types
              const workoutTypeMap: Record<string, string> = {
                "HKWorkoutActivityTypeRunning": "running",
                "HKWorkoutActivityTypeCycling": "cycling",
                "HKWorkoutActivityTypeWalking": "walking",
                "HKWorkoutActivityTypeHiking": "hiking",
                "HKWorkoutActivityTypeSwimming": "swimming",
                "HKWorkoutActivityTypeYoga": "yoga",
                "HKWorkoutActivityTypeTraditionalStrengthTraining": "strength",
                "HKWorkoutActivityTypeFunctionalStrengthTraining": "strength",
                "HKWorkoutActivityTypeHighIntensityIntervalTraining": "hiit",
                "HKWorkoutActivityTypeElliptical": "cardio",
                "HKWorkoutActivityTypeRowing": "cardio",
                "HKWorkoutActivityTypeCrossTraining": "crossfit",
              };
              
              // Get workout type from metric name or workout.workoutType field
              const workoutType = workoutTypeMap[workout.workoutType] || 
                (metric.name?.toLowerCase().includes("cycling") ? "cycling" : 
                 metric.name?.toLowerCase().includes("running") ? "running" :
                 metric.name?.toLowerCase().includes("walking") ? "walking" : "other");
              
              // Handle nested qty/units structure for distance and energy
              const distance = workout.distance?.qty ? Math.round(workout.distance.qty * 1000) : // km to meters
                              workout.distance ? Math.round(workout.distance) : null;
              const calories = workout.activeEnergyBurned?.qty ? Math.round(workout.activeEnergyBurned.qty) : // kJ
                              workout.totalEnergyBurned ? Math.round(workout.totalEnergyBurned) : null;
              
              console.log("💪 Creating workout:", { workoutType, duration, distance, calories });
              
              // Create workout session and match to schedule in parallel
              workoutPromises.push(
                (async () => {
                  const session = await storage.createWorkoutSession({
                    userId,
                    workoutType,
                    startTime,
                    endTime,
                    duration,
                    distance,
                    calories,
                    avgHeartRate: workout.avgHeartRate ? Math.round(workout.avgHeartRate) : null,
                    maxHeartRate: workout.maxHeartRate ? Math.round(workout.maxHeartRate) : null,
                    sourceType: "apple_health",
                    sourceId: workout.id || null,
                  });
                  
                  // Try to match to training schedule and mark as completed
                  const matchingSchedule = await storage.findMatchingSchedule(userId, workoutType, startTime);
                  if (matchingSchedule) {
                    await storage.matchWorkoutToSchedule(session.id, matchingSchedule.id, userId);
                    console.log(`✅ Matched workout to training schedule: ${matchingSchedule.workoutType} on ${matchingSchedule.day}`);
                  }
                })()
              );
            } else {
              console.log("⚠️  Missing start/end date for workout:", {
                hasStartDate: !!startDate,
                hasEndDate: !!endDate,
                workoutKeys: Object.keys(workout)
              });
              continue;
            }
          }
          
          await Promise.all(workoutPromises);
          workoutSessionsCount += workoutPromises.length;
          continue; // Skip the normal biomarker processing for workouts
        }
        
        // Special handling for sleep analysis - create sleep sessions
        const isSleep = metricName === "sleep_analysis" || metricName === "sleep analysis" || metricName.includes("sleep");
        
        if (isSleep && metric.data && Array.isArray(metric.data)) {
          console.log(`🛌 Processing ${metric.data.length} sleep data point(s)`);
          
          // Group sleep segments by date (same night)
          // Apple Health sends multiple segments for one night (REM, Core, Deep, etc.)
          // We need to combine them into ONE session per night
          const sleepNights = new Map<string, {
            bedtime: Date;
            waketime: Date;
            awakeMinutes: number;
            deepMinutes: number;
            remMinutes: number;
            coreMinutes: number;
            sleepScore?: number;
          }>();
          
          for (const dataPoint of metric.data) {
            if (dataPoint.inBedStart && dataPoint.inBedEnd) {
              const bedtime = new Date(dataPoint.inBedStart);
              const waketime = new Date(dataPoint.inBedEnd);
              
              // Smart night key: if bedtime is after 3pm, use that date; otherwise it's a morning nap
              // This handles sleep that crosses midnight (e.g., 10pm Oct 13 to 6am Oct 14 = Oct 13 night)
              const bedHour = bedtime.getHours();
              const nightDate = bedHour >= 15 ? bedtime : new Date(bedtime.getTime() - 12 * 60 * 60 * 1000);
              const nightKey = nightDate.toISOString().split('T')[0];
              
              const existing = sleepNights.get(nightKey);
              
              if (existing) {
                // Merge with existing night - extend the time range and accumulate minutes
                console.log(`🔗 Merging sleep segment for night ${nightKey}`);
                existing.bedtime = new Date(Math.min(existing.bedtime.getTime(), bedtime.getTime()));
                existing.waketime = new Date(Math.max(existing.waketime.getTime(), waketime.getTime()));
                existing.awakeMinutes += Math.round((dataPoint.awake || 0) * 60);
                existing.deepMinutes += Math.round((dataPoint.deep || 0) * 60);
                existing.remMinutes += Math.round((dataPoint.rem || 0) * 60);
                existing.coreMinutes += Math.round((dataPoint.core || 0) * 60);
                
                // Use the highest sleep score if multiple segments have scores
                if (dataPoint.sleepScore !== undefined && dataPoint.sleepScore !== null) {
                  existing.sleepScore = Math.max(existing.sleepScore || 0, Math.round(dataPoint.sleepScore));
                }
              } else {
                // First segment for this night
                console.log(`🆕 New sleep night detected: ${nightKey}`);
                sleepNights.set(nightKey, {
                  bedtime,
                  waketime,
                  awakeMinutes: Math.round((dataPoint.awake || 0) * 60),
                  deepMinutes: Math.round((dataPoint.deep || 0) * 60),
                  remMinutes: Math.round((dataPoint.rem || 0) * 60),
                  coreMinutes: Math.round((dataPoint.core || 0) * 60),
                  sleepScore: dataPoint.sleepScore !== undefined ? Math.round(dataPoint.sleepScore) : undefined,
                });
              }
            }
          }
          
          console.log(`📊 Grouped into ${sleepNights.size} night(s) of sleep`);
          
          // Now create one sleep session per night
          const sleepPromises = [];
          
          for (const [nightKey, night] of Array.from(sleepNights.entries())) {
            const totalMinutes = Math.round((night.waketime.getTime() - night.bedtime.getTime()) / (1000 * 60));
            
            // Use Apple Health's sleep score if available, otherwise calculate our own
            let sleepScore: number;
            
            if (night.sleepScore !== undefined && night.sleepScore !== null) {
              sleepScore = night.sleepScore;
              console.log(`✅ Using Apple Health sleep score for ${nightKey}: ${sleepScore}`);
            } else {
              // Calculate our own score (0-100) based on sleep quality
              // Actual sleep time excludes awake minutes
              const actualSleepMinutes = totalMinutes - night.awakeMinutes;
              const sleepHours = actualSleepMinutes / 60;
              sleepScore = 70; // Base score
              
              // Adjust for actual sleep duration (optimal 7-9 hours)
              if (sleepHours >= 7 && sleepHours <= 9) {
                sleepScore += 15;
              } else if (sleepHours >= 6 && sleepHours < 7) {
                sleepScore += 8;
              } else if (sleepHours < 6) {
                sleepScore -= 15;
              } else if (sleepHours > 9) {
                sleepScore -= 5;
              }
              
              // Adjust for deep sleep (should be ~15-20% of actual sleep time)
              if (night.deepMinutes > 0 && actualSleepMinutes > 0) {
                const deepPercentage = night.deepMinutes / actualSleepMinutes;
                if (deepPercentage >= 0.15 && deepPercentage <= 0.25) {
                  sleepScore += 10;
                } else if (deepPercentage < 0.10) {
                  sleepScore -= 5;
                }
              }
              
              // Adjust for REM sleep (should be ~20-25% of actual sleep time)
              if (night.remMinutes > 0 && actualSleepMinutes > 0) {
                const remPercentage = night.remMinutes / actualSleepMinutes;
                if (remPercentage >= 0.18 && remPercentage <= 0.28) {
                  sleepScore += 10;
                } else if (remPercentage < 0.15) {
                  sleepScore -= 5;
                }
              }
              
              // Penalize excessive awake time (>10% of time in bed is poor sleep quality)
              if (night.awakeMinutes > 0) {
                const awakePercentage = night.awakeMinutes / totalMinutes;
                if (awakePercentage > 0.15) {
                  // Very poor sleep efficiency (>15% awake)
                  sleepScore -= 20;
                } else if (awakePercentage > 0.10) {
                  // Moderate awake time (10-15% awake)
                  sleepScore -= 10;
                }
              }
              
              // Ensure score is between 0 and 100
              sleepScore = Math.max(0, Math.min(100, sleepScore));
              console.log(`🧮 Calculated custom sleep score for ${nightKey}: ${sleepScore}`);
            }
            
            // Determine quality
            let quality = "Fair";
            if (sleepScore >= 85) quality = "Excellent";
            else if (sleepScore >= 75) quality = "Good";
            else if (sleepScore >= 60) quality = "Fair";
            else quality = "Poor";
            
            console.log(`💾 Creating sleep session for ${nightKey}: ${night.bedtime.toISOString()} to ${night.waketime.toISOString()} (${totalMinutes} mins, score: ${sleepScore})`);
            
            sleepPromises.push(
              storage.upsertSleepSession({
                userId,
                bedtime: night.bedtime,
                waketime: night.waketime,
                totalMinutes,
                awakeMinutes: night.awakeMinutes,
                lightMinutes: night.coreMinutes, // Core sleep maps to light
                deepMinutes: night.deepMinutes,
                remMinutes: night.remMinutes,
                sleepScore,
                quality,
                source: "apple-health",
              })
            );
          }
          
          await Promise.all(sleepPromises);
          sleepSessionsCount += sleepPromises.length;
          
          // Clear cached readiness scores since sleep data changed
          // This forces recalculation with the new sleep data
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          await db.delete(readinessScores).where(
            and(
              eq(readinessScores.userId, userId),
              gte(readinessScores.date, today)
            )
          );
          console.log('🔄 Cleared readiness score cache due to new sleep data');
          
          continue; // Skip the normal biomarker processing for sleep
        }
        
        const biomarkerType = metricMapping[metric.name];
        
        if (!biomarkerType) {
          continue;
        }

        if (metric.name === "Blood Pressure" && metric.data) {
          // Batch process blood pressure data in parallel
          const bpPromises = [];
          for (const dataPoint of metric.data) {
            if (dataPoint.systolic) {
              bpPromises.push(
                storage.upsertBiomarker({
                  userId,
                  type: "blood-pressure-systolic",
                  value: dataPoint.systolic,
                  unit: "mmHg",
                  source: "health-auto-export",
                  recordedAt: new Date(dataPoint.date),
                })
              );
            }
            if (dataPoint.diastolic) {
              bpPromises.push(
                storage.upsertBiomarker({
                  userId,
                  type: "blood-pressure-diastolic",
                  value: dataPoint.diastolic,
                  unit: "mmHg",
                  source: "health-auto-export",
                  recordedAt: new Date(dataPoint.date),
                })
              );
            }
          }
          await Promise.all(bpPromises);
          insertedCount += bpPromises.length;
        } else if (metric.data && Array.isArray(metric.data)) {
          // Batch process other biomarkers in parallel
          const biomarkerPromises = [];
          for (const dataPoint of metric.data) {
            let value = dataPoint.qty;
            
            if (metric.name === "Sleep Analysis" && dataPoint.asleep) {
              value = dataPoint.asleep;
            }
            
            if (metric.name === "heart_rate" && dataPoint.Avg !== undefined) {
              value = dataPoint.Avg;
            }

            if (value !== undefined && value !== null) {
              // Convert to standardized storage units
              const converted = convertToStorageUnit(value, metric.units, biomarkerType);
              
              biomarkerPromises.push(
                storage.upsertBiomarker({
                  userId,
                  type: biomarkerType,
                  value: converted.value,
                  unit: converted.unit,
                  source: "health-auto-export",
                  recordedAt: new Date(dataPoint.date),
                })
              );
            }
          }
          await Promise.all(biomarkerPromises);
          insertedCount += biomarkerPromises.length;
        }
      }

      // Auto-calculate body fat percentage if both weight and lean body mass are available
      let bodyFatCalculations = 0; // Declare outside try block so it's accessible in goal auto-update
      
      try {
        // Get unique dates where biomarkers were inserted
        const today = new Date();
        const sevenDaysAgo = subDays(today, 7);
        
        // Query for recent weight and lean body mass biomarkers
        const recentBiomarkers = await db.query.biomarkers.findMany({
          where: and(
            eq(biomarkers.userId, userId),
            gte(biomarkers.recordedAt, sevenDaysAgo),
            inArray(biomarkers.type, ['weight', 'lean-body-mass'])
          ),
          orderBy: (biomarkers, { desc }) => [desc(biomarkers.recordedAt)]
        });
        
        // Group by date (YYYY-MM-DD) and find days with both weight and lean body mass
        const biomarkersByDate = new Map<string, { weight?: number; leanBodyMass?: number }>();
        
        for (const biomarker of recentBiomarkers) {
          const dateKey = biomarker.recordedAt.toISOString().split('T')[0];
          
          if (!biomarkersByDate.has(dateKey)) {
            biomarkersByDate.set(dateKey, {});
          }
          
          const dayData = biomarkersByDate.get(dateKey)!;
          
          if (biomarker.type === 'weight') {
            dayData.weight = biomarker.value;
          } else if (biomarker.type === 'lean-body-mass') {
            dayData.leanBodyMass = biomarker.value;
          }
        }
        
        // Calculate and insert body fat percentage for days with both values
        const bodyFatPromises = [];
        
        // Check existing body fat percentage entries to avoid duplicates
        const existingBodyFat = await db.query.biomarkers.findMany({
          where: and(
            eq(biomarkers.userId, userId),
            eq(biomarkers.type, 'body-fat-percentage'),
            gte(biomarkers.recordedAt, sevenDaysAgo)
          )
        });
        
        const existingBodyFatDates = new Set(
          existingBodyFat.map(b => b.recordedAt.toISOString().split('T')[0])
        );
        
        for (const [dateStr, data] of Array.from(biomarkersByDate.entries())) {
          // Skip if body fat percentage already exists for this date
          if (existingBodyFatDates.has(dateStr)) {
            console.log(`⏭️ Body fat % already exists for ${dateStr}, skipping calculation`);
            continue;
          }
          
          if (data.weight && data.leanBodyMass && data.weight > 0) {
            // Formula: Body Fat % = ((Weight - Lean Body Mass) / Weight) × 100
            const bodyFatPercentage = ((data.weight - data.leanBodyMass) / data.weight) * 100;
            
            // Only insert if the calculation makes sense (0-100%)
            if (bodyFatPercentage >= 0 && bodyFatPercentage <= 100) {
              bodyFatPromises.push(
                storage.upsertBiomarker({
                  userId,
                  type: "body-fat-percentage",
                  value: Math.round(bodyFatPercentage * 10) / 10, // Round to 1 decimal place
                  unit: "%",
                  source: "calculated",
                  recordedAt: new Date(dateStr),
                })
              );
              bodyFatCalculations++;
              console.log(`🧮 Calculated body fat % for ${dateStr}: ${bodyFatPercentage.toFixed(1)}% (Weight: ${data.weight} lbs, Lean: ${data.leanBodyMass} lbs)`);
            }
          }
        }
        
        await Promise.all(bodyFatPromises);
        
        if (bodyFatCalculations > 0) {
          console.log(`✅ Auto-calculated ${bodyFatCalculations} body fat percentage entries`);
        }
      } catch (error: any) {
        console.error("Error auto-calculating body fat percentage:", error);
        // Don't fail the whole request if body fat calculation fails
      }

      // Auto-update goals with latest biomarker values
      try {
        console.log("🎯 Checking for goals to auto-update...");
        
        // Get all active goals for the user
        const activeGoals = await storage.getGoals(userId);
        const activeUserGoals = activeGoals.filter(g => g.status === 'active');
        
        if (activeUserGoals.length > 0) {
          // Add body-fat-percentage if it was calculated
          if (bodyFatCalculations > 0) {
            insertedBiomarkerTypes.add('body-fat-percentage');
          }
          
          // Map biomarker types to goal metric types
          // This handles cases where multiple biomarker types map to a single goal metric
          const biomarkerToGoalMetricMap: Record<string, string> = {
            'blood-pressure-systolic': 'blood-pressure',
            'blood-pressure-diastolic': 'blood-pressure',
            // All other biomarker types map 1:1 to goal metrics
          };
          
          // Get unique goal metric types from inserted biomarkers
          const goalMetricTypes = new Set<string>();
          const insertedBiomarkerTypesArray = Array.from(insertedBiomarkerTypes);
          for (const biomarkerType of insertedBiomarkerTypesArray) {
            const goalMetric = biomarkerToGoalMetricMap[biomarkerType] || biomarkerType;
            goalMetricTypes.add(goalMetric);
          }
          
          const goalMetricTypesArray = Array.from(goalMetricTypes);
          console.log(`📊 Goal metric types to check: ${goalMetricTypesArray.join(', ')}`);
          
          let updatedGoalsCount = 0;
          
          // For each goal metric type, check if there's a matching active goal
          for (const goalMetricType of goalMetricTypesArray) {
            const matchingGoals = activeUserGoals.filter(g => g.metricType === goalMetricType);
            
            if (matchingGoals.length > 0) {
              // Get the appropriate biomarker type for fetching latest value
              let biomarkerTypeToFetch = goalMetricType;
              
              // For blood pressure goals, use systolic value (primary health indicator)
              if (goalMetricType === 'blood-pressure') {
                biomarkerTypeToFetch = 'blood-pressure-systolic';
              }
              
              const latestBiomarker = await storage.getLatestBiomarkerByType(userId, biomarkerTypeToFetch);
              
              if (latestBiomarker) {
                // Update each matching goal
                for (const goal of matchingGoals) {
                  await storage.updateGoalProgress(goal.id, userId, latestBiomarker.value);
                  updatedGoalsCount++;
                  console.log(`✅ Auto-updated goal "${goal.metricType}" to ${latestBiomarker.value} ${latestBiomarker.unit}`);
                }
              }
            }
          }
          
          if (updatedGoalsCount > 0) {
            console.log(`🎯 Successfully auto-updated ${updatedGoalsCount} goal(s)`);
          } else {
            console.log(`ℹ️ No matching active goals found for these biomarkers`);
          }
        } else {
          console.log(`ℹ️ No active goals found for user`);
        }
      } catch (error: any) {
        console.error("Error auto-updating goals:", error);
        // Don't fail the whole request if goal update fails
      }

      // Return success response immediately to avoid timeout
      res.json({ 
        success: true, 
        message: `Successfully imported ${insertedCount} biomarkers, ${sleepSessionsCount} sleep sessions, and ${workoutSessionsCount} workout sessions`,
        biomarkersCount: insertedCount,
        sleepSessionsCount: sleepSessionsCount,
        workoutSessionsCount: workoutSessionsCount
      });
    } catch (error: any) {
      console.error("Error processing Health Auto Export data:", error);
      // Only send error if response hasn't been sent yet
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Junction (Vital) webhook endpoint with Svix signature verification
  app.post("/api/junction/webhook", async (req, res) => {
    try {
      console.log("📥 Received Junction webhook");
      
      // Verify Svix webhook signature
      const svixId = req.headers['svix-id'] as string;
      const svixTimestamp = req.headers['svix-timestamp'] as string;
      const svixSignature = req.headers['svix-signature'] as string;
      
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("❌ Missing Svix headers");
        return res.status(401).json({ error: "Missing webhook signature headers" });
      }
      
      // TODO: Implement Svix signature verification using webhook secret from Junction dashboard
      // For now, require the headers to be present (basic validation)
      // In production, use Svix SDK: new Webhook(secret).verify(payload, headers)
      console.log("✅ Svix headers present:", { svixId, svixTimestamp });
      
      console.log("🔑 Event type:", req.body.event_type);
      console.log("📋 Full payload:", JSON.stringify(req.body, null, 2));

      const eventType = req.body.event_type;
      const data = req.body.data;

      // Verify required fields
      if (!eventType || !data) {
        return res.status(400).json({ error: "Missing event_type or data" });
      }

      // Handle different event types
      if (eventType === "provider.connection.created") {
        // User connected a provider
        console.log(`✅ Provider connected: ${data.provider?.name} for user ${req.body.user_id}`);
        return res.json({ success: true, message: "Provider connection acknowledged" });
      }

      if (eventType.startsWith("historical.data.")) {
        // Historical data backfill completed - notification only
        const resource = eventType.replace("historical.data.", "").replace(".created", "");
        console.log(`📚 Historical backfill complete for ${resource}: ${data.start_date} to ${data.end_date}`);
        return res.json({ success: true, message: "Historical backfill acknowledged" });
      }

      if (eventType.startsWith("daily.data.")) {
        // Incremental data update - contains actual health data
        const resource = eventType.replace("daily.data.", "").replace(".created", "").replace(".updated", "");
        console.log(`📊 Processing ${resource} data for user ${data.user_id}`);

        // Map user_id to HealthPilot user (you'll need to maintain this mapping)
        // For now, using client_user_id which should match your user ID
        const userId = req.body.client_user_id || data.user_id;

        let insertedCount = 0;

        // Handle different resource types
        if (resource === "workouts") {
          // Create workout session
          const workout = await storage.createWorkoutSession({
            userId,
            sourceType: `junction-${data.source?.provider || 'unknown'}`,
            sourceId: data.id || data.provider_id,
            workoutType: data.sport?.name || "Unknown",
            startTime: new Date(data.time_start),
            endTime: new Date(data.time_end),
            duration: Math.round((data.moving_time || 0) / 60), // Convert seconds to minutes
            calories: data.calories || 0,
            distance: data.distance || 0,
            avgHeartRate: data.average_hr || null,
            maxHeartRate: data.max_hr || null,
          });
          insertedCount++;
          console.log(`✅ Created workout session: ${workout.id}`);
        } else if (resource === "sleep") {
          // Create sleep session
          const totalMinutes = Math.round((data.total || data.duration || 0) / 60); // Convert seconds to minutes
          const sleep = await storage.createSleepSession({
            userId,
            source: `junction-${data.source?.provider || 'unknown'}`,
            bedtime: new Date(data.bedtime_start),
            waketime: new Date(data.bedtime_stop),
            totalMinutes,
            awakeMinutes: Math.round((data.awake || 0) / 60),
            lightMinutes: Math.round((data.light || 0) / 60),
            deepMinutes: Math.round((data.deep || 0) / 60),
            remMinutes: Math.round((data.rem || 0) / 60),
            sleepScore: data.score || null,
          });
          insertedCount++;
          console.log(`✅ Created sleep session: ${sleep.id}`);
        } else if (resource === "heartrate") {
          // Store heart rate as biomarker
          await storage.upsertBiomarker({
            userId,
            type: "heart-rate",
            value: data.value || data.hr_average,
            unit: "bpm",
            source: `junction-${data.source?.provider || 'unknown'}`,
            recordedAt: new Date(data.timestamp || data.calendar_date),
          });
          insertedCount++;
        } else if (resource === "weight" || resource === "body") {
          // Store weight as biomarker
          if (data.weight) {
            await storage.upsertBiomarker({
              userId,
              type: "weight",
              value: data.weight,
              unit: "kg",
              source: `junction-${data.source?.provider || 'unknown'}`,
              recordedAt: new Date(data.timestamp || data.calendar_date),
            });
            insertedCount++;
          }
        } else if (resource === "glucose") {
          // Store glucose as biomarker
          await storage.upsertBiomarker({
            userId,
            type: "blood-glucose",
            value: data.value || data.glucose,
            unit: "mg/dL",
            source: `junction-${data.source?.provider || 'unknown'}`,
            recordedAt: new Date(data.timestamp || data.calendar_date),
          });
          insertedCount++;
        } else if (resource === "blood_pressure") {
          // Store blood pressure as biomarkers
          if (data.systolic) {
            await storage.upsertBiomarker({
              userId,
              type: "blood-pressure-systolic",
              value: data.systolic,
              unit: "mmHg",
              source: `junction-${data.source?.provider || 'unknown'}`,
              recordedAt: new Date(data.timestamp || data.calendar_date),
            });
            insertedCount++;
          }
          if (data.diastolic) {
            await storage.upsertBiomarker({
              userId,
              type: "blood-pressure-diastolic",
              value: data.diastolic,
              unit: "mmHg",
              source: `junction-${data.source?.provider || 'unknown'}`,
              recordedAt: new Date(data.timestamp || data.calendar_date),
            });
            insertedCount++;
          }
        }

        return res.json({ 
          success: true, 
          message: `Processed ${resource} data`,
          insertedCount 
        });
      }

      // Unknown event type
      console.log(`⚠️ Unknown event type: ${eventType}`);
      return res.json({ success: true, message: "Event acknowledged" });

    } catch (error: any) {
      console.error("Error processing Junction webhook:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Capacitor iOS native HealthKit sync endpoint  
  app.post("/api/apple-health/sync", isAuthenticated, requirePremium(PremiumFeature.APPLE_HEALTH_SYNC), async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      console.log("📱 Received Capacitor HealthKit sync");
      const { steps, hrv, restingHR, sleep, workouts, weight, bodyFat, leanMass } = req.body;

      let insertedCount = 0;

      // Process steps data
      if (steps && steps.length > 0) {
        console.log(`👟 Processing ${steps.length} step samples`);
        for (const sample of steps) {
          await storage.upsertBiomarker({
            userId,
            type: "steps",
            value: sample.value,
            unit: sample.unit || "count",
            source: "ios-healthkit",
            recordedAt: new Date(sample.startDate),
          });
          insertedCount++;
        }
      }

      // Process HRV data
      if (hrv && hrv.length > 0) {
        console.log(`💓 Processing ${hrv.length} HRV samples`);
        for (const sample of hrv) {
          await storage.upsertBiomarker({
            userId,
            type: "hrv",
            value: sample.value,
            unit: sample.unit || "ms",
            source: "ios-healthkit",
            recordedAt: new Date(sample.startDate),
          });
          insertedCount++;
        }
      }

      // Process resting heart rate data
      if (restingHR && restingHR.length > 0) {
        console.log(`❤️  Processing ${restingHR.length} resting HR samples`);
        for (const sample of restingHR) {
          await storage.upsertBiomarker({
            userId,
            type: "heart-rate",
            value: sample.value,
            unit: sample.unit || "bpm",
            source: "ios-healthkit",
            recordedAt: new Date(sample.startDate),
          });
          insertedCount++;
        }
      }

      // Process weight data
      if (weight && weight.length > 0) {
        console.log(`⚖️  Processing ${weight.length} weight samples`);
        for (const sample of weight) {
          await storage.upsertBiomarker({
            userId,
            type: "weight",
            value: sample.value,
            unit: sample.unit || "kg",
            source: "ios-healthkit",
            recordedAt: new Date(sample.startDate),
          });
          insertedCount++;
        }
      }

      // Process body fat percentage data
      if (bodyFat && bodyFat.length > 0) {
        console.log(`📊 Processing ${bodyFat.length} body fat samples`);
        for (const sample of bodyFat) {
          await storage.upsertBiomarker({
            userId,
            type: "body-fat-percentage",
            value: sample.value,
            unit: sample.unit || "%",
            source: "ios-healthkit",
            recordedAt: new Date(sample.startDate),
          });
          insertedCount++;
        }
      }

      // Process lean body mass data
      if (leanMass && leanMass.length > 0) {
        console.log(`💪 Processing ${leanMass.length} lean mass samples`);
        for (const sample of leanMass) {
          await storage.upsertBiomarker({
            userId,
            type: "lean-body-mass",
            value: sample.value,
            unit: sample.unit || "kg",
            source: "ios-healthkit",
            recordedAt: new Date(sample.startDate),
          });
          insertedCount++;
        }
      }

      // Process sleep data
      if (sleep && sleep.length > 0) {
        console.log(`🛌 Processing ${sleep.length} sleep samples`);
        
        // Group sleep segments by night, using smart bedtime detection
        const sleepNights = new Map<string, {
          bedtime: Date;
          waketime: Date;
          awakeMinutes: number;
          lightMinutes: number;
          deepMinutes: number;
          remMinutes: number;
          sleepScore?: number;
        }>();

        for (const sample of sleep) {
          const startTime = new Date(sample.startDate);
          const endTime = new Date(sample.endDate);
          
          // Smart night key: if sleep starts after 3pm, use that date; otherwise it's a morning nap
          // This handles sleep that crosses midnight (e.g., 10pm Oct 13 to 6am Oct 14 = Oct 13 night)
          const startHour = startTime.getHours();
          const nightDate = startHour >= 15 ? startTime : new Date(startTime.getTime() - 12 * 60 * 60 * 1000);
          const nightKey = nightDate.toISOString().split('T')[0];
          
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          
          // Extract sleep stage information if available
          const sleepType = sample.value?.toLowerCase() || '';
          let awakeMinutes = 0;
          let lightMinutes = 0;
          let deepMinutes = 0;
          let remMinutes = 0;
          
          // Map sleep types to stage minutes
          if (sleepType.includes('awake') || sleepType === 'awake') {
            awakeMinutes = duration;
          } else if (sleepType.includes('rem') || sleepType === 'asleep_rem') {
            remMinutes = duration;
          } else if (sleepType.includes('deep') || sleepType === 'asleep_deep') {
            deepMinutes = duration;
          } else if (sleepType.includes('core') || sleepType.includes('light') || sleepType === 'asleep_core') {
            lightMinutes = duration;
          } else {
            // Default to light sleep if type is unknown
            lightMinutes = duration;
          }
          
          if (!sleepNights.has(nightKey)) {
            sleepNights.set(nightKey, {
              bedtime: startTime,
              waketime: endTime,
              awakeMinutes,
              lightMinutes,
              deepMinutes,
              remMinutes,
            });
          } else {
            const night = sleepNights.get(nightKey)!;
            
            // Only extend bedtime backwards if this segment starts significantly earlier (>30 mins)
            // and is a real sleep segment (not just a brief awakening)
            if (startTime < night.bedtime && duration > 30 && !sleepType.includes('awake')) {
              night.bedtime = startTime;
            }
            
            // Always extend waketime forward
            if (endTime > night.waketime) {
              night.waketime = endTime;
            }
            
            // Accumulate stage minutes
            night.awakeMinutes += awakeMinutes;
            night.lightMinutes += lightMinutes;
            night.deepMinutes += deepMinutes;
            night.remMinutes += remMinutes;
          }
        }

        // Create sleep sessions with validation
        for (const [nightKey, night] of Array.from(sleepNights.entries())) {
          const totalMinutes = Math.round((night.waketime.getTime() - night.bedtime.getTime()) / (1000 * 60));
          
          // Validation: Ensure bedtime is within reasonable range (within 16 hours before wake time)
          // This filters out cases where a sleep stage transition was incorrectly used as bedtime
          if (totalMinutes > 16 * 60) {
            console.log(`⚠️ Rejecting sleep session with unrealistic duration: ${totalMinutes} mins (${night.bedtime.toISOString()} to ${night.waketime.toISOString()})`);
            continue;
          }
          
          // Validation: Must have at least 1 hour of sleep
          if (totalMinutes < 60) {
            console.log(`⚠️ Rejecting sleep session too short: ${totalMinutes} mins`);
            continue;
          }
          
          // Calculate sleep score based on duration and stage quality
          // Actual sleep time excludes awake minutes
          const actualSleepMinutes = totalMinutes - night.awakeMinutes;
          const sleepHours = actualSleepMinutes / 60;
          let sleepScore = 70; // Base score
          
          // Adjust for actual sleep duration (optimal 7-9 hours)
          if (sleepHours >= 7 && sleepHours <= 9) {
            sleepScore += 15;
          } else if (sleepHours >= 6 && sleepHours < 7) {
            sleepScore += 8;
          } else if (sleepHours < 6) {
            sleepScore -= 15;
          } else if (sleepHours > 9) {
            sleepScore -= 5;
          }
          
          // Adjust for deep sleep (should be ~15-20% of actual sleep time)
          if (night.deepMinutes > 0 && actualSleepMinutes > 0) {
            const deepPercentage = night.deepMinutes / actualSleepMinutes;
            if (deepPercentage >= 0.15 && deepPercentage <= 0.25) {
              sleepScore += 10;
            } else if (deepPercentage < 0.10) {
              sleepScore -= 5;
            }
          }
          
          // Adjust for REM sleep (should be ~20-25% of actual sleep time)
          if (night.remMinutes > 0 && actualSleepMinutes > 0) {
            const remPercentage = night.remMinutes / actualSleepMinutes;
            if (remPercentage >= 0.18 && remPercentage <= 0.28) {
              sleepScore += 10;
            } else if (remPercentage < 0.15) {
              sleepScore -= 5;
            }
          }
          
          // Penalize excessive awake time (>10% of time in bed is poor sleep quality)
          if (night.awakeMinutes > 0) {
            const awakePercentage = night.awakeMinutes / totalMinutes;
            if (awakePercentage > 0.15) {
              // Very poor sleep efficiency (>15% awake)
              sleepScore -= 20;
            } else if (awakePercentage > 0.10) {
              // Moderate awake time (10-15% awake)
              sleepScore -= 10;
            }
          }
          
          // Ensure score is between 0 and 100
          sleepScore = Math.max(0, Math.min(100, Math.round(sleepScore)));
          
          const quality = sleepScore >= 80 ? "excellent" : sleepScore >= 60 ? "good" : sleepScore >= 40 ? "fair" : "poor";

          console.log(`💾 Creating sleep session for ${nightKey}: ${night.bedtime.toISOString()} to ${night.waketime.toISOString()} (${totalMinutes} mins, score: ${sleepScore})`);
          
          await storage.upsertSleepSession({
            userId,
            bedtime: night.bedtime,
            waketime: night.waketime,
            totalMinutes,
            awakeMinutes: night.awakeMinutes,
            lightMinutes: night.lightMinutes,
            deepMinutes: night.deepMinutes,
            remMinutes: night.remMinutes,
            sleepScore,
            quality,
            source: "ios-healthkit",
          });
          insertedCount++;
        }
      }

      // Process workout data
      if (workouts && workouts.length > 0) {
        console.log(`🏃 Processing ${workouts.length} workout samples`);
        for (const workout of workouts) {
          const startTime = new Date(workout.startDate);
          const endTime = new Date(workout.endDate);
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

          // Map workout type from HealthKit
          const workoutType = workout.workoutActivityType?.toLowerCase() || "other";
          const calories = workout.totalEnergyBurned || 0;

          await storage.createWorkoutSession({
            userId,
            date: startTime.toISOString().split('T')[0],
            exerciseName: workoutType,
            sets: 1,
            reps: null,
            weight: null,
            notes: `Distance: ${workout.totalDistance || 0}m`,
            duration,
            calories,
            avgHeartRate: workout.averageHeartRate ? Math.round(workout.averageHeartRate) : null,
            maxHeartRate: workout.maxHeartRate ? Math.round(workout.maxHeartRate) : null,
            sourceType: "ios-healthkit",
            sourceId: workout.uuid || null,
          });
          insertedCount++;
        }
      }

      console.log(`✅ Capacitor sync complete: ${insertedCount} items inserted/updated`);

      res.json({
        success: true,
        message: `Synced ${insertedCount} health data points`,
        insertedCount,
      });
    } catch (error: any) {
      console.error("Error processing Capacitor HealthKit sync:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cleanup endpoint to remove old test data
  app.post("/api/cleanup-test-data", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Delete old ai-extracted biomarkers
      const deletedBiomarkers = await db.delete(biomarkers)
        .where(and(
          eq(biomarkers.userId, userId),
          eq(biomarkers.source, 'ai-extracted')
        ))
        .returning();
      
      // Delete all old sleep sessions
      const deletedSleep = await db.delete(sleepSessions)
        .where(eq(sleepSessions.userId, userId))
        .returning();
      
      console.log(`🗑️ Cleaned up ${deletedBiomarkers.length} ai-extracted biomarkers and ${deletedSleep.length} sleep sessions`);
      
      res.json({
        success: true,
        deletedBiomarkers: deletedBiomarkers.length,
        deletedSleepSessions: deletedSleep.length
      });
    } catch (error: any) {
      console.error("Error cleaning up test data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Migrate test user data to authenticated user
  app.post("/api/migrate-test-data", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const testUserId = 'test-user-1';

    try {
      if (userId === testUserId) {
        return res.json({ 
          success: true, 
          message: "You are already the test user, no migration needed" 
        });
      }

      // Update all tables to transfer data from test-user-1 to current user
      const [healthRecordsUpdated] = await Promise.all([
        db.update(healthRecords)
          .set({ userId })
          .where(eq(healthRecords.userId, testUserId))
          .returning(),
        db.update(biomarkers)
          .set({ userId })
          .where(eq(biomarkers.userId, testUserId)),
        db.update(sleepSessions)
          .set({ userId })
          .where(eq(sleepSessions.userId, testUserId)),
        db.update(mealPlans)
          .set({ userId })
          .where(eq(mealPlans.userId, testUserId)),
        db.update(trainingSchedules)
          .set({ userId })
          .where(eq(trainingSchedules.userId, testUserId)),
        db.update(recommendations)
          .set({ userId })
          .where(eq(recommendations.userId, testUserId)),
      ]);

      console.log(`✅ Migrated all test-user-1 data to user ${userId}`);
      
      res.json({
        success: true,
        message: "Successfully migrated all test data to your account",
        healthRecordsMigrated: healthRecordsUpdated.length
      });
    } catch (error: any) {
      console.error("Error migrating test data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Temporary token store for WebSocket authentication
  const wsTokens = new Map<string, { userId: string, expiresAt: number }>();

  // Generate temporary token for WebSocket authentication
  app.post("/api/voice-chat/token", isAuthenticated, requirePremium(PremiumFeature.VOICE_CHAT), async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;

      // Generate token (simple random string)
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Token expires in 30 seconds (enough time to establish connection)
      wsTokens.set(token, {
        userId,
        expiresAt: Date.now() + 30000
      });

      res.json({ token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for OpenAI Realtime API (Premium voice chat feature)
  const wss = new WebSocketServer({ server: httpServer, path: "/api/voice-chat" });

  wss.on("connection", async (clientWs: any, req: IncomingMessage) => {
    console.log("🎙️ Voice chat WebSocket connection attempt");

    try {
      // Extract token from URL query parameter
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        console.log("❌ No token provided");
        clientWs.close(4001, "Authentication required");
        return;
      }

      // Verify token
      const tokenData = wsTokens.get(token);
      if (!tokenData) {
        console.log("❌ Invalid token");
        clientWs.close(4001, "Invalid token");
        return;
      }

      // Check if token expired
      if (Date.now() > tokenData.expiresAt) {
        console.log("❌ Token expired");
        wsTokens.delete(token);
        clientWs.close(4001, "Token expired");
        return;
      }

      // Delete token after use (one-time use)
      wsTokens.delete(token);

      const userId = tokenData.userId;
      const user = await storage.getUser(userId);

      console.log(`✅ Voice chat authenticated for user ${userId} (${user.subscriptionTier})`);

      // Fetch comprehensive user data (EXACTLY matching regular chat)
      const now = new Date();
      
      // Get ALL historical data for complete context
      const [
        allBiomarkers,
        allSleepSessions,
        allWorkoutSessions,
        allTrainingSchedules,
        healthRecords,
        supplements,
        mealPlans,
        allGoals,
        fitnessProfile,
        nutritionProfile,
        onboardingStatus
      ] = await Promise.all([
        storage.getBiomarkers(userId),
        storage.getSleepSessions(userId),
        storage.getWorkoutSessions(userId),
        storage.getTrainingSchedules(userId),
        storage.getHealthRecords(userId),
        storage.getSupplements(userId),
        storage.getMealPlans(userId),
        storage.getGoals(userId),
        storage.getFitnessProfile(userId),
        storage.getNutritionProfile(userId),
        storage.getOnboardingStatus(userId)
      ]);

      // Get historical readiness scores (last 30 days)
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const historicalReadiness = await storage.getReadinessScores(userId, thirtyDaysAgo, now);
      
      // Get latest readiness score
      const readinessScore = await storage.getReadinessScoreForDate(userId, today);
      
      // Get recent insights for comprehensive context
      const recentInsights = await storage.getInsights(userId, 20);
      
      // Get downvoted recovery protocols to avoid suggesting them
      const downvotedProtocolIds = await storage.getDownvotedProtocols(userId);
      const downvotedProtocols: string[] = [];
      if (downvotedProtocolIds.length > 0) {
        for (const protocolId of downvotedProtocolIds) {
          const protocol = await storage.getRecoveryProtocol(protocolId);
          if (protocol) {
            downvotedProtocols.push(protocol.name);
          }
        }
      }

      // Format latest key biomarkers
      const latestWeight = allBiomarkers
        .filter(b => b.type === 'weight')
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
      
      const latestHRV = allBiomarkers
        .filter(b => b.type === 'hrv')
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
      
      const latestRHR = allBiomarkers
        .filter(b => b.type === 'resting-heart-rate')
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

      // Build comprehensive user context (matching regular chat)
      const personalMemories = user?.personalContext || null;
      const activeGoals = allGoals.filter(g => g.status === 'active');
      
      // Format latest sleep data
      const latestSleep = allSleepSessions.length > 0 
        ? allSleepSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;
      
      // Format readiness trend
      const readinessTrend = historicalReadiness.length > 0
        ? `Average last 7 days: ${Math.round(historicalReadiness.slice(-7).reduce((sum, r) => sum + r.score, 0) / Math.min(7, historicalReadiness.length))}/100`
        : 'No history';
      
      // Build comprehensive context for AI
      const userContextData = {
        // User profile
        name: user.firstName || 'User',
        age: user.dateOfBirth ? Math.floor((now.getTime() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        gender: user.gender,
        height: user.height,
        activityLevel: user.activityLevel,
        timezone: user.timezone,
        
        // Latest metrics
        weight: latestWeight ? `${latestWeight.value} ${latestWeight.unit} (${new Date(latestWeight.recordedAt).toLocaleDateString()})` : 'Not recorded',
        hrv: latestHRV ? `${latestHRV.value} ms (${new Date(latestHRV.recordedAt).toLocaleDateString()})` : 'Not recorded',
        restingHR: latestRHR ? `${latestRHR.value} bpm (${new Date(latestRHR.recordedAt).toLocaleDateString()})` : 'Not recorded',
        
        // Readiness & Recovery
        todayReadiness: readinessScore ? `${readinessScore.score}/100 (${readinessScore.quality}) - ${readinessScore.recommendation}` : 'Not available',
        readinessTrend,
        
        // Sleep
        lastNightSleep: latestSleep ? `${Math.round(latestSleep.totalMinutes / 60)}h ${latestSleep.totalMinutes % 60}m, Quality: ${latestSleep.sleepScore || 'N/A'}/100` : 'No data',
        
        // Workouts
        recentWorkouts: allWorkoutSessions.slice(-5).map(w => `${w.name} (${new Date(w.date).toLocaleDateString()}, ${w.duration}min)`).join('\n'),
        totalWorkouts: allWorkoutSessions.length,
        
        // Goals
        activeGoals: activeGoals.map(g => `${g.metricType}: ${g.currentValue} → ${g.targetValue} ${g.unit}`).join('\n'),
        
        // Fitness profile
        fitnessGoal: fitnessProfile?.primaryGoal || 'Not set',
        experience: fitnessProfile?.experienceLevel || 'Not set',
        exercisePreferences: fitnessProfile?.exercisePreferences?.join(', ') || 'Not set',
        
        // Nutrition
        dietPreferences: nutritionProfile?.dietaryPreferences?.join(', ') || 'Not set',
        mealsPerDay: nutritionProfile?.mealsPerDay || 'Not set',
        
        // Data availability
        totalBiomarkers: allBiomarkers.length,
        totalSleepSessions: allSleepSessions.length,
        
        // Personal memories
        memories: personalMemories,
        
        // Preferences
        downvotedProtocols: downvotedProtocols.length > 0 ? downvotedProtocols.join(', ') : 'None',
        
        // Recent AI insights
        recentInsights: recentInsights.slice(0, 3).map(i => `- ${i.message}`).join('\n')
      };

      // Import OpenAI dynamically
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Connect to OpenAI Realtime API
      const realtimeUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
      const { default: WebSocket } = await import('ws');
      
      const openaiWs = new WebSocket(realtimeUrl, {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1",
        },
      });

      openaiWs.on("open", () => {
        console.log("🔗 Connected to OpenAI Realtime API");
        
        // Build guardrails prompt for voice chat
        const guardrailsPrompt = buildGuardrailsSystemPrompt();
        
        // Configure session with comprehensive user data
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: `${guardrailsPrompt}

You are a knowledgeable, supportive AI health coach for HealthPilot. You have complete access to the user's health data and history.

## USER PROFILE:
Name: ${userContextData.name}
Age: ${userContextData.age || 'Not provided'}
Gender: ${userContextData.gender || 'Not provided'}
Height: ${userContextData.height ? userContextData.height + ' cm' : 'Not provided'}
Activity Level: ${userContextData.activityLevel || 'Not provided'}

## LATEST METRICS:
Weight: ${userContextData.weight}
HRV: ${userContextData.hrv}
Resting Heart Rate: ${userContextData.restingHR}

## READINESS & RECOVERY:
Today's Readiness: ${userContextData.todayReadiness}
Readiness Trend: ${userContextData.readinessTrend}
Avoid These Recovery Protocols: ${userContextData.downvotedProtocols}

## SLEEP:
Last Night: ${userContextData.lastNightSleep}

## WORKOUTS:
Recent Training:
${userContextData.recentWorkouts || 'No recent workouts'}
Total Workouts Tracked: ${userContextData.totalWorkouts}

## ACTIVE GOALS:
${userContextData.activeGoals || 'No active goals set'}

## FITNESS PROFILE:
Primary Goal: ${userContextData.fitnessGoal}
Experience Level: ${userContextData.experience}
Exercise Preferences: ${userContextData.exercisePreferences}

## NUTRITION:
Dietary Preferences: ${userContextData.dietPreferences}
Meals Per Day: ${userContextData.mealsPerDay}

## RECENT AI INSIGHTS:
${userContextData.recentInsights || 'No recent insights'}

## PERSONAL MEMORIES:
${userContextData.memories || 'No personal context saved yet'}

## DATA AVAILABILITY:
- Total Biomarkers: ${userContextData.totalBiomarkers}
- Total Sleep Sessions: ${userContextData.totalSleepSessions}
- Total Workouts: ${userContextData.totalWorkouts}

Your role:
- Provide personalized guidance based on THEIR ACTUAL DATA above
- Answer questions using SPECIFIC VALUES from their metrics
- Reference their goals, preferences, and personal memories when appropriate
- Be warm, empathetic, and conversational
- Keep responses concise for voice - aim for 2-3 sentences unless asked for detail
- Speak naturally as their personal health coach

IMPORTANT: When discussing metrics like weight, HRV, sleep, etc., always use the EXACT values provided above, not generic estimates.`,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            temperature: 0.8,
          },
        };

        openaiWs.send(JSON.stringify(sessionConfig));

        // Send initial greeting after a brief delay to ensure session is configured
        setTimeout(() => {
          const userName = user.firstName || 'there';
          const greeting = {
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Say a brief, warm greeting to ${userName}. Welcome them to voice chat and let them know you're here to help with their health and fitness goals. Keep it short and conversational, under 2 sentences.`
                }
              ]
            }
          };

          const responseCreate = {
            type: "response.create"
          };

          openaiWs.send(JSON.stringify(greeting));
          openaiWs.send(JSON.stringify(responseCreate));
          console.log(`👋 Sent greeting for ${userName}`);
        }, 500);
      });

      openaiWs.on("message", (data: any) => {
        // Relay OpenAI messages to client
        clientWs.send(data.toString());
      });

      openaiWs.on("error", (error: any) => {
        console.error("❌ OpenAI WebSocket error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        clientWs.close(4000, "OpenAI connection error");
      });

      openaiWs.on("close", (code: number, reason: Buffer) => {
        const reasonStr = reason.toString();
        console.log(`🔌 OpenAI WebSocket closed - Code: ${code}, Reason: ${reasonStr}`);
        console.log("Close event details:", { code, reason: reasonStr });
        clientWs.close();
      });

      clientWs.on("message", (data: any) => {
        // Relay client messages to OpenAI
        if (openaiWs.readyState === 1) { // OPEN
          openaiWs.send(data.toString());
        }
      });

      clientWs.on("close", () => {
        console.log("🔌 Client WebSocket closed");
        openaiWs.close();
      });

      clientWs.on("error", (error: any) => {
        console.error("❌ Client WebSocket error:", error);
        openaiWs.close();
      });

    } catch (error: any) {
      console.error("❌ Voice chat WebSocket error:", error);
      clientWs.close(4000, error.message);
    }
  });

  // Proactive Suggestion Routes
  app.get("/api/proactive-suggestions/check-metrics", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const deficits = await storage.checkUserMetrics(userId);
      res.json(deficits);
    } catch (error: any) {
      console.error("Error checking metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/proactive-suggestions/generate", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { deficit } = req.body;
      const suggestion = await storage.generateProactiveSuggestion(userId, deficit);
      res.json(suggestion);
    } catch (error: any) {
      console.error("Error generating suggestion:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/proactive-suggestions/active", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const suggestions = await storage.getActiveSuggestions(userId);
      res.json(suggestions);
    } catch (error: any) {
      console.error("Error getting active suggestions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/proactive-suggestions/:id/respond", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { id } = req.params;
      const { response, scheduledFor } = req.body;
      const result = await storage.respondToSuggestion(
        userId,
        id,
        response,
        scheduledFor ? new Date(scheduledFor) : undefined
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error responding to suggestion:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Background monitoring endpoint - can be called by cron job
  app.post("/api/proactive-suggestions/monitor-all", async (req, res) => {
    try {
      const results = [];
      
      // Get all active users (users with activity in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { users } = await storage.getAllUsers(1000, 0);
      
      for (const user of users) {
        try {
          // Check metrics for each user
          const deficits = await storage.checkUserMetrics(user.id);
          
          // Generate suggestions for high priority deficits
          for (const deficit of deficits) {
            if (deficit.priority === 'high' || deficit.priority === 'medium') {
              const suggestion = await storage.generateProactiveSuggestion(user.id, deficit);
              if (suggestion.id) {
                results.push({ userId: user.id, suggestionId: suggestion.id, deficit: deficit.metricType });
              }
            }
          }
        } catch (userError: any) {
          console.error(`Error processing user ${user.id}:`, userError);
          results.push({ userId: user.id, error: userError.message });
        }
      }
      
      res.json({ 
        success: true, 
        processedUsers: users.length,
        suggestionsGenerated: results.filter(r => r.suggestionId).length,
        results 
      });
    } catch (error: any) {
      console.error("Error monitoring all users:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Voice Chat & Feedback API Endpoints
  
  // Submit feedback (thumbs up/down) on AI messages
  app.post("/api/chat/feedback", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const validationResult = chatFeedbackSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid feedback data", 
          details: validationResult.error.format() 
        });
      }

      const { messageId, feedbackType, context } = validationResult.data;

      const feedback = await storage.submitChatFeedback({
        messageId,
        userId,
        feedbackType,
        context: context || null,
      });

      res.json(feedback);
    } catch (error: any) {
      console.error("Error submitting chat feedback:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create voice session summary
  app.post("/api/voice/session", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const validationResult = voiceSessionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid voice session data", 
          details: validationResult.error.format() 
        });
      }

      const { summary, embedding } = validationResult.data;

      const session = await storage.createVoiceSession({
        userId,
        summary,
        embedding: embedding || null,
      });

      res.json(session);
    } catch (error: any) {
      console.error("Error creating voice session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create coach memory with embedding
  app.post("/api/coach/memory", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { summary, memoryType } = req.body;
      
      if (!summary || !memoryType) {
        return res.status(400).json({ 
          error: "Summary and memoryType are required" 
        });
      }

      // Generate embedding for the summary
      const { generateEmbedding } = await import("./services/embeddings");
      const embedding = await generateEmbedding(summary);

      const memory = await storage.addCoachMemory({
        userId,
        summary,
        memoryType,
        embedding: JSON.stringify(embedding),
      });

      res.json(memory);
    } catch (error: any) {
      console.error("Error creating coach memory:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get coach memories (optionally filtered by type)
  app.get("/api/coach/memory", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { memoryType } = req.query;
      
      const memories = await storage.getCoachMemories(
        userId,
        memoryType as string | undefined
      );

      res.json(memories);
    } catch (error: any) {
      console.error("Error getting coach memories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete all user memory (Forget Me functionality)
  app.delete("/api/coach/memory", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      await storage.resetUserMemory(userId);

      res.json({ success: true, message: "All coaching memory deleted" });
    } catch (error: any) {
      console.error("Error resetting user memory:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Log safety escalation
  app.post("/api/safety/escalation", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const validationResult = safetyEscalationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid safety escalation data", 
          details: validationResult.error.format() 
        });
      }

      const { triggerKeyword, context } = validationResult.data;

      const escalation = await storage.logSafetyEscalation({
        userId,
        triggerKeyword,
        context: context || null,
      });

      res.json(escalation);
    } catch (error: any) {
      console.error("Error logging safety escalation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get weekly reflection summary
  app.get("/api/coach/reflection", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      // Default to last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const reflectionData = await storage.getWeeklyReflectionData(
        userId,
        startDate,
        endDate
      );

      res.json(reflectionData);
    } catch (error: any) {
      console.error("Error getting weekly reflection:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
