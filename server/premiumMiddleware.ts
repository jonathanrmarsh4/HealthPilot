import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { startOfDay } from "date-fns";

// Free tier limits
export const FREE_TIER_LIMITS = {
  messagesPerMonth: 50,
  biomarkerTypes: 3,
  historicalDataDays: 7,
};

// Premium features enum
export enum PremiumFeature {
  UNLIMITED_CHAT = "unlimited_chat",
  MEAL_PLANS = "meal_plans",
  BIOLOGICAL_AGE = "biological_age",
  APPLE_HEALTH_SYNC = "apple_health_sync",
  UNLIMITED_BIOMARKERS = "unlimited_biomarkers",
  UNLIMITED_HISTORY = "unlimited_history",
  VOICE_CHAT = "voice_chat",
  AI_INSIGHTS = "ai_insights",
}

// Helper to check if user has premium access
export async function isPremiumUser(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;
  
  // Admins automatically get premium access
  if (user.role === "admin") return true;
  
  return (
    (user.subscriptionTier === "premium" || user.subscriptionTier === "enterprise") &&
    user.subscriptionStatus === "active"
  );
}

// Helper to check monthly message count for free users
export async function canSendMessage(userId: string): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
}> {
  const isPremium = await isPremiumUser(userId);
  
  if (isPremium) {
    return { allowed: true, count: 0, limit: -1 }; // Unlimited
  }
  
  // Get current month's message count
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed
  const count = await storage.getMonthlyMessageUsage(userId, year, month);
  
  return {
    allowed: count < FREE_TIER_LIMITS.messagesPerMonth,
    count,
    limit: FREE_TIER_LIMITS.messagesPerMonth,
  };
}

// Middleware to require premium subscription
export function requirePremium(feature: PremiumFeature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const isPremium = await isPremiumUser(userId);
      
      if (!isPremium) {
        return res.status(403).json({
          error: "Premium subscription required",
          feature,
          message: `This feature requires a premium subscription. Upgrade to access ${feature.replace(/_/g, " ")}.`,
          upgradeUrl: "/pricing",
        });
      }
      
      next();
    } catch (error: any) {
      console.error("Premium check error:", error);
      res.status(500).json({ error: "Failed to verify subscription status" });
    }
  };
}

// Middleware to check message limit for chat
export async function checkMessageLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req.user as any)?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { allowed, count, limit } = await canSendMessage(userId);
    
    if (!allowed) {
      return res.status(429).json({
        error: "Daily message limit reached",
        feature: PremiumFeature.UNLIMITED_CHAT,
        message: `You've reached your daily limit of ${limit} messages. Upgrade to premium for unlimited messages.`,
        count,
        limit,
        upgradeUrl: "/pricing",
      });
    }
    
    // Attach message count to request for tracking
    (req as any).messageCount = count;
    
    next();
  } catch (error: any) {
    console.error("Message limit check error:", error);
    res.status(500).json({ error: "Failed to check message limit" });
  }
}

// Helper to increment message count
export async function incrementMessageCount(userId: string): Promise<void> {
  const isPremium = await isPremiumUser(userId);
  
  // Don't track for premium users
  if (isPremium) return;
  
  const today = startOfDay(new Date());
  await storage.incrementMessageUsage(userId, today);
}

// Helper to get biomarker type count
export async function getBiomarkerTypeCount(userId: string): Promise<number> {
  const biomarkers = await storage.getBiomarkers(userId);
  const uniqueTypes = new Set(biomarkers.map(b => b.type));
  return uniqueTypes.size;
}

// Helper to check if user can add more biomarker types
export async function canAddBiomarkerType(userId: string, newType?: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
}> {
  const isPremium = await isPremiumUser(userId);
  
  if (isPremium) {
    return { allowed: true, current: 0, limit: -1 }; // Unlimited
  }
  
  const biomarkers = await storage.getBiomarkers(userId);
  const uniqueTypes = new Set(biomarkers.map(b => b.type));
  const current = uniqueTypes.size;
  
  // If adding a new type, check if it already exists
  if (newType && uniqueTypes.has(newType)) {
    // Type already exists, so user can add more of this type
    return {
      allowed: true,
      current,
      limit: FREE_TIER_LIMITS.biomarkerTypes,
    };
  }
  
  return {
    allowed: current < FREE_TIER_LIMITS.biomarkerTypes,
    current,
    limit: FREE_TIER_LIMITS.biomarkerTypes,
  };
}

// Middleware to check biomarker type limit
export async function checkBiomarkerLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req.user as any)?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
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
    
    next();
  } catch (error: any) {
    console.error("Biomarker limit check error:", error);
    res.status(500).json({ error: "Failed to check biomarker limit" });
  }
}

// Helper to filter historical data based on subscription tier
export function filterHistoricalData<T extends { createdAt?: Date; recordedAt?: Date }>(
  data: T[],
  userId: string,
  isPremium: boolean
): T[] {
  if (isPremium) {
    return data; // No filtering for premium users
  }
  
  // Free users can only access last 7 days of data
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - FREE_TIER_LIMITS.historicalDataDays);
  
  return data.filter(item => {
    const itemDate = item.recordedAt || item.createdAt;
    if (!itemDate) return true; // Include items without dates
    return new Date(itemDate) >= cutoffDate;
  });
}
