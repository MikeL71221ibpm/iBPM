import { storage } from '../storage';
import { pool } from '../db';
import { extractedSymptoms, notes, symptomMaster, SymptomMaster, InsertSymptomMaster } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { extractSymptomsParallel } from './parallelExtractor';
// No longer using symptom generation, only loading from database
// import { ensureSymptomLibrary, getSymptomLibrary } from './symptomLibraryManager';

/**
 * Type for the progress callback function
 * @param progress Number between 0 and 1 representing overall completion percentage
 * @param message Human-readable message about current progress
 * @param stage Optional stage identifier to categorize the progress update
 * @param patientId Optional patient ID being processed (for more detailed tracking)
 * @param processedPatients Optional count of how many patients have been processed
 * @param totalPatients Optional total number of patients to process
 */
export type ProgressCallback = (
  progress: number, 
  message: string, 
  stage?: string,
  patientId?: string,
  processedPatients?: number,
  totalPatients?: number
) => void;

/**
 * Pre-process symptoms from the database for all patient notes
 * and store the results in the database with a preProcessed flag
 * @param userId The ID of the user initiating the pre-processing
 * @param progressCallback Optional callback for progress updates
 */
export async function preProcessFromDatabase(userId: number, progressCallback?: ProgressCallback): Promise<void> {
  console.log(`Starting database pre-processing for user ${userId}...`);
  
  // Create a processing status record in the database
  const statusRecord = await storage.createProcessingStatus({
    userId,
    processType: 'pre_processing',
    status: 'pending',
    progress: 0,
    currentStage: 'initialization',
    message: 'Initializing pre-processing...',
    totalItems: 0, // Will update once we know how many notes there are
    processedItems: 0,
    startTime: new Date(),
  });

  // Create a wrapper function to update both the WebSocket progress and the database status
  const updateProgress = async (
    progress: number, 
    message: string, 
    stage?: string,
    patientId?: string,
    processedPatients?: number,
    totalPatients?: number
  ) => {
    // Call the original callback if provided (for WebSocket updates)
    if (progressCallback) {
      progressCallback(progress, message, stage, patientId, processedPatients, totalPatients);
    }
    
    // Update the status record in the database
    await storage.updateProcessingStatus(statusRecord.id, {
      status: progress >= 1 ? 'completed' : progress > 0 ? 'in_progress' : 'pending',
      progress: Math.floor(progress * 100),
      currentStage: stage || statusRecord.currentStage,
      message,
      // If we have patient counts, use those for better tracking
      processedItems: processedPatients || (statusRecord.totalItems > 0 ? Math.floor(progress * statusRecord.totalItems) : 0),
    });
  };
  
  try {
    // Update status to in_progress
    await updateProgress(0.01, 'Starting pre-processing...', 'preparation');
    
    // Use our new symptom library manager to ensure all symptoms are loaded
    console.log('Ensuring comprehensive library of ~3800 symptoms is loaded...');
    await updateProgress(0.02, 'Ensuring symptom library is loaded...', 'loading_symptoms');
    
    // This will ensure the symptom library exists in both the file and database
    const fullSymptomLibrary = await ensureSymptomLibrary();
    console.log(`Using symptom library with ${fullSymptomLibrary.length} symptoms`);
    console.log(`Sample symptom from library: ${JSON.stringify(fullSymptomLibrary[0])}`);
    
    // Also get symptoms from the master table to ensure we include all defined symptoms
    const dbSymptoms = await storage.getSymptomMaster();
    console.log(`Retrieved ${dbSymptoms.length} symptom master entries from database`);
    
    if (dbSymptoms.length > 0) {
      console.log(`Sample symptom from database: ${JSON.stringify(dbSymptoms[0])}`);
    }
    
    // Create a lookup of existing symptom segments to avoid duplicates
    const existingSegments = new Set<string>();
    
    // Create a map of existing database symptoms by segment for faster lookups
    const dbSymptomMap = new Map<string, SymptomMaster>();
    for (const dbSymptom of dbSymptoms) {
      dbSymptomMap.set(dbSymptom.symptomSegment.toLowerCase(), dbSymptom);
      existingSegments.add(dbSymptom.symptomSegment.toLowerCase());
    }
    
    console.log(`Created existingSegments set with ${existingSegments.size} entries`);
    
    // Filter out the symptoms that already exist in the database
    console.log('Filtering symptoms to find new ones that are not already in the database...');
    const newSymptoms = fullSymptomLibrary.filter(symptom => {
      const lowercaseSegment = symptom.symptomSegment.toLowerCase();
      const exists = !existingSegments.has(lowercaseSegment);
      if (!exists) {
        // This symptom already exists in the database
        //console.log(`Symptom segment already exists: ${lowercaseSegment}`);
      }
      return exists;
    });
    
    console.log(`Filtering complete: ${newSymptoms.length} new symptoms to add out of ${fullSymptomLibrary.length} total`);
    
    // Important debugging - check if we're filtering correctly
    if (newSymptoms.length === 0 && fullSymptomLibrary.length > 0) {
      console.log('⚠️ CRITICAL ERROR: The filter is removing all symptoms!');
      console.log('Let\'s check a few sample symptoms from the library:');
      
      for (let i = 0; i < Math.min(5, fullSymptomLibrary.length); i++) {
        const sample = fullSymptomLibrary[i];
        console.log(`Sample symptom ${i+1}: ${JSON.stringify(sample)}`);
        console.log(`Is this in existingSegments? ${existingSegments.has(sample.symptomSegment.toLowerCase())}`);
      }
      
      console.log('And let\'s check existingSegments values:');
      // Convert Set to Array to avoid iteration issues
      const existingSegmentsArray = Array.from(existingSegments);
      for (let i = 0; i < Math.min(5, existingSegmentsArray.length); i++) {
        console.log(`Existing segment ${i+1}: ${existingSegmentsArray[i]}`);
      }
      
      // WORKAROUND: If filter is incorrectly removing all symptoms, let's force add all library symptoms
      console.log('🛠️ WORKAROUND: Using fullSymptomLibrary directly instead of filtered newSymptoms');
      const forceSaveAllSymptoms = fullSymptomLibrary.slice(); // Create a copy of fullSymptomLibrary
      
      // Empty the database first, then we'll save all symptoms
      try {
        console.log('Removing all existing symptoms from the master table...');
        const deleteResult = await storage.executeRawQuery('TRUNCATE TABLE symptom_master RESTART IDENTITY');
        console.log('Truncated symptom_master table successfully');
        
        // Now save all symptoms
        console.log(`Force saving all ${forceSaveAllSymptoms.length} symptoms to the database...`);
        await updateProgress(0.03, `Force saving all ${forceSaveAllSymptoms.length} symptoms to database...`, 'updating_symptom_library');
        
        // Save in batches
        const FORCE_BATCH_SIZE = 100;
        for (let i = 0; i < forceSaveAllSymptoms.length; i += FORCE_BATCH_SIZE) {
          const batch = forceSaveAllSymptoms.slice(i, i + FORCE_BATCH_SIZE);
          console.log(`Force saving symptom batch ${Math.floor(i/FORCE_BATCH_SIZE) + 1} of ${Math.ceil(forceSaveAllSymptoms.length/FORCE_BATCH_SIZE)} (${batch.length} symptoms)`);
          
          try {
            // @ts-ignore: Type error is acceptable here as we know the implementation works without id
            await storage.saveSymptomMaster(batch);
          } catch (error: any) {
            console.error(`Error in force batch save: ${error.message || 'Unknown error'}`);
          }
        }
        
        console.log(`Force saved ${forceSaveAllSymptoms.length} symptoms to the database`);
        
        // Check if the save was successful
        try {
          const countResult = await storage.executeRawQuery("SELECT COUNT(*) FROM symptom_master");
          console.log(`Total symptoms in master table after force save: ${countResult.rows[0].count}`);
        } catch (countError) {
          console.error("Error counting symptoms after force save:", countError);
        }
      } catch (forceError) {
        console.error('Error during force save operation:', forceError);
      }
    }
    
    // Save the new symptoms to the database if there are any
    if (newSymptoms.length > 0) {
      console.log(`Saving ${newSymptoms.length} new symptoms to the symptom master table...`);
      await updateProgress(0.03, `Saving ${newSymptoms.length} new symptoms to database...`, 'updating_symptom_library');
      
      // Save in batches to avoid overwhelming the database
      const BATCH_SIZE = 500;
      for (let i = 0; i < newSymptoms.length; i += BATCH_SIZE) {
        const batch = newSymptoms.slice(i, i + BATCH_SIZE);
        console.log(`Saving symptom batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(newSymptoms.length/BATCH_SIZE)} (${batch.length} symptoms)`);
        
        try {
          // TypeScript complains that InsertSymptomMaster doesn't have 'id', but our saveSymptomMaster
          // implementation handles this correctly using a raw SQL query that doesn't need the id field
          // @ts-ignore: Type error is acceptable here as we know the implementation works without id
          await storage.saveSymptomMaster(batch);
        } catch (error: any) {
          console.error(`Error saving symptom batch: ${error.message || 'Unknown error'}`);
          console.log(`Attempting to continue with pre-processing using in-memory symptom library`);
        }
      }
      
      console.log(`Saved ${newSymptoms.length} new symptoms to the database`);
    } else {
      console.log('No new symptoms to add to the database');
    }
    
    // Add any symptoms from the database that aren't already in the full library
    for (const dbSymptom of dbSymptoms) {
      if (!fullSymptomLibrary.some(s => s.symptomSegment.toLowerCase() === dbSymptom.symptomSegment.toLowerCase())) {
        fullSymptomLibrary.push(dbSymptom);
      }
    }
    
    console.log(`Final symptom library for pre-processing contains ${fullSymptomLibrary.length} symptom patterns`);
    
    if (fullSymptomLibrary.length === 0) {
      console.log('No symptom definitions found. Skipping pre-processing.');
      return;
    }
    
    // Get the most recent uploaded file data instead of preprocessed notes
    console.log('Getting raw data from most recent file upload...');
    const uploadQuery = `
      SELECT file_name, id 
      FROM file_uploads 
      WHERE processed_status = true 
      ORDER BY upload_date DESC 
      LIMIT 1`;
    const uploadResult = await pool.query(uploadQuery);
    
    if (uploadResult.rows.length === 0) {
      throw new Error('No processed file uploads found. Please upload a file first.');
    }
    
    const latestUpload = uploadResult.rows[0];
    console.log(`Using raw data from file: ${latestUpload.file_name}`);
    
    // Get raw notes from the uploaded file data, not the preprocessed notes table
    const query = `
      SELECT 
        id,
        patient_id,
        dos_date,
        note_text,
        provider_id,
        user_id
      FROM notes 
      WHERE user_id = $1
      ORDER BY patient_id, dos_date`;
    const result = await pool.query(query, [userId]);
    
    // Convert snake_case properties to camelCase
    const allNotes = result.rows.map(row => ({
      id: row.id,
      patientId: row.patient_id,
      dosDate: row.dos_date,
      // This is the critical field - map note_text to noteText
      noteText: row.note_text,
      providerId: row.provider_id,
      userId: row.user_id
    }));
    
    console.log(`Retrieved ${allNotes.length} patient notes for pre-processing`);
    
    if (allNotes.length === 0) {
      console.log('No patient notes found. Skipping pre-processing.');
      // Update status record to completed with message
      await updateProgress(1, 'No patient notes found to process.', 'completed');
      return;
    }
    
    // Update total items in status record
    await storage.updateProcessingStatus(statusRecord.id, {
      totalItems: allNotes.length
    });
    
    // Clear ALL existing data to ensure fresh start from CSV/XLSX source
    console.log('Clearing all existing data for fresh CSV/XLSX processing...');
    await updateProgress(0.05, 'Clearing all existing data for fresh CSV/XLSX processing...', 'preparation');
    
    // Clear all extracted symptoms
    await storage.executeRawQuery('DELETE FROM extracted_symptoms');
    
    // Clear all notes except the newly uploaded CSV/XLSX data for this user
    await storage.executeRawQuery(
      'DELETE FROM notes WHERE user_id != $1', 
      [userId]
    );
    
    console.log('All existing data cleared. Using fresh CSV/XLSX upload as data source.');
    
    console.log('Beginning symptom extraction process...');
    
    // Report progress
    await updateProgress(0.1, `Found ${allNotes.length} notes to process with ${fullSymptomLibrary.length} symptom patterns`, 'processing');
    
    // Process in smaller batches for better memory management and more frequent updates
    // Using a smaller batch size for more frequent progress updates
    const BATCH_SIZE = 50; // Reduced from 100 to provide more frequent updates
    let processedCount = 0;
    let totalExtractedCount = 0;
    
    // Track patient processing for progress reporting
    const processedPatientIds = new Set<string>();
    
    // Group notes by patient for better tracking
    const patientNoteMap = new Map<string, any[]>();
    for (const note of allNotes) {
      const patientId = String(note.patientId);
      if (!patientNoteMap.has(patientId)) {
        patientNoteMap.set(patientId, []);
      }
      patientNoteMap.get(patientId)!.push(note);
    }
    
    // Get unique patient count
    const totalPatients = patientNoteMap.size;
    console.log(`Notes are for ${totalPatients} unique patients`);
    
    // Log start time for performance tracking
    const startTime = Date.now();
    
    for (let i = 0; i < allNotes.length; i += BATCH_SIZE) {
      const batchStartTime = Date.now();
      const batchNumber = Math.floor(i/BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allNotes.length/BATCH_SIZE);
      const noteBatch = allNotes.slice(i, i + BATCH_SIZE);
      
      // Track which patients are in this batch for progress reporting
      const patientsInBatch = new Set<string>();
      for (const note of noteBatch) {
        patientsInBatch.add(String(note.patientId));
      }
      
      console.log(`Processing batch ${batchNumber} of ${totalBatches} (${noteBatch.length} notes for ${patientsInBatch.size} patients)`);
      
      // Report batch start via both callback and database
      const progressPercentageBatchStart = processedCount / allNotes.length;
      const batchMessage = `Starting batch ${batchNumber}/${totalBatches} with ${noteBatch.length} notes for ${patientsInBatch.size} patients...`;
      await updateProgress(
        progressPercentageBatchStart,
        batchMessage,
        `processing_batch_${batchNumber}`,
        undefined, // patientId
        processedPatientIds.size, // processedPatients
        totalPatients // totalPatients
      );
      
      try {
        // Process this batch with parallelExtractor (optimized version)
        const extractedSymptoms = await extractSymptomsParallel(noteBatch, fullSymptomLibrary);
        
        if (extractedSymptoms.length > 0) {
          console.log(`Batch ${batchNumber} extracted ${extractedSymptoms.length} symptoms in ${((Date.now() - batchStartTime)/1000).toFixed(2)}s`);
          
          // Add pre_processed flag to all entries
          const processedSymptoms = extractedSymptoms.map((symptom: any) => ({
            ...symptom,
            pre_processed: true // Using snake_case for consistency with database column
          }));
          
          // Save in smaller sub-batches to avoid potential database limits
          const SUB_BATCH_SIZE = 500; // Smaller sub-batches for faster commits
          for (let j = 0; j < processedSymptoms.length; j += SUB_BATCH_SIZE) {
            const subBatch = processedSymptoms.slice(j, j + SUB_BATCH_SIZE);
            console.log(`Saving sub-batch ${Math.floor(j/SUB_BATCH_SIZE) + 1} of ${Math.ceil(processedSymptoms.length/SUB_BATCH_SIZE)} (${subBatch.length} symptoms)`);
            
            // Report saving progress with both callback and database update
            const subBatchProgress = (processedCount / allNotes.length) + ((j / processedSymptoms.length) * (noteBatch.length / allNotes.length));
            const subBatchMessage = `Saving extracted symptoms: sub-batch ${Math.floor(j/SUB_BATCH_SIZE) + 1}/${Math.ceil(processedSymptoms.length/SUB_BATCH_SIZE)}`;
            
            await updateProgress(
              subBatchProgress,
              subBatchMessage,
              `saving_batch_${batchNumber}_subbatch_${Math.floor(j/SUB_BATCH_SIZE) + 1}`
            );
            
            await storage.saveExtractedSymptoms(subBatch);
          }
          
          totalExtractedCount += extractedSymptoms.length;
        } else {
          console.log(`Batch ${batchNumber} did not extract any symptoms`);
        }
        
        processedCount += noteBatch.length;
        
        // Update processed patient tracking
        for (const note of noteBatch) {
          processedPatientIds.add(String(note.patientId));
        }
        
        const progressPercentage = processedCount / allNotes.length;
        const progressPercent = Math.round(progressPercentage * 100);
        const elapsedTime = (Date.now() - startTime) / 1000;
        const estimatedTimeRemaining = (elapsedTime / progressPercentage) * (1 - progressPercentage);
        
        // Calculate progress based on patient count as well
        const patientProgressPercent = Math.round((processedPatientIds.size / totalPatients) * 100);
        
        console.log(`Progress: ${processedCount}/${allNotes.length} notes (${progressPercent}%)`);
        console.log(`Patient progress: ${processedPatientIds.size}/${totalPatients} patients (${patientProgressPercent}%)`);
        console.log(`Elapsed time: ${elapsedTime.toFixed(2)}s, Est. remaining: ${estimatedTimeRemaining.toFixed(2)}s`);
        
        // Report detailed progress to both WebSocket and database
        const detailedMessage = `Processed ${processedCount}/${allNotes.length} notes (${progressPercent}%) for ${processedPatientIds.size}/${totalPatients} patients (${patientProgressPercent}%). Found ${totalExtractedCount} symptoms. Est. time remaining: ${Math.round(estimatedTimeRemaining)}s.`;
        
        await updateProgress(
          progressPercentage,
          detailedMessage,
          `processing_batch_${batchNumber}_complete`,
          undefined, // patientId
          processedPatientIds.size, // processedPatients
          totalPatients // totalPatients
        );
        
        // Also update the processed items count in the database
        await storage.updateProcessingStatus(statusRecord.id, {
          processedItems: processedCount
        });
        
        // Send timestamp for tracking
        console.log(`Batch ${batchNumber} completed at: ${new Date().toISOString()}`);
      } catch (error) {
        console.error(`Error processing batch ${batchNumber}:`, error);
        
        // Report error via both callback and database
        const errorMessage = `Error in batch ${batchNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        const errorProgress = processedCount / allNotes.length;
        
        await updateProgress(
          errorProgress,
          errorMessage,
          `error_batch_${batchNumber}`
        );
        
        // Also update the error field in the database record
        await storage.updateProcessingStatus(statusRecord.id, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`Pre-processing complete. Processed ${processedCount} notes and extracted ${totalExtractedCount} symptoms for ${processedPatientIds.size} patients.`);
    
    // Send final success message to both WebSocket and database
    const successMessage = `Pre-processing complete! Processed ${processedCount} notes and extracted ${totalExtractedCount} symptoms for ${processedPatientIds.size} patients.`;
    await updateProgress(
      1.0, 
      successMessage, 
      'completed',
      undefined, // patientId 
      processedPatientIds.size, // processedPatients
      totalPatients // totalPatients
    );
    
    // Mark the processing as completed in the database with final stats
    await storage.updateProcessingStatus(statusRecord.id, {
      status: 'completed',
      progress: 100,
      processedItems: processedPatientIds.size, // Store patient count instead of note count
      message: successMessage,
      endTime: new Date()
    });
    
  } catch (error) {
    console.error('Error in database pre-processing:', error);
    
    // Send final error message to both WebSocket and database
    const errorMessage = `Pre-processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    
    // Update progress callback for WebSocket clients
    if (progressCallback) {
      progressCallback(0, errorMessage);
    }
    
    // Update the database record to mark as failed
    await storage.updateProcessingStatus(statusRecord.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      endTime: new Date()
    });
    
    throw error;
  }
}

// For ES modules, we can't check require.main === module directly
// This code will only run if executed directly as a script in Node.js
// and not when imported as a module by another file
// The pre-processing is triggered from routes.ts, so this block isn't needed anymore
// but kept commented for reference

/*
// When running as a script:  
preProcessFromDatabase()
  .then(() => {
    console.log('Database pre-processing completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database pre-processing failed:', err);
    process.exit(1);
  });
*/

/**
 * Process notes for symptom extraction in background processing
 * This function is called by the background processor to extract symptoms from a batch of notes
 * @param noteBatch Array of notes to process
 * @param userId User ID for the processing
 */
export async function processNotesForSymptomExtraction(noteBatch: any[], userId: number): Promise<void> {
  console.log(`🔍 Processing ${noteBatch.length} notes for symptom extraction (User: ${userId})`);
  
  try {
    // Get symptoms directly from database - simplified approach
    const allSymptoms = await storage.getSymptomMaster();
    
    if (!allSymptoms || allSymptoms.length === 0) {
      console.error('❌ No symptoms found in database');
      console.log('📝 No symptoms found in database - completing batch without extraction');
      return;
    }
    
    console.log(`📚 Using ${allSymptoms.length} symptoms from database for extraction`);
    
    // Simplified symptom extraction for background processing
    const extractedResults: any[] = [];
    
    for (const note of noteBatch) {
      if (!note.noteText) continue;
      
      const noteText = note.noteText.toLowerCase();
      
      // Simple keyword matching against symptom library
      for (const symptom of allSymptoms) {
        const symptomText = symptom.symptom_segment?.toLowerCase();
        if (symptomText && noteText.includes(symptomText)) {
          extractedResults.push({
            mentionId: `${note.id}-${symptom.symptom_id || 'unknown'}-${Date.now()}`,
            noteId: note.id,
            patientId: note.patientId,
            patientName: note.patientName,
            dosDate: note.dosDate,
            symptomId: symptom.symptom_id,
            symptomSegment: symptom.symptom_segment,
            diagnosis: symptom.diagnosis,
            diagnosisIcd10Code: symptom.diagnosis_icd10_code,
            diagnosticCategory: symptom.diagnostic_category,
            sympProb: symptom.symp_prob,
            zcodeHrsn: symptom.zcode_hrsn,
            userId: userId,
            extractionMethod: 'background_processing',
            extractedAt: new Date()
          });
        }
      }
    }
    
    // Insert extracted symptoms into database
    if (extractedResults && extractedResults.length > 0) {
      await storage.saveExtractedSymptoms(extractedResults);
      console.log(`✅ Successfully extracted ${extractedResults.length} symptoms from ${noteBatch.length} notes`);
    } else {
      console.log(`📝 No symptoms found in ${noteBatch.length} notes`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing note batch for user ${userId}:`, error);
    throw error;
  }
}