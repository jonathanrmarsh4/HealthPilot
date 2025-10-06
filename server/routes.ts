import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { insertBiomarkerSchema, insertHealthRecordSchema } from "@shared/schema";
import { listHealthDocuments, downloadFile, getFileMetadata } from "./services/googleDrive";
import { analyzeHealthDocument, generateMealPlan, generateTrainingSchedule, generateHealthRecommendations } from "./services/ai";

const upload = multer({ storage: multer.memoryStorage() });

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
      
      res.json({
        biomarkers: latestByType,
        totalRecords: records.length,
        analyzedRecords: records.filter(r => r.analyzedAt).length,
        activeRecommendations: recommendations.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
