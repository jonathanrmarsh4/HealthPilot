import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import multer from "multer";
import { insertBiomarkerSchema, insertHealthRecordSchema, biomarkers, sleepSessions, healthRecords, mealPlans, trainingSchedules, recommendations } from "@shared/schema";
import { listHealthDocuments, downloadFile, getFileMetadata } from "./services/googleDrive";
import { analyzeHealthDocument, generateMealPlan, generateTrainingSchedule, generateHealthRecommendations, chatWithHealthCoach, generateDailyInsights } from "./services/ai";
import { parseISO, isValid } from "date-fns";
import { eq, and } from "drizzle-orm";
import { isAuthenticated, isAdmin, webhookAuth } from "./replitAuth";
import { z } from "zod";

// Zod schema for admin user updates
const adminUserUpdateSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  subscriptionTier: z.enum(["free", "premium", "enterprise"]).optional(),
  subscriptionStatus: z.enum(["active", "inactive", "cancelled", "past_due"]).optional(),
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

      const dbUser = await storage.getUser(user.claims.sub);
      if (!dbUser) {
        return res.status(200).send('null');
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

  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting admin stats:", error);
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

  app.get("/api/google-drive/files", isAuthenticated, async (req, res) => {
    try {
      const files = await listHealthDocuments();
      res.json(files);
    } catch (error: any) {
      console.error("Error listing Google Drive files:", error);
      res.status(500).json({ error: error.message });
    }
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
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileText = req.file.buffer.toString('utf-8');
      const analysis = await analyzeHealthDocument(fileText, req.file.originalname);

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
        for (const biomarker of analysis.biomarkers) {
          await storage.createBiomarker({
            userId,
            type: biomarker.type,
            value: biomarker.value,
            unit: biomarker.unit,
            source: 'ai-extracted',
            recordId: record.id,
            recordedAt: parseBiomarkerDate(biomarker.date, analysis.documentDate, undefined),
          });
        }
      }

      res.json(record);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      
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
      const validatedData = insertBiomarkerSchema.parse({
        ...req.body,
        userId,
      });
      const biomarker = await storage.createBiomarker(validatedData);
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
      res.json(biomarkers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/biomarkers/chart/:type", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { type } = req.params;
      const { days = '7' } = req.query;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));
      
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

  app.post("/api/meal-plans/generate", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const userProfile = req.body;
      
      const chatHistory = await storage.getChatMessages(userId);
      const chatContext = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      const mealPlans = await generateMealPlan({
        ...userProfile,
        chatContext
      });
      
      const savedPlans = [];
      for (const plan of mealPlans) {
        const saved = await storage.createMealPlan({
          ...plan,
          userId,
        });
        savedPlans.push(saved);
      }
      
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

  app.post("/api/training-schedules/generate", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const userProfile = req.body;
      
      const chatHistory = await storage.getChatMessages(userId);
      const chatContext = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      const schedules = await generateTrainingSchedule({
        ...userProfile,
        chatContext
      });
      
      const savedSchedules = [];
      for (const schedule of schedules) {
        const saved = await storage.createTrainingSchedule({
          ...schedule,
          userId,
          completed: 0,
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

  app.post("/api/recommendations/generate", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const biomarkers = await storage.getBiomarkers(userId);
      
      const chatHistory = await storage.getChatMessages(userId);
      const chatContext = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Get recent sleep sessions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sleepSessions = await storage.getSleepSessions(userId, thirtyDaysAgo, new Date());
      
      // Get recent AI insights for context
      const recentInsights = await storage.getInsights(userId, 10);
      
      const recommendations = await generateHealthRecommendations({
        biomarkers,
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
      
      const insights = await generateDailyInsights({
        biomarkers: biomarkers.slice(0, 50), // Last 50 biomarkers
        sleepSessions,
        chatContext,
        timezone
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

  app.post("/api/chat", isAuthenticated, async (req, res) => {
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

      const chatHistory = await storage.getChatMessages(userId);
      
      const conversationHistory = chatHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      // Gather context for AI
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const now = new Date();
      
      // Get all biomarkers from last 7 days and sort by newest first
      const allBiomarkers = await storage.getBiomarkers(userId);
      const recentBiomarkers = allBiomarkers
        .filter(b => new Date(b.recordedAt) >= sevenDaysAgo)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
        .slice(0, 20);

      const recentInsights = await storage.getInsights(userId, 5);
      
      const user = await storage.getUser(userId);

      const context = {
        recentBiomarkers,
        recentInsights,
        currentPage,
        userTimezone: user?.timezone || undefined
      };

      const aiResponse = await chatWithHealthCoach(conversationHistory, context);

      const assistantMessage = await storage.createChatMessage({
        userId,
        role: "assistant",
        content: aiResponse,
      });

      // Check if AI response contains a training plan to save
      let trainingPlanSaved = false;
      const trainingPlanMatch = aiResponse.match(/<<<SAVE_TRAINING_PLAN>>>([\s\S]*?)<<<END_SAVE_TRAINING_PLAN>>>/);
      
      if (trainingPlanMatch) {
        try {
          const trainingPlanJson = trainingPlanMatch[1].trim();
          const trainingPlans = JSON.parse(trainingPlanJson);
          
          // Save each workout from the plan
          for (const plan of trainingPlans) {
            await storage.createTrainingSchedule({
              userId,
              day: plan.day,
              workoutType: plan.workoutType,
              duration: plan.duration,
              intensity: plan.intensity,
              exercises: plan.exercises,
              completed: 0,
            });
          }
          
          trainingPlanSaved = true;
        } catch (e) {
          console.error("Failed to parse and save training plan:", e);
        }
      }

      res.json({
        userMessage,
        assistantMessage,
        trainingPlanSaved,
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
      const { visible, order } = req.body;
      if (!Array.isArray(visible) || !Array.isArray(order)) {
        return res.status(400).json({ error: "visible and order must be arrays" });
      }
      await storage.saveDashboardPreferences(userId, { visible, order });
      res.json({ success: true, visible, order });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

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

  app.post("/api/health-auto-export/ingest", webhookAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      console.log("📥 Received Health Auto Export data:", JSON.stringify(req.body, null, 2));
      
      const { data } = req.body;
      
      if (!data || !data.metrics) {
        console.log("❌ Invalid data format - missing data.metrics");
        return res.status(400).json({ error: "Invalid data format" });
      }

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
          "steps": "steps",
          "calories": "kcal",
          "blood-pressure-systolic": "mmHg",
          "blood-pressure-diastolic": "mmHg",
          "oxygen-saturation": "%",
          "sleep-hours": "hours",
        };
        
        return { value, unit: defaultUnits[biomarkerType] || incomingUnit || "" };
      };

      const metricMapping: Record<string, string> = {
        "Heart Rate": "heart-rate",
        "heart_rate": "heart-rate",
        "Resting Heart Rate": "heart-rate",
        "resting_heart_rate": "heart-rate",
        "Blood Glucose": "blood-glucose",
        "blood_glucose": "blood-glucose",
        "Weight": "weight",
        "weight": "weight",
        "weight_body_mass": "weight",
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

      for (const metric of data.metrics) {
        // Special handling for sleep analysis - create sleep sessions
        if (metric.name === "sleep_analysis" && metric.data && Array.isArray(metric.data)) {
          for (const dataPoint of metric.data) {
            // Use inBedStart/inBedEnd for full session duration (includes awake time)
            if (dataPoint.inBedStart && dataPoint.inBedEnd) {
              const bedtime = new Date(dataPoint.inBedStart);
              const waketime = new Date(dataPoint.inBedEnd);
              // Calculate total minutes from in-bed duration
              const totalMinutes = Math.round((waketime.getTime() - bedtime.getTime()) / (1000 * 60));
              const awakeMinutes = Math.round((dataPoint.awake || 0) * 60);
              const deepMinutes = Math.round((dataPoint.deep || 0) * 60);
              const remMinutes = Math.round((dataPoint.rem || 0) * 60);
              const coreMinutes = Math.round((dataPoint.core || 0) * 60);
              
              // Use Apple Health's sleep score if available, otherwise calculate our own
              let sleepScore: number;
              
              if (dataPoint.sleepScore !== undefined && dataPoint.sleepScore !== null) {
                // Use Apple Health's actual sleep score
                sleepScore = Math.round(dataPoint.sleepScore);
                console.log(`✅ Using Apple Health sleep score: ${sleepScore}`);
              } else if (dataPoint.quality !== undefined && dataPoint.quality !== null) {
                // Some Health Auto Export versions send quality as a score
                sleepScore = Math.round(dataPoint.quality);
                console.log(`✅ Using Health Auto Export quality score: ${sleepScore}`);
              } else {
                // Calculate our own score (0-100) based on sleep quality
                sleepScore = 70; // Base score
                const sleepHours = totalMinutes / 60;
                
                // Adjust for total sleep duration (optimal 7-9 hours)
                if (sleepHours >= 7 && sleepHours <= 9) {
                  sleepScore += 10;
                } else if (sleepHours >= 6 && sleepHours < 7) {
                  sleepScore += 5;
                } else if (sleepHours < 6) {
                  sleepScore -= 10;
                }
                
                // Adjust for deep sleep (should be ~20% of total)
                const deepPercentage = (dataPoint.deep || 0) / sleepHours;
                if (deepPercentage >= 0.15 && deepPercentage <= 0.25) {
                  sleepScore += 10;
                } else if (deepPercentage < 0.10) {
                  sleepScore -= 5;
                }
                
                // Adjust for REM sleep (should be ~20-25% of total)
                const remPercentage = (dataPoint.rem || 0) / sleepHours;
                if (remPercentage >= 0.18 && remPercentage <= 0.28) {
                  sleepScore += 10;
                } else if (remPercentage < 0.15) {
                  sleepScore -= 5;
                }
                
                // Ensure score is between 0 and 100
                sleepScore = Math.max(0, Math.min(100, sleepScore));
                console.log(`🧮 Calculated custom sleep score: ${sleepScore}`);
              }
              
              // Determine quality
              let quality = "Fair";
              if (sleepScore >= 85) quality = "Excellent";
              else if (sleepScore >= 75) quality = "Good";
              else if (sleepScore >= 60) quality = "Fair";
              else quality = "Poor";
              
              await storage.upsertSleepSession({
                userId,
                bedtime,
                waketime,
                totalMinutes,
                awakeMinutes,
                lightMinutes: coreMinutes, // Core sleep maps to light
                deepMinutes,
                remMinutes,
                sleepScore,
                quality,
                source: "apple-health",
              });
              
              sleepSessionsCount++;
            }
          }
          continue; // Skip the normal biomarker processing for sleep
        }
        
        const biomarkerType = metricMapping[metric.name];
        
        if (!biomarkerType) {
          continue;
        }

        if (metric.name === "Blood Pressure" && metric.data) {
          for (const dataPoint of metric.data) {
            if (dataPoint.systolic) {
              await storage.upsertBiomarker({
                userId,
                type: "blood-pressure-systolic",
                value: dataPoint.systolic,
                unit: "mmHg",
                source: "health-auto-export",
                recordedAt: new Date(dataPoint.date),
              });
              insertedCount++;
            }
            if (dataPoint.diastolic) {
              await storage.upsertBiomarker({
                userId,
                type: "blood-pressure-diastolic",
                value: dataPoint.diastolic,
                unit: "mmHg",
                source: "health-auto-export",
                recordedAt: new Date(dataPoint.date),
              });
              insertedCount++;
            }
          }
        } else if (metric.data && Array.isArray(metric.data)) {
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
              
              await storage.upsertBiomarker({
                userId,
                type: biomarkerType,
                value: converted.value,
                unit: converted.unit,
                source: "health-auto-export",
                recordedAt: new Date(dataPoint.date),
              });
              insertedCount++;
            }
          }
        }
      }

      res.json({ 
        success: true, 
        message: `Successfully imported ${insertedCount} biomarkers and ${sleepSessionsCount} sleep sessions`,
        biomarkersCount: insertedCount,
        sleepSessionsCount: sleepSessionsCount
      });
    } catch (error: any) {
      console.error("Error processing Health Auto Export data:", error);
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

  const httpServer = createServer(app);
  return httpServer;
}
