import { promises as fs } from 'fs';
import path from 'path';
import * as schedule from 'node-schedule';

interface PDFCleanupConfig {
  retentionHours: number;
  pdfDirectory: string;
  enableLogging: boolean;
}

export class PDFCleanupService {
  private config: PDFCleanupConfig;
  private cleanupJob: any;

  constructor(config: Partial<PDFCleanupConfig> = {}) {
    this.config = {
      retentionHours: 24, // Default 24 hours
      pdfDirectory: 'uploads/daily-reports/pdfs',
      enableLogging: true,
      ...config
    };
  }

  /**
   * Clean up failed PDF files immediately (files < 10KB are considered failed)
   */
  private async cleanupFailedPDFs(): Promise<{ filesRemoved: number; spaceFreed: number }> {
    const stats = { filesRemoved: 0, spaceFreed: 0 };

    try {
      await fs.access(this.config.pdfDirectory);
    } catch {
      return stats;
    }

    const files = await fs.readdir(this.config.pdfDirectory);

    for (const filename of files) {
      if (!filename.endsWith('.pdf')) continue;

      const filePath = path.join(this.config.pdfDirectory, filename);
      
      try {
        const fileStats = await fs.stat(filePath);
        
        // Remove files smaller than 10KB (likely failed generations)
        if (fileStats.size < 10240) {
          await fs.unlink(filePath);
          
          stats.filesRemoved++;
          stats.spaceFreed += fileStats.size;
          
          if (this.config.enableLogging) {
            console.log(`🗑️  Removed failed PDF: ${filename} (${formatBytes(fileStats.size)})`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error);
      }
    }

    return stats;
  }

  /**
   * Initialize the cleanup service with scheduled runs
   */
  public initialize(): void {
    console.log(`🧹 PDF Cleanup Service initialized`);
    console.log(`📁 Directory: ${this.config.pdfDirectory}`);
    console.log(`⏰ Retention: ${this.config.retentionHours} hours`);

    // Run cleanup every 4 hours
    this.cleanupJob = schedule.scheduleJob('0 */4 * * *', async () => {
      await this.runCleanup();
    });

    // Run initial cleanup on startup
    setTimeout(async () => {
      await this.runCleanup();
    }, 30000); // Wait 30 seconds after startup

    console.log(`✅ Scheduled cleanup every 4 hours (next: ${this.cleanupJob.nextInvocation()})`);
  }

  /**
   * Run the cleanup process
   */
  public async runCleanup(): Promise<void> {
    try {
      if (this.config.enableLogging) {
        console.log(`🧹 Starting PDF cleanup (retention: ${this.config.retentionHours}h)`);
      }

      // Clean up old PDFs first
      const oldPdfStats = await this.cleanupOldPDFs();
      
      // Clean up failed PDFs immediately
      const failedPdfStats = await this.cleanupFailedPDFs();
      
      const totalStats = {
        filesRemoved: oldPdfStats.filesRemoved + failedPdfStats.filesRemoved,
        spaceFreed: oldPdfStats.spaceFreed + failedPdfStats.spaceFreed
      };
      
      if (this.config.enableLogging && totalStats.filesRemoved > 0) {
        console.log(`🗑️  Cleanup complete: ${totalStats.filesRemoved} files removed, ${formatBytes(totalStats.spaceFreed)} freed`);
        if (failedPdfStats.filesRemoved > 0) {
          console.log(`   └─ Failed PDFs cleaned: ${failedPdfStats.filesRemoved} files`);
        }
      }
    } catch (error) {
      console.error('❌ PDF cleanup error:', error);
    }
  }

  /**
   * Clean up PDFs older than retention period
   */
  private async cleanupOldPDFs(): Promise<{ filesRemoved: number; spaceFreed: number }> {
    const stats = { filesRemoved: 0, spaceFreed: 0 };

    try {
      // Check if directory exists
      await fs.access(this.config.pdfDirectory);
    } catch {
      if (this.config.enableLogging) {
        console.log(`📁 PDF directory doesn't exist: ${this.config.pdfDirectory}`);
      }
      return stats;
    }

    const files = await fs.readdir(this.config.pdfDirectory);
    const cutoffTime = Date.now() - (this.config.retentionHours * 60 * 60 * 1000);

    for (const filename of files) {
      if (!filename.endsWith('.pdf')) continue;

      const filePath = path.join(this.config.pdfDirectory, filename);
      
      try {
        const fileStats = await fs.stat(filePath);
        
        if (fileStats.mtime.getTime() < cutoffTime) {
          const fileSize = fileStats.size;
          await fs.unlink(filePath);
          
          stats.filesRemoved++;
          stats.spaceFreed += fileSize;
          
          if (this.config.enableLogging) {
            console.log(`🗑️  Removed: ${filename} (${formatBytes(fileSize)}, ${formatAge(fileStats.mtime)})`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error);
      }
    }

    return stats;
  }

  /**
   * Manual cleanup trigger (for testing or immediate cleanup)
   */
  public async forceCleanup(): Promise<{ filesRemoved: number; spaceFreed: number }> {
    console.log('🔧 Manual PDF cleanup triggered');
    return await this.cleanupOldPDFs();
  }

  /**
   * Get current cleanup status
   */
  public async getCleanupStatus(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: { name: string; age: string } | null;
    nextCleanup: string;
  }> {
    const status = {
      totalFiles: 0,
      totalSize: 0,
      oldestFile: null as { name: string; age: string } | null,
      nextCleanup: this.cleanupJob?.nextInvocation()?.toISOString() || 'Not scheduled'
    };

    try {
      await fs.access(this.config.pdfDirectory);
      const files = await fs.readdir(this.config.pdfDirectory);
      
      let oldestTime = Date.now();
      let oldestFileName = '';

      for (const filename of files) {
        if (!filename.endsWith('.pdf')) continue;
        
        const filePath = path.join(this.config.pdfDirectory, filename);
        const fileStats = await fs.stat(filePath);
        
        status.totalFiles++;
        status.totalSize += fileStats.size;
        
        if (fileStats.mtime.getTime() < oldestTime) {
          oldestTime = fileStats.mtime.getTime();
          oldestFileName = filename;
        }
      }

      if (oldestFileName) {
        status.oldestFile = {
          name: oldestFileName,
          age: formatAge(new Date(oldestTime))
        };
      }
    } catch {
      // Directory doesn't exist or other error - return default status
    }

    return status;
  }

  /**
   * Stop the cleanup service
   */
  public stop(): void {
    if (this.cleanupJob) {
      this.cleanupJob.cancel();
      console.log('🛑 PDF cleanup service stopped');
    }
  }
}

// Utility functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatAge(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Less than 1 hour ago';
  }
}

// Singleton instance
export const pdfCleanupService = new PDFCleanupService({
  retentionHours: 24, // 24 hours retention
  enableLogging: true
});