import { v4 as uuidv4 } from 'uuid';
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { Note, SymptomMaster, InsertExtractedSymptom } from '@shared/schema';
import { ensureSymptomLibrary, getSymptomLibrary } from './symptomLibraryManager';

/**
 * Pre-process symptoms for all patients with a hybrid approach
 * Can process from database or from a CSV file
 */
export async function preProcessSymptoms(options: {
  source: 'database' | 'csv';
  csvFilePath?: string;
  userId?: number;
}): Promise<{
  processedPatients: number;
  processedNotes: number;
  extractedSymptoms: number;
  processingTimeSeconds: number;
}> {
  console.log(`Starting pre-processing of symptoms from ${options.source}...`);
  const startTime = Date.now();
  
  // Load the symptom master library using our improved library manager
  console.log('Ensuring symptom master library is fully loaded...');
  let symptomMaster;
  try {
    // First ensure the symptom library is fully loaded in both file and database
    const fullSymptomLibrary = await ensureSymptomLibrary();
    console.log(`Ensured comprehensive library with ${fullSymptomLibrary.length} symptoms is loaded`);
    
    // Now get the symptoms from database for processing
    symptomMaster = await storage.getSymptomMaster();
    console.log(`Loaded ${symptomMaster.length} symptom patterns from database`);
    
    // If database has fewer symptoms than our full library, use the full library directly
    if (symptomMaster.length < fullSymptomLibrary.length) {
      console.log(`Database has fewer symptoms (${symptomMaster.length}) than expected (${fullSymptomLibrary.length})`);
      console.log('Using full symptom library directly for preprocessing');
      symptomMaster = fullSymptomLibrary;
    }
  } catch (error) {
    console.error('Error ensuring symptom library:', error);
    
    // Fallback to direct database query if there's an error
    console.log('Falling back to loading symptom patterns directly from database...');
    symptomMaster = await storage.getSymptomMaster();
    console.log(`Loaded ${symptomMaster.length} symptom patterns from database`);
  }
  
  // Pre-process the symptom texts for faster matching
  const symptomPatterns = symptomMaster.map(symptom => ({
    ...symptom,
    // Add a null check to handle possible undefined symptom_segment
    // Use the correct field names from the SymptomMaster schema
    lowerText: symptom.symptom_segment ? symptom.symptom_segment.toLowerCase() : ""
  }));
  
  // Load notes from the appropriate source
  let allNotes: Note[] = [];
  
  if (options.source === 'database') {
    // Get notes from the database
    console.log('Fetching all notes from database...');
    const result = await storage.executeRawQuery(
      'SELECT * FROM notes ORDER BY patient_id, dos_date'
    );
    // Handle the result, which could be an array or an object with a rows property
    allNotes = result.rows ? result.rows : result;
    console.log(`Fetched ${allNotes.length} notes from database for processing`);
  } else if (options.source === 'csv') {
    // Get notes from CSV file
    if (!options.csvFilePath) {
      throw new Error('CSV file path is required when source is "csv"');
    }
    
    console.log(`Parsing notes from CSV file: ${options.csvFilePath}`);
    allNotes = await parseCSVFile(options.csvFilePath);
    console.log(`Parsed ${allNotes.length} notes from CSV file for processing`);
  }
  
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
    const patientSymptoms = extractSymptomsForPatient(
      patientNotes,
      symptomPatterns,
      options.userId || null
    );
    
    console.log(`Extracted ${patientSymptoms.length} symptoms for patient ${patientId}`);
    
    // Add to our collection
    totalExtractedSymptoms.push(...patientSymptoms);
    processedPatients++;
    
    // Log progress every 5 patients
    if (processedPatients % 5 === 0) {
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
  try {
    const deleteResult = await storage.executeRawQuery(
      'DELETE FROM extracted_symptoms WHERE pre_processed = true'
    );
    console.log('Delete result:', deleteResult.rowCount || 'Unknown', 'rows affected');
  } catch (error) {
    console.error('Error removing previous pre-processed symptoms:', error);
    // Continue with the process despite the error
  }
  
  // Store the results in the database
  console.log(`Storing ${totalExtractedSymptoms.length} pre-processed symptoms...`);
  
  // Save to database in chunks to avoid memory issues
  const chunkSize = 500;
  for (let i = 0; i < totalExtractedSymptoms.length; i += chunkSize) {
    const chunk = totalExtractedSymptoms.slice(i, i + chunkSize);
    await storage.saveExtractedSymptoms(chunk);
    console.log(`Saved symptoms chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(totalExtractedSymptoms.length/chunkSize)}`);
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
 * Extract symptoms for a specific patient's notes
 */
function extractSymptomsForPatient(
  notes: Note[],
  symptomPatterns: Array<SymptomMaster & { lowerText: string }>,
  userId: number | null
): InsertExtractedSymptom[] {
  const extractedSymptoms: InsertExtractedSymptom[] = [];
  let matchCount = 0;
  
  // Process each note
  notes.forEach(note => {
    // Handle property access safely with the correct TypeScript property name
    const noteText = ((note as any).noteText || (note as any).note_text || '').toLowerCase();
    
    // Skip if no note text is available
    if (!noteText) {
      console.log('Warning: Note missing text content:', note);
      return; // Skip to next note
    }
    
    // Process each symptom pattern
    symptomPatterns.forEach(symptom => {
      // Check if the note contains this symptom (exact match only)
      if (noteText.includes(symptom.lowerText)) {
        matchCount++;
        
        // Get patient ID from the note (handle different property naming)
        const notePatientId = (note as any).patientId || (note as any).patient_id || 'unknown';
        
        // Get date of service (handle different property naming)
        const noteDosDate = (note as any).dosDate || (note as any).dos_date || 
                           (note as any).date || new Date().toISOString().split('T')[0];
        
        // Create extracted symptom record with correct field names
        extractedSymptoms.push({
          mention_id: uuidv4(), // Generate a unique ID for this mention
          patient_id: notePatientId,
          dos_date: noteDosDate,
          symptom_segment: symptom.symptom_segment, // Use correct field names
          symptom_id: symptom.symptom_id,
          diagnosis: symptom.diagnosis,
          diagnostic_category: symptom.diagnostic_category,
          symptom_present: "Yes",
          symptom_detected: "Yes",
          validated: "Yes",
          symptom_segments_in_note: 1,
          housing_status: null,
          food_status: null,
          financial_status: null,
          user_id: userId,
          pre_processed: true // Flag as pre-processed
        });
      }
    });
  });
  
  return extractedSymptoms;
}

/**
 * Parse a CSV file into an array of Note objects
 */
async function parseCSVFile(csvFilePath: string): Promise<Note[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(csvFilePath)) {
      reject(new Error(`CSV file not found at path: ${csvFilePath}`));
      return;
    }
    
    const notes: Note[] = [];
    
    // Create read stream
    const fileStream = fs.createReadStream(csvFilePath);
    
    // Configure parser
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    // Set up event handlers
    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        // Map CSV columns to Note fields based on the provided CSV structure
        try {
          // Format the date properly if needed
          let dosDate = record.date_of_service_dos;
          if (dosDate && dosDate.includes('/')) {
            // Convert MM/DD/YYYY to YYYY-MM-DD format
            const parts = dosDate.split('/');
            if (parts.length === 3) {
              dosDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
          }
          
          // Skip rows with "No Symptom" in note_text as they won't match anything
          if (record.note_text && record.note_text.includes("No Symptom")) {
            continue;
          }
          
          const note: Note = {
            id: parseInt(record.note_id?.replace('Note_', '') || '0'), 
            patientId: record.patient_ID || record.patient_ID,
            dosDate: dosDate,
            noteText: record.note_text,
            providerId: record.provider_id || record.provider_id,
            userId: 2 // Default to admin user ID for pre-processing
          };
          
          notes.push(note);
        } catch (error) {
          console.error('Error parsing CSV row:', error);
          console.error('Problematic record:', record);
          // Continue processing other rows
        }
      }
    });
    
    // Handle errors and completion
    parser.on('error', function(err) {
      reject(err);
    });
    
    parser.on('end', function() {
      resolve(notes);
    });
    
    // Start the parsing process
    fileStream.pipe(parser);
  });
}

// Type for progress callback function with patient tracking
type ProgressCallback = (
  progress: number, 
  message: string, 
  stage?: string, 
  patientId?: string,
  processedPatients?: number,
  totalPatients?: number
) => void;

// Export a function to run the pre-processing on demand
export async function runPreProcessing(options: {
  source: 'database' | 'csv';
  csvFilePath?: string;
  userId?: number;
  progressCallback?: ProgressCallback;
} = { source: 'database' }): Promise<any> {
  try {
    // Create a wrapper that sends progress updates through the original function 
    // and also formats them for WebSocket updates
    const progressCallback = options.progressCallback || ((
      progress: number, 
      message: string, 
      stage?: string, 
      patientId?: string,
      processedPatients?: number,
      totalPatients?: number
    ) => {
      // Default no-op callback if none provided
      console.log(`Progress update: ${(progress * 100).toFixed(2)}% - ${message} (Stage: ${stage || 'general'}) - Patients: ${processedPatients || 0}/${totalPatients || 0}`);
    });
    
    // Instead of modifying the original function (which leads to TypeScript errors),
    // we'll track progress using a more direct approach
    
    try {
      // Send initial progress update - use 1% to show progress started
      progressCallback(1, "Starting pre-processing...", "initialization", undefined, 0, 0);
      
      // Create a simple progress tracking function that watches patientIds processing
      const monitorPatientProcessing = (patientId: string, index: number, total: number) => {
        // Calculate progress - reserve 10% for initialization and 10% for saving at the end
        // This ensures we show meaningful progress at the beginning and throughout the process
        // Use percentage values (0-100) instead of decimals (0-1)
        const progress = 10 + Math.round(80 * ((index + 1) / total));
        const message = `Processing patient ${index + 1} of ${total}`;
        
        // Send comprehensive progress information including patient tracking data
        progressCallback(
          progress, 
          message, 
          "processing_patients", 
          patientId, 
          index + 1,  // processed patients
          total       // total patients
        );
      };
      
      // Override the method in preProcessSymptoms to process patients with progress tracking
      const processWithProgress = async () => {
        console.log('Starting pre-processing with progress tracking...');
        
        // Load the symptom master library using our improved library manager
        console.log('Ensuring symptom master library is fully loaded...');
        progressCallback(5, "Loading comprehensive symptom library...");
        
        let symptomMaster;
        try {
          // First ensure the symptom library is fully loaded in both file and database
          const fullSymptomLibrary = await ensureSymptomLibrary();
          console.log(`Ensured comprehensive library with ${fullSymptomLibrary.length} symptoms is loaded`);
          progressCallback(8, `Loaded comprehensive library with ${fullSymptomLibrary.length} symptoms`);
          
          // Now get the symptoms from database for processing
          symptomMaster = await storage.getSymptomMaster();
          console.log(`Loaded ${symptomMaster.length} symptom patterns from database`);
          
          // If database has fewer symptoms than our full library, use the full library directly
          if (symptomMaster.length < fullSymptomLibrary.length) {
            console.log(`Database has fewer symptoms (${symptomMaster.length}) than expected (${fullSymptomLibrary.length})`);
            console.log('Using full symptom library directly for preprocessing');
            progressCallback(9, `Using full library of ${fullSymptomLibrary.length} symptoms directly`);
            symptomMaster = fullSymptomLibrary;
          }
        } catch (error) {
          console.error('Error ensuring symptom library:', error);
          
          // Fallback to direct database query if there's an error
          console.log('Falling back to loading symptom patterns directly from database...');
          progressCallback(8, "Using fallback method to load symptoms");
          symptomMaster = await storage.getSymptomMaster();
          console.log(`Loaded ${symptomMaster.length} symptom patterns from database`);
        }
        
        progressCallback(10, `Processing with ${symptomMaster.length} symptom patterns`);
        
        // Pre-process the symptom texts for faster matching
        const symptomPatterns = symptomMaster.map(symptom => ({
          ...symptom,
          // Add a null check to handle possible undefined symptom_segment
          // Use the correct field names from the SymptomMaster schema
          lowerText: symptom.symptom_segment ? symptom.symptom_segment.toLowerCase() : ""
        }));
        
        // Load notes from the appropriate source
        let allNotes: Note[] = [];
        
        if (options.source === 'database') {
          // Get notes from the database
          console.log('Fetching all notes from database...');
          const rawResults = await storage.executeRawQuery(
            'SELECT * FROM notes ORDER BY patient_id, dos_date'
          );
          
          // Ensure we have an array of notes
          if (!Array.isArray(rawResults)) {
            if (rawResults && typeof rawResults === 'object' && rawResults.rows && Array.isArray(rawResults.rows)) {
              // Some database drivers return { rows: [...] } format
              allNotes = rawResults.rows;
            } else {
              // If we can't determine the format, log and throw an error
              console.error('Unexpected database result format:', rawResults);
              throw new Error('Database query did not return an array of notes');
            }
          } else {
            // Results are already an array
            allNotes = rawResults;
          }
          
          console.log(`Fetched ${allNotes.length} notes from database for processing`);
        } else if (options.source === 'csv') {
          // Get notes from CSV file
          if (!options.csvFilePath) {
            throw new Error('CSV file path is required when source is "csv"');
          }
          
          console.log(`Parsing notes from CSV file: ${options.csvFilePath}`);
          allNotes = await parseCSVFile(options.csvFilePath);
          console.log(`Parsed ${allNotes.length} notes from CSV file for processing`);
        }
        
        // Group notes by patient for better progress tracking
        const notesByPatient: { [patientId: string]: Note[] } = {};
        allNotes.forEach((note: Note) => {
          // Handle different naming conventions for patientId
          const patientId = note.patientId || (note as any).patient_id || 'unknown';
          
          // Skip notes with missing patient ID
          if (patientId === 'unknown') {
            console.log('Warning: Note missing patient ID:', note);
            return; // Skip to next note
          }
          
          // Add note to appropriate patient group
          if (!notesByPatient[patientId]) {
            notesByPatient[patientId] = [];
          }
          notesByPatient[patientId].push(note);
        });
        
        const patientIds = Object.keys(notesByPatient);
        console.log(`Processing ${patientIds.length} patients with notes`);
        
        let totalExtractedSymptoms: InsertExtractedSymptom[] = [];
        let processedPatients = 0;
        
        // Process each patient's notes with progress tracking
        for (let i = 0; i < patientIds.length; i++) {
          const patientId = patientIds[i];
          const patientNotes = notesByPatient[patientId];
          console.log(`Processing patient ${patientId} with ${patientNotes.length} notes...`);
          
          // Call our progress monitor
          monitorPatientProcessing(patientId, i, patientIds.length);
          
          // Extract symptoms for this patient
          const patientSymptoms = extractSymptomsForPatient(
            patientNotes,
            symptomPatterns,
            options.userId || null
          );
          
          console.log(`Extracted ${patientSymptoms.length} symptoms for patient ${patientId}`);
          
          // Add to our collection
          totalExtractedSymptoms.push(...patientSymptoms);
          processedPatients++;
        }
        
        // Delete any existing pre-processed symptoms
        console.log('Removing previous pre-processed symptoms...');
        await storage.executeRawQuery(
          'DELETE FROM extracted_symptoms WHERE pre_processed = true'
        );
        
        // Store the results in the database
        console.log(`Storing ${totalExtractedSymptoms.length} pre-processed symptoms...`);
        progressCallback(90, `Saving ${totalExtractedSymptoms.length} processed symptoms to database...`);
        
        // Save to database in chunks to avoid memory issues
        const chunkSize = 500;
        for (let i = 0; i < totalExtractedSymptoms.length; i += chunkSize) {
          const chunk = totalExtractedSymptoms.slice(i, i + chunkSize);
          await storage.saveExtractedSymptoms(chunk);
          console.log(`Saved symptoms chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(totalExtractedSymptoms.length/chunkSize)}`);
          
          // Update progress during saving (90-100%)
          const saveProgress = 90 + Math.round(10 * (i / totalExtractedSymptoms.length));
          progressCallback(saveProgress, `Saved ${i + chunk.length} of ${totalExtractedSymptoms.length} symptoms`);
        }
        
        // Send final completion update
        progressCallback(100, "Pre-processing completed successfully!");
        
        return {
          processedPatients,
          processedNotes: allNotes.length,
          extractedSymptoms: totalExtractedSymptoms.length,
          processingTimeSeconds: 0 // Will be calculated by the caller
        };
      };
      
      // Track start time
      const startTime = Date.now();
      
      // Run our custom processing with progress tracking
      const result = await processWithProgress();
      
      // Calculate processing time
      const endTime = Date.now();
      result.processingTimeSeconds = (endTime - startTime) / 1000;
      
      return result;
    } catch (error: any) {
      // Send error update with proper error message (0% progress)
      progressCallback(0, `Error in pre-processing: ${error.message || 'Unknown error'}`);
      throw error;
    }
  } catch (error) {
    console.error('Pre-processing failed:', error);
    throw error;
  }
}

// We're using ES modules, so we don't need the "if this is main module" check
// The function can be called directly from other modules