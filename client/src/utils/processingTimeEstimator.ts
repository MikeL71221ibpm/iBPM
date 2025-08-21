/**
 * Utility functions for estimating file processing times
 */

export interface ProcessingTimeEstimate {
  uploadTime: number;
  initialProcessingTime: number;
  databaseInsertionTime: number;
  preProcessingTime: number;
  totalTime: number;
}

/**
 * Calculates estimated processing time for a file
 * 
 * @param fileSizeMB File size in MB
 * @param recordCount Number of records/rows in the file
 * @param avgNoteLength Average length of each note text in characters
 * @param uniquePatients Number of unique patients in the dataset
 * @param networkSpeedMbps Network upload speed in Mbps
 * @returns Object containing time estimates for each processing phase
 */
export function calculateProcessingTime(
  fileSizeMB: number,
  recordCount: number,
  avgNoteLength: number = 1000,
  uniquePatients: number = 0,
  networkSpeedMbps: number = 50
): ProcessingTimeEstimate {
  // If uniquePatients not specified, estimate as 10% of recordCount
  if (uniquePatients <= 0) {
    uniquePatients = Math.max(1, Math.round(recordCount * 0.1));
  }

  // Constants derived from observed processing speeds
  const BASE_UPLOAD_TIME = 5; // seconds
  const BASE_PROCESSING_TIME = 10; // seconds
  const BASE_DB_TIME = 15; // seconds
  const BASE_NLP_TIME = 20; // seconds
  
  const FILE_SIZE_FACTOR = 0.2; // seconds per MB
  const RECORD_PROCESSING_FACTOR = 0.005; // seconds per record
  const DB_FACTOR = 0.004; // seconds per record
  const NLP_PATIENT_FACTOR = 0.5; // seconds per unique patient
  const NLP_RECORD_FACTOR = 0.003; // seconds per record
  const NOTE_LENGTH_FACTOR = 0.0001; // seconds per character per record
  
  // Calculate upload time based on file size and network speed
  const uploadTimeSec = BASE_UPLOAD_TIME + (fileSizeMB * 8 / networkSpeedMbps);
  
  // Calculate initial processing time
  const initialProcessingTimeSec = BASE_PROCESSING_TIME + 
    (recordCount * RECORD_PROCESSING_FACTOR);
  
  // Calculate database insertion time
  const dbInsertionTimeSec = BASE_DB_TIME + 
    (recordCount * DB_FACTOR) + 
    (recordCount * avgNoteLength * NOTE_LENGTH_FACTOR * 0.3);
  
  // Calculate pre-processing time (NLP analysis)
  const preProcessingTimeSec = BASE_NLP_TIME + 
    (uniquePatients * NLP_PATIENT_FACTOR) + 
    (recordCount * NLP_RECORD_FACTOR) + 
    (recordCount * avgNoteLength * NOTE_LENGTH_FACTOR * 0.7);
  
  // Calculate total time
  const totalTimeSec = uploadTimeSec + initialProcessingTimeSec + 
    dbInsertionTimeSec + preProcessingTimeSec;
  
  return {
    uploadTime: Math.round(uploadTimeSec),
    initialProcessingTime: Math.round(initialProcessingTimeSec),
    databaseInsertionTime: Math.round(dbInsertionTimeSec),
    preProcessingTime: Math.round(preProcessingTimeSec),
    totalTime: Math.round(totalTimeSec)
  };
}

/**
 * Formats seconds into a human-readable time string
 * 
 * @param seconds Time in seconds
 * @returns Formatted time string (e.g., "2 minutes 30 seconds")
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds > 0 ? `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}` : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}`;
  }
}

/**
 * Estimates record count based on file size and average note length
 * 
 * @param fileSizeMB File size in MB
 * @param avgNoteLength Average note length in characters
 * @returns Estimated number of records
 */
export function estimateRecordCount(fileSizeMB: number, avgNoteLength: number = 1000): number {
  // Average overhead per record (commas, quotes, newlines, etc.) - estimated at 20%
  const overhead = 0.2;
  
  // Average bytes per character (assuming UTF-8 encoding where most characters are 1 byte)
  const bytesPerChar = 1.2;
  
  // Calculate bytes per record including overhead
  const bytesPerRecord = avgNoteLength * bytesPerChar * (1 + overhead);
  
  // Calculate total records based on file size
  const totalBytes = fileSizeMB * 1024 * 1024;
  const estimatedRecords = Math.round(totalBytes / bytesPerRecord);
  
  return Math.max(1, estimatedRecords);
}