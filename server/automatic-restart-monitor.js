/**
 * Automatic Process Monitor and Restart System
 * 
 * This system monitors background processing and automatically restarts
 * stalled processes to ensure consistent, reliable operation without
 * requiring manual intervention.
 */

const { storage } = require('./storage');

class AutomaticRestartMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.checkIntervalMs = 45 * 1000; // Check every 45 seconds
    this.stallTimeoutMs = 60 * 1000; // Consider stalled after 1 minute
    this.isMonitoring = false;
  }

  /**
   * Start monitoring background processes
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('📊 Monitor already running');
      return;
    }

    console.log('🔄 Starting automatic process monitor...');
    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkAndRestartStalledProcesses();
    }, this.checkIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('⏹️ Automatic process monitor stopped');
  }

  /**
   * Check for stalled processes and restart them
   */
  async checkAndRestartStalledProcesses() {
    try {
      // Check all active users with in_progress status
      const stalledProcesses = await storage.executeRawQuery(`
        SELECT user_id, process_type, status, progress, message, last_update_time
        FROM processing_status 
        WHERE status = 'in_progress' 
        AND last_update_time < NOW() - INTERVAL '1 minute'
      `);

      if (stalledProcesses.length > 0) {
        console.log(`🚨 Found ${stalledProcesses.length} stalled processes`);
        
        for (const process of stalledProcesses) {
          await this.restartStalledProcess(process);
        }
      }
    } catch (error) {
      console.error('❌ Error checking for stalled processes:', error);
    }
  }

  /**
   * Restart a specific stalled process
   */
  async restartStalledProcess(process) {
    const { user_id, process_type, progress } = process;
    const minutesStalled = Math.round((Date.now() - new Date(process.last_update_time).getTime()) / (1000 * 60));
    
    console.log(`🔄 Auto-restarting stalled process: User ${user_id}, Type ${process_type}, Stalled for ${minutesStalled} minutes`);

    try {
      // Reset the process status
      await storage.executeRawQuery(`
        UPDATE processing_status 
        SET status = 'reset', 
            message = 'Auto-restarted due to ${minutesStalled}-minute stall', 
            updated_at = NOW(),
            last_update_time = NOW()
        WHERE user_id = $1 AND process_type = $2
      `, [user_id, process_type]);

      // Trigger restart based on process type
      if (process_type === 'extract_symptoms') {
        await this.triggerSymptomExtractionRestart(user_id);
      }

      console.log(`✅ Successfully restarted process for user ${user_id}`);
    } catch (error) {
      console.error(`❌ Failed to restart process for user ${user_id}:`, error);
    }
  }

  /**
   * Trigger symptom extraction restart via API call
   */
  async triggerSymptomExtractionRestart(userId) {
    try {
      // Import the preProcess module and restart extraction
      const preProcess = require('./preProcess');
      
      console.log(`🔄 Restarting symptom extraction for user ${userId}`);
      
      // Start the background processing with default options
      preProcess.preProcessSymptoms(
        userId,
        { source: "database" },
        (progress, message, stage, patientId, processedPatients, totalPatients) => {
          // Progress callback - update database status
          const progressPercentage = Math.min(100, Math.round(progress));
          const status = progressPercentage >= 100 ? "complete" : "in_progress";
          
          const statusMessage = processedPatients && totalPatients
            ? `Processing ${processedPatients}/${totalPatients} patients...`
            : message || "Processing in progress...";

          storage.executeRawQuery(
            `INSERT INTO processing_status (user_id, process_type, status, progress, message, created_at, updated_at, processed_items, total_items, current_stage)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7, $8)
             ON CONFLICT (user_id, process_type) 
             DO UPDATE SET status = $3, progress = $4, message = $5, processed_items = $6, total_items = $7, current_stage = $8, updated_at = NOW(), last_update_time = NOW()`,
            [
              userId,
              "extract_symptoms",
              status,
              progressPercentage,
              statusMessage,
              processedPatients || 0,
              totalPatients || 0,
              stage || "processing",
            ]
          ).catch((err) => {
            console.error(`Failed to update status during auto-restart:`, err);
          });
        }
      );
    } catch (error) {
      console.error(`❌ Failed to trigger symptom extraction restart:`, error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      checkInterval: this.checkIntervalMs,
      stallTimeout: this.stallTimeoutMs
    };
  }
}

// Create singleton instance
const monitor = new AutomaticRestartMonitor();

// Start monitoring when module loads
monitor.startMonitoring();

// Export for external control
module.exports = {
  monitor,
  AutomaticRestartMonitor
};