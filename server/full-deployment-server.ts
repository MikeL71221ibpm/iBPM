import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Import and use all the real routes from your main server
async function setupServer() {
  try {
    // Only import routes if we have DATABASE_URL
    if (process.env.DATABASE_URL) {
      console.log('✅ Database URL found, loading full backend...');
      
      // Import the route registration
      const { registerRoutes } = await import('./routes');
      
      // Import session and auth setup
      const { setupAuth } = await import('./auth');
      
      // Configure proxy/trust behavior for TLS termination (nginx, ingress)
      if (process.env.TRUST_PROXY === '1') {
        app.set('trust proxy', 1);
        console.log('🔁 trust proxy enabled (TRUST_PROXY=1)');
      }

      // Setup authentication first
      setupAuth(app);
      
      // Then register all routes
      registerRoutes(app);
      
      console.log('✅ Full backend loaded with authentication and database');
    } else {
      console.log('⚠️ No DATABASE_URL found, running in demo mode');
      
      // Minimal routes for demo mode
      app.get('/api/health', (req, res) => {
        res.json({ 
          status: 'ok', 
          mode: 'demo',
          message: 'Add DATABASE_URL secret for full functionality'
        });
      });
      
      app.get('/api/user', (req, res) => {
        res.status(401).json({ error: 'Demo mode - no authentication' });
      });
      
      app.get('/api/database-stats', (req, res) => {
        res.json({
          patientCount: 0,
          noteCount: 0,
          symptomCount: 0,
          processedNotesCount: 0,
          lastFile: {
            filename: "Demo Mode - Add DATABASE_URL secret",
            uploadedAt: new Date().toISOString()
          },
          processingStatus: {
            status: "demo",
            progress: 0,
            message: "Running in demo mode - no database connected",
            updatedAt: new Date().toISOString()
          }
        });
      });
    }
    
    // Serve static files
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
    
    if (staticPath) {
      app.use(express.static(staticPath));
      
      // Catch all routes - serve index.html
      app.get('*', (req, res) => {
        const indexPath = path.join(staticPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('index.html not found');
        }
      });
    }
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Deployment server running on port ${PORT}`);
      console.log(`📁 Static path: ${staticPath || 'NOT FOUND'}`);
      console.log(`🔐 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured (demo mode)'}`);
      console.log(`🔑 Session Secret: ${process.env.SESSION_SECRET ? 'Configured' : 'Not configured'}`);
      console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
      
      if (!process.env.DATABASE_URL) {
        console.log('\n⚠️  To enable full functionality:');
        console.log('   1. Add DATABASE_URL secret in Replit Secrets');
        console.log('   2. Add SESSION_SECRET secret');
        console.log('   3. Redeploy the application\n');
      }
    });
    
  } catch (error) {
    console.error('❌ Server setup error:', error);
    process.exit(1);
  }
}

// Start the server
setupServer();