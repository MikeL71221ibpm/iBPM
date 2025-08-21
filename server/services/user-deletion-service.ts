import { db } from '../db';
import { users, patients, notes, extractedSymptoms, fileUploads, processingStatus } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { promises as fs } from 'fs';
import path from 'path';
import * as schedule from 'node-schedule';

interface UserDeletionConfig {
  deletionDelayHours: number;
  uploadsDirectory: string;
  dailyReportsDirectory: string;
}

export class UserDeletionService {
  private config: UserDeletionConfig;

  constructor(config?: Partial<UserDeletionConfig>) {
    this.config = {
      deletionDelayHours: 24,
      uploadsDirectory: 'uploads',
      dailyReportsDirectory: 'uploads/daily-reports',
      ...config
    };

    // Schedule cleanup to run every 4 hours
    schedule.scheduleJob('0 */4 * * *', () => {
      this.processScheduledDeletions().catch(console.error);
    });

    console.log('🗑️ User Deletion Service initialized');
    console.log(`⏰ Deletion delay: ${this.config.deletionDelayHours} hours`);
    console.log('✅ Scheduled cleanup every 4 hours');
  }

  /**
   * Mark a user for deletion (soft delete with timestamp)
   */
  async markUserForDeletion(userId: number): Promise<void> {
    const deletionTimestamp = Date.now();
    
    try {
      // Get current user data
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Mark username with deletion timestamp
      const deletedUsername = `${user.username}_deleted_${deletionTimestamp}`;

      await db.update(users)
        .set({
          username: deletedUsername,
          subscriptionStatus: 'deleted'
        })
        .where(eq(users.id, userId));

      console.log(`🗑️ User ${userId} marked for deletion (will be removed after ${this.config.deletionDelayHours} hours)`);
    } catch (error) {
      console.error(`❌ Error marking user ${userId} for deletion:`, error);
      throw error;
    }
  }

  /**
   * Permanently delete users marked for deletion after delay period
   */
  async processScheduledDeletions(): Promise<void> {
    console.log('🧹 Processing scheduled user deletions...');

    try {
      // Find users marked for deletion older than the delay period
      const cutoffTime = Date.now() - (this.config.deletionDelayHours * 60 * 60 * 1000);
      
      // Query users with deletion markers in their username
      const markedUsers = await db.select().from(users).where(eq(users.subscriptionStatus, 'deleted'));
      
      const usersToDelete = [];
      for (const user of markedUsers) {
        // Extract deletion timestamp from username
        const deletionMatch = user.username.match(/_deleted_(\d+)/);
        if (deletionMatch) {
          const deletionTimestamp = parseInt(deletionMatch[1]);
          if (deletionTimestamp < cutoffTime) {
            usersToDelete.push({ ...user, deletionTimestamp });
          }
        }
      }

      console.log(`🗑️ Found ${usersToDelete.length} users ready for permanent deletion`);

      for (const user of usersToDelete) {
        await this.permanentlyDeleteUser(user.id);
      }

      console.log('✅ Scheduled user deletion processing complete');
    } catch (error) {
      console.error('❌ Error processing scheduled deletions:', error);
    }
  }

  /**
   * Permanently delete a user and all associated data
   */
  async permanentlyDeleteUser(userId: number): Promise<void> {
    console.log(`🗑️ Permanently deleting user ${userId} and all associated data...`);

    try {
      // Delete in order to respect foreign key constraints
      
      // 1. Delete extracted symptoms
      const symptomsResult = await db.delete(extractedSymptoms).where(eq(extractedSymptoms.user_id, userId));
      console.log(`   📊 Deleted ${symptomsResult.rowCount || 0} extracted symptoms`);

      // 2. Delete notes
      const notesResult = await db.delete(notes).where(eq(notes.user_id, userId));
      console.log(`   📄 Deleted ${notesResult.rowCount || 0} notes`);

      // 3. Delete patients
      const patientsResult = await db.delete(patients).where(eq(patients.user_id, userId));
      console.log(`   👥 Deleted ${patientsResult.rowCount || 0} patients`);

      // 4. Delete processing status
      const statusResult = await db.delete(processingStatus).where(eq(processingStatus.user_id, userId));
      console.log(`   ⚙️ Deleted ${statusResult.rowCount || 0} processing status records`);

      // 5. Delete file uploads records
      const uploadsResult = await db.delete(fileUploads).where(eq(fileUploads.user_id, userId));
      console.log(`   📁 Deleted ${uploadsResult.rowCount || 0} file upload records`);

      // 6. Delete user files from filesystem
      await this.deleteUserFiles(userId);

      // 7. Finally delete user account
      const userResult = await db.delete(users).where(eq(users.id, userId));
      console.log(`   👤 Deleted user account (${userResult.rowCount || 0} records)`);

      console.log(`✅ User ${userId} permanently deleted with all associated data`);
    } catch (error) {
      console.error(`❌ Error permanently deleting user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete all files associated with a user
   */
  private async deleteUserFiles(userId: number): Promise<void> {
    const filesToCheck = [
      // User-specific upload files
      path.join(this.config.uploadsDirectory, `user_${userId}`),
      
      // Daily reports PDFs
      path.join(this.config.dailyReportsDirectory, 'pdfs', `user_${userId}`),
      
      // Any other user-specific directories
      path.join('temp', `user_${userId}`),
    ];

    for (const filePath of filesToCheck) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          await fs.rmdir(filePath, { recursive: true });
          console.log(`   🗂️ Deleted directory: ${filePath}`);
        } else {
          await fs.unlink(filePath);
          console.log(`   📄 Deleted file: ${filePath}`);
        }
      } catch (error) {
        // File/directory doesn't exist or can't be deleted - not a critical error
        if (error.code !== 'ENOENT') {
          console.log(`   ⚠️ Could not delete ${filePath}: ${error.message}`);
        }
      }
    }

    // Also check for any CSV files that might be named with user info
    try {
      const uploadFiles = await fs.readdir(this.config.uploadsDirectory);
      for (const file of uploadFiles) {
        if (file.includes(`_user${userId}_`) || file.includes(`user_${userId}`)) {
          const filePath = path.join(this.config.uploadsDirectory, file);
          try {
            await fs.unlink(filePath);
            console.log(`   📄 Deleted user file: ${filePath}`);
          } catch (deleteError) {
            console.log(`   ⚠️ Could not delete user file ${filePath}: ${deleteError.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Could not scan uploads directory: ${error.message}`);
    }
  }

  /**
   * Get list of users marked for deletion with their deletion timestamps
   */
  async getMarkedUsers(): Promise<Array<{
    id: number;
    username: string;
    email: string;
    deletionTimestamp: number;
    hoursUntilDeletion: number;
  }>> {
    const markedUsers = await db.select().from(users).where(eq(users.subscriptionStatus, 'deleted'));
    
    return markedUsers.map(user => {
      const deletionMatch = user.username.match(/_deleted_(\d+)/);
      const deletionTimestamp = deletionMatch ? parseInt(deletionMatch[1]) : Date.now();
      const hoursUntilDeletion = Math.max(0, 
        this.config.deletionDelayHours - ((Date.now() - deletionTimestamp) / (60 * 60 * 1000))
      );

      return {
        id: user.id,
        username: user.username,
        email: user.email || '',
        deletionTimestamp,
        hoursUntilDeletion: Math.round(hoursUntilDeletion * 100) / 100
      };
    });
  }

  /**
   * Cancel deletion for a user (restore from soft delete)
   */
  async cancelUserDeletion(userId: number): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Remove deletion markers from username
      const originalUsername = user.username.replace(/_deleted_\d+/g, '');

      await db.update(users)
        .set({
          username: originalUsername,
          subscriptionStatus: 'free'
        })
        .where(eq(users.id, userId));

      console.log(`✅ Cancelled deletion for user ${userId} - restored to active status`);
    } catch (error) {
      console.error(`❌ Error cancelling deletion for user ${userId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const userDeletionService = new UserDeletionService();