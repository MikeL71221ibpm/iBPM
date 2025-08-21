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

// Import the real routes and middleware
async function startServer() {
  try {
    // Import database and initialize
    const { db } = await import('./db');
    
    // Import session and auth setup
    const session = (await import('express-session')).default;
    const passport = (await import('passport')).default;
    const { Strategy: LocalStrategy } = await import('passport-local');
    const { comparePassword } = await import('./auth');
    const { users } = await import('../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    // Session configuration
    app.use(session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      }
    }));
    
    // Passport setup
    app.use(passport.initialize());
    app.use(passport.session());
    
    passport.use(new LocalStrategy(
      async (username, password, done) => {
        try {
          const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
          if (user.length === 0) {
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          const isValidPassword = await comparePassword(password, user[0].password);
          if (!isValidPassword) {
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          return done(null, user[0]);
        } catch (error) {
          return done(error);
        }
      }
    ));
    
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });
    
    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
        done(null, user[0] || null);
      } catch (error) {
        done(error);
      }
    });
    
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
    
    // Import and use real routes
    const { registerRoutes } = await import('./routes');
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
    }
    
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
      console.log(`🚀 Production server running on port ${PORT}`);
      console.log(`📁 Static path: ${staticPath || 'NOT FOUND'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`🔐 Session secret: ${process.env.SESSION_SECRET ? 'Configured' : 'Using default'}`);
      console.log(`🗄️ Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();