import { storage } from '../storage';

interface UploadMetrics {
  uploadId: string;
  userId: number;
  fileName: string;
  fileSize: number;
  recordCount: number;
  startTime: Date;
  endTime?: Date;
  uploadDuration?: number;
  processingDuration?: number;
  extractionDuration?: number;
  errorCount: number;
  successRate: number;
  notesProcessed: number;
  symptomsExtracted: number;
  status: 'uploading' | 'processing' | 'extracting' | 'complete' | 'error';
  errorDetails?: string;
}

interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  activeUploads: number;
  todayUploads: number;
  errorRate: number;
}

class PerformanceMonitor {
  private activeUploads: Map<string, UploadMetrics> = new Map();
  
  // Start tracking an upload
  startUploadTracking(uploadId: string, userId: number, fileName: string, fileSize: number): void {
    const metrics: UploadMetrics = {
      uploadId,
      userId,
      fileName,
      fileSize,
      recordCount: 0,
      startTime: new Date(),
      errorCount: 0,
      successRate: 0,
      notesProcessed: 0,
      symptomsExtracted: 0,
      status: 'uploading'
    };
    
    this.activeUploads.set(uploadId, metrics);
    console.log(`Performance tracking started for upload: ${uploadId}`);
  }
  
  // Update upload progress
  updateUploadProgress(uploadId: string, updates: Partial<UploadMetrics>): void {
    const existing = this.activeUploads.get(uploadId);
    if (existing) {
      Object.assign(existing, updates);
      this.activeUploads.set(uploadId, existing);
    }
  }
  
  // Complete upload tracking
  async completeUploadTracking(uploadId: string): Promise<void> {
    const metrics = this.activeUploads.get(uploadId);
    if (metrics) {
      metrics.endTime = new Date();
      metrics.uploadDuration = metrics.endTime.getTime() - metrics.startTime.getTime();
      metrics.status = 'complete';
      metrics.successRate = metrics.errorCount === 0 ? 100 : 
        ((metrics.notesProcessed - metrics.errorCount) / metrics.notesProcessed) * 100;
      
      // Save to database
      await this.saveUploadMetrics(metrics);
      
      // Remove from active tracking
      this.activeUploads.delete(uploadId);
      
      console.log(`Upload ${uploadId} completed - Duration: ${metrics.uploadDuration}ms, Success Rate: ${metrics.successRate}%`);
    }
  }
  
  // Save metrics to database
  private async saveUploadMetrics(metrics: UploadMetrics): Promise<void> {
    try {
      await storage.executeRawQuery(`
        INSERT INTO upload_metrics (
          upload_id, user_id, file_name, file_size, record_count,
          start_time, end_time, upload_duration, processing_duration,
          extraction_duration, error_count, success_rate, notes_processed,
          symptoms_extracted, status, error_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (upload_id) DO UPDATE SET
          end_time = EXCLUDED.end_time,
          upload_duration = EXCLUDED.upload_duration,
          processing_duration = EXCLUDED.processing_duration,
          extraction_duration = EXCLUDED.extraction_duration,
          error_count = EXCLUDED.error_count,
          success_rate = EXCLUDED.success_rate,
          notes_processed = EXCLUDED.notes_processed,
          symptoms_extracted = EXCLUDED.symptoms_extracted,
          status = EXCLUDED.status,
          error_details = EXCLUDED.error_details
      `, [
        metrics.uploadId, metrics.userId, metrics.fileName, metrics.fileSize,
        metrics.recordCount, metrics.startTime, metrics.endTime, metrics.uploadDuration,
        metrics.processingDuration, metrics.extractionDuration, metrics.errorCount,
        metrics.successRate, metrics.notesProcessed, metrics.symptomsExtracted,
        metrics.status, metrics.errorDetails
      ]);
    } catch (error) {
      console.error('Error saving upload metrics:', error);
    }
  }
  
  // Get performance summary
  async getPerformanceSummary(userId: number): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's upload stats
      const todayStats = await storage.executeRawQuery(`
        SELECT 
          COUNT(*) as uploads_today,
          AVG(upload_duration) as avg_upload_time,
          AVG(success_rate) as avg_success_rate,
          SUM(notes_processed) as total_notes,
          SUM(symptoms_extracted) as total_symptoms
        FROM upload_metrics 
        WHERE user_id = $1 AND DATE(start_time) = $2
      `, [userId, today]);
      
      // Get overall stats
      const overallStats = await storage.executeRawQuery(`
        SELECT 
          COUNT(*) as total_uploads,
          AVG(upload_duration) as avg_upload_time,
          AVG(success_rate) as avg_success_rate,
          SUM(error_count) as total_errors,
          SUM(notes_processed) as total_notes_processed
        FROM upload_metrics 
        WHERE user_id = $1
      `, [userId]);
      
      // Get recent uploads
      const recentUploads = await storage.executeRawQuery(`
        SELECT * FROM upload_metrics 
        WHERE user_id = $1 
        ORDER BY start_time DESC 
        LIMIT 10
      `, [userId]);
      
      return {
        todayStats: todayStats.rows?.[0] || todayStats[0],
        overallStats: overallStats.rows?.[0] || overallStats[0],
        recentUploads: recentUploads.rows || recentUploads,
        activeUploads: Array.from(this.activeUploads.values())
      };
    } catch (error) {
      console.error('Error getting performance summary:', error);
      return null;
    }
  }
  
  // Create metrics table if it doesn't exist
  async initializeMetricsTable(): Promise<void> {
    try {
      await storage.executeRawQuery(`
        CREATE TABLE IF NOT EXISTS upload_metrics (
          upload_id VARCHAR PRIMARY KEY,
          user_id INTEGER NOT NULL,
          file_name VARCHAR NOT NULL,
          file_size BIGINT,
          record_count INTEGER,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          upload_duration INTEGER,
          processing_duration INTEGER,
          extraction_duration INTEGER,
          error_count INTEGER DEFAULT 0,
          success_rate DECIMAL(5,2),
          notes_processed INTEGER DEFAULT 0,
          symptoms_extracted INTEGER DEFAULT 0,
          status VARCHAR DEFAULT 'uploading',
          error_details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Upload metrics table initialized');
    } catch (error) {
      console.error('Error initializing metrics table:', error);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();