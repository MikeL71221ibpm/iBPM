import express from 'express';
import { db } from './db';
// Import necessary schema components
import { processingStatus } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { storage } from './storage';
import { PassThrough } from 'stream';

// Define types for global state
declare global {
  var activeExtractions: Record<number, Record<string, boolean>>;
  var boostedExtractions: Record<number, Record<string, boolean>>;
  var sseConnections: Record<number, PassThrough[]>;
}

// Create an express router for direct database emergency operations
const emergencyDirectDbRouter = express.Router();

/**
 * Directly reset the process tracking database entry - most severe option
 * This bypasses all normal processing logic and just updates the database directly
 */
emergencyDirectDbRouter.post('/direct-db-reset', async (req, res) => {
  try {
    const { userId = 2, taskType = 'extract_symptoms', force = false } = req.body;
    
    console.log(`🚨 EMERGENCY: Direct database reset requested for user ${userId}, process ${taskType}, force=${force}`);
    
    if (!force) {
      return res.status(400).json({ 
        error: 'Direct database reset requires force=true parameter for safety' 
      });
    }
    
    // 1. First attempt to update using storage interface for safety
    try {
      await storage.updateProcessingStatusByType(taskType, userId, {
        status: 'reset',
        progress: 0,
        message: 'EMERGENCY RESET by direct database operation',
        currentStage: null
      });
      console.log('✅ Process status updated through storage interface');
    } catch (storageError) {
      console.error('❌ Failed to update through storage interface:', storageError);
      
      // 2. Direct database operation if storage interface fails
      try {
        await db.update(processingStatus)
          .set({
            status: 'reset',
            progress: 0,
            message: 'EMERGENCY DIRECT DB RESET',
            currentStage: null,
            lastUpdateTime: new Date()
          })
          .where(
            and(
              eq(processingStatus.userId, userId),
              eq(processingStatus.processType, taskType)
            )
          );
        console.log('✅ Process status updated directly in database');
      } catch (dbError) {
        console.error('❌ Direct database update failed:', dbError);
        throw dbError; // Re-throw for the outer catch
      }
    }
    
    // 3. Clean up in-memory resources if global objects exist
    try {
      if (global.activeExtractions && global.activeExtractions[userId]) {
        delete global.activeExtractions[userId][taskType];
        console.log('✅ Cleared in-memory activeExtractions');
      }
      
      if (global.boostedExtractions && global.boostedExtractions[userId]) {
        delete global.boostedExtractions[userId][taskType];
        console.log('✅ Cleared in-memory boostedExtractions');
      }
      
      if (global.sseConnections && global.sseConnections[userId]) {
        // Send a message to all connected clients that process has been reset
        const message = {
          type: 'process_update',
          status: 'reset',
          progress: 0,
          message: 'Process has been reset via emergency direct database operation',
          timestamp: new Date()
        };
        
        global.sseConnections[userId].forEach((connection: PassThrough) => {
          try {
            connection.write(`data: ${JSON.stringify(message)}\n\n`);
            console.log('✅ Sent SSE update to client');
          } catch (sseError) {
            console.error('❌ Failed to send SSE update:', sseError);
          }
        });
      }
    } catch (cleanupError) {
      console.error('❌ Error during in-memory cleanup:', cleanupError);
      // Continue anyway as database is already updated
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Process tracking database entry has been reset. You may need to log out and back in for changes to take effect.' 
    });
  } catch (error) {
    console.error('🚨 CRITICAL ERROR during emergency database reset:', error);
    return res.status(500).json({ 
      error: 'Critical error during emergency reset operation. Please contact system administrator.' 
    });
  }
});

export default emergencyDirectDbRouter;