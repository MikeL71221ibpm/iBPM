/**
 * Stream Processing Utility
 * 
 * This utility provides functions for processing large files in chunks,
 * allowing handling of files of any size without memory limitations.
 */

import fs from 'fs';
import { createReadStream } from 'fs';
import { parse as parseCsv } from 'csv-parse';
import * as XLSX from 'xlsx';
import path from 'path';
import { db } from '../db';
import { notes, patients } from '@shared/schema';
import { storage } from '../storage';

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
 * Processes a file using a streaming approach to handle large files
 * @param filePath Path to the file to process
 * @param userId User ID for associating the processed data
 * @param progressCallback Optional callback for tracking progress
 * @returns Processing result
 */
export async function streamProcessFile(
  filePath: string, 
  userId: number,
  progressCallback?: ProgressCallback
): Promise<ProcessResult> {
  // Extract file extension
  const fileExtension = path.extname(filePath).toLowerCase();
  
  // Initialize result object
  const result: ProcessResult = {
    stage: 'complete',
    recordCount: 0,
    patientCount: 0,
    patients: [],
    notes: []
  };
  
  function reportProgress(progress: ProcessProgress) {
    if (progressCallback) {
      progressCallback(progress);
    }
  }
  
  try {
    if (progressCallback) {
      progressCallback({
        stage: 'detecting',
        progress: 0,
        recordCount: 0,
        patientCount: 0
      });
    }
    
    // Process based on file type
    if (fileExtension === '.csv') {
      // Process CSV file
      return await processCsvFile(filePath, userId, progressCallback);
    } else if (fileExtension === '.xlsx') {
      // Process Excel file - import from dedicated Excel processor
      const { processExcelFile } = await import('./excelProcessor');
      return await processExcelFile(filePath, userId, progressCallback);
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error('Error in streamProcessFile:', error);
    
    // Report error progress
    if (progressCallback) {
      progressCallback({
        stage: 'error',
        progress: 0,
        recordCount: result.recordCount,
        patientCount: result.patientCount,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    return {
      ...result,
      stage: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Process a CSV file using streams to handle large files
 */
async function processCsvFile(
  filePath: string, 
  userId: number,
  progressCallback?: ProgressCallback
): Promise<ProcessResult> {
  // Initialize tracking variables
  const patientMap = new Map<string, any>();
  const notes: any[] = [];
  let recordCount = 0;
  let rowsProcessed = 0;
  
  // Create result object
  const result: ProcessResult = {
    stage: 'complete',
    recordCount: 0,
    patientCount: 0,
    patients: [],
    notes: []
  };
  
  function reportProgress(progress: ProcessProgress) {
    if (progressCallback) {
      progressCallback(progress);
    }
  }
  
  try {
    // Get file size for progress tracking
    const stats = fs.statSync(filePath);
    const totalSize = stats.size;
    let processedSize = 0;
    
    // Create read stream for file
    const fileStream = createReadStream(filePath);
    
    // Set up parser with streaming options
    const parser = parseCsv({
      columns: true,
      trim: true,
      skip_empty_lines: true,
      bom: true,
      skip_records_with_error: true,
    });
    
    // Create a promise to handle the streaming
    return new Promise<ProcessResult>((resolve, reject) => {
      // Set up stream pipeline
      fileStream
        .pipe(parser)
        .on('data', (row) => {
          try {
            // Track processed size for progress
            processedSize += JSON.stringify(row).length;
            rowsProcessed++;
            
            // Debug: Log column names from first row
            if (rowsProcessed === 1) {
              console.log("CSV Column names found:", Object.keys(row));
              console.log("Sample row data:", JSON.stringify(row).substring(0, 200));
            }
            
            // Calculate progress percentage (0-95% during processing)
            const progress = Math.min(Math.floor((processedSize / totalSize) * 90), 90);
            
            // Process the row
            // Extract patient data with flexible field matching
            const patientId = normalizeField(row['patientId']) || 
                             normalizeField(row['Patient_ID#']) ||
                             normalizeField(row['patient_id']);
            if (!patientId) {
              return; // Skip rows without patient ID
            }
            
            // Build the patient record if not already seen
            if (!patientMap.has(patientId)) {
              // Debug patient name field mapping
              console.log('DEBUG: Row data for patient name mapping:', {
                'row["patientName"]': row['patientName'],
                'row["Patient Name"]': row['Patient Name'], 
                'row["patient_name"]': row['patient_name'],
                'normalizeField(row["patient_name"])': normalizeField(row['patient_name']),
                'all_row_keys': Object.keys(row)
              });
              
              const patient = {
                patientId,
                patientName: normalizeField(row['patientName']) || normalizeField(row['Patient Name']) || normalizeField(row['patient_name']) || 'Unknown Patient',
                providerId: normalizeField(row['provider_id']) || normalizeField(row['providerId']),
                providerName: normalizeField(row['provider_name']) || normalizeField(row['providerName']),
                providerLname: normalizeField(row['provider_lname']) || normalizeField(row['providerLname']),
                userId,
                age_range: normalizeField(row['age_range']) || normalizeField(row['ageRange']) || '30-39',
                gender: normalizeField(row['gender']) || 'Not Specified',
              };
              
              patientMap.set(patientId, patient);
            }
            
            // Build note record with flexible field matching
            const noteText = normalizeField(row['noteText']) || 
                            normalizeField(row['Note_Text']) ||
                            normalizeField(row['note_text']) || '';
            
            // Debug note text processing - always show for troubleshooting
            console.log('DEBUG: Note text processing for row', rowsProcessed, ':', {
              'Available columns': Object.keys(row),
              'row["Note_Text"]': row['Note_Text'],
              'normalizeField result': normalizeField(row['Note_Text']),
              'final noteText': noteText,
              'noteText length': noteText ? noteText.length : 0,
              'noteText truthy?': !!noteText
            });
            
            if (noteText) {
              const note = {
                patientId,
                dosDate: formatDate(normalizeField(row['dos_date']) || normalizeField(row['dosDate']) || new Date().toISOString()),
                noteText,
                providerId: normalizeField(row['provider_id']) || normalizeField(row['providerId']),
                userId,
              };
              
              notes.push(note);
              recordCount++;
            }
            
            // Report progress periodically to avoid overwhelming the UI
            if (rowsProcessed % 100 === 0) {
              reportProgress({
                stage: 'processing',
                progress,
                recordCount,
                patientCount: patientMap.size
              });
              
              // Save notes in batches for better performance
              if (notes.length >= 500) {
                saveNoteBatch(notes.splice(0, notes.length));
              }
            }
          } catch (rowError) {
            console.error('Error processing CSV row:', rowError);
            // Continue processing other rows even if one fails
          }
        })
        .on('error', (error) => {
          console.error('Error parsing CSV:', error);
          reject({
            ...result,
            stage: 'error',
            error: error.message
          });
        })
        .on('end', async () => {
          try {
            // Report saving progress
            reportProgress({
              stage: 'saving',
              progress: 95,
              recordCount,
              patientCount: patientMap.size
            });
            
            // Save any remaining notes
            if (notes.length > 0) {
              await saveNoteBatch(notes);
            }
            
            // Convert patients map to array and save
            const patientArray = Array.from(patientMap.values());
            
            // Save all patients
            if (patientArray.length > 0) {
              await savePatientBatch(patientArray);
            }
            
            // Complete the result
            result.recordCount = recordCount;
            result.patientCount = patientMap.size;
            result.patients = patientArray;
            
            // Report completion
            reportProgress({
              stage: 'complete',
              progress: 100,
              recordCount,
              patientCount: patientMap.size
            });
            
            resolve(result);
          } catch (error) {
            console.error('Error saving processed data:', error);
            reject({
              ...result,
              stage: 'error',
              error: error instanceof Error ? error.message : String(error)
            });
          }
        });
    });
  } catch (error) {
    console.error('Error in processCsvFile:', error);
    
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