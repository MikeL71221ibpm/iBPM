import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { Note, SymptomMaster, InsertExtractedSymptom } from '@shared/schema';

/**
 * Pre-process symptoms for all patients and store results in the database
 * This function is meant to be run as a scheduled job
 */
export async function preProcessAllPatients(): Promise<{
  processedPatients: number;
  processedNotes: number;
  extractedSymptoms: number;
  processingTimeSeconds: number;
}> {
  console.log('Starting pre-processing of symptoms for all patients...');
  const startTime = Date.now();
  
  // Load all notes from the database
  // We're querying all notes regardless of patient to process in bulk
  console.log('Fetching all notes from database...');
  const allNotes = await storage.executeRawQuery(
    'SELECT * FROM notes ORDER BY patient_id'
  );
  console.log(`Fetched ${allNotes.length} notes for processing`);
  
  // Load the symptom master library
  console.log('Loading symptom master library...');
  const symptomMaster = await storage.getSymptomMaster();
  console.log(`Loaded ${symptomMaster.length} symptom patterns`);
  
  // Group notes by patient for better progress tracking
  const notesByPatient: { [patientId: string]: Note[] } = {};
  allNotes.forEach((note: Note) => {
    if (!notesByPatient[note.patientId]) {
      notesByPatient[note.patientId] = [];
    }
    notesByPatient[note.patientId].push(note);
  });
  
  const patientIds = Object.keys(notesByPatient);
  console.log(`Processing ${patientIds.length} patients with notes`);
  
  let totalExtractedSymptoms: InsertExtractedSymptom[] = [];
  let processedPatients = 0;
  
  // Process each patient's notes
  for (const patientId of patientIds) {
    const patientNotes = notesByPatient[patientId];
    console.log(`Processing patient ${patientId} with ${patientNotes.length} notes...`);
    
    // Extract symptoms for this patient
    const patientSymptoms = extractSymptomsForPreProcessing(
      patientNotes,
      symptomMaster,
      null // No user ID for pre-processing as it's a system job
    );
    
    console.log(`Extracted ${patientSymptoms.length} symptoms for patient ${patientId}`);
    
    // Add to our collection
    totalExtractedSymptoms.push(...patientSymptoms);
    processedPatients++;
    
    // Log progress every 10 patients
    if (processedPatients % 10 === 0) {
      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - startTime) / 1000;
      const patientsPerSecond = processedPatients / elapsedSeconds;
      const estimatedTotalSeconds = patientIds.length / patientsPerSecond;
      const remainingSeconds = estimatedTotalSeconds - elapsedSeconds;
      
      console.log(`Processed ${processedPatients}/${patientIds.length} patients ` +
        `(${Math.round(processedPatients/patientIds.length*100)}%) in ${elapsedSeconds.toFixed(1)}s. ` +
        `Estimated ${remainingSeconds.toFixed(1)}s remaining.`);
    }
  }
  
  // Delete any existing pre-processed symptoms
  console.log('Removing previous pre-processed symptoms...');
  await storage.executeRawQuery(
    'DELETE FROM extracted_symptoms WHERE pre_processed = true'
  );
  
  // Store the results in the database with pre_processed flag
  console.log(`Storing ${totalExtractedSymptoms.length} pre-processed symptoms...`);
  
  // Add pre_processed flag to all symptoms
  const flaggedSymptoms = totalExtractedSymptoms.map(symptom => ({
    ...symptom,
    pre_processed: true
  }));
  
  // Save to database in chunks to avoid memory issues
  const chunkSize = 500;
  for (let i = 0; i < flaggedSymptoms.length; i += chunkSize) {
    const chunk = flaggedSymptoms.slice(i, i + chunkSize);
    await storage.saveExtractedSymptoms(chunk);
    console.log(`Saved symptoms chunk ${i/chunkSize + 1}/${Math.ceil(flaggedSymptoms.length/chunkSize)}`);
  }
  
  const endTime = Date.now();
  const processingTimeSeconds = (endTime - startTime) / 1000;
  
  console.log(`Pre-processing complete in ${processingTimeSeconds.toFixed(2)}s.`);
  console.log(`Processed ${processedPatients} patients with ${allNotes.length} notes.`);
  console.log(`Extracted ${totalExtractedSymptoms.length} symptoms.`);
  
  return {
    processedPatients,
    processedNotes: allNotes.length,
    extractedSymptoms: totalExtractedSymptoms.length,
    processingTimeSeconds
  };
}

/**
 * Extract symptoms for a set of notes - optimized version for pre-processing
 * Based on the original symptomExtractor but optimized for bulk processing
 */
function extractSymptomsForPreProcessing(
  notes: Note[],
  symptomMaster: SymptomMaster[],
  userId: number | null
): InsertExtractedSymptom[] {
  const extractedSymptoms: InsertExtractedSymptom[] = [];
  
  // Pre-process the symptom texts for faster matching
  const symptomPatterns = symptomMaster.map(symptom => ({
    ...symptom,
    lowerText: symptom.symptom_segment.toLowerCase()
  }));
  
  // Process each note
  notes.forEach(note => {
    const noteText = note.noteText.toLowerCase();
    
    // Process each symptom pattern
    symptomPatterns.forEach(symptom => {
      // Check if the note contains this symptom (exact match only)
      if (noteText.includes(symptom.lowerText)) {
        // Create extracted symptom record with harmonized fields
        extractedSymptoms.push({
          mention_id: uuidv4(), // Generate a unique ID for this mention
          patient_id: note.patientId,
          dos_date: note.dosDate,
          // Use symptom_segment as the primary descriptor field
          symptom_segment: symptom.symptom_segment,
          symptom_id: symptom.symptom_id,
          diagnosis: symptom.diagnosis,
          diagnosis_icd10_code: symptom.diagnosis_icd10_code,
          diagnostic_category: symptom.diagnostic_category,
          // Store type consistently in symp_prob field (must be "Problem" or "Symptom" only)
          symp_prob: symptom.symp_prob,
          // For HRSN indicators (Problems), store "ZCode/HRSN" in zcode_hrsn
          // For symptoms, zcode_hrsn should be "No"
          zcode_hrsn: symptom.symp_prob === "Problem" ? "ZCode/HRSN" : "No",
          // Remove the "Problem:" prefix from the segment display for HRSN indicators
          // This ensures consistent display in visualizations
          symptom_present: "Yes",
          symptom_detected: "Yes",
          validated: "Yes",
          symptom_segments_in_note: 1,
          housing_status: null,
          food_status: null,
          financial_status: null,
          user_id: userId,
          // Add flag to identify pre-processed symptoms - this will be passed to the database
          // The property name needs to match what's in the schema
          pre_processed: true
        });
      }
    });
  });
  
  return extractedSymptoms;
}