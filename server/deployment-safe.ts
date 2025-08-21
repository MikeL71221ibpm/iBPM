import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Start server immediately, then initialize features
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  initializeApp().catch(err => {
    console.error('❌ Failed to initialize app:', err);
  });
});

async function initializeApp() {
  try {
    // Import modules after server starts
    const { registerRoutes } = await import('./routes.js');
    const { setupAuth } = await import('./auth.js');
    
    // Setup authentication with fixed admin checks
    setupAuth(app);
    
    // Setup middleware
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Add health check endpoint for deployment
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Register all API routes
    registerRoutes(app);
    
    // Serve static files with multiple path checks
    const possiblePaths = [
      path.join(__dirname, '../dist/public'),
      path.join(__dirname, '../public'),
      path.join('/home/runner/workspace/dist/public'),
      path.join(process.cwd(), 'dist/public')
    ];
    
    let staticPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        staticPath = testPath;
        console.log(`✅ Static files found at: ${testPath}`);
        break;
      }
    }
    
    if (staticPath) {
      app.use(express.static(staticPath));
      
      // SPA fallback
      app.get('*', (req, res) => {
        const indexPath = path.join(staticPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Application not found');
        }
      });
    } else {
      console.warn('⚠️ Static files not found in any expected location');
    }
    
    console.log(`✅ Application initialized successfully`);
    console.log(`🔐 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`🔑 Session: ${process.env.SESSION_SECRET ? 'Configured' : 'Not configured'}`);
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
    // Don't exit - keep server running for health checks
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});