import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use((req, res, next) => {
  // Simple CORS handling without cors package
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: '50mb' }));

// Find the correct path for static files
const possiblePaths = [
  path.join(__dirname, '../dist/public'),
  path.join(__dirname, '../public'),
  path.join(__dirname, '../../dist/public'),
  path.join('/home/runner/workspace/dist/public'),
  path.join(process.cwd(), 'dist/public'),
  path.join(process.cwd(), 'public')
];

let staticPath = null;
for (const testPath of possiblePaths) {
  if (fs.existsSync(testPath)) {
    staticPath = testPath;
    console.log(`✅ Found static files at: ${testPath}`);
    break;
  }
}

if (!staticPath) {
  console.error('❌ Could not find static files directory');
  console.error('Searched paths:', possiblePaths);
} else {
  app.use(express.static(staticPath));
}

// Import database connection if available
let dbAvailable = false;
let db: any = null;

// Try to connect to database if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  try {
    const dbModule = await import('./db');
    db = dbModule.db;
    dbAvailable = true;
    console.log('✅ Database connection available');
  } catch (error) {
    console.log('⚠️ Database not available in deployment:', error.message);
  }
}

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: 'production',
    database: dbAvailable ? 'connected' : 'mock mode',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/user', (req, res) => {
  // In deployment, return not authenticated
  res.status(401).json({ error: 'Not authenticated' });
});

app.get('/api/database-stats', async (req, res) => {
  // If database is available, try to get real stats
  if (dbAvailable && db) {
    try {
      const { patients, notes, extractedSymptoms, processingStatus, fileUploads } = await import('../shared/schema');
      
      // Simple counts without user filtering for deployment demo
      const patientCount = await db.select({ count: db.$count() }).from(patients);
      const noteCount = await db.select({ count: db.$count() }).from(notes);
      const symptomCount = await db.select({ count: db.$count() }).from(extractedSymptoms);
      
      res.json({
        patientCount: patientCount[0]?.count || 0,
        noteCount: noteCount[0]?.count || 0,
        symptomCount: symptomCount[0]?.count || 0,
        processedNotesCount: noteCount[0]?.count || 0,
        lastFile: {
          filename: "Database connected",
          uploadedAt: new Date().toISOString()
        },
        processingStatus: {
          status: "completed",
          progress: 100,
          message: "Production deployment with database",
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Database query error:', error);
      // Fall back to mock data
      res.json({
        patientCount: 2456,
        noteCount: 23702,
        symptomCount: 0, // Dynamic - depends on uploaded file
        processedNotesCount: 23702,
        lastFile: {
          filename: "Validated_Generated_Notes_HALF_6_27_25.csv",
          uploadedAt: new Date().toISOString()
        },
        processingStatus: {
          status: "completed",
          progress: 100,
          message: "Deployment server running (mock data)",
          updatedAt: new Date().toISOString()
        }
      });
    }
  } else {
    // Return mock data if no database
    res.json({
      patientCount: 2456,
      noteCount: 23702,
      symptomCount: 0, // Dynamic - depends on uploaded file
      processedNotesCount: 23702,
      lastFile: {
        filename: "Validated_Generated_Notes_HALF_6_27_25.csv",
        uploadedAt: new Date().toISOString()
      },
      processingStatus: {
        status: "completed",
        progress: 100,
        message: "Deployment server running (mock data)",
        updatedAt: new Date().toISOString()
      }
    });
  }
});

// Catch all routes - serve index.html
app.get('*', (req, res) => {
  if (staticPath) {
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html not found');
    }
  } else {
    res.status(503).send('Static files not configured');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Deployment server running on port ${PORT}`);
  console.log(`📁 Static path: ${staticPath || 'NOT FOUND'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
});