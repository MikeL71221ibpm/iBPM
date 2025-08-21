// Type declarations for V3.3.6 - maintaining V3.3.5 authentication patterns

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email?: string;
      password: string;
    }
    
    interface Request {
      user?: User;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user?: number;
    };
  }
}

export {};