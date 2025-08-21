import { createReadStream, createWriteStream } from 'fs';
import { parse } from 'csv-parse';
import { Transform } from 'stream';
import { storage } from '../storage';
import { InsertPatient, InsertNote } from '@shared/schema';

interface UploadProgress {
  progress: number;
  message: string;
  processedPatients: number;
  totalPatients: number;
  stage: string;
}

interface BatchData {
  patients: Map<string, InsertPatient>;
  notes: InsertNote[];
}

export class StreamingUpload {
  private userId: number;
  private batchSize: number = 1000; // Increased from 25-50 to 1000 as recommended
  private currentBatch: BatchData;
  private totalRecords: number = 0;
  private processedRecords: number = 0;
  private progressCallback?: (progress: UploadProgress) => void;
  private isProcessing: boolean = false;

  constructor(userId: number) {
    this.userId = userId;
    this.currentBatch = {
      patients: new Map(),
      notes: []
    };
  }

  setProgressCallback(callback: (progress: UploadProgress) => void) {
    this.progressCallback = callback;
  }

  private reportProgress(stage: string, message: string) {
    if (this.progressCallback) {
      const progress = this.totalRecords > 0 ? 
        Math.round((this.processedRecords / this.totalRecords) * 100) : 0;
      
      this.progressCallback({
        progress,
        message,
        processedPatients: this.processedRecords,
        totalPatients: this.totalRecords,
        stage
      });
    }
  }

  private async processBatch(): Promise<void> {
    if (this.currentBatch.patients.size === 0 && this.currentBatch.notes.length === 0) {
      return;
    }

    try {
      // Process patients first
      const patientArray = Array.from(this.currentBatch.patients.values());
      if (patientArray.length > 0) {
        await storage.batchInsertPatients(patientArray);
        this.reportProgress('patients', `Processed ${patientArray.length} patients`);
      }

      // Then process notes
      if (this.currentBatch.notes.length > 0) {
        await storage.batchInsertNotes(this.currentBatch.notes);
        this.reportProgress('notes', `Processed ${this.currentBatch.notes.length} notes`);
      }

      // Clear batch
      this.currentBatch = {
        patients: new Map(),
        notes: []
      };

    } catch (error) {
      console.error('Batch processing error:', error);
      // Continue processing other batches even if one fails
      throw error;
    }
  }

  private createTransformStream() {
    let recordCount = 0;
    
    return new Transform({
      objectMode: true,
      async transform(record: any, encoding, callback) {
        try {
          recordCount++;
          this.processedRecords = recordCount;

          // Extract patient data
          const patientId = String(record.patient_id || record.Patient_ID || `patient-${recordCount}`).trim();
          const patientName = String(record.patient_name || record.Patient_Name || `Patient ${patientId}`).trim();
          
          // Create patient record if not exists
          if (!this.currentBatch.patients.has(patientId)) {
            const patient: InsertPatient = {
              patientId,
              patientName,
              providerId: String(record.provider_id || '').trim() || null,
              providerName: String(record.provider_name || '').trim() || null,
              providerLname: String(record.provider_lname || '').trim() || null,
              userId: this.userId,
              age_range: String(record.age_range || record.Age_Range || '').trim() || null,
              gender: String(record.gender || record.Gender || '').trim() || null,
              race: String(record.race || record.Race || '').trim() || null,
              ethnicity: String(record.ethnicity || record.Ethnicity || '').trim() || null,
              zip_code: String(record.zip_code || record.Zip_Code || '').trim() || null,
              financial_status: String(record.financial_status || '').trim() || null,
              housing_insecurity: String(record.housing_insecurity || '').trim() || null,
              food_insecurity: String(record.food_insecurity || '').trim() || null,
              veteran_status: String(record.veteran_status || '').trim() || null,
              education_level: String(record.education_level || '').trim() || null,
              transportation: String(record.transportation || '').trim() || null,
              has_car: String(record.has_car || '').trim() || null
            };
            
            this.currentBatch.patients.set(patientId, patient);
          }

          // Create note record if there's note text
          const noteText = String(record.note_text || record.Note_Text || '').trim();
          if (noteText && noteText.length >= 10) {
            const dosDate = this.formatDate(record.dos_date || record.DOS_Date || new Date().toISOString());
            
            const note: InsertNote = {
              patientId,
              dosDate,
              noteText,
              providerId: String(record.provider_id || '').trim() || null,
              userId: this.userId
            };
            
            this.currentBatch.notes.push(note);
          }

          // Process batch when it reaches target size
          if (this.currentBatch.patients.size + this.currentBatch.notes.length >= this.batchSize) {
            await this.processBatch();
          }

          callback();
        } catch (error) {
          console.error('Transform error for record:', error);
          // Continue processing even if individual record fails
          callback();
        }
      },

      async flush(callback) {
        try {
          // Process remaining batch
          await this.processBatch();
          callback();
        } catch (error) {
          console.error('Flush error:', error);
          callback(error);
        }
      }
    });
  }

  private formatDate(dateInput: any): string {
    try {
      if (dateInput instanceof Date) {
        return dateInput.toISOString().split('T')[0];
      }
      
      if (typeof dateInput === 'string') {
        // Handle MM/DD/YYYY format
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput)) {
          const parts = dateInput.split('/');
          const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
          return date.toISOString().split('T')[0];
        }
        
        // Handle YYYY-MM-DD format
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateInput)) {
          return new Date(dateInput).toISOString().split('T')[0];
        }
      }
      
      // Fallback to current date
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      return new Date().toISOString().split('T')[0];
    }
  }

  async uploadFile(filePath: string): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Upload already in progress');
    }

    this.isProcessing = true;
    
    try {
      this.reportProgress('setup', 'Initializing streaming upload...');

      // Count total records first for progress tracking
      await this.countRecords(filePath);
      
      this.reportProgress('streaming', 'Starting data processing...');

      return new Promise((resolve, reject) => {
        const readStream = createReadStream(filePath);
        const parser = parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        const transformer = this.createTransformStream();

        readStream
          .pipe(parser)
          .pipe(transformer)
          .on('finish', () => {
            this.reportProgress('complete', 'Upload completed successfully');
            this.isProcessing = false;
            resolve();
          })
          .on('error', (error) => {
            console.error('Upload stream error:', error);
            this.isProcessing = false;
            reject(error);
          });
      });

    } catch (error) {
      this.isProcessing = false;
      throw error;
    }
  }

  private async countRecords(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let count = 0;
      const readStream = createReadStream(filePath);
      const parser = parse({
        columns: true,
        skip_empty_lines: true
      });

      readStream
        .pipe(parser)
        .on('data', () => count++)
        .on('end', () => {
          this.totalRecords = count;
          resolve();
        })
        .on('error', reject);
    });
  }
}