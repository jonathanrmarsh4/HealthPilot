import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import multer from "multer";
import { insertBiomarkerSchema, insertHealthRecordSchema, insertScheduledExerciseRecommendationSchema, biomarkers, sleepSessions, healthRecords, mealPlans, trainingSchedules, recommendations, readinessScores } from "@shared/schema";
import { listHealthDocuments, downloadFile, getFileMetadata } from "./services/googleDrive";
import { analyzeHealthDocument, generateMealPlan, generateTrainingSchedule, generateHealthRecommendations, chatWithHealthCoach, generateDailyInsights, generateRecoveryInsights, generateTrendPredictions, generatePeriodComparison, generateDailyTrainingRecommendation } from "./services/ai";
import { calculatePhenoAge, getBiomarkerDisplayName, getBiomarkerUnit, getBiomarkerSource } from "./services/phenoAge";
import { calculateReadinessScore } from "./services/readiness";
import { parseISO, isValid, subDays } from "date-fns";
import { eq, and, gte } from "drizzle-orm";
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

  app.get("/api/biological-age", isAuthenticated, async (req, res) => {
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

  app.post("/api/meal-plans/generate", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const userProfile = req.body;
      
      // Step 1: Delete past meals to keep only current/future meals
      const deletedCount = await storage.deletePastMealPlans(userId);
      console.log(`🗑️ Deleted ${deletedCount} past meal(s) for user ${userId}`);
      
      // Step 2: Check existing meals to determine start date
      const existingMeals = await storage.getMealPlans(userId);
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      // If there are existing future meals, start from tomorrow
      // Otherwise, start from today
      if (existingMeals.length > 0) {
        startDate.setDate(startDate.getDate() + 1);
      }
      
      const chatHistory = await storage.getChatMessages(userId);
      const chatContext = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Fetch active goals to incorporate into meal planning
      const allGoals = await storage.getGoals(userId);
      const activeGoals = allGoals.filter(goal => goal.status === 'active');
      
      // Step 3: Generate 4 days of meals (16 total) - fits within Claude Haiku token limit
      const mealPlans = await generateMealPlan({
        ...userProfile,
        chatContext,
        activeGoals
      });
      
      // Step 4: Assign dates to meals, generate images, and save them
      const savedPlans = [];
      
      // Helper to get food image URL with curated food images
      const getFoodImageUrl = (mealName: string, mealType: string): string => {
        // Use Unsplash Source API to get real food photos based on meal name
        // This provides actual food images that match the meal content
        const searchTerm = mealName
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special chars
          .replace(/\s+/g, ','); // Convert spaces to commas for multi-term search
        
        // Add 'food' keyword to ensure food-related images
        return `https://source.unsplash.com/800x600/?food,${searchTerm}`;
      };
      
      for (const plan of mealPlans) {
        // Calculate scheduled date based on dayNumber (1-7)
        const dayNumber = (plan as any).dayNumber || 1;
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(startDate.getDate() + (dayNumber - 1));
        
        // Get a food image URL that matches the meal
        const imageUrl = getFoodImageUrl((plan as any).name, (plan as any).mealType);
        
        const saved = await storage.createMealPlan({
          ...plan,
          userId,
          scheduledDate,
          imageUrl,
        });
        savedPlans.push(saved);
      }
      
      // Step 5: Enforce 7-day maximum - delete any meals beyond 7 days from today
      const maxDate = new Date();
      maxDate.setHours(0, 0, 0, 0);
      maxDate.setDate(maxDate.getDate() + 7); // 7 days from today
      
      const cappedCount = await storage.deleteFutureMealsBeyondDate(userId, maxDate);
      if (cappedCount > 0) {
        console.log(`🔒 Enforced 7-day cap: deleted ${cappedCount} meal(s) beyond ${maxDate.toISOString().split('T')[0]}`);
      }
      
      console.log(`✅ Generated ${savedPlans.length} meals for 7 days starting ${startDate.toISOString().split('T')[0]}`);
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

  // Get all exercise recommendations
  app.get("/api/exercise-recommendations", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const status = req.query.status as string | undefined;
    try {
      const recommendations = await storage.getScheduledExerciseRecommendations(userId, status);
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
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

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
      
      // Count exercises per day
      exercises.forEach((ex: any) => {
        if (ex.scheduledDates) {
          ex.scheduledDates.forEach((date: string) => {
            const dateKey = new Date(date).toISOString().split('T')[0];
            if (!calendar[dateKey]) calendar[dateKey] = { exercises: 0, workouts: 0, supplements: 0 };
            calendar[dateKey].exercises++;
          });
        }
      });

      // Count workouts per day
      filteredWorkouts.forEach((wo: any) => {
        if (wo.scheduledFor) {
          const dateKey = new Date(wo.scheduledFor).toISOString().split('T')[0];
          if (!calendar[dateKey]) calendar[dateKey] = { exercises: 0, workouts: 0, supplements: 0 };
          calendar[dateKey].workouts++;
        }
      });

      // Supplements are daily, so add to all days in range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
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
      
      // 2. Get recent workout history (last 7 days)
      const workoutSessions = await storage.getWorkoutSessions(userId);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentWorkouts = workoutSessions
        .filter(w => new Date(w.startTime) >= sevenDaysAgo && new Date(w.startTime) < today)
        .map(w => ({
          type: w.workoutType,
          duration: w.duration || 0,
          startTime: new Date(w.startTime),
        }));
      
      // 3. Generate AI recommendation with safety-first logic
      const aiRecommendation = await generateDailyTrainingRecommendation({
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
      });
      
      res.json({
        readinessScore: readinessData!.score,
        readinessRecommendation: readinessData!.recommendation,
        recommendation: aiRecommendation,
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
      "body-fat": "%",
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
      
      // Get onboarding status
      const onboardingStatus = await storage.getOnboardingStatus(userId);
      const isOnboarding = onboardingStatus ? !onboardingStatus.completed : false;
      let onboardingStep = onboardingStatus?.step || null;
      
      // Initialize onboarding if not completed and step is null
      if (isOnboarding && !onboardingStep) {
        await storage.updateOnboardingStep(userId, 'welcome');
        onboardingStep = 'welcome';
      }
      
      // Fetch active goals to provide goal-driven recommendations
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

      const context = {
        recentBiomarkers,
        recentInsights,
        currentPage,
        userTimezone: user?.timezone || undefined,
        isOnboarding,
        onboardingStep,
        activeGoals,
        readinessScore: readinessScore || undefined,
        downvotedProtocols: downvotedProtocols.length > 0 ? downvotedProtocols : undefined,
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
          
          // Auto-advance onboarding step when training plan is saved
          if (isOnboarding && onboardingStep === 'training_plan') {
            await storage.updateOnboardingStep(userId, 'meal_plan');
          }
        } catch (e) {
          console.error("Failed to parse and save training plan:", e);
        }
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
          
          // Auto-advance onboarding step when meal plan is saved (if on meal_plan step)
          if (isOnboarding && onboardingStep === 'meal_plan') {
            await storage.completeOnboarding(userId);
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
      const exerciseMatch = aiResponse.match(/<<<SAVE_EXERCISE>>>([\s\S]*?)<<<END_SAVE_EXERCISE>>>/);
      
      if (exerciseMatch) {
        console.log("🏃 Exercise markers found! Extracting JSON...");
        try {
          const exerciseJson = exerciseMatch[1].trim();
          console.log("📋 Exercise JSON:", exerciseJson);
          const exercise = JSON.parse(exerciseJson);
          
          console.log("💾 Saving exercise recommendation:", exercise.exerciseName);
          
          await storage.createScheduledExerciseRecommendation({
            userId,
            exerciseName: exercise.exerciseName,
            exerciseType: exercise.exerciseType,
            description: exercise.description,
            duration: exercise.duration || null,
            frequency: exercise.frequency,
            recommendedBy: 'ai',
            reason: exercise.reason,
            isSupplementary: 1, // Always supplementary from AI
            status: 'pending',
            scheduledDates: null,
            userFeedback: null,
            declineReason: null,
          });
          
          exerciseSaved = true;
          console.log("✨ Exercise recommendation saved successfully!");
        } catch (e) {
          console.error("❌ Failed to parse and save exercise recommendation:", e);
        }
      } else {
        console.log("ℹ️ No exercise markers found in AI response");
      }

      // Auto-advance onboarding steps after AI responds (user has engaged with current step)
      if (isOnboarding && onboardingStep && message.trim().length > 0) {
        const STEP_PROGRESSION: Record<string, string> = {
          'welcome': 'apple_health',
          'apple_health': 'health_records',
          'health_records': 'training_plan',
          // training_plan -> meal_plan handled above when plan is saved
          // meal_plan completion is handled by user clicking skip or completing onboarding
        };

        const nextStep = STEP_PROGRESSION[onboardingStep];
        if (nextStep) {
          // Advance to next step after user message (they've engaged with current step)
          await storage.updateOnboardingStep(userId, nextStep);
        }
      }

      res.json({
        userMessage,
        assistantMessage,
        trainingPlanSaved,
        mealPlanSaved,
        goalSaved,
        supplementSaved,
        exerciseSaved,
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

  // Onboarding routes
  const VALID_ONBOARDING_STEPS = ['welcome', 'apple_health', 'health_records', 'training_plan', 'meal_plan'] as const;
  
  app.get("/api/onboarding/status", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const status = await storage.getOnboardingStatus(userId);
      // Initialize step to 'welcome' in database if onboarding not completed and no step set
      if (status && !status.completed && !status.step) {
        await storage.updateOnboardingStep(userId, 'welcome');
        res.json({ ...status, step: 'welcome' });
      } else if (!status) {
        // No onboarding record at all, initialize it
        await storage.updateOnboardingStep(userId, 'welcome');
        res.json({ completed: false, step: 'welcome', startedAt: null, completedAt: null });
      } else {
        res.json(status);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/onboarding/step", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { step } = req.body;
      if (!step || typeof step !== 'string') {
        return res.status(400).json({ error: "Step is required" });
      }
      // Validate step is one of the allowed values
      if (!VALID_ONBOARDING_STEPS.includes(step as any)) {
        return res.status(400).json({ error: `Invalid step. Must be one of: ${VALID_ONBOARDING_STEPS.join(', ')}` });
      }
      await storage.updateOnboardingStep(userId, step);
      res.json({ success: true, step });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/onboarding/complete", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      await storage.completeOnboarding(userId);
      res.json({ success: true, completed: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/onboarding/skip", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;

    try {
      const { currentStep, nextStep } = req.body;
      if (!currentStep || !nextStep) {
        return res.status(400).json({ error: "currentStep and nextStep are required" });
      }
      // Validate steps are valid
      if (!VALID_ONBOARDING_STEPS.includes(currentStep as any) || !VALID_ONBOARDING_STEPS.includes(nextStep as any)) {
        return res.status(400).json({ error: `Invalid step. Must be one of: ${VALID_ONBOARDING_STEPS.join(', ')}` });
      }
      const updated = await storage.skipOnboardingStep(userId, currentStep, nextStep);
      if (!updated) {
        return res.status(409).json({ error: "Current step does not match. Onboarding state may have changed." });
      }
      res.json({ success: true, step: nextStep });
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
              const deepHours = night.deepMinutes / 60;
              const deepPercentage = deepHours / sleepHours;
              if (deepPercentage >= 0.15 && deepPercentage <= 0.25) {
                sleepScore += 10;
              } else if (deepPercentage < 0.10) {
                sleepScore -= 5;
              }
              
              // Adjust for REM sleep (should be ~20-25% of total)
              const remHours = night.remMinutes / 60;
              const remPercentage = remHours / sleepHours;
              if (remPercentage >= 0.18 && remPercentage <= 0.28) {
                sleepScore += 10;
              } else if (remPercentage < 0.15) {
                sleepScore -= 5;
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
