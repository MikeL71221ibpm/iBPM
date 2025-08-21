import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Log startup information
console.log('Starting deployment server...');
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);

// Simple middleware without external dependencies
app.use(express.json({ limit: '50mb' }));

// Basic CORS handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Find static files
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

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: 'production', server: 'simple-deployment' });
});

app.get('/api/user', (req, res) => {
  res.status(401).json({ error: 'Not authenticated' });
});

app.get('/api/database-stats', (req, res) => {
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
      message: "Simple deployment server running",
      updatedAt: new Date().toISOString()
    }
  });
});

// Serve index.html for all other routes
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

// Add error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple deployment server running on port ${PORT}`);
  console.log(`📁 Static path: ${staticPath || 'NOT FOUND'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});