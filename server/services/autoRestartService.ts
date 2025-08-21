/**
 * Auto-Restart Service - Built into Main Application
 * 
 * This service automatically monitors and restarts stalled extraction processes
 * as part of the core application, eliminating the need for external monitoring scripts.
 */

import { Pool } from '@neondatabase/serverless';
import { spawn } from 'child_process';
import path from 'path';

class AutoRestartService {
  private pool: Pool;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly CHECK_INTERVAL = 1 * 60 * 1000; // Check every 1 minute
  private readonly STALL_THRESHOLD = 45 * 1000; // 45 seconds without update = stalled

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  /**
   * Start the auto-restart monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.log('🔄 Auto-restart service already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting auto-restart monitoring service...');

    // Start immediate check
    this.checkAndRestart();

    // Schedule regular checks
    this.monitoringInterval = setInterval(() => {
      this.checkAndRestart();
    }, this.CHECK_INTERVAL);

    console.log('✅ Auto-restart service started - checking every 2 minutes');
  }

  /**
   * Stop the auto-restart monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🛑 Auto-restart service stopped');
  }

  /**
   * Check for stalled processes and restart if necessary
   */
  private async checkAndRestart(): Promise<void> {
    try {
      const stalledProcesses = await this.findStalledProcesses();
      
      for (const process of stalledProcesses) {
        console.log(`🚨 Detected stalled process: ${process.process_type} for user ${process.user_id}`);
        console.log(`📊 Last update: ${process.last_update_time}, Progress: ${process.progress}%`);
        
        await this.restartProcess(process);
      }
    } catch (error) {
      console.error('❌ Error in auto-restart check:', error);
    }
  }

  /**
   * Find processes that have been stalled for too long
   */
  private async findStalledProcesses(): Promise<any[]> {
    const query = `
      SELECT * FROM processing_status 
      WHERE status IN ('processing', 'in_progress') 
      AND last_update_time < NOW() - INTERVAL '${this.STALL_THRESHOLD / 1000} seconds'
      ORDER BY last_update_time ASC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Restart a stalled process
   */
  private async restartProcess(processInfo: any): Promise<void> {
    const { user_id, process_type, id } = processInfo;
    
    console.log(`🔄 Auto-restarting ${process_type} for user ${user_id}...`);

    try {
      // Mark current process as failed
      await this.pool.query(`
        UPDATE processing_status 
        SET status = 'failed', 
            error = 'Auto-restarted due to stall detected',
            end_time = NOW()
        WHERE id = $1
      `, [id]);

      // Start new process based on type
      if (process_type === 'extract_symptoms') {
        await this.restartExtractionProcess(user_id);
      }

      console.log(`✅ Successfully restarted ${process_type} for user ${user_id}`);
    } catch (error) {
      console.error(`❌ Failed to restart ${process_type} for user ${user_id}:`, error);
    }
  }

  /**
   * Restart the symptom extraction process
   */
  private async restartExtractionProcess(userId: number): Promise<void> {
    // Get total notes count for this user
    const notesResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM notes WHERE user_id = $1',
      [userId]
    );
    const totalNotes = parseInt(notesResult.rows[0].count);

    // Insert new processing status
    await this.pool.query(`
      INSERT INTO processing_status (
        user_id, process_type, status, progress, current_stage, 
        message, total_items, processed_items, start_time, last_update_time
      ) VALUES (
        $1, 'extract_symptoms', 'in_progress', 0, 'initializing',
        'Auto-restarted extraction process', $2, 0, NOW(), NOW()
      )
    `, [userId, totalNotes]);

    // Start the optimized extractor process
    const extractorPath = path.join(__dirname, '../utils/optimizedExtractor.js');
    const extractorProcess = spawn('node', [
      extractorPath,
      '--user-id', userId.toString(),
      '--batch-size', '25',
      '--restart'
    ], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore']
    });

    extractorProcess.unref();
    console.log(`🚀 Extraction process restarted for user ${userId}`);
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; checkInterval: number; stallThreshold: number } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL,
      stallThreshold: this.STALL_THRESHOLD
    };
  }

  /**
   * Force restart a specific process (for manual intervention)
   */
  async forceRestart(userId: number, processType: string): Promise<void> {
    console.log(`🔧 Force restarting ${processType} for user ${userId}...`);

    // Find the current process
    const result = await this.pool.query(`
      SELECT * FROM processing_status 
      WHERE user_id = $1 AND process_type = $2 AND status = 'in_progress'
      ORDER BY last_update_time DESC LIMIT 1
    `, [userId, processType]);

    if (result.rows.length > 0) {
      await this.restartProcess(result.rows[0]);
    } else {
      console.log(`⚠️ No active ${processType} process found for user ${userId}`);
    }
  }
}

// Export singleton instance
export const autoRestartService = new AutoRestartService();