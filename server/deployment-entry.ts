import express from "express";
import { registerRoutes } from "./routes";
import emergencyRouter from "./api-emergency";
import emergencyDirectDbRouter from "./emergency-direct-db";
import { stallMonitor } from './stall-monitor.js';
import { DatabaseStorage } from './database-storage';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-restart disabled for production deployment
async function checkAndRestartIncompleteExtractions() {
  console.log(`⚠️ Auto-restart system disabled - manual extraction start required if needed`);
}

const app = express();

// Special handling for Stripe webhooks - needs raw body for signature verification
app.use('/api/webhook', express.raw({ type: 'application/json' }));

// Regular JSON parsing for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the built frontend
const publicPath = path.join(__dirname, '../dist/public');
app.use(express.static(publicPath));
console.log(`Serving static files from: ${publicPath}`);

// Emergency test page route
app.get('/emergency-test', (req, res) => {
  console.log('Serving emergency test page...');
  res.sendFile('emergency-test.html', { root: './client' });
});

// Register emergency recovery routes
app.use('/api/emergency', emergencyRouter);

// Register direct database emergency routes
app.use('/api', emergencyDirectDbRouter);

// Import the real file info API implementation
import { getFileInfo } from "./file-info-api";

// Add file info endpoint to get current file information from database
app.get('/api/file-info', getFileInfo);

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
      if (capturedJsonResponse && path.startsWith("/api")) {
        const responsePreview = JSON.stringify(capturedJsonResponse).substring(0, 100);
        logLine += ` :: ${responsePreview}`;
      }
      console.log(logLine);
    }
  });

  next();
});

(async () => {
  registerRoutes(app);

  // Serve index.html for all non-API routes (client-side routing)
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(publicPath, "index.html"));
    } else {
      res.status(404).send("Not found");
    }
  });

  // Initialize database storage
  console.log('Initializing database storage...');
  await DatabaseStorage.initializeTables();

  const httpServer = createServer(app);
  
  const port = process.env.PORT || 5000;
  httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log('✅ Deployment server ready (no vite dependencies)');
  });

  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer });
  
  wss.on('connection', (ws) => {
    console.log('👤 WebSocket client connected');
    ws.on('close', () => {
      console.log('👤 WebSocket client disconnected');
    });
  });

  // Attach WebSocket server to app for access in routes
  (app as any).wss = wss;

  // No vite setup in production!
  console.log('Production mode: No vite middleware loaded');
})();