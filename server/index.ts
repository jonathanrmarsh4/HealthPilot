import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./replitAuth";
import { reminderScheduler } from './services/reminderScheduler';

const app = express();

// CORS configuration for mobile app support
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await setupAuth(app);
  
  // Seed exercise templates before validation
  // This ensures all template_ids referenced in RULES exist in the database
  try {
    log('🌱 Seeding exercise templates...');
    const { seedExerciseTemplates } = await import('./scripts/seedExerciseTemplates');
    await seedExerciseTemplates();
  } catch (error: any) {
    log(`❌ FATAL: Template seeding failed: ${error.message}`);
    process.exit(1);
  }
  
  // Validate template system integrity at startup
  // Fails fast if RULES references non-existent templates or patterns lack coverage
  try {
    const { validateTemplateSystemStrict } = await import('./services/validateTemplateSystem');
    await validateTemplateSystemStrict();
  } catch (error: any) {
    log(`❌ FATAL: ${error.message}`);
    process.exit(1); // Prevent app from running with broken template config
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Keep the process alive - prevent premature exit
  process.on('uncaughtException', (error) => {
    log(`❌ Uncaught Exception: ${error.message}`);
    console.error(error);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`);
    console.error(reason);
  });
  
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    
    // Start background monitoring for proactive suggestions
    // Run every 30 minutes
    const MONITORING_INTERVAL = 30 * 60 * 1000; // 30 minutes in ms
    
    setInterval(async () => {
      try {
        log('🔄 Running proactive suggestion monitoring...');
        const response = await fetch(`http://localhost:${port}/api/proactive-suggestions/monitor-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        log(`✅ Monitoring complete: ${result.suggestionsGenerated} suggestions generated for ${result.processedUsers} users`);
      } catch (error: any) {
        log(`❌ Monitoring error: ${error.message}`);
      }
    }, MONITORING_INTERVAL);
    
    // Run once on startup after a short delay
    setTimeout(async () => {
      try {
        log('🔄 Running initial proactive suggestion monitoring...');
        const response = await fetch(`http://localhost:${port}/api/proactive-suggestions/monitor-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        log(`✅ Initial monitoring complete: ${result.suggestionsGenerated} suggestions generated for ${result.processedUsers} users`);
      } catch (error: any) {
        log(`❌ Initial monitoring error: ${error.message}`);
      }
    }, 5000); // Wait 5 seconds after startup
    
    // Start Daily Insights Scheduler (runs at 02:00 user local time)
    setTimeout(async () => {
      try {
        log('🔮 Starting Daily Insights Scheduler...');
        const { startDailyInsightsScheduler } = await import('./services/dailyInsightsScheduler');
        startDailyInsightsScheduler();
      } catch (error: any) {
        log(`❌ Daily Insights Scheduler error: ${error.message}`);
      }
    }, 7000); // Wait 7 seconds after startup
    
    // Start Daily Training Generator Scheduler (runs at 04:00 user local time)
    setTimeout(async () => {
      try {
        log('💪 Starting Daily Training Generator Scheduler...');
        const { startDailyTrainingScheduler } = await import('./services/dailyTrainingScheduler');
        startDailyTrainingScheduler();
      } catch (error: any) {
        log(`❌ Daily Training Generator Scheduler error: ${error.message}`);
      }
    }, 8000); // Wait 8 seconds after startup
    
    // Start Cost Rollup Scheduler (runs daily at 02:30 UTC)
    setTimeout(async () => {
      try {
        log('💰 Starting Cost Rollup Scheduler...');
        const { startCostRollupScheduler } = await import('./services/costRollupScheduler');
        startCostRollupScheduler();
      } catch (error: any) {
        log(`❌ Cost Rollup Scheduler error: ${error.message}`);
      }
    }, 9000); // Wait 9 seconds after startup
    
    // Start Reminder Scheduler (runs every minute)
    setTimeout(() => {
      try {
        log('⏰ Starting Reminder Scheduler...');
        reminderScheduler.start();
      } catch (error: any) {
        log(`❌ Reminder Scheduler error: ${error.message}`);
      }
    }, 10000); // Wait 10 seconds after startup
  });
})();
