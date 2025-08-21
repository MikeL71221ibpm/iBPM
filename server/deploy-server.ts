import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import emergencyRouter from "./api-emergency";
import emergencyDirectDbRouter from "./emergency-direct-db";
import { stallMonitor } from './stall-monitor.js';
import { DatabaseStorage } from './database-storage'; 
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from "path";

// Simple log function
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit", 
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

const app = express();

// Webhook handling
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("client/public"));

// Emergency routes
app.get('/emergency-test', (req, res) => {
  console.log('Serving emergency test page...');
  res.sendFile('emergency-test.html', { root: './client' });
});

app.use('/api/emergency', emergencyRouter);
app.use('/api', emergencyDirectDbRouter);

// Import file info API
import { getFileInfo } from "./file-info-api";
app.get('/api/file-info', getFileInfo);

// Request logging middleware
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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).slice(0, 80)}...`;
      }
      log(logLine);
    }  
  });

  next();
});

(async () => {
  const storage = new DatabaseStorage();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws) => {
    console.log('👤 WebSocket client connected');
    ws.on('close', () => console.log('👋 WebSocket client disconnected'));
    ws.on('error', (error) => console.error('WebSocket error:', error));
  });

  registerRoutes(app);

  // Serve static files for production - robust path detection
  const possiblePaths = [
    path.join(process.cwd(), "dist/public"),
    path.join("/app", "dist/public"),
    "./dist/public",
    "dist/public"
  ];
  
  let staticPath = possiblePaths[0];
  const fs = await import('fs');
  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath)) {
        staticPath = testPath;
        console.log(`✅ Using static path: ${staticPath}`);
        break;
      }
    } catch (e) {
      console.log(`❌ Path not found: ${testPath}`);
    }
  }
  
  app.use(express.static(staticPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    const indexPath = path.join(staticPath, "index.html");
    console.log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Enhanced server startup with error handling
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    console.log(`🚀 DEPLOYMENT DIAGNOSTIC - Server successfully started`);
    console.log(`🔍 Environment: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log(`📁 Static path verified: ${staticPath}`);
  });

  server.on('error', (error: any) => {
    console.error('❌ DEPLOYMENT DIAGNOSTIC - Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use - this may be normal during deployment restart`);
    }
  });

  // Enhanced error handling and diagnostics
  process.on('exit', (code) => {
    console.log(`✅ Process monitoring enabled - will track termination causes`);
    console.log(`Process exited with code: ${code}`);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ DEPLOYMENT DIAGNOSTIC - Uncaught Exception:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Error occurred during startup phase');
    // Don't exit immediately in production - let deployment system handle it
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ DEPLOYMENT DIAGNOSTIC - Unhandled Rejection at:', promise, 'reason:', reason);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  // Initialize stall monitor
  if (stallMonitor && typeof stallMonitor.initialize === 'function') {
    try {
      await stallMonitor.initialize();
      console.log('✅ Stall monitor initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize stall monitor:', error);
    }
  }

  console.log(`⚠️ Auto-restart system disabled - manual extraction start required if needed`);
})();