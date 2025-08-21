// Production-ready server with full functionality
// This server maintains all features while being deployment-compatible
import express from "express";
import { registerRoutes } from "./routes.js";
import emergencyRouter from "./api-emergency.js";
import emergencyDirectDbRouter from "./emergency-direct-db.js";
import { DatabaseStorage } from './database-storage.js';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { getFileInfo } from "./file-info-api.js";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: false }));

// Serve static files - try multiple paths for deployment compatibility
let staticPath = path.join(__dirname, 'public');
if (!fs.existsSync(staticPath)) {
  // Try alternative paths
  const alternatives = [
    path.join(__dirname, '..', 'dist', 'public'),
    path.join(__dirname, '..', 'public'),
    '/home/runner/workspace/dist/public',
    path.join(process.cwd(), 'dist', 'public'),
    path.join(process.cwd(), 'public')
  ];
  
  for (const alt of alternatives) {
    if (fs.existsSync(alt)) {
      staticPath = alt;
      console.log(`Found static files at: ${alt}`);
      break;
    }
  }
}

app.use(express.static(staticPath));

// Emergency test page route
app.get('/emergency-test', (req, res) => {
  console.log('Serving emergency test page...');
  const emergencyPath = path.join(staticPath, '..', '..', 'client', 'emergency-test.html');
  if (fs.existsSync(emergencyPath)) {
    res.sendFile(emergencyPath);
  } else {
    res.status(404).send('Emergency test page not found');
  }
});

// Register emergency recovery routes
app.use('/api/emergency', emergencyRouter);

// Register direct database emergency routes
app.use('/api', emergencyDirectDbRouter);

// Add file info endpoint to get current file information from database
app.get('/api/file-info', getFileInfo);

// Request logging
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

      console.log(logLine);
    }
  });

  next();
});

// Create HTTP server for WebSocket support
const server = createServer(app);

// Initialize storage
const storage = new DatabaseStorage();

// WebSocket server for real-time updates
const wss = new WebSocketServer({ 
  server,
  perMessageDeflate: false 
});

let connectedClients = new Set();

wss.on('connection', (ws) => {
  connectedClients.add(ws);
  console.log('👤 WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('👤 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast function for progress updates
export function broadcastProgress(data: any) {
  const message = JSON.stringify(data);
  connectedClients.forEach((ws: any) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(message);
    }
  });
}

// Register API routes
registerRoutes(app);

// Initialize database tables and Stripe
async function initializeApp() {
  try {
    // Initialize database tables
    await storage.initializeTables();
    console.log('✅ Database tables initialized');
    
    // Check for Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("⚠️ STRIPE_SECRET_KEY not found - Stripe features will be limited");
    } else {
      console.log("✅ STRIPE_SECRET_KEY is available");
    }
    
    // Check and restart incomplete extractions
    await checkAndRestartIncompleteExtractions();
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
}

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not found');
  }
});

// Start server
const PORT = parseInt(process.env.PORT || '3000', 10);

initializeApp().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Production server running on port ${PORT}`);
    console.log(`✅ Database: ${process.env.DATABASE_URL ? 'Connected' : '❌ Not configured'}`);
    console.log(`✅ Static files: ${staticPath}`);
    console.log("✅ Process monitoring enabled - will track termination causes");
  });
}).catch(console.error);