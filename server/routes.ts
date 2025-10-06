import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { insertBiomarkerSchema, insertHealthRecordSchema } from "@shared/schema";
import { listHealthDocuments, downloadFile, getFileMetadata } from "./services/googleDrive";
import { analyzeHealthDocument, generateMealPlan, generateTrainingSchedule, generateHealthRecommendations, chatWithHealthCoach } from "./services/ai";

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
      
      const metadata = await getFileMetadata(fileId);
      const fileBuffer = await downloadFile(fileId);
      
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      
      const fileText = fileBuffer.toString('utf-8');
      
      const analysis = await analyzeHealthDocument(fileText, metadata.name || 'Unknown');
      
      const record = await storage.createHealthRecord({
        userId: TEST_USER_ID,
        name: metadata.name || 'Uploaded Document',
        fileId: fileId,
        fileUrl: metadata.webViewLink || '',
        type: 'Lab Results',
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
            recordedAt: biomarker.date ? new Date(biomarker.date) : new Date(),
          });
        }
      }

      res.json(record);
    } catch (error: any) {
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
            recordedAt: biomarker.date ? new Date(biomarker.date) : new Date(),
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
      
      res.json(biomarkers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/meal-plans/generate", async (req, res) => {
    try {
      const userProfile = req.body;
      const mealPlans = await generateMealPlan(userProfile);
      
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
      const schedules = await generateTrainingSchedule(userProfile);
      
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
      
      const recommendations = await generateHealthRecommendations({
        biomarkers,
        healthGoals: req.body.healthGoals || [],
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

  app.post("/api/health-auto-export/ingest", async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!data || !data.metrics) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      const metricMapping: Record<string, string> = {
        "Heart Rate": "heart-rate",
        "Resting Heart Rate": "heart-rate",
        "Blood Glucose": "blood-glucose",
        "Weight": "weight",
        "Steps": "steps",
        "Active Energy": "calories",
        "Active Energy Burned": "calories",
        "Blood Pressure Systolic": "blood-pressure-systolic",
        "Blood Pressure Diastolic": "blood-pressure-diastolic",
        "Oxygen Saturation": "oxygen-saturation",
        "Body Temperature": "body-temperature",
        "Sleep Analysis": "sleep-hours",
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
              await storage.createBiomarker({
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
              await storage.createBiomarker({
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

            if (value !== undefined && value !== null) {
              await storage.createBiomarker({
                userId: TEST_USER_ID,
                type: biomarkerType,
                value: value,
                unit: metric.units || "",
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
