/**
 * Checkpoint Recovery System for Pre-processing
 * Saves progress incrementally and allows resuming from last checkpoint
 */

import { storage } from "../database-storage";

interface CheckpointData {
  userId: number;
  lastProcessedPatient: string;
  processedPatients: string[];
  totalPatients: number;
  startTime: Date;
  lastCheckpointTime: Date;
  extractedSymptomsCount: number;
}

export class CheckpointRecovery {
  private static readonly CHECKPOINT_INTERVAL = 50; // Save checkpoint every 50 patients
  
  /**
   * Save a checkpoint with current progress
   */
  static async saveCheckpoint(checkpointData: CheckpointData): Promise<void> {
    try {
      await storage.executeRawQuery(
        `INSERT INTO processing_checkpoints 
         (user_id, last_processed_patient, processed_patients, total_patients, 
          start_time, last_checkpoint_time, extracted_symptoms_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           last_processed_patient = $2,
           processed_patients = $3,
           total_patients = $4,
           last_checkpoint_time = $6,
           extracted_symptoms_count = $7`,
        [
          checkpointData.userId,
          checkpointData.lastProcessedPatient,
          JSON.stringify(checkpointData.processedPatients),
          checkpointData.totalPatients,
          checkpointData.startTime,
          checkpointData.lastCheckpointTime,
          checkpointData.extractedSymptomsCount
        ]
      );
      
      console.log(`Checkpoint saved: ${checkpointData.processedPatients.length} patients processed`);
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
    }
  }

  /**
   * Load the last checkpoint for resuming
   */
  static async loadCheckpoint(userId: number): Promise<CheckpointData | null> {
    try {
      const result = await storage.executeRawQuery(
        'SELECT * FROM processing_checkpoints WHERE user_id = $1',
        [userId]
      );
      
      if (result.length === 0) {
        return null;
      }
      
      const row = result[0];
      return {
        userId: row.user_id,
        lastProcessedPatient: row.last_processed_patient,
        processedPatients: JSON.parse(row.processed_patients || '[]'),
        totalPatients: row.total_patients,
        startTime: row.start_time,
        lastCheckpointTime: row.last_checkpoint_time,
        extractedSymptomsCount: row.extracted_symptoms_count
      };
    } catch (error) {
      console.error('Failed to load checkpoint:', error);
      return null;
    }
  }

  /**
   * Clear checkpoint after successful completion
   */
  static async clearCheckpoint(userId: number): Promise<void> {
    try {
      await storage.executeRawQuery(
        'DELETE FROM processing_checkpoints WHERE user_id = $1',
        [userId]
      );
      console.log('Checkpoint cleared after successful completion');
    } catch (error) {
      console.error('Failed to clear checkpoint:', error);
    }
  }

  /**
   * Check if processing should create checkpoint
   */
  static shouldCreateCheckpoint(processedCount: number): boolean {
    return processedCount % this.CHECKPOINT_INTERVAL === 0;
  }

  /**
   * Get already processed patients from database
   */
  static async getProcessedPatients(userId: number): Promise<Set<string>> {
    try {
      const result = await storage.executeRawQuery(
        'SELECT DISTINCT patient_id FROM extracted_symptoms WHERE user_id = $1',
        [userId]
      );
      
      return new Set(result.map(row => row.patient_id));
    } catch (error) {
      console.error('Failed to get processed patients:', error);
      return new Set();
    }
  }
}

/**
 * Create checkpoint table if it doesn't exist
 */
export async function initializeCheckpointTable(): Promise<void> {
  try {
    await storage.executeRawQuery(`
      CREATE TABLE IF NOT EXISTS processing_checkpoints (
        user_id INTEGER PRIMARY KEY,
        last_processed_patient VARCHAR(255),
        processed_patients TEXT,
        total_patients INTEGER,
        start_time TIMESTAMP,
        last_checkpoint_time TIMESTAMP,
        extracted_symptoms_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Checkpoint table initialized');
  } catch (error) {
    console.error('Failed to initialize checkpoint table:', error);
  }
}