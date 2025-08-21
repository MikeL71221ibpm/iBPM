import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { Note, SymptomMaster, InsertExtractedSymptom } from '@shared/schema';

/**
 * Pre-process symptoms from a CSV file containing patient notes
 * and store the results in the database with a preProcessed flag
 */
export async function preProcessFromCSV(
  csvFilePath: string
): Promise<{
  processedPatients: number;
  processedNotes: number;
  extractedSymptoms: number;
  processingTimeSeconds: number;
}> {
  console.log(`Starting pre-processing of symptoms from CSV file: ${csvFilePath}`);
  const startTime = Date.now();
  
  // First, check if the file exists
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found at path: ${csvFilePath}`);
  }
  
  // Load the symptom master library
  console.log('Loading symptom master library...');
  const symptomMaster = await storage.getSymptomMaster();
  console.log(`Loaded ${symptomMaster.length} symptom patterns`);
  
  // Pre-process the symptom texts for faster matching
  const symptomPatterns = symptomMaster.map(symptom => ({
    ...symptom,
    lowerText: symptom.symptom_segment.toLowerCase()
  }));
  
  // Parse the CSV file
  const notes = await parseCSVFile(csvFilePath);
  console.log(`Parsed ${notes.length} notes from CSV file`);
  
  // Group notes by patient for better progress tracking
  const notesByPatient: { [patientId: string]: Note[] } = {};
  notes.forEach(note => {
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
    
    let patientSymptoms: InsertExtractedSymptom[] = [];
    let matchCount = 0;
    
    // Process each note for this patient
    patientNotes.forEach(note => {
      const noteText = note.noteText.toLowerCase();
      
      // Process each symptom pattern
      symptomPatterns.forEach(symptom => {
        // Check if the note contains this symptom (exact match only)
        if (noteText.includes(symptom.lowerText)) {
          matchCount++;
          
          // Create extracted symptom record with harmonized fields
          patientSymptoms.push({
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
            // For problems (HRSN indicators), store the actual HRSN indicator in zcode_hrsn
            // For symptoms, zcode_hrsn should be "No"
            zcode_hrsn: symptom.symp_prob === "Problem" ? symptom.symptom_segment : "No",
            symptom_present: "Yes",
            symptom_detected: "Yes",
            validated: "Yes",
            symptom_segments_in_note: 1,
            housing_status: null,
            food_status: null,
            financial_status: null,
            user_id: 1, // Use system admin user for pre-processing jobs
            pre_processed: true // Flag as pre-processed
          });
        }
      });
    });
    
    console.log(`Found ${matchCount} symptom matches for patient ${patientId}`);
    
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
  await storage.executeRawQuery(
    'DELETE FROM extracted_symptoms WHERE pre_processed = true'
  );
  
  // Store the results in the database
  console.log(`Storing ${totalExtractedSymptoms.length} pre-processed symptoms...`);
  
  // Save to database in chunks to avoid memory issues
  const chunkSize = 500;
  for (let i = 0; i < totalExtractedSymptoms.length; i += chunkSize) {
    const chunk = totalExtractedSymptoms.slice(i, i + chunkSize);
    await storage.saveExtractedSymptoms(chunk);
    console.log(`Saved symptoms chunk ${i/chunkSize + 1}/${Math.ceil(totalExtractedSymptoms.length/chunkSize)}`);
  }
  
  const endTime = Date.now();
  const processingTimeSeconds = (endTime - startTime) / 1000;
  
  console.log(`Pre-processing complete in ${processingTimeSeconds.toFixed(2)}s.`);
  console.log(`Processed ${processedPatients} patients with ${notes.length} notes.`);
  console.log(`Extracted ${totalExtractedSymptoms.length} symptoms.`);
  
  return {
    processedPatients,
    processedNotes: notes.length,
    extractedSymptoms: totalExtractedSymptoms.length,
    processingTimeSeconds
  };
}

/**
 * Parse a CSV file into an array of Note objects
 */
async function parseCSVFile(csvFilePath: string): Promise<Note[]> {
  return new Promise((resolve, reject) => {
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
          
          const note: Note = {
            id: parseInt(record.note_id.replace('Note_', '') || '0'), 
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

/**
 * Command-line interface to run the pre-processing
 * Example: node -r ts-node/register server/utils/csvPreProcess.ts /path/to/file.csv
 * 
 * Note: This is not executed when imported as a module, only when run directly.
 * The pre-processing is now triggered from routes.ts
 */
/*
// When using as a script:
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Please provide the path to the CSV file');
  process.exit(1);
}

const csvFilePath = args[0];

preProcessFromCSV(csvFilePath)
  .then(result => {
    console.log('Pre-processing completed successfully!');
    console.log(`Processed ${result.processedPatients} patients with ${result.processedNotes} notes in ${result.processingTimeSeconds.toFixed(2)}s`);
    console.log(`Extracted ${result.extractedSymptoms} symptoms.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Pre-processing failed:', error);
    process.exit(1);
  });
*/