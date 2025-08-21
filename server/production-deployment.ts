import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Initialize server with all production features
async function initializeServer() {
  try {
    // Load dotenv at runtime, not build time
    await import('dotenv/config');
    
    // Import all the necessary modules
    const { registerRoutes } = await import('./routes.js');
    const { setupAuth } = await import('./auth.js');
    
    // Setup authentication with error handling
    setupAuth(app);
    
    // Add error handling for authentication issues
    app.use((err: any, req: any, res: any, next: any) => {
      if (err.message === 'User not found') {
        console.log('Authentication error - clearing invalid session');
        req.logout((logoutErr) => {
          if (logoutErr) {
            console.error('Logout error:', logoutErr);
          }
          res.status(401).json({ error: 'Authentication required' });
        });
      } else {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Setup middleware
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Register all API routes
    registerRoutes(app);
    
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
      
      // Catch all routes - serve index.html for SPA
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
      console.log(`🚀 Production server running on port ${PORT}`);
      console.log(`📁 Static path: ${staticPath || 'NOT FOUND'}`);
      console.log(`🔐 Database: ${process.env.DATABASE_URL ? 'Connected' : 'ERROR: Not configured!'}`);
      console.log(`🔑 Session: ${process.env.SESSION_SECRET ? 'Configured' : 'ERROR: Not configured!'}`);
      console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Warning: Not configured'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();