import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./replitAuth";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
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
  });
})();
