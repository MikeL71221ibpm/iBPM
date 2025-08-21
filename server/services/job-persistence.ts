// Persistent job storage service for production reliability
// Replaces in-memory Map with disk-based storage + memory cache

import fs from 'fs/promises';
import path from 'path';

interface JobData {
  id: string;
  userId: number;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  pdfPath?: string;
}

class JobPersistenceService {
  private jobsDir: string;
  private memoryCache = new Map<string, JobData>();

  constructor() {
    this.jobsDir = 'uploads/daily-reports/jobs';
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.jobsDir, { recursive: true });
      console.log('📁 Job persistence storage initialized');
      
      // Load existing jobs into memory cache on startup
      await this.loadExistingJobs();
    } catch (error) {
      console.error('❌ Failed to initialize job storage:', error);
    }
  }

  private async loadExistingJobs(): Promise<void> {
    try {
      const files = await fs.readdir(this.jobsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      console.log(`📋 Loading ${jsonFiles.length} existing jobs into cache...`);
      
      for (const file of jsonFiles) {
        try {
          const jobId = file.replace('.json', '');
          const jobData = await this.getJobFromDisk(jobId);
          if (jobData) {
            this.memoryCache.set(jobId, jobData);
          }
        } catch (error) {
          console.error(`⚠️ Failed to load job ${file}:`, error);
        }
      }
      
      console.log(`✅ Loaded ${this.memoryCache.size} jobs into memory cache`);
    } catch (error) {
      console.error('❌ Failed to load existing jobs:', error);
    }
  }

  private getJobFilePath(jobId: string): string {
    return path.join(this.jobsDir, `${jobId}.json`);
  }

  private async saveJobToDisk(jobData: JobData): Promise<void> {
    const filePath = this.getJobFilePath(jobData.id);
    
    // Convert dates to ISO strings for JSON serialization
    const serializedJob = {
      ...jobData,
      createdAt: jobData.createdAt.toISOString(),
      updatedAt: jobData.updatedAt.toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(serializedJob, null, 2));
  }

  private async getJobFromDisk(jobId: string): Promise<JobData | null> {
    try {
      const filePath = this.getJobFilePath(jobId);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsedJob = JSON.parse(data);
      
      // Convert ISO strings back to Date objects
      return {
        ...parsedJob,
        createdAt: new Date(parsedJob.createdAt),
        updatedAt: new Date(parsedJob.updatedAt)
      };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`❌ Error reading job ${jobId} from disk:`, error);
      }
      return null;
    }
  }

  async createJob(jobData: Omit<JobData, 'createdAt' | 'updatedAt'>): Promise<JobData> {
    const now = new Date();
    const fullJobData: JobData = {
      ...jobData,
      createdAt: now,
      updatedAt: now
    };

    // Save to both memory and disk
    this.memoryCache.set(jobData.id, fullJobData);
    await this.saveJobToDisk(fullJobData);

    console.log(`💾 Job ${jobData.id} created and persisted`);
    return fullJobData;
  }

  async updateJob(jobId: string, updates: Partial<Omit<JobData, 'id' | 'createdAt'>>): Promise<JobData | null> {
    // Try memory first
    let existingJob = this.memoryCache.get(jobId);
    
    // If not in memory, try to load from disk
    if (!existingJob) {
      existingJob = await this.getJobFromDisk(jobId);
      if (existingJob) {
        this.memoryCache.set(jobId, existingJob);
      }
    }

    if (!existingJob) {
      console.error(`❌ Job ${jobId} not found for update`);
      return null;
    }

    const updatedJob: JobData = {
      ...existingJob,
      ...updates,
      updatedAt: new Date()
    };

    // Update both memory and disk
    this.memoryCache.set(jobId, updatedJob);
    await this.saveJobToDisk(updatedJob);

    console.log(`💾 Job ${jobId} updated: status=${updatedJob.status}, progress=${updatedJob.progress}`);
    return updatedJob;
  }

  async getJob(jobId: string): Promise<JobData | null> {
    // Try memory first (fastest)
    let job = this.memoryCache.get(jobId);
    
    if (!job) {
      // Fallback to disk
      job = await this.getJobFromDisk(jobId);
      if (job) {
        this.memoryCache.set(jobId, job);
        console.log(`📁 Job ${jobId} loaded from disk into cache`);
      }
    }

    return job;
  }

  async deleteJob(jobId: string): Promise<boolean> {
    try {
      // Remove from memory
      this.memoryCache.delete(jobId);
      
      // Remove from disk
      const filePath = this.getJobFilePath(jobId);
      await fs.unlink(filePath);
      
      console.log(`🗑️ Job ${jobId} deleted from storage`);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`❌ Error deleting job ${jobId}:`, error);
      }
      return false;
    }
  }

  async getJobsByUser(userId: number): Promise<JobData[]> {
    // Check memory cache first
    const memoryJobs = Array.from(this.memoryCache.values())
      .filter(job => job.userId === userId);
    
    // Also check disk for any missed jobs
    try {
      const files = await fs.readdir(this.jobsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      const diskJobs: JobData[] = [];
      for (const file of jsonFiles) {
        const jobId = file.replace('.json', '');
        if (!this.memoryCache.has(jobId)) {
          const job = await this.getJobFromDisk(jobId);
          if (job && job.userId === userId) {
            diskJobs.push(job);
            this.memoryCache.set(jobId, job); // Cache it
          }
        }
      }
      
      return [...memoryJobs, ...diskJobs];
    } catch (error) {
      console.error('❌ Error scanning disk for user jobs:', error);
      return memoryJobs;
    }
  }

  async cleanupOldJobs(maxAgeHours: number = 48): Promise<number> {
    console.log(`🧹 Cleaning up jobs older than ${maxAgeHours} hours...`);
    
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    try {
      const files = await fs.readdir(this.jobsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const jobId = file.replace('.json', '');
        const job = await this.getJobFromDisk(jobId);
        
        if (job && job.createdAt.getTime() < cutoffTime) {
          await this.deleteJob(jobId);
          cleanedCount++;
        }
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} old job records`);
    } catch (error) {
      console.error('❌ Error during job cleanup:', error);
    }
    
    return cleanedCount;
  }

  // Get all jobs currently in memory (for debugging)
  getMemoryCacheStats(): { totalJobs: number; byStatus: Record<string, number> } {
    const jobs = Array.from(this.memoryCache.values());
    const byStatus = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalJobs: jobs.length,
      byStatus
    };
  }
}

// Export singleton instance
export const jobPersistence = new JobPersistenceService();