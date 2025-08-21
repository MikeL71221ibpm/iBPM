/**
 * Automatic Stall Detection and Recovery System
 * 
 * This system continuously monitors extraction progress and automatically
 * restarts stalled processes to ensure reliable, unattended operation.
 */

import { storage } from './storage.js';

class StallMonitor {
  constructor() {
    this.monitorInterval = null;
    this.isRunning = false;
    this.checkIntervalMs = 90 * 1000; // Check every 90 seconds
    this.stallTimeoutMs = 2 * 60 * 1000; // Consider stalled after 2 minutes
    this.lastProgressCheck = new Map(); // Track progress changes
  }

  start() {
    if (this.isRunning) {
      console.log('Stall monitor already running');
      return;
    }

    console.log('🔄 Starting automatic stall monitor...');
    this.isRunning = true;
    
    this.monitorInterval = setInterval(async () => {
      await this.checkForStalls();
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isRunning = false;
    console.log('Stall monitor stopped');
  }

  async checkForStalls() {
    try {
      // Get all users with active processing status (both upload and extraction)
      const result = await storage.executeRawQuery(`
        SELECT user_id, process_type, status, progress, message, last_update_time, start_time
        FROM processing_status 
        WHERE (
          (process_type = 'extract_symptoms' AND status = 'in_progress') OR
          (process_type = 'file_upload' AND status = 'processing')
        )
      `);

      const activeProcesses = result.rows || [];
      for (const process of activeProcesses) {
        await this.checkProcessStall(process);
      }

      // Also check for progress stagnation
      await this.checkProgressStagnation();
      
    } catch (error) {
      console.error('Error in stall monitor:', error);
    }
  }

  async checkProcessStall(process) {
    const { user_id, last_update_time, start_time } = process;
    const updateTime = new Date(last_update_time || start_time);
    const now = new Date();
    const minutesSinceUpdate = (now.getTime() - updateTime.getTime()) / (1000 * 60);

    if (minutesSinceUpdate > 2) {
      console.log(`🚨 STALL DETECTED: User ${user_id} stalled for ${minutesSinceUpdate.toFixed(1)} minutes`);
      await this.restartStalledProcess(user_id);
    }
  }

  async checkProgressStagnation() {
    try {
      // Check symptom extraction progress for all users
      const progressData = await storage.executeRawQuery(`
        SELECT 
          ps.user_id,
          COUNT(es.id) as current_symptoms,
          COUNT(DISTINCT n.id) as processed_notes,
          ps.status,
          ps.last_update_time
        FROM processing_status ps
        LEFT JOIN extracted_symptoms es ON es.user_id = ps.user_id
        LEFT JOIN notes n ON n.user_id = ps.user_id
        WHERE ps.process_type = 'extract_symptoms'
        GROUP BY ps.user_id, ps.status, ps.last_update_time
      `);

      for (const data of progressData.rows || []) {
        const userId = data.user_id;
        const currentKey = `${data.current_symptoms}-${data.processed_notes}`;
        const lastKey = this.lastProgressCheck.get(userId);

        if (lastKey && lastKey === currentKey && data.status === 'in_progress') {
          // No progress made since last check
          const lastUpdate = new Date(data.last_update_time);
          const minutesSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
          
          if (minutesSinceUpdate > 2) {
            console.log(`🚨 PROGRESS STAGNATION: User ${userId} - no progress for ${minutesSinceUpdate.toFixed(1)} minutes`);
            await this.restartStalledProcess(userId);
          }
        }

        this.lastProgressCheck.set(userId, currentKey);
      }
    } catch (error) {
      console.error('Error checking progress stagnation:', error);
    }
  }

  async restartStalledProcess(userId) {
    try {
      console.log(`🔄 Auto-restarting stalled process for user ${userId}`);

      // Check what type of process is stalled
      const stalledProcesses = await storage.executeRawQuery(`
        SELECT process_type, status FROM processing_status 
        WHERE user_id = $1 AND (
          (process_type = 'extract_symptoms' AND status = 'in_progress') OR
          (process_type = 'file_upload' AND status = 'processing')
        )
      `, [userId]);

      for (const process of stalledProcesses) {
        if (process.process_type === 'file_upload') {
          console.log(`🔄 Clearing stalled upload for user ${userId}`);
          // Clear stalled upload - user will need to re-upload
          await storage.executeRawQuery(`
            UPDATE processing_status 
            SET status = 'failed', 
                message = 'Upload stalled - cleared by stall monitor', 
                last_update_time = NOW()
            WHERE user_id = $1 AND process_type = 'file_upload'
          `, [userId]);
        } else if (process.process_type === 'extract_symptoms') {
          console.log(`🔄 Restarting stalled extraction for user ${userId}`);
          // Reset extraction status for restart
          await storage.executeRawQuery(`
            UPDATE processing_status 
            SET status = 'reset', 
                message = 'Auto-restarted by stall monitor', 
                last_update_time = NOW()
            WHERE user_id = $1 AND process_type = 'extract_symptoms'
          `, [userId]);
        }
      }

      // Trigger restart via the parallel extractor
      setTimeout(async () => {
        try {
          // Import the parallel extractor for reliable restart
          const { extractSymptomsParallel } = await import('./utils/parallelExtractor.js');
          
          console.log(`🔄 Triggering parallel extraction restart for user ${userId}`);
          
          // Start the parallel extraction process
          await extractSymptomsParallel(userId, {
            onProgress: (progress, message, stage, patientId, processedPatients, totalPatients) => {
              // Progress callback - update status with heartbeat
              const progressPercentage = Math.min(100, Math.round(progress));
              const status = progressPercentage >= 100 ? "complete" : "in_progress";
              
              storage.executeRawQuery(
                `UPDATE processing_status 
                 SET status = $1, progress = $2, message = $3, last_update_time = NOW(), processed_items = $4, total_items = $5
                 WHERE user_id = $6 AND process_type = 'extract_symptoms'`,
                [
                  status,
                  progressPercentage,
                  message || `Auto-restart: Processing ${processedPatients || 0}/${totalPatients || 0} patients...`,
                  processedPatients || 0,
                  totalPatients || 0,
                  userId
                ]
              ).catch((err) => {
                console.error(`Failed to update status during auto-restart:`, err);
              });
            }
          });
          
          console.log(`✅ Successfully restarted extraction for user ${userId}`);
        } catch (error) {
          console.error(`❌ Failed to restart extraction for user ${userId}:`, error);
          
          // Fallback: mark as failed and ready for manual intervention
          await storage.executeRawQuery(`
            UPDATE processing_status 
            SET status = 'failed', 
                message = 'Auto-restart failed: ' + $2, 
                last_update_time = NOW()
            WHERE user_id = $1 AND process_type = 'extract_symptoms'
          `, [userId, error.message]);
        }
      }, 3000);

    } catch (error) {
      console.error(`Error restarting process for user ${userId}:`, error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkIntervalMs,
      stallTimeout: this.stallTimeoutMs,
      trackedUsers: this.lastProgressCheck.size
    };
  }
}

// Create and start the monitor
const stallMonitor = new StallMonitor();
stallMonitor.start();

export { stallMonitor, StallMonitor };