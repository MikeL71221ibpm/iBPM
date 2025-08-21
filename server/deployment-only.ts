// Deployment-only server with NO vite imports
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Initialize server
async function initializeServer() {
  try {
    // Load environment variables
    await import('dotenv/config');
    
    console.log('🚀 Starting deployment server...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'Set' : 'Not set');
    
    // Import dependencies without vite
    const { registerRoutes } = await import('./routes.js');
    const { setupAuth } = await import('./auth.js');
    const emergencyRouter = (await import('./api-emergency.js')).default;
    const emergencyDirectDbRouter = (await import('./emergency-direct-db.js')).default;
    const { getFileInfo } = await import('./file-info-api.js');
    const { createServer } = await import('http');
    const { WebSocketServer } = await import('ws');
    
    // Test database connection early
    try {
      const { db } = await import('./db.js');
      const { sql } = await import('drizzle-orm');
      await db.execute(sql`SELECT 1`);
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
    }
    
    // Configure express
    app.set('trust proxy', 1); // Trust first proxy for HTTPS deployment
    app.use('/api/webhook', express.raw({ type: 'application/json' }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Set up session middleware BEFORE auth
    const session = (await import('express-session')).default;
    const passport = (await import('passport')).default;
    const ConnectPgSimple = (await import('connect-pg-simple')).default;
    const pg = (await import('pg')).default;
    
    // Create PostgreSQL pool for session store
    const pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
    });
    
    // Use PostgreSQL session store for deployment
    const pgSession = ConnectPgSimple(session);
    
    app.use(session({
      store: new pgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true, // Changed to true for HTTPS deployment
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      },
      proxy: true // Trust the reverse proxy
    }));
    
    // Initialize passport after session
    app.use(passport.initialize());
    app.use(passport.session());
    
    // Find and serve static files
    const possiblePaths = [
      path.join(__dirname, '../dist/public'),
      path.join(__dirname, '../client/dist'),
      path.join(process.cwd(), 'dist/public'),
      '/home/runner/workspace/dist/public'
    ];
    
    let staticPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        staticPath = testPath;
        console.log(`✅ Found static files at: ${testPath}`);
        break;
      }
    }
    
    if (staticPath) {
      app.use(express.static(staticPath));
    } else {
      console.error('❌ Could not find static files directory');
    }
    
    // Register routes
    app.use('/api/emergency', emergencyRouter);
    app.use('/api', emergencyDirectDbRouter);
    app.get('/api/file-info', getFileInfo);
    
    // Setup passport strategies without reconfiguring sessions
    const { Strategy: LocalStrategy } = await import('passport-local');
    const { db } = await import('./db.js');
    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    const { comparePasswords } = await import('./auth.js');
    
    // Configure passport strategies with error handling
    passport.use(
      new LocalStrategy(async (username, password, done) => {
        try {
          // Check if database is available
          if (!process.env.DATABASE_URL) {
            console.error('DATABASE_URL not set in deployment environment');
            return done(null, false, { message: "Database not configured" });
          }
          
          const result = await db.select().from(users).where(eq(users.username, username));
          if (result.length === 0) {
            return done(null, false, { message: "Incorrect username." });
          }
          const user = result[0];
          const isValidPassword = await comparePasswords(password, user.password);
          if (!isValidPassword) {
            return done(null, false, { message: "Incorrect password." });
          }
          return done(null, user);
        } catch (err) {
          console.error('Passport authentication error:', err);
          return done(err);
        }
      })
    );

    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
      try {
        const { db: dbDeployment } = await import('./db.js');
        const result = await dbDeployment.select().from(users).where(eq(users.id, id));
        if (result.length === 0) {
          return done(new Error("User not found"));
        }
        done(null, result[0]);
      } catch (err) {
        done(err);
      }
    });
    
    // Add authentication routes
    app.post("/api/login", (req, res, next) => {
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info?.message || "Login failed" });
        }
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.json(user);
        });
      })(req, res, next);
    });

    app.post("/api/logout", (req, res, next) => {
      req.logout((err) => {
        if (err) {
          return next(err);
        }
        res.sendStatus(200);
      });
    });

    app.get("/api/user", async (req, res) => {
      if (req.isAuthenticated() && req.user) {
        return res.json(req.user);
      }
      res.status(401).json({ 
        error: "Not authenticated",
        message: "Please log in to continue" 
      });
    });
    

    // Health check with diagnostics
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        version: 'V3.4.26',
        env: {
          DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
          SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Not set'
        }
      });
    });
    
    // Deployment diagnostics endpoint
    app.get('/api/deployment-check', async (req, res) => {
      const diagnostics = {
        environment: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          SESSION_SECRET: !!process.env.SESSION_SECRET
        },
        database: {
          canConnect: false,
          error: null
        }
      };
      
      try {
        const { db } = await import('./db.js');
        const { sql } = await import('drizzle-orm');
        await db.execute(sql`SELECT 1`);
        diagnostics.database.canConnect = true;
      } catch (error) {
        diagnostics.database.canConnect = false;
        diagnostics.database.error = error.message;
      }
      
      res.json(diagnostics);
    });
    
    // Register other routes BEFORE the catch-all
    await registerRoutes(app);
    
    // Import and setup WebSocket for real-time progress
    const clients = new Map<number, any>();
    
    const wss = new WebSocketServer({ noServer: true });
    
    wss.on('connection', (ws) => {
      console.log('👤 WebSocket client connected');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'identify' && data.userId) {
            clients.set(data.userId, ws);
            console.log(`📡 Client identified: User ${data.userId}`);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('📡 Client disconnected');
        for (const [userId, client] of Array.from(clients.entries())) {
          if (client === ws) {
            clients.delete(userId);
            console.log(`📡 Client disconnected: User ${userId}`);
            break;
          }
        }
      });
    });
    
    // Make clients available globally for progress updates
    global.websocketClients = clients;
    
    // Export function to broadcast progress updates - CRITICAL FOR AUTO-EXTRACTION
    (global as any).broadcastProgress = (userId: number, data: any) => {
      const client = clients.get(userId);
      if (client && client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'extraction_progress',
          progress: data.progress,
          status: data.status,
          message: data.message,
          timestamp: new Date().toISOString()
        }));
        console.log(`📊 Sent progress to User ${userId}: ${data.progress}% (${data.status})`);
      } else {
        console.log(`⚠️ No WebSocket client found for User ${userId} or connection closed`);
        console.log(`📋 Current connected clients: ${Array.from(clients.keys()).join(', ')}`);
      }
    };
    
    // Add critical endpoints for deployment
    app.get('/api/database-stats', async (req, res) => {
      try {
        if (!req.isAuthenticated() || !req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        const userId = (req.user as any).id;
        const { db: deploymentDb } = await import('./db.js');
        const { patients, notes, extractedSymptoms, processingStatus, fileUploads } = await import('@shared/schema');
        const { eq, desc, sql } = await import('drizzle-orm');
        
        // Get counts
        const [patientCount] = await deploymentDb
          .select({ count: sql<number>`count(*)::int` })
          .from(patients)
          .where(eq(patients.userId, userId));
          
        const [noteCount] = await deploymentDb
          .select({ count: sql<number>`count(*)::int` })
          .from(notes)
          .where(eq(notes.userId, userId));
          
        const [symptomCount] = await deploymentDb
          .select({ count: sql<number>`count(*)::int` })
          .from(extractedSymptoms)
          .where(eq(extractedSymptoms.user_id, userId));
          
        // Get processing status
        const [status] = await deploymentDb
          .select()
          .from(processingStatus)
          .where(eq(processingStatus.userId, userId))
          .orderBy(desc(processingStatus.lastUpdateTime))
          .limit(1);
          
        // Get last file
        const [lastFile] = await deploymentDb
          .select({
            filename: fileUploads.fileName,
            uploadedAt: fileUploads.uploadDate
          })
          .from(fileUploads)
          .where(eq(fileUploads.userId, userId))
          .orderBy(desc(fileUploads.uploadDate))
          .limit(1);
        
        res.json({
          patientCount: patientCount?.count || 0,
          noteCount: noteCount?.count || 0,
          symptomCount: symptomCount?.count || 0,
          processedNotesCount: noteCount?.count || 0,
          lastFile,
          processingStatus: status ? {
            status: status.status,
            progress: status.progress,
            message: status.message,
            updatedAt: status.lastUpdateTime
          } : null
        });
      } catch (error) {
        console.error('Database stats error:', error);
        res.status(500).json({ error: 'Failed to fetch database stats' });
      }
    });
    
    app.get('/api/population-health-data', async (req, res) => {
      try {
        if (!req.isAuthenticated() || !req.user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const userId = (req.user as any).id;
        const { db: deploymentDb } = await import('./db.js');
        const { extractedSymptoms } = await import('@shared/schema');
        const { eq, sql } = await import('drizzle-orm');
        
        // Get symptoms data
        const symptoms = await deploymentDb
          .select({
            symptom_name: extractedSymptoms.symptom_segment,
            symptom_status: extractedSymptoms.symptom_present,
            note_date: extractedSymptoms.dos_date
          })
          .from(extractedSymptoms)
          .where(eq(extractedSymptoms.user_id, userId));
        
        res.json({ symptoms });
      } catch (error) {
        console.error('Population health data error:', error);
        res.status(500).json({ error: 'Failed to fetch population health data' });
      }
    });
    
    // Serve index.html for all other routes - MUST BE LAST
    app.get('*', (req, res) => {
      if (staticPath) {
        res.sendFile(path.join(staticPath, 'index.html'));
      } else {
        res.status(500).send('Static files not found');
      }
    });
    
    // Create HTTP server and WebSocket
    const server = createServer(app);
    
    // Handle WebSocket upgrade
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("✅ Automatic extraction enabled - symptoms will be extracted 2 seconds after CSV upload completes");
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();