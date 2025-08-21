/**
 * Utility to completely reset a stalled extraction process
 * This forces the application to completely restart any stalled extractions
 */

import { storage } from '../storage';
import { extractedSymptoms } from '@shared/schema';
import { db } from '../db';

/**
 * Reset all extraction data and state for a user
 * This is more aggressive than just updating the status - it clears all data
 * @param userId The user ID to reset extraction for
 * @param patientIds Optional list of patient IDs to specifically reset
 */
export async function resetExtraction(userId: number, patientIds?: string[]): Promise<void> {
  try {
    console.log(`🔄 FORCE RESETTING extraction for user ${userId}${patientIds ? ` and patients: ${patientIds.join(', ')}` : ''}`);
    
    // 1. Update processing status to reset/cancelled
    await storage.updateProcessingStatusByType('extract_symptoms', userId, {
      status: 'reset',
      progress: 0,
      message: 'Extraction process has been reset',
      currentStage: 'reset'
    });
    
    // 2. If specific patient IDs are provided, delete their extracted symptoms
    if (patientIds && patientIds.length > 0) {
      for (const patientId of patientIds) {
        await storage.deleteExtractedSymptomsByPatientId(patientId);
        console.log(`✅ Deleted extracted symptoms for patient ${patientId}`);
      }
    }
    
    // 3. Wait a moment for changes to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 4. Return to pending state so a new extraction can be started
    await storage.updateProcessingStatusByType('extract_symptoms', userId, {
      status: 'pending',
      progress: 0,
      message: 'Ready for new extraction',
      currentStage: 'idle'
    });
    
    console.log(`✅ Extraction reset completed for user ${userId}`);
  } catch (error) {
    console.error('Error resetting extraction:', error);
    throw error;
  }
}