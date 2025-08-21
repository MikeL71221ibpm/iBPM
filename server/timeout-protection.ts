/**
 * Timeout Protection System
 * 
 * Implements comprehensive timeout monitoring and automatic recovery
 * to prevent processing stalls and ensure reliable operation.
 */

import { storage } from './storage';

interface TimeoutConfig {
  maxProcessingTime: number; // Maximum time in milliseconds
  checkInterval: number;     // How often to check in milliseconds
  stallThreshold: number;    // Consider stalled after this many milliseconds
  maxRetries: number;        // Maximum retry attempts
}

interface ProcessMonitor {
  userId: number;
  processType: string;
  startTime: number;
  lastActivity: number;
  retryCount: number;
  timerId?: NodeJS.Timeout;
}

class TimeoutProtectionService {
  private monitors = new Map<string, ProcessMonitor>();
  private config: TimeoutConfig = {
    maxProcessingTime: 2 * 60 * 60 * 1000, // 2 hours max (matches parallelExtractor)
    checkInterval: 60 * 1000,               // Check every 60 seconds
    stallThreshold: 5 * 60 * 1000,          // 5 minutes without activity = stalled
    maxRetries: 2                           // Try 2 times before giving up
  };

  /**
   * Start monitoring a process for timeouts
   */
  startMonitoring(userId: number, processType: string): void {
    const key = `${userId}-${processType}`;
    const now = Date.now();
    
    // Stop existing monitor if present
    this.stopMonitoring(userId, processType);
    
    const monitor: ProcessMonitor = {
      userId,
      processType,
      startTime: now,
      lastActivity: now,
      retryCount: 0
    };
    
    monitor.timerId = setInterval(() => {
      this.checkProcess(monitor);
    }, this.config.checkInterval);
    
    this.monitors.set(key, monitor);
    console.log(`🛡️ Started timeout monitoring for ${processType} (user ${userId})`);
  }

  /**
   * Update activity timestamp for a process
   */
  updateActivity(userId: number, processType: string): void {
    const key = `${userId}-${processType}`;
    const monitor = this.monitors.get(key);
    
    if (monitor) {
      monitor.lastActivity = Date.now();
      console.log(`🔄 Activity updated for ${processType} (user ${userId})`);
    }
  }

  /**
   * Stop monitoring a process
   */
  stopMonitoring(userId: number, processType: string): void {
    const key = `${userId}-${processType}`;
    const monitor = this.monitors.get(key);
    
    if (monitor) {
      if (monitor.timerId) {
        clearInterval(monitor.timerId);
      }
      this.monitors.delete(key);
      console.log(`🛡️ Stopped timeout monitoring for ${processType} (user ${userId})`);
    }
  }

  /**
   * Check if a process has stalled and take recovery action
   */
  private async checkProcess(monitor: ProcessMonitor): Promise<void> {
    const now = Date.now();
    const timeSinceActivity = now - monitor.lastActivity;
    const totalTime = now - monitor.startTime;
    
    // Check if process has been running too long
    if (totalTime > this.config.maxProcessingTime) {
      console.log(`⏰ Process ${monitor.processType} exceeded max time (${totalTime}ms)`);
      await this.handleTimeout(monitor, 'max_time_exceeded');
      return;
    }
    
    // Check if process appears stalled
    if (timeSinceActivity > this.config.stallThreshold) {
      console.log(`🚨 Process ${monitor.processType} appears stalled (${timeSinceActivity}ms since activity)`);
      await this.handleTimeout(monitor, 'stalled');
      return;
    }
    
    // Process is healthy
    console.log(`✅ Process ${monitor.processType} healthy (${timeSinceActivity}ms since activity)`);
  }

  /**
   * Handle timeout scenarios
   */
  private async handleTimeout(monitor: ProcessMonitor, reason: string): Promise<void> {
    const { userId, processType, retryCount } = monitor;
    
    if (retryCount >= this.config.maxRetries) {
      console.log(`❌ Process ${processType} failed after ${retryCount} retries`);
      await this.markAsFailed(userId, processType, `Failed after ${retryCount} retries: ${reason}`);
      this.stopMonitoring(userId, processType);
      return;
    }
    
    // Attempt recovery
    console.log(`🔄 Attempting recovery for ${processType} (attempt ${retryCount + 1}/${this.config.maxRetries})`);
    monitor.retryCount++;
    monitor.lastActivity = Date.now();
    
    await this.attemptRecovery(userId, processType, reason);
  }

  /**
   * Attempt to recover a stalled process
   */
  private async attemptRecovery(userId: number, processType: string, reason: string): Promise<void> {
    try {
      if (processType === 'extract_symptoms') {
        console.log(`🚀 Restarting symptom extraction for user ${userId}`);
        
        // Force restart the extraction process
        const response = await fetch('http://localhost:5000/api/extract-symptoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceRestart: true, userId })
        });
        
        if (response.ok) {
          console.log(`✅ Successfully restarted ${processType}`);
          await storage.updateProcessingStatusByType(processType, userId, {
            status: 'in_progress',
            progress: 10,
            message: `Auto-recovered from ${reason} - restarting extraction...`
          });
        } else {
          throw new Error(`Restart failed: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error(`❌ Recovery failed for ${processType}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.markAsFailed(userId, processType, `Recovery failed: ${errorMessage}`);
    }
  }

  /**
   * Mark a process as failed
   */
  private async markAsFailed(userId: number, processType: string, message: string): Promise<void> {
    await storage.updateProcessingStatusByType(processType, userId, {
      status: 'failed',
      progress: 0,
      message: `Timeout protection: ${message}`
    });
  }

  /**
   * Get monitoring status for debugging
   */
  getMonitoringStatus(): Array<{ userId: number; processType: string; runtime: number; lastActivity: number }> {
    const now = Date.now();
    return Array.from(this.monitors.values()).map(monitor => ({
      userId: monitor.userId,
      processType: monitor.processType,
      runtime: now - monitor.startTime,
      lastActivity: now - monitor.lastActivity
    }));
  }
}

// Export singleton instance
export const timeoutProtection = new TimeoutProtectionService();