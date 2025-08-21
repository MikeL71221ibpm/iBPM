import { storage } from '../storage';
import { extractSymptomsParallel } from './parallelExtractor';

/**
 * Automatic background extraction system
 * Triggers parallel extraction when unprocessed notes are detected
 */
export class AutoExtractionSystem {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start automatic checking for unprocessed notes
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Auto-extraction system started');
    
    // Check every 30 seconds for unprocessed notes
    this.checkInterval = setInterval(() => {
      this.checkForUnprocessedNotes();
    }, 30000);
    
    // Run initial check
    this.checkForUnprocessedNotes();
  }

  /**
   * Stop the automatic extraction system
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Auto-extraction system stopped');
  }

  /**
   * Check for notes without symptom extraction and process them
   */
  private async checkForUnprocessedNotes() {
    try {
      // Get count of notes vs extracted symptoms
      const noteCount = await storage.executeRawQuery(
        'SELECT COUNT(*) as count FROM notes WHERE user_id = $1',
        [4] // Main user ID
      );
      
      const symptomCount = await storage.executeRawQuery(
        'SELECT COUNT(*) as count FROM extracted_symptoms WHERE user_id = $1',
        [4]
      );

      const totalNotes = parseInt(noteCount[0]?.count || '0');
      const totalSymptoms = parseInt(symptomCount[0]?.count || '0');
      
      // If less than 10% of notes have symptoms extracted, trigger processing
      const processingThreshold = Math.max(1000, totalNotes * 0.1);
      
      if (totalSymptoms < processingThreshold && totalNotes > 100) {
        console.log(`🔍 Auto-extraction triggered: ${totalSymptoms} symptoms from ${totalNotes} notes (${((totalSymptoms/totalNotes)*100).toFixed(1)}% processed)`);
        
        // Get unprocessed patients (limit to 100 at a time for efficiency)
        const unprocessedPatients = await storage.executeRawQuery(`
          SELECT DISTINCT p.patient_id 
          FROM patients p
          LEFT JOIN extracted_symptoms es ON p.patient_id = es.patient_id
          WHERE p.user_id = $1 AND es.patient_id IS NULL
          LIMIT 100
        `, [4]);

        if (unprocessedPatients.length > 0) {
          const patientIds = unprocessedPatients.map((p: any) => p.patient_id);
          console.log(`🔄 Processing ${patientIds.length} unprocessed patients`);
          
          // Trigger parallel extraction in background
          this.triggerBackgroundExtraction(patientIds);
        }
      }
    } catch (error) {
      console.error('❌ Auto-extraction check failed:', error);
    }
  }

  /**
   * Trigger background extraction for specific patients
   */
  private async triggerBackgroundExtraction(patientIds: string[]) {
    try {
      // Get notes for these patients
      const notes = await storage.executeRawQuery(`
        SELECT id, patient_id as patientId, dos_date as dosDate, note_text as noteText, provider_id as providerId
        FROM notes 
        WHERE patient_id = ANY($1) AND user_id = $2
      `, [patientIds, 4]);

      if (notes.length === 0) return;

      // Get symptom library
      const symptomMaster = await storage.getSymptomMaster();
      
      if (symptomMaster.length === 0) {
        console.log('⚠️ No symptom library found, skipping extraction');
        return;
      }

      console.log(`🚀 Starting background extraction for ${notes.length} notes from ${patientIds.length} patients`);
      
      // Use parallel extraction with boost mode (16 cores, 400-note batches)
      const extractedSymptoms = await extractSymptomsParallel(
        notes,
        symptomMaster,
        4, // userId
        (progress, message) => {
          if (progress === 1) {
            console.log(`✅ Background extraction progress: ${message}`);
          }
        },
        true // boost mode (16 cores, 400-note batches)
      );

      // Insert extracted symptoms
      if (extractedSymptoms.length > 0) {
        await storage.saveExtractedSymptoms(extractedSymptoms);
        console.log(`✅ Background extraction completed: ${extractedSymptoms.length} symptoms extracted`);
      }

    } catch (error) {
      console.error('❌ Background extraction failed:', error);
    }
  }
}

// Export singleton instance
export const autoExtractionSystem = new AutoExtractionSystem();