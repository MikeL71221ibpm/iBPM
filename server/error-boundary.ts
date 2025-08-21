import type { Request, Response, NextFunction } from "express";

export function errorBoundary(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error('Error boundary caught:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };
}

export function monitoringBoundary(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error('Monitoring boundary caught:', error);
      res.status(500).json({
        error: 'Monitoring error',
        message: error instanceof Error ? error.message : 'Monitoring operation failed'
      });
    }
  };
}

export function extractionBoundary(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Extraction boundary caught:', error);
      res.status(500).json({
        error: 'Extraction error',
        message: error instanceof Error ? error.message : 'Symptom extraction failed',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  };
}