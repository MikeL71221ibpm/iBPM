/**
 * Background Processing System for Large Healthcare Data Uploads
 * 
 * Handles enterprise-scale file processing with progress tracking
 * and WebSocket updates for real-time monitoring
 */

import { EnterpriseUploadSystem } from '../../enterprise_upload_system.js';
import { broadcastProgress } from '../routes.js';

interface BackgroundJob {
  id: string;
  userId: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    processedRecords: number;
    totalRecords: number;
    newPatients: number;
    newNotes: number;
    errors: number;
    rate: number;
    eta: number;
    percentage: number;
  };
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

class BackgroundProcessor {
  private jobs: Map<string, BackgroundJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;

  /**
   * Queue a new background upload job
   */
  async queueUpload(userId: number, filePath: string, fileName: string): Promise<string> {
    const jobId = `upload_${userId}_${Date.now()}`;
    const fileStats = await import('fs').then(fs => fs.promises.stat(filePath));
    
    const job: BackgroundJob = {
      id: jobId,
      userId,
      filePath,
      fileName,
      fileSize: fileStats.size,
      status: 'queued',
      progress: {
        processedRecords: 0,
        totalRecords: 0,
        newPatients: 0,
        newNotes: 0,
        errors: 0,
        rate: 0,
        eta: 0,
        percentage: 0
      }
    };

    this.jobs.set(jobId, job);
    
    // Start processing if we have capacity
    this.tryStartNextJob();
    
    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): BackgroundJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a user
   */
  getUserJobs(userId: number): BackgroundJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
  }

  /**
   * Try to start the next queued job
   */
  private tryStartNextJob(): void {
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    const queuedJob = Array.from(this.jobs.values())
      .find(job => job.status === 'queued');

    if (queuedJob) {
      this.startJob(queuedJob.id);
    }
  }

  /**
   * Start processing a specific job
   */
  private async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'queued') {
      return;
    }

    this.activeJobs.add(jobId);
    job.status = 'processing';
    job.startTime = new Date();

    console.log(`🚀 Starting background upload job: ${jobId}`);
    console.log(`   File: ${job.fileName} (${(job.fileSize / 1024 / 1024).toFixed(1)} MB)`);

    try {
      const uploader = new EnterpriseUploadSystem();
      
      // Set up progress callback for real-time updates
      uploader.setProgressCallback((progress) => {
        job.progress = { ...progress };
        
        // Broadcast progress via WebSocket
        broadcastProgress(job.userId, {
          type: 'upload_progress',
          jobId: job.id,
          fileName: job.fileName,
          ...progress
        });
      });

      // Process the file
      const result = await uploader.uploadLargeFile(job.filePath);
      
      // Job completed successfully
      job.status = 'completed';
      job.endTime = new Date();
      job.progress = {
        ...job.progress,
        processedRecords: result.processedRecords || 0,
        newPatients: result.newPatients || 0,
        newNotes: result.newNotes || 0,
        percentage: 100
      };

      // Record the upload in file tracking system
      try {
        const { storage } = await import('../storage.js');
        await storage.recordFileUpload({
          userId: job.userId,
          fileName: job.fileName,
          filePath: job.filePath,
          recordCount: result.processedRecords || 0,
          patientCount: result.newPatients || 0,
          fileSize: job.fileSize,
          uploadTime: job.startTime || new Date(),
          processedTime: job.endTime
        });
        console.log(`📝 Upload recorded in file tracking system`);
      } catch (trackingError) {
        console.error('Failed to record upload in tracking system:', trackingError);
      }

      console.log(`✅ Background upload completed: ${jobId}`);
      console.log(`   Processed: ${result.processedRecords?.toLocaleString()} records`);
      console.log(`   Patients: +${result.newPatients?.toLocaleString()}`);
      console.log(`   Notes: +${result.newNotes?.toLocaleString()}`);

      // Broadcast completion
      broadcastProgress(job.userId, {
        type: 'upload_completed',
        jobId: job.id,
        fileName: job.fileName,
        result: {
          processedRecords: result.processedRecords,
          newPatients: result.newPatients,
          newNotes: result.newNotes,
          duration: result.duration
        }
      });

      // Auto-start symptom extraction after successful upload
      if (result.newNotes && result.newNotes > 0) {
        console.log(`🚀 Auto-starting symptom extraction for ${result.newNotes} new notes`);
        try {
          // Start background symptom processing automatically
          await this.startBackgroundProcessing({
            userId: job.userId,
            batchSize: 400,
            delayBetweenBatches: 50
          });
          console.log(`✅ Symptom extraction started automatically for user ${job.userId}`);
        } catch (extractionError) {
          console.error(`Failed to auto-start symptom extraction:`, extractionError);
          
          // Broadcast warning but don't fail the upload
          broadcastProgress(job.userId, {
            type: 'extraction_start_failed',
            message: 'Upload completed successfully, but automatic symptom extraction failed to start. You can manually trigger it from the dashboard.',
            error: extractionError instanceof Error ? extractionError.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      // Job failed
      job.status = 'failed';
      job.endTime = new Date();
      job.error = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Background upload failed: ${jobId}`);
      console.error(`   Error: ${job.error}`);

      // Broadcast failure
      broadcastProgress(job.userId, {
        type: 'upload_failed',
        jobId: job.id,
        fileName: job.fileName,
        error: job.error
      });

    } finally {
      this.activeJobs.delete(jobId);
      
      // Try to start next job
      this.tryStartNextJob();
    }
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'processing') {
      // Note: In a production system, you would need to implement
      // proper cancellation handling in the upload process
      console.log(`⚠️ Job cancellation requested: ${jobId} (not yet implemented)`);
      return false;
    }

    if (job.status === 'queued') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.endTime = new Date();
      return true;
    }

    return false;
  }

  /**
   * Clean up old completed jobs
   */
  cleanupOldJobs(maxAgeHours: number = 24): void {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.endTime && job.endTime < cutoff) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    const jobs = Array.from(this.jobs.values());
    
    return {
      totalJobs: jobs.length,
      queuedJobs: jobs.filter(j => j.status === 'queued').length,
      activeJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      maxConcurrentJobs: this.maxConcurrentJobs
    };
  }

  /**
   * Start background symptom processing for existing notes
   */
  async startBackgroundProcessing(options: { userId: number; batchSize?: number; delayBetweenBatches?: number }): Promise<void> {
    const { userId, batchSize = 400, delayBetweenBatches = 50 } = options;
    
    try {
      // Import required modules
      const { storage } = await import('../storage.js');
      const { extractSymptomsParallel } = await import('./parallelExtractor.js');
      
      console.log(`🚀 Starting background symptom processing for user ${userId}`);
      
      // Get unprocessed notes (all notes for this user since we have minimal symptoms extracted)
      const notes = await storage.getNotesByUserId(userId);
      console.log(`Found ${notes.length} notes for background processing`);
      
      if (notes.length === 0) {
        console.log('No notes found for processing');
        return;
      }
      
      // Get symptom library
      const symptoms = await storage.getSymptomMaster();
      console.log(`Loaded ${symptoms.length} symptom patterns`);
      
      // Process notes in background with proper error handling
      await this.processNotesInBackground(userId, notes, symptoms, batchSize, delayBetweenBatches);
      
    } catch (error) {
      console.error(`Failed to start background processing for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Process notes in background with progress tracking and auto-recovery
   */
  private async processNotesInBackground(
    userId: number, 
    notes: any[], 
    symptoms: any[], 
    batchSize: number,
    delayBetweenBatches: number
  ): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const { storage } = await import('../storage.js');
        const { extractSymptomsParallel } = await import('./parallelExtractor.js');
        
        // Check if we need to resume from a previous attempt
        const existingSymptoms = await storage.getExtractedSymptomsByUserId(userId);
        const processedPatientIds = new Set(existingSymptoms.map(s => s.patientId));
        const remainingNotes = notes.filter(note => !processedPatientIds.has(note.patientId));
        
        if (remainingNotes.length === 0) {
          console.log(`✅ All notes already processed for user ${userId}`);
          return;
        }
        
        const totalBatches = Math.ceil(remainingNotes.length / batchSize);
        let processedBatches = 0;
        
        console.log(`Processing ${remainingNotes.length} remaining notes in ${totalBatches} batches of ${batchSize} (retry ${retryCount})`);
        
        for (let i = 0; i < remainingNotes.length; i += batchSize) {
          const batch = remainingNotes.slice(i, i + batchSize);
          processedBatches++;
          
          console.log(`Processing batch ${processedBatches}/${totalBatches} (${batch.length} notes)`);
          
          try {
            // Extract symptoms from this batch with timeout protection
            const extractedSymptoms = await Promise.race([
              extractSymptomsParallel(
                batch,
                symptoms,
                userId,
                (progress, message) => {
                  // Broadcast progress via WebSocket
                  broadcastProgress(userId, {
                    type: 'symptom_extraction_progress',
                    batch: processedBatches,
                    totalBatches,
                    batchProgress: progress,
                    message: `Batch ${processedBatches}/${totalBatches}: ${message}`,
                    overallProgress: ((processedBatches - 1) + progress) / totalBatches
                  });
                }
              ),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Batch timeout after 10 minutes')), 600000)
              )
            ]);
            
            // Save extracted symptoms
            if (extractedSymptoms.length > 0) {
              await storage.saveExtractedSymptoms(extractedSymptoms);
              console.log(`Saved ${extractedSymptoms.length} symptoms from batch ${processedBatches}`);
            }
            
            // Broadcast batch completion
            broadcastProgress(userId, {
              type: 'batch_completed',
              batch: processedBatches,
              totalBatches,
              symptomsFound: extractedSymptoms.length,
              overallProgress: processedBatches / totalBatches
            });
            
          } catch (batchError) {
            console.error(`Batch ${processedBatches} failed:`, batchError);
            // Continue with next batch instead of failing entirely
            broadcastProgress(userId, {
              type: 'batch_warning',
              batch: processedBatches,
              message: `Batch ${processedBatches} failed, continuing with next batch`
            });
          }
          
          // Small delay between batches to prevent overwhelming the system
          if (processedBatches < totalBatches) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }
        }
        
        // Broadcast completion
        broadcastProgress(userId, {
          type: 'symptom_extraction_completed',
          message: `Background processing completed! Processed ${remainingNotes.length} notes in ${totalBatches} batches.`
        });
        
        console.log(`✅ Background symptom processing completed for user ${userId}`);
        return; // Success - exit retry loop
        
      } catch (error) {
        retryCount++;
        console.error(`Background processing attempt ${retryCount} failed for user ${userId}:`, error);
        
        if (retryCount <= maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
          console.log(`Retrying in ${waitTime/1000} seconds...`);
          
          broadcastProgress(userId, {
            type: 'symptom_extraction_retry',
            attempt: retryCount,
            maxRetries,
            waitTime,
            message: `Processing failed, retrying in ${waitTime/1000} seconds (attempt ${retryCount}/${maxRetries})`
          });
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Final failure - broadcast error
          broadcastProgress(userId, {
            type: 'symptom_extraction_error',
            message: `Background processing failed after ${maxRetries} attempts: ${error.message}`
          });
          throw error;
        }
      }
    }
  }
}

// Export singleton instance
export const backgroundProcessor = new BackgroundProcessor();

// Cleanup old jobs every hour
setInterval(() => {
  backgroundProcessor.cleanupOldJobs(24);
}, 60 * 60 * 1000);