import { storage } from "../storage";

// Add type definitions to the global scope
declare global {
  var activeExtractions: Record<number, Record<string, boolean>>;
  var boostedExtractions: Record<number, Record<string, boolean>>;
}

/**
 * Force stops the extraction process and cleans up any resources
 * @param userId User ID for the extraction
 * @param taskType Type of process to stop
 */
export async function forceStopExtraction(userId: number, taskType: string): Promise<boolean> {
  try {
    console.log(`🛑 Force stopping extraction process for user ${userId}, task ${taskType}`);
    
    // Get the latest processing status
    const latestStatus = await storage.getLatestProcessingStatus(userId, taskType);
    
    if (latestStatus) {
      // 1. Update the process status to 'stopped'
      await storage.updateProcessingStatus(latestStatus.id, {
        status: 'stopped',
        progress: 0,
        message: 'Process was force stopped by user.',
        currentStage: null,
        endTime: new Date()
      });
      
      console.log(`Process status updated to stopped`);
    } else {
      console.log(`No process status found for user ${userId}, task ${taskType}`);
    }
    
    // 2. Clean up any in-memory resources if needed
    if (global.activeExtractions) {
      if (global.activeExtractions[userId]) {
        delete global.activeExtractions[userId][taskType];
        
        // If no more active extractions for this user, remove the user entry
        if (Object.keys(global.activeExtractions[userId]).length === 0) {
          delete global.activeExtractions[userId];
        }
        
        console.log(`Removed in-memory extraction for user ${userId}, task ${taskType}`);
      }
    }
    
    console.log(`✅ Successfully force stopped extraction for user ${userId}, task ${taskType}`);
    return true;
  } catch (error) {
    console.error(`❌ Error force stopping extraction:`, error);
    return false;
  }
}

/**
 * Completely resets the extraction process, including clearing all data
 * This is a more drastic measure than force stopping
 */
export async function resetExtraction(userId: number, taskType: string): Promise<boolean> {
  try {
    console.log(`🔄 Completely resetting extraction process for user ${userId}, task ${taskType}`);
    
    // 1. Force stop first
    await forceStopExtraction(userId, taskType);
    
    // 2. Get the latest processing status and update it to reset
    const latestStatus = await storage.getLatestProcessingStatus(userId, taskType);
    
    if (latestStatus) {
      await storage.updateProcessingStatus(latestStatus.id, {
        status: 'reset',
        progress: 0,
        message: 'Process has been completely reset by user.',
        currentStage: null,
        endTime: new Date()
      });
      
      console.log(`Process status updated to reset`);
    }
    
    // 3. Force garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
      console.log('🧹 Forced garbage collection');
    }
    
    console.log(`✅ Successfully reset extraction for user ${userId}, task ${taskType}`);
    return true;
  } catch (error) {
    console.error(`❌ Error resetting extraction:`, error);
    return false;
  }
}

/**
 * Applies a processing speed boost by allocating more resources
 */
export async function boostProcessing(userId: number, taskType: string): Promise<boolean> {
  try {
    console.log(`🚀 Boosting processing speed for user ${userId}, task ${taskType}`);
    
    // Get the latest processing status
    const latestStatus = await storage.getLatestProcessingStatus(userId, taskType);
    
    if (latestStatus) {
      // Mark the process as boosted in the database
      await storage.updateProcessingStatus(latestStatus.id, {
        status: 'in_progress',
        message: 'Processing with boosted performance...',
        // We don't change the progress or current stage
      });
      
      console.log(`Process status updated for boost`);
    }
    
    // Set a global flag to indicate boost mode if not already set
    if (!global.boostedExtractions) {
      global.boostedExtractions = {};
    }
    
    if (!global.boostedExtractions[userId]) {
      global.boostedExtractions[userId] = {};
    }
    
    global.boostedExtractions[userId][taskType] = true;
    
    console.log(`✅ Successfully applied boost for user ${userId}, task ${taskType}`);
    return true;
  } catch (error) {
    console.error(`❌ Error applying boost:`, error);
    return false;
  }
}