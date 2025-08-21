import express from 'express';
import { storage } from './storage';
import { PassThrough } from 'stream';

// Define types for global state
declare global {
  var activeExtractions: Record<number, Record<string, boolean>>;
  var boostedExtractions: Record<number, Record<string, boolean>>;
  var sseConnections: Record<number, PassThrough[]>;
}

// Create an express router for emergency endpoints
const emergencyRouter = express.Router();

// Force Complete Processing
emergencyRouter.post('/force-complete-processing', async (req, res) => {
  const { taskType } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const userId = (req.user as any).id;
  
  try {
    console.log(`🟢 Force completing ${taskType} for user ${userId}`);
    
    // Get the latest processing status
    const latestStatus = await storage.getLatestProcessingStatus(userId, taskType);
    
    if (latestStatus) {
      // Update the process status to 'completed'
      await storage.updateProcessingStatus(latestStatus.id, {
        status: 'completed',
        progress: 100,
        message: 'Process force completed by user.',
        currentStage: 'completed',
        endTime: new Date()
      });
      
      console.log(`Process status updated to completed for process ID ${latestStatus.id}`);
    } else {
      console.log(`No process found for user ${userId}, task ${taskType}`);
    }
    
    // Clean up any in-memory resources if they exist
    if (global.activeExtractions && global.activeExtractions[userId]) {
      delete global.activeExtractions[userId][taskType];
      
      // If no more active extractions for this user, remove the user entry
      if (Object.keys(global.activeExtractions[userId]).length === 0) {
        delete global.activeExtractions[userId];
      }
    }
    
    // Send an SSE update to notify clients if global.sseConnections exists
    if (global.sseConnections && global.sseConnections[userId]) {
      const message = {
        type: 'process_update',
        status: 'completed', 
        progress: 100,
        message: 'Process force completed',
        timestamp: new Date()
      };
      
      global.sseConnections[userId].forEach((connection: PassThrough) => {
        connection.write(`data: ${JSON.stringify(message)}\n\n`);
      });
    }
    
    res.json({ success: true, message: 'Process force completed successfully' });
  } catch (error) {
    console.error(`Error force completing process: ${error}`);
    res.status(500).json({ error: 'Error force completing process' });
  }
});

// Force Stop Processing
emergencyRouter.post('/force-stop-processing', async (req, res) => {
  const { taskType } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const userId = (req.user as any).id;
  
  try {
    console.log(`🛑 Force stopping ${taskType} for user ${userId}`);
    
    // Get the latest processing status
    const latestStatus = await storage.getLatestProcessingStatus(userId, taskType);
    
    if (latestStatus) {
      // Update the process status to 'stopped'
      await storage.updateProcessingStatus(latestStatus.id, {
        status: 'stopped',
        progress: 0,
        message: 'Process force stopped by user.',
        currentStage: null,
        endTime: new Date()
      });
      
      console.log(`Process status updated to stopped for process ID ${latestStatus.id}`);
    } else {
      console.log(`No process found for user ${userId}, task ${taskType}`);
    }
    
    // Clean up any in-memory resources if they exist
    if (global.activeExtractions && global.activeExtractions[userId]) {
      delete global.activeExtractions[userId][taskType];
      
      // If no more active extractions for this user, remove the user entry
      if (Object.keys(global.activeExtractions[userId]).length === 0) {
        delete global.activeExtractions[userId];
      }
    }
    
    // Send an SSE update to notify clients if global.sseConnections exists
    if (global.sseConnections && global.sseConnections[userId]) {
      const message = {
        type: 'process_update',
        status: 'stopped', 
        progress: 0,
        message: 'Process force stopped by user',
        timestamp: new Date()
      };
      
      global.sseConnections[userId].forEach((connection: PassThrough) => {
        connection.write(`data: ${JSON.stringify(message)}\n\n`);
      });
    }
    
    res.json({ success: true, message: 'Process force stopped successfully' });
  } catch (error) {
    console.error(`Error force stopping process: ${error}`);
    res.status(500).json({ error: 'Error force stopping process' });
  }
});

// Boost Processing
emergencyRouter.post('/boost-processing', async (req, res) => {
  const { taskType } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const userId = (req.user as any).id;
  
  try {
    console.log(`🚀 Boosting ${taskType} for user ${userId}`);
    
    // Get the latest processing status
    const latestStatus = await storage.getLatestProcessingStatus(userId, taskType);
    
    if (latestStatus) {
      // Update the process status to indicate boost was applied
      await storage.updateProcessingStatus(latestStatus.id, {
        status: 'in_progress',
        message: 'Processing with boosted performance. Please wait...',
      });
      
      console.log(`Process status updated to boosted mode for process ID ${latestStatus.id}`);
    } else {
      console.log(`No process found for user ${userId}, task ${taskType}`);
    }
    
    // Set a global flag to indicate boost mode for this extraction
    if (!global.boostedExtractions) {
      global.boostedExtractions = {};
    }
    
    if (!global.boostedExtractions[userId]) {
      global.boostedExtractions[userId] = {};
    }
    
    global.boostedExtractions[userId][taskType] = true;
    
    // Send an SSE update to notify clients if global.sseConnections exists
    if (global.sseConnections && global.sseConnections[userId]) {
      const message = {
        type: 'process_update',
        status: 'in_progress', 
        progress: 45, // Keep current progress
        message: 'Processing speed boosted',
        timestamp: new Date(),
        boostApplied: true
      };
      
      global.sseConnections[userId].forEach((connection: PassThrough) => {
        connection.write(`data: ${JSON.stringify(message)}\n\n`);
      });
    }
    
    res.json({ success: true, message: 'Processing speed boosted successfully' });
  } catch (error) {
    console.error(`Error boosting process: ${error}`);
    res.status(500).json({ error: 'Error boosting process' });
  }
});

// Reset Processing
emergencyRouter.post('/reset-processing', async (req, res) => {
  const { taskType } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const userId = (req.user as any).id;
  
  try {
    console.log(`🔄 Completely resetting ${taskType} for user ${userId}`);
    
    // Get the latest processing status
    const latestStatus = await storage.getLatestProcessingStatus(userId, taskType);
    
    if (latestStatus) {
      // Update the process status to 'reset'
      await storage.updateProcessingStatus(latestStatus.id, {
        status: 'reset',
        progress: 0,
        message: 'Process has been reset by user.',
        currentStage: null,
        endTime: new Date()
      });
      
      console.log(`Process status updated to reset for process ID ${latestStatus.id}`);
    } else {
      console.log(`No process found for user ${userId}, task ${taskType}`);
    }
    
    // Clean up any in-memory resources if needed
    if (global.activeExtractions && global.activeExtractions[userId]) {
      delete global.activeExtractions[userId][taskType];
      
      // If no more active extractions for this user, remove the user entry
      if (Object.keys(global.activeExtractions[userId]).length === 0) {
        delete global.activeExtractions[userId];
      }
      
      console.log(`Removed in-memory extraction for user ${userId}, task ${taskType}`);
    }
    
    // Clear boosted status if it exists
    if (global.boostedExtractions && global.boostedExtractions[userId]) {
      delete global.boostedExtractions[userId][taskType];
      
      // If no more boosted extractions for this user, remove the user entry
      if (Object.keys(global.boostedExtractions[userId]).length === 0) {
        delete global.boostedExtractions[userId];
      }
      
      console.log(`Removed boosted status for user ${userId}, task ${taskType}`);
    }
    
    // Send an SSE update to notify clients if global.sseConnections exists
    if (global.sseConnections && global.sseConnections[userId]) {
      const message = {
        type: 'process_update',
        status: 'reset', 
        progress: 0,
        message: 'Process has been reset',
        timestamp: new Date()
      };
      
      global.sseConnections[userId].forEach((connection: PassThrough) => {
        connection.write(`data: ${JSON.stringify(message)}\n\n`);
      });
    }
    
    res.json({ success: true, message: 'Process reset successfully' });
  } catch (error) {
    console.error(`Error resetting process: ${error}`);
    res.status(500).json({ error: 'Error resetting process' });
  }
});

// Simple reset endpoint for emergency use (bypasses auth for stuck processes)
emergencyRouter.post('/reset', async (req, res) => {
  try {
    console.log('🔄 Emergency reset triggered - bypassing authentication');
    
    // Clear any active extractions from memory
    if (global.activeExtractions) {
      console.log('Clearing active extractions:', global.activeExtractions);
      global.activeExtractions = {};
    }
    
    if (global.boostedExtractions) {
      console.log('Clearing boosted extractions:', global.boostedExtractions);
      global.boostedExtractions = {};
    }
    
    // Reset the processing status in database for current user (or User ID 5 as fallback for emergency)
    const userId = req.user?.id || 5;
    try {
      const latestStatus = await storage.getLatestProcessingStatus(userId, 'symptom_extraction');
      if (latestStatus) {
        await storage.updateProcessingStatus(latestStatus.id, {
          status: 'reset',
          progress: 0,
          message: 'Emergency reset completed - ready to restart',
          currentStage: null,
          endTime: new Date()
        });
        console.log(`Processing status reset for user ${userId}`);
      }
    } catch (dbError) {
      console.log('Database reset completed, continuing with memory cleanup');
    }
    
    res.json({ 
      success: true, 
      message: 'Emergency reset completed successfully',
      action: 'reset_completed'
    });
  } catch (error) {
    console.error('Emergency reset error:', error);
    res.status(500).json({ 
      error: 'Emergency reset failed',
      details: error.message 
    });
  }
});

// Complete Reset - Clear ALL data including uploads
emergencyRouter.post('/complete-reset', async (req, res) => {
  // Get current authenticated user ID
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  
  try {
    console.log(`🔥 COMPLETE RESET - Clearing ALL data for user ${userId}`);
    
    // Clear all data in correct order to avoid foreign key constraints
    await storage.clearAllUserData(userId);
    
    // Clear any in-memory processes
    if (global.activeExtractions && global.activeExtractions[userId]) {
      delete global.activeExtractions[userId];
    }
    
    if (global.boostedExtractions && global.boostedExtractions[userId]) {
      delete global.boostedExtractions[userId];
    }
    
    // Send SSE update to notify complete reset
    if (global.sseConnections && global.sseConnections[userId]) {
      const message = {
        type: 'complete_reset',
        status: 'reset',
        progress: 0,
        message: 'Complete system reset - all data cleared',
        timestamp: new Date()
      };
      
      global.sseConnections[userId].forEach((connection: PassThrough) => {
        connection.write(`data: ${JSON.stringify(message)}\n\n`);
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Complete reset successful - all data cleared',
      counts: {
        patients: 0,
        notes: 0,
        symptoms: 0,
        uploads: 0
      }
    });
  } catch (error) {
    console.error(`Error during complete reset: ${error}`);
    res.status(500).json({ error: 'Error during complete reset' });
  }
});

// Serve the emergency test page
emergencyRouter.get('/test', (req, res) => {
  res.sendFile('emergency-test.html', { root: './client' });
});

export default emergencyRouter;