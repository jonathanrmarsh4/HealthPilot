import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import multer from "multer";
import { insertBiomarkerSchema, insertHealthRecordSchema, biomarkers } from "@shared/schema";
import { listHealthDocuments, downloadFile, getFileMetadata } from "./services/googleDrive";
import { analyzeHealthDocument, generateMealPlan, generateTrainingSchedule, generateHealthRecommendations, chatWithHealthCoach } from "./services/ai";
import { parseISO, isValid } from "date-fns";
import { eq } from "drizzle-orm";

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
  const TEST_USER_ID = "test-user-1";

  app.get("/api/google-drive/files", async (req, res) => {
    try {
      const files = await listHealthDocuments();
      res.json(files);
    } catch (error: any) {
      console.error("Error listing Google Drive files:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/health-records/analyze/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      
      // Check if a record with this fileId already exists
      const existingRecord = await storage.getHealthRecordByFileId(fileId);
      if (existingRecord) {
        return res.json(existingRecord);
      }
      
      const metadata = await getFileMetadata(fileId);
      const fileBuffer = await downloadFile(fileId);
      
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      
      // Create record immediately (before analysis) so it can be deleted
      const pendingRecord = await storage.createHealthRecord({
        userId: TEST_USER_ID,
        name: metadata.name || 'Uploaded Document',
        fileId: fileId,
        fileUrl: metadata.webViewLink || '',
        type: 'Lab Results',
      });
      
      const fileText = fileBuffer.toString('utf-8');
      
      // Pass file creation date to AI for fallback
      const fileCreatedDate = metadata.createdTime ? new Date(metadata.createdTime) : undefined;
      const analysis = await analyzeHealthDocument(fileText, metadata.name || 'Unknown', fileCreatedDate);
      
      // Check if record was deleted during analysis
      const stillExists = await storage.getHealthRecordByFileId(fileId);
      if (!stillExists) {
        // Record was deleted during analysis, don't update or create biomarkers
        return res.status(410).json({ error: 'Record was deleted during analysis' });
      }
      
      // Update record with analysis results
      const record = await storage.updateHealthRecord(pendingRecord.id, {
        aiAnalysis: analysis,
        extractedData: analysis.biomarkers,
        analyzedAt: new Date(),
      });

      if (analysis.biomarkers && Array.isArray(analysis.biomarkers)) {
        for (const biomarker of analysis.biomarkers) {
          await storage.createBiomarker({
            userId: TEST_USER_ID,
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(499).json({ error: 'Request cancelled' });
      }
      console.error("Error analyzing document:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/health-records/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileText = req.file.buffer.toString('utf-8');
      const analysis = await analyzeHealthDocument(fileText, req.file.originalname);

      const record = await storage.createHealthRecord({
        userId: TEST_USER_ID,
        name: req.file.originalname,
        type: req.body.type || 'Lab Results',
        aiAnalysis: analysis,
        extractedData: analysis.biomarkers,
        analyzedAt: new Date(),
      });

      if (analysis.biomarkers && Array.isArray(analysis.biomarkers)) {
        for (const biomarker of analysis.biomarkers) {
          await storage.createBiomarker({
            userId: TEST_USER_ID,
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
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/health-records", async (req, res) => {
    try {
      const records = await storage.getHealthRecords(TEST_USER_ID);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/health-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHealthRecord(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/biomarkers", async (req, res) => {
    try {
      const validatedData = insertBiomarkerSchema.parse({
        ...req.body,
        userId: TEST_USER_ID,
      });
      const biomarker = await storage.createBiomarker(validatedData);
      res.json(biomarker);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/biomarkers", async (req, res) => {
    try {
      const { type } = req.query;
      const biomarkers = await storage.getBiomarkers(
        TEST_USER_ID,
        type as string | undefined
      );
      res.json(biomarkers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/biomarkers/chart/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const { days = '7' } = req.query;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));
      
      const biomarkers = await storage.getBiomarkersByTimeRange(
        TEST_USER_ID,
        type,
        startDate,
        endDate
      );
      
      // Transform to chart data format
      const chartData = biomarkers.map(b => ({
        date: b.recordedAt.toISOString(),
        value: b.value,
      }));
      
      res.json(chartData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/meal-plans/generate", async (req, res) => {
    try {
      const userProfile = req.body;
      
      const chatHistory = await storage.getChatMessages(TEST_USER_ID);
      const chatContext = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      const mealPlans = await generateMealPlan({
        ...userProfile,
        chatContext
      });
      
      const savedPlans = [];
      for (const plan of mealPlans) {
        const saved = await storage.createMealPlan({
          ...plan,
          userId: TEST_USER_ID,
        });
        savedPlans.push(saved);
      }
      
      res.json(savedPlans);
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/meal-plans", async (req, res) => {
    try {
      const plans = await storage.getMealPlans(TEST_USER_ID);
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/training-schedules/generate", async (req, res) => {
    try {
      const userProfile = req.body;
      
      const chatHistory = await storage.getChatMessages(TEST_USER_ID);
      const chatContext = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      const schedules = await generateTrainingSchedule({
        ...userProfile,
        chatContext
      });
      
      const savedSchedules = [];
      for (const schedule of schedules) {
        const saved = await storage.createTrainingSchedule({
          ...schedule,
          userId: TEST_USER_ID,
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

  app.get("/api/training-schedules", async (req, res) => {
    try {
      const schedules = await storage.getTrainingSchedules(TEST_USER_ID);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/training-schedules/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const { completed } = req.body;
      
      const updated = await storage.updateTrainingSchedule(id, {
        completed: completed ? 1 : 0,
        completedAt: completed ? new Date() : null,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recommendations/generate", async (req, res) => {
    try {
      const biomarkers = await storage.getBiomarkers(TEST_USER_ID);
      
      const chatHistory = await storage.getChatMessages(TEST_USER_ID);
      const chatContext = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      const recommendations = await generateHealthRecommendations({
        biomarkers,
        healthGoals: req.body.healthGoals || [],
        chatContext
      });
      
      const savedRecs = [];
      for (const rec of recommendations) {
        const saved = await storage.createRecommendation({
          ...rec,
          userId: TEST_USER_ID,
        });
        savedRecs.push(saved);
      }
      
      res.json(savedRecs);
    } catch (error: any) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recommendations", async (req, res) => {
    try {
      const recommendations = await storage.getRecommendations(TEST_USER_ID);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/recommendations/:id/dismiss", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.dismissRecommendation(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const userMessage = await storage.createChatMessage({
        userId: TEST_USER_ID,
        role: "user",
        content: message,
      });

      const chatHistory = await storage.getChatMessages(TEST_USER_ID);
      
      const conversationHistory = chatHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      const aiResponse = await chatWithHealthCoach(conversationHistory);

      const assistantMessage = await storage.createChatMessage({
        userId: TEST_USER_ID,
        role: "assistant",
        content: aiResponse,
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error: any) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/chat/history", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(TEST_USER_ID);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/chat/history", async (req, res) => {
    try {
      await storage.clearChatHistory(TEST_USER_ID);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const biomarkers = await storage.getBiomarkers(TEST_USER_ID);
      const records = await storage.getHealthRecords(TEST_USER_ID);
      const recommendations = await storage.getRecommendations(TEST_USER_ID);
      
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

  app.post("/api/biomarkers/cleanup-duplicates", async (req, res) => {
    try {
      console.log("🧹 Starting duplicate cleanup...");
      
      // First, delete the bad weight spike
      const badWeightId = '21d7e29c-713b-4c1c-97d0-657548ef41ad';
      await db.delete(biomarkers).where(eq(biomarkers.id, badWeightId));
      console.log("✅ Deleted bad weight spike");
      
      // Now delete all duplicates keeping only the first occurrence
      const allBiomarkers = await db.select().from(biomarkers).where(eq(biomarkers.userId, TEST_USER_ID));
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

  app.post("/api/health-auto-export/ingest", async (req, res) => {
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

      for (const metric of data.metrics) {
        const biomarkerType = metricMapping[metric.name];
        
        if (!biomarkerType) {
          continue;
        }

        if (metric.name === "Blood Pressure" && metric.data) {
          for (const dataPoint of metric.data) {
            if (dataPoint.systolic) {
              await storage.upsertBiomarker({
                userId: TEST_USER_ID,
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
                userId: TEST_USER_ID,
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
                userId: TEST_USER_ID,
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
        message: `Successfully imported ${insertedCount} health metrics`,
        count: insertedCount 
      });
    } catch (error: any) {
      console.error("Error processing Health Auto Export data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
