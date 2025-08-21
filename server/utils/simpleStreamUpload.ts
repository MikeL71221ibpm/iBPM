import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { storage } from '../storage';
import { InsertPatient, InsertNote } from '@shared/schema';

export class SimpleStreamUpload {
  private userId: number;
  private batchSize: number = 1000; // Increased batch size as recommended
  
  constructor(userId: number) {
    this.userId = userId;
  }

  async uploadFile(filePath: string): Promise<{ patients: number, notes: number }> {
    console.log(`Starting simple stream upload for file: ${filePath}`);
    
    let patientBatch: InsertPatient[] = [];
    let noteBatch: InsertNote[] = [];
    let totalPatients = 0;
    let totalNotes = 0;
    let recordCount = 0;

    return new Promise((resolve, reject) => {
      const readStream = createReadStream(filePath);
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      parser.on('readable', async () => {
        let record;
        while (record = parser.read()) {
          try {
            recordCount++;
            
            // Extract patient data - handle your specific CSV format
            const patientId = String(record['Patient_ID#'] || record.Patient_ID || record.patient_id || `patient-${recordCount}`).trim();
            const patientName = String(record['Patient Name'] || record.Patient_Name || record.patient_name || `Patient ${patientId}`).trim();
            
            // Create patient record (only using fields that exist in schema)
            const patient: InsertPatient = {
              patientId,
              patientName,
              providerId: String(record.provider_id || '').trim() || null,
              providerName: String(record.provider_name || '').trim() || null,
              providerLname: String(record.provider_lname || '').trim() || null,
              userId: this.userId,
              age_range: String(record.age_range || record.Age_Range || '').trim() || null
            };
            
            patientBatch.push(patient);

            // Create note record if there's note text - handle your specific CSV format
            const noteText = String(record.Note_Text || record.note_text || record['Note Text'] || '').trim();
            console.log(`Record ${recordCount}: noteText length = ${noteText.length}, first 50 chars: "${noteText.substring(0, 50)}"`);
            if (noteText && noteText.length >= 10) {
              const dosDate = this.formatDate(record['Date of Service (DOS)'] || record.DOS_Date || record.dos_date || new Date().toISOString());
              
              const note: InsertNote = {
                patientId,
                dosDate,
                noteText,
                providerId: String(record.provider_id || '').trim() || null,
                userId: this.userId
              };
              
              noteBatch.push(note);
              console.log(`Added note to batch. Total notes in batch: ${noteBatch.length}`);
            } else {
              console.log(`Skipping note - text too short or empty`);
            }

            // Process batch when it reaches target size
            if (patientBatch.length >= this.batchSize) {
              await this.processBatch(patientBatch, noteBatch);
              totalPatients += patientBatch.length;
              totalNotes += noteBatch.length;
              
              console.log(`Processed batch: ${totalPatients} patients, ${totalNotes} notes`);
              
              // Clear batches
              patientBatch = [];
              noteBatch = [];
            }

          } catch (error) {
            console.error('Record processing error:', error);
            // Continue processing other records
          }
        }
      });

      parser.on('end', async () => {
        try {
          // Process remaining batch
          if (patientBatch.length > 0 || noteBatch.length > 0) {
            await this.processBatch(patientBatch, noteBatch);
            totalPatients += patientBatch.length;
            totalNotes += noteBatch.length;
          }
          
          console.log(`Upload completed: ${totalPatients} patients, ${totalNotes} notes`);
          resolve({ patients: totalPatients, notes: totalNotes });
        } catch (error) {
          reject(error);
        }
      });

      parser.on('error', (error) => {
        console.error('Parser error:', error);
        reject(error);
      });

      readStream.pipe(parser);
    });
  }

  private async processBatch(patients: InsertPatient[], notes: InsertNote[]): Promise<void> {
    try {
      // Insert patients first
      if (patients.length > 0) {
        await storage.batchInsertPatients(patients);
        console.log(`Batch inserted ${patients.length} patients`);
      }

      // Then insert notes
      if (notes.length > 0) {
        await storage.batchInsertNotes(notes);
        console.log(`Batch inserted ${notes.length} notes`);
      }
    } catch (error) {
      console.error('Batch processing error:', error);
      throw error;
    }
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
}