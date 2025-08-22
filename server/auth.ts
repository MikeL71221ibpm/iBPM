import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// Hash a password
export async function hashPassword(password: string) {
  console.log(`Hashing password: '${password}'`);
  const salt = randomBytes(16).toString("hex");
  console.log(`Generated salt: ${salt}`);
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashedPassword = `${buf.toString("hex")}.${salt}`;
  console.log(`Generated hash+salt: ${hashedPassword}`);
  return hashedPassword;
}

// Compare password with stored hash
export async function comparePasswords(supplied: string, stored: string) {
  console.log(`Comparing passwords: supplied='${supplied}'`);
  console.log(`Stored password hash: ${stored}`);
  const [hashed, salt] = stored.split(".");
  console.log(`Split parts: ${stored.split(".").length}`);
  console.log(`Stored hash: ${hashed}`);
  console.log(`Salt: ${salt}`);
  
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  console.log(`Generated hash for supplied password: ${suppliedBuf.toString("hex")}`);
  console.log(`Hashed match? ${timingSafeEqual(hashedBuf, suppliedBuf)}`);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Use PostgreSQL for session storage
  const PostgresSessionStore = connectPg(session);
  
  const sessionStore = new PostgresSessionStore({
    pool,
    tableName: 'session', // Default is "session"
    createTableIfMissing: true,
  });

  // Determine if we're in a secure (HTTPS) environment
  const isProduction = process.env.NODE_ENV === 'production';
  // In Replit workspace (development), we use HTTP, not HTTPS
  const isSecureEnvironment = isProduction; // Only production uses HTTPS
  
  // Generate unique cookie name based on environment to prevent cross-contamination
  const cookieName = isSecureEnvironment ? 'ibpm.prod.sid' : 'ibpm.dev.sid';
  
  const sessionSettings: session.SessionOptions = {
    name: cookieName, // Unique cookie name per environment
    secret: process.env.SESSION_SECRET || 'please-use-a-better-secret',
    resave: true, // Changed back to true to ensure session is saved on each request
    saveUninitialized: true, // Changed back to true for compatibility
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureEnvironment === true, // Ensure boolean value
      domain: undefined, // Let browser handle domain to prevent subdomain issues
      path: '/', // Explicit path to ensure consistency
      // Added for more predictable behavior:
      rolling: true as any // Reset expiration on activity (prevents session timeout)
    }
  };
  
  console.log('🔐 Session Configuration:', {
    environment: process.env.NODE_ENV || 'development',
    isProduction,
    isSecureEnvironment,
    cookieSecure: isSecureEnvironment,
    replSlug: process.env.REPL_SLUG || 'none'
  });

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Session validation and debugging middleware
  app.use((req, res, next) => {
    // Log session info for debugging
    if (req.path === '/api/user' || req.path.startsWith('/api/database-stats')) {
      const userId = req.user ? (req.user as any).id : null;
      const sessionUserId = req.session?.passport?.user;
      
      console.log('🔍 Session Validation:', {
        path: req.path,
        authenticated: req.isAuthenticated(),
        sessionID: req.sessionID,
        userId: userId,
        sessionUserId: sessionUserId,
        cookieSecure: req.session?.cookie?.secure,
        userMatch: userId === sessionUserId
      });
      
      // Validate session integrity
      if (req.isAuthenticated() && userId !== sessionUserId) {
        console.error('❌ Session mismatch detected!', {
          requestUser: userId,
          sessionUser: sessionUserId
        });
        // Force logout on mismatch
        req.logout(() => {
          req.session.destroy(() => {
            console.log('🔄 Session cleared due to mismatch');
          });
        });
      }
    }
    next();
  });

  // Configure the local strategy for use by Passport - supporting both username and email
  passport.use(
    new LocalStrategy({ usernameField: 'username' }, async (usernameOrEmail, password, done) => {
      console.log(`🔐 AUTH ATTEMPT for username/email: ${usernameOrEmail}`);
      console.log(`🔑 Password provided: ${password ? 'YES' : 'NO'}`);
      try {
        let user = null;
        
        // Always try username first (case-insensitive using raw SQL)
        console.log(`Searching for user by username: ${usernameOrEmail}`);
        const usernameResults = await pool.query(`
          SELECT * FROM users WHERE LOWER(username) = LOWER($1)
        `, [usernameOrEmail]);
        console.log(`Username search results: ${usernameResults.rows.length} rows`);
        if (usernameResults.rows.length > 0) {
          user = usernameResults.rows[0];
          console.log(`User found by username: ${user.username} (ID: ${user.id})`);
        }
        
        // If not found by username and input looks like email, try email as secondary check
        if (!user && usernameOrEmail.includes('@')) {
          console.log(`Username not found, trying email: ${usernameOrEmail}`);
          const emailResults = await pool.query(`
            SELECT * FROM users WHERE LOWER(email) = LOWER($1)
            ORDER BY created_at DESC
          `, [usernameOrEmail]);
          console.log(`Email search results: ${emailResults.rows.length} rows`);
          if (emailResults.rows.length > 0) {
            // Just take the most recent account with this email
            user = emailResults.rows[0];
            console.log(`User found by email: ${user.username} (ID: ${user.id})`);
          }
        }
        
        if (user) {
          console.log(`User found: ${user.username} (ID: ${user.id})`);
          
          // Check password
          const passwordValid = await comparePasswords(password, user.password);
          console.log(`Password valid: ${passwordValid}`);
          
          if (passwordValid) {
            console.log("Login successful");
            return done(null, user);
          } else {
            console.log("Password invalid");
            return done(null, false, { message: "Invalid username/email or password" });
          }
        } else {
          console.log("User not found");
          return done(null, false, { message: "Invalid username/email or password" });
        }
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    })
  );

  // Tell passport how to serialize/deserialize the user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      // Use raw SQL to ensure all fields including role are selected
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        done(null, result.rows[0]);
      } else {
        done(new Error('User not found'), null);
      }
    } catch (err) {
      done(err);
    }
  });

  // Set up auth routes
  app.post("/api/register", async (req, res) => {
    try {
      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, req.body.username));

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(req.body.password);

      // Create the user
      const [user] = await db
        .insert(users)
        .values({
          username: req.body.username,
          password: hashedPassword,
          email: req.body.email || null,
          company: req.body.company || null,
        })
        .returning();

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login after registration failed" });
        }
        return res.status(201).json(user);
      });
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      
      // Clear any existing sessions for this user before creating a new one
      try {
        const userId = user.id;
        console.log(`🔄 Clearing existing sessions for user ${userId}`);
        
        // Clear existing sessions for this user from the database
        await pool.query(
          `DELETE FROM session WHERE sess::jsonb->'passport'->>'user' = $1`,
          [userId.toString()]
        );
        
        console.log(`✅ Cleared existing sessions for user ${userId}`);
      } catch (clearErr) {
        console.error('⚠️ Error clearing existing sessions:', clearErr);
        // Continue with login even if session cleanup fails
      }
      
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        console.log(`✅ Login successful for user ${user.id} with session ${req.sessionID}`);
        
        // Force session save to ensure it's persisted
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('❌ Session save error:', saveErr);
            return next(saveErr);
          }
          console.log(`✅ Session saved for user ${user.id}`);
          
          // Debug: Check what's in the session
          console.log('📋 Session data after login:', {
            sessionID: req.sessionID,
            userId: req.session.passport?.user,
            authenticated: req.isAuthenticated(),
            cookie: req.session.cookie
          });
          
          return res.json(user);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const sessionId = req.sessionID;
    const userId = req.user ? (req.user as any).id : null;
    
    console.log('🚪 Logout initiated:', { sessionId, userId });
    
    req.logout((err) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return next(err);
      }
      
      // Destroy the session to ensure complete cleanup
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('❌ Session destroy error:', destroyErr);
          return next(destroyErr);
        }
        
        console.log('✅ Logout successful:', { sessionId, userId });
        // Clear both possible cookie names to ensure complete logout
        res.clearCookie('connect.sid'); // Legacy cookie
        res.clearCookie('ibpm.prod.sid'); // Production cookie
        res.clearCookie('ibpm.dev.sid'); // Development cookie
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", async (req, res) => {
    // Log request authentication state for debugging
    console.log('SESSION DEBUG:', {
      authenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      hasSession: !!req.session,
      sessionObj: req.session
    });
    
    if (req.isAuthenticated() && req.user) {
      return res.json(req.user);
    } 
    
    // Return unauthenticated status - no hardcoded user fallbacks
    res.status(401).json({ 
      error: "Not authenticated",
      message: "Please log in to continue" 
    });
  });

  // Set admin privileges for a user
  app.post("/api/set-admin", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if current user has admin privileges
    const currentUser = req.user as any;
    const isCurrentUserAdmin = currentUser.is_admin === true;
    
    if (!isCurrentUserAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    try {
      const { userId, isAdmin } = req.body;
      
      const [updatedUser] = await db
        .update(users)
        .set({ isAdmin })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        message: `Admin privileges ${isAdmin ? 'granted to' : 'removed from'} user ${updatedUser.username}`,
        user: updatedUser 
      });
    } catch (err) {
      console.error("Set admin error:", err);
      res.status(500).json({ message: "Failed to update admin privileges" });
    }
  });

  // List all users (admin only)
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if current user has admin privileges
    const currentUser = req.user as any;
    const isCurrentUserAdmin = currentUser.is_admin === true;
    
    if (!isCurrentUserAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    try {
      const allUsers = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          isAdmin: users.isAdmin,
          subscriptionStatus: users.subscriptionStatus,
          createdAt: users.createdAt
        })
        .from(users);

      res.json(allUsers);
    } catch (err) {
      console.error("List users error:", err);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:userId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if current user has admin privileges
    const currentUser = req.user as any;
    const isCurrentUserAdmin = currentUser.is_admin === true;
    
    if (!isCurrentUserAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    try {
      const userId = parseInt(req.params.userId);
      
      // Prevent self-deletion
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning();

      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        message: `User ${deletedUser.username} deleted successfully`,
        deletedUser 
      });
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Create or update the admin user (for development/testing)
  app.post("/api/setup-admin", async (req, res) => {
    try {
      const password = req.body.password || "admin123";
      const hashedPassword = await hashPassword(password);
      
      // Check if admin user exists
      const [existingAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.username, "admin"));
      
      if (existingAdmin) {
        // Update admin password
        console.log("Executing raw query: UPDATE users SET password = $1 WHERE username = 'admin'");
        console.log(`Query params: [${JSON.stringify(hashedPassword)}]`);
        
        const result = await pool.query(
          "UPDATE users SET password = $1 WHERE username = 'admin'",
          [hashedPassword]
        );
        
        console.log(`Query result: ${result.rowCount} rows affected`);
        return res.json({ message: "Admin password updated successfully", username: "admin" });
      } else {
        // Create admin user
        const [admin] = await db
          .insert(users)
          .values({
            username: "admin",
            email: "admin@example.com",
            password: hashedPassword,
          })
          .returning();
        
        return res.json({ message: "Admin user created successfully", username: "admin" });
      }
    } catch (err) {
      console.error("Admin setup error:", err);
      return res.status(500).json({ message: "Failed to setup admin" });
    }
  });
}

// Authentication middleware
export function isAuthenticated(req: any, res: any, next: any) {
  // Allow all Emergency Recovery endpoints without authentication
  if (req.path && req.path.startsWith('/api/emergency/')) {
    console.log('Emergency endpoint access - bypassing authentication');
    return next();
  }
  

  
  // Check if user is authenticated via passport
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  // Check if user has valid session data
  if (req.session?.passport?.user) {
    return next();
  }
  
  return res.status(401).json({ error: 'Authentication required' });
}