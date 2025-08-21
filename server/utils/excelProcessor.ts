/**
 * Excel File Processing Utility
 * 
 * Provides specialized functions for processing Excel files efficiently,
 * handling large files in a memory-efficient way.
 */

import * as XLSX from 'xlsx';
import fs from 'fs';
import { db } from '../db';
import { notes, patients } from '@shared/schema';

// Type definition for progress tracking
interface ProcessProgress {
  stage: 'detecting' | 'processing' | 'saving' | 'complete' | 'error';
  progress: number;
  recordCount: number;
  patientCount: number;
  error?: string;
}

// Type definition for processing result
interface ProcessResult {
  stage: 'complete' | 'error';
  recordCount: number;
  patientCount: number;
  patients: any[];
  notes: any[];
  error?: string;
}

// Type for progress callback function
type ProgressCallback = (progress: ProcessProgress) => void;

/**
 * Process an Excel file efficiently, handling large files
 */
export async function processExcelFile(
  filePath: string, 
  userId: number,
  progressCallback?: ProgressCallback
): Promise<ProcessResult> {
  // Initialize tracking variables
  const patientMap = new Map<string, any>();
  const notes: any[] = [];
  let recordCount = 0;
  
  // Create result object
  const result: ProcessResult = {
    stage: 'complete',
    recordCount: 0,
    patientCount: 0,
    patients: [],
    notes: []
  };
  
  try {
    // Report initial progress
    reportProgress({
      stage: 'processing',
      progress: 0,
      recordCount: 0,
      patientCount: 0
    });
    
    // Load workbook with options optimized for large files
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { 
      type: 'buffer',
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      sheetStubs: true,
      cellDates: true
    });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
    const totalRows = data.length;
    
    // Debug logging to see column names in the first row
    if (totalRows > 0) {
      console.log("Excel file loaded successfully with", totalRows, "rows");
      console.log("First row column names:", Object.keys(data[0]).join(", "));
      console.log("Sample first row data:", JSON.stringify(data[0]).substring(0, 200) + "...");
      
      // Specifically check for expected population data format (1062 records file)
      if (Object.keys(data[0]).some(key => key.includes("Patient") || key.includes("Diagnosis"))) {
        console.log("Detected population data format - will use specialized mapping");
      }
    } else {
      console.log("Excel file loaded but contains no data rows");
      // Debug sheet structure
      console.log("Available sheets:", workbook.SheetNames);
      console.log("Sheet range:", XLSX.utils.decode_range(sheet['!ref'] || 'A1'));
    }
    
    // Process rows in batches for better memory management
    for (let i = 0; i < totalRows; i++) {
      const row = data[i];
      
      // Process the row
      try {
        // Detect column names from the first row
        if (i === 0) {
          console.log("Processing row with keys:", Object.keys(row));
        }

        // Get patient ID directly from the known field name or generate from Note_ID
        // Field mapping matching Upload Data page requirements first, then flexible variations
        let patientId = normalizeField(row['patientId']) || // Primary expected field
                       normalizeField(row['patient_id']) || 
                       normalizeField(row['Patient_ID#']) || 
                       normalizeField(row['Patient_ID']) ||
                       normalizeField(row['PatientID']) ||
                       normalizeField(row['patient ID']) ||
                       normalizeField(row['PATIENT_ID']);
        
        // If no patient_id but has Note_ID, create a patient ID from it
        if (!patientId && row['Note_ID']) {
          // Extract a numeric part from Note_ID to use as patient_id
          const noteId = normalizeField(row['Note_ID']);
          if (noteId) {
            // Create a patient ID from the note ID by extracting numbers
            const numericMatch = noteId.match(/\d+/);
            if (numericMatch) {
              // Use modulo to get patient ID between 1-100 from the note ID
              const noteNum = parseInt(numericMatch[0], 10);
              const patientNum = (noteNum % 100) + 1; // Ensure it's 1-100, not 0-99
              patientId = `patient_${patientNum}`;
              console.log(`Generated patient ID ${patientId} from note ID ${noteId}`);
            }
          }
        }
        
        if (!patientId) {
          console.log("Skipping row, no patient ID found:", JSON.stringify(row).substring(0, 100) + "...");
          continue; // Skip rows without patient ID
        }
        
        // Build the patient record if not already seen
        if (!patientMap.has(patientId)) {
          // Create patient record using the provided field structure
          const patient = {
            patientId,
            patientName: normalizeField(row['patientName']) || normalizeField(row['patient_name']) || normalizeField(row['Patient Name']) || 'Unknown',
            providerId: normalizeField(row['provider_id']),
            providerName: normalizeField(row['provider_fname']),
            providerLname: normalizeField(row['provider_lname']),
            userId,
            age_range: normalizeField(row['age_range']) || '30-39',
            gender: normalizeField(row['gender']) || 'Not Specified',
            race: normalizeField(row['race']),
            ethnicity: normalizeField(row['ethnicity']),
            zip_code: normalizeField(row['zip_code']),
            financial_status: normalizeField(row['financial_status']),
            housing_insecurity: normalizeField(row['housing_insecurity']),
            food_insecurity: normalizeField(row['food_insecurity']),
            veteran_status: normalizeField(row['veteran_status']),
            education_level: normalizeField(row['education_level']),
            access_to_transportation: normalizeField(row['access_to_transportation']),
            has_a_car: normalizeField(row['has_a_car'])
          };
          
          patientMap.set(patientId, patient);
        }
        
        // Build note record with support for multiple file formats
        // Flexible note text matching - handles multiple common variations
        const noteText = normalizeField(row['noteText']) || // Upload page standard
                        normalizeField(row['Note_Text']) || // User's CSV format
                        normalizeField(row['note_text']) ||
                        normalizeField(row['NOTE_TEXT']) ||
                        normalizeField(row['Note Text']) ||
                        normalizeField(row['clinical_note']) ||
                        normalizeField(row['Clinical Note']) || '';
        if (noteText) {
          const note = {
            patientId,
            noteId: normalizeField(row['note_id']) || normalizeField(row['Note_ID']) || `${patientId}_note_${i}`,
            dosDate: formatDate(normalizeField(row['dosDate']) || normalizeField(row['Date of Service (DOS)']) || normalizeField(row['date_of_service_dos']) || normalizeField(row['DOS']) || new Date().toISOString()),
            donDate: formatDate(normalizeField(row['donDate']) || normalizeField(row['Date of Note (DON)']) || normalizeField(row['date_of_note_don']) || normalizeField(row['DON']) || new Date().toISOString()),
            noteText,
            noteType: normalizeField(row['note_type']) || normalizeField(row['Note_Type']) || 'clinical',
            symptomPresent: normalizeField(row['symptom_present']) || normalizeField(row['Symptom_Present']),
            symptomDetected: normalizeField(row['symptom_detected']) || normalizeField(row['Symptom_Detected']),
            symptomId: normalizeField(row['symptom_id']) || normalizeField(row['Symptom_ID']),
            symptomWording: normalizeField(row['symptom_wording']) || normalizeField(row['Symptom_Wording']),
            symptomCount: normalizeField(row['symptom_count']) || normalizeField(row['Symptom_Count']),
            validationStatus: normalizeField(row['validation_status']) || normalizeField(row['Validation_Status']),
            providerId: normalizeField(row['provider_id']) || normalizeField(row['Provider_ID']),
            providerFname: normalizeField(row['provider_fname']) || normalizeField(row['Provider_FName']),
            providerLname: normalizeField(row['provider_lname']) || normalizeField(row['Provider_LName']),
            providerDegree: normalizeField(row['provider_degree']) || normalizeField(row['Provider_Degree']),
            userId,
          };
          
          notes.push(note);
          recordCount++;
        }
        
        // Report progress periodically
        if (i % 100 === 0 || i === totalRows - 1) {
          const progress = Math.min(Math.floor((i / totalRows) * 95), 95);
          reportProgress({
            stage: 'processing',
            progress,
            recordCount,
            patientCount: patientMap.size
          });
          
          // Save notes in batches for better performance
          if (notes.length >= 500) {
            await saveNoteBatch(notes.splice(0, notes.length));
          }
        }
      } catch (err) {
        console.error('Error processing Excel row:', err);
        // Continue processing other rows even if one fails
      }
    }
    
    // Report saving progress
    reportProgress({
      stage: 'saving',
      progress: 98,
      recordCount,
      patientCount: patientMap.size
    });
    
    // Save any remaining notes
    if (notes.length > 0) {
      await saveNoteBatch(notes);
    }
    
    // Convert patients map to array and save
    const patientArray = Array.from(patientMap.values());
    result.patients = patientArray;
    
    // Save all patients
    if (patientArray.length > 0) {
      await savePatientBatch(patientArray);
    }
    
    // Complete the result
    result.recordCount = recordCount;
    result.patientCount = patientMap.size;
    
    // Report completion
    reportProgress({
      stage: 'complete',
      progress: 100,
      recordCount,
      patientCount: patientMap.size
    });
    
    return result;
  } catch (error) {
    console.error('Error in processExcelFile:', error);
    
    // Report error
    reportProgress({
      stage: 'error',
      progress: 0,
      recordCount,
      patientCount: patientMap.size,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return {
      ...result,
      stage: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
  
  // Helper function to report progress
  function reportProgress(progress: ProcessProgress) {
    if (progressCallback) {
      progressCallback(progress);
    }
  }
  
  /**
   * Find the first field from a list of possible field names
   */
  function findFirstMatchingField(row: Record<string, any>, fieldNames: string[]): string | null {
    for (const fieldName of fieldNames) {
      if (row[fieldName] !== undefined && row[fieldName] !== null) {
        const value = normalizeField(row[fieldName]);
        if (value) return value;
      }
    }
    return null;
  }
}

/**
 * Save a batch of notes to the database efficiently
 */
async function saveNoteBatch(noteBatch: any[]): Promise<void> {
  if (noteBatch.length === 0) return;
  
  try {
    // Insert notes in a batch operation
    await db.insert(notes).values(noteBatch);
    console.log(`Saved batch of ${noteBatch.length} notes`);
  } catch (error) {
    console.error('Error saving note batch:', error);
    throw error;
  }
}

/**
 * Save a batch of patients to the database efficiently
 */
async function savePatientBatch(patientBatch: any[]): Promise<void> {
  if (patientBatch.length === 0) return;
  
  try {
    // Insert patients in a batch operation with conflict resolution
    for (const patient of patientBatch) {
      await db.insert(patients)
        .values(patient)
        .onConflictDoUpdate({
          target: patients.patientId,
          set: {
            patientName: patient.patientName,
            providerId: patient.providerId,
            providerName: patient.providerName,
            providerLname: patient.providerLname,
            age_range: patient.age_range,
          }
        });
    }
    console.log(`Saved ${patientBatch.length} patients`);
  } catch (error) {
    console.error('Error saving patient batch:', error);
    throw error;
  }
}

/**
 * Normalize a field value to handle various input formats
 */
function normalizeField(value: any): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value.trim();
  return String(value);
}

/**
 * Format a date string to a consistent format (YYYY-MM-DD)
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  try {
    // Handle various date formats
    let date: Date;
    
    // Check if it's already ISO format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}(T.*)?$/)) {
      date = new Date(dateStr);
    } 
    // Check if it's MM/DD/YYYY
    else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [month, day, year] = dateStr.split('/').map(Number);
      date = new Date(year, month - 1, day);
    }
    // Check if it's MM-DD-YYYY
    else if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const [month, day, year] = dateStr.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }
    // Handle Excel date (serial number)
    else if (!isNaN(Number(dateStr))) {
      // Excel dates are number of days since 1/1/1900
      // JavaScript dates are milliseconds since 1/1/1970
      const excelDate = Number(dateStr);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      date = new Date((excelDate - 25569) * millisecondsPerDay); // 25569 is the difference between 1/1/1900 and 1/1/1970
    }
    else {
      // Try parsing with JavaScript Date
      date = new Date(dateStr);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    
    // Format as YYYY-MM-DD
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error('Error formatting date:', e);
    return new Date().toISOString().split('T')[0];
  }
}