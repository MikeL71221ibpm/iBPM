import fs from 'fs';
import { parse } from 'csv-parse';
import * as XLSX from 'xlsx';
import { InsertPatient, InsertNote } from '@shared/schema';

export interface SimpleUploadResult {
  patients: InsertPatient[];
  notes: InsertNote[];
  recordCount: number;
  patientCount: number;
}

/**
 * Simple, reliable upload function that won't hang
 */
export async function simpleUpload(
  filePath: string,
  userId: number
): Promise<SimpleUploadResult> {
  console.log(`🚀 Starting simple upload for file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  let rawData: any[] = [];

  try {
    if (fileExtension === 'xlsx') {
      console.log('📊 Processing Excel file...');
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawData = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false, 
        defval: "", 
        blankrows: false 
      });
    } else if (fileExtension === 'csv') {
      console.log('📄 Processing CSV file...');
      const csvContent = fs.readFileSync(filePath, 'utf8');
      
      // Use streaming parser for better memory management
      return new Promise((resolve, reject) => {
        const patients: InsertPatient[] = [];
        const notes: InsertNote[] = [];
        let recordCount = 0;
        const patientMap = new Map<string, boolean>();

        const parser = parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        parser.on('readable', function() {
          let record;
          while (record = parser.read()) {
            try {
              recordCount++;
              
              // Extract patient ID - try multiple field names
              const patientId = String(
                record['Patient_ID#'] || 
                record['Patient ID'] || 
                record['patient_id'] || 
                record['PatientID'] || 
                `patient-${recordCount}`
              ).trim();

              // Extract patient name
              const patientName = String(
                record['Patient Name'] || 
                record['Patient_Name'] || 
                record['patient_name'] || 
                record['PatientName'] || 
                `Patient ${patientId}`
              ).trim();

              // Create patient record if not already exists
              if (!patientMap.has(patientId)) {
                const patient: InsertPatient = {
                  patientId,
                  patientName,
                  userId,
                  age_range: String(record['age_range'] || record['Age_Range'] || '').trim() || null,
                  providerId: String(record['provider_id'] || '').trim() || null,
                  providerName: String(record['provider_name'] || '').trim() || null,
                  providerLname: String(record['provider_lname'] || '').trim() || null
                };
                
                patients.push(patient);
                patientMap.set(patientId, true);
              }

              // Extract note text - try multiple field names
              const noteText = String(
                record['Note_Text'] || 
                record['Note Text'] || 
                record['note_text'] || 
                record['NoteText'] || 
                record['Clinical Note'] ||
                ''
              ).trim();

              // Only create note if there's actual text content
              if (noteText && noteText.length >= 10) {
                // Extract date - try multiple field names
                const dosDate = formatDate(
                  record['Date of Service (DOS)'] || 
                  record['DOS_Date'] || 
                  record['dos_date'] || 
                  record['Date'] ||
                  new Date().toISOString()
                );

                const note: InsertNote = {
                  patientId,
                  dosDate,
                  noteText,
                  userId,
                  providerId: String(record['provider_id'] || '').trim() || null
                };
                
                notes.push(note);
              }

              // Log progress every 1000 records
              if (recordCount % 1000 === 0) {
                console.log(`📈 Processed ${recordCount} records, ${patients.length} patients, ${notes.length} notes`);
              }

            } catch (error) {
              console.warn(`⚠️ Error processing record ${recordCount}:`, error);
              // Continue processing other records
            }
          }
        });

        parser.on('end', function() {
          console.log(`✅ Upload completed: ${recordCount} records, ${patients.length} patients, ${notes.length} notes`);
          resolve({
            patients,
            notes,
            recordCount,
            patientCount: patients.length
          });
        });

        parser.on('error', function(error) {
          console.error('❌ Parser error:', error);
          reject(error);
        });

        // Start parsing
        parser.write(csvContent);
        parser.end();
      });
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error('❌ File processing error:', error);
    throw error;
  }

  // For Excel files, process synchronously
  console.log(`📊 Processing ${rawData.length} rows from Excel file`);
  
  const patients: InsertPatient[] = [];
  const notes: InsertNote[] = [];
  const patientMap = new Map<string, boolean>();

  for (let i = 0; i < rawData.length; i++) {
    const record = rawData[i];
    
    try {
      // Extract patient ID
      const patientId = String(
        record['Patient_ID#'] || 
        record['Patient ID'] || 
        record['patient_id'] || 
        `patient-${i + 1}`
      ).trim();

      // Extract patient name
      const patientName = String(
        record['Patient Name'] || 
        record['Patient_Name'] || 
        record['patient_name'] || 
        `Patient ${patientId}`
      ).trim();

      // Create patient record if not already exists
      if (!patientMap.has(patientId)) {
        const patient: InsertPatient = {
          patientId,
          patientName,
          userId,
          age_range: String(record['age_range'] || record['Age_Range'] || '').trim() || null,
          providerId: String(record['provider_id'] || '').trim() || null,
          providerName: String(record['provider_name'] || '').trim() || null,
          providerLname: String(record['provider_lname'] || '').trim() || null
        };
        
        patients.push(patient);
        patientMap.set(patientId, true);
      }

      // Extract note text
      const noteText = String(
        record['Note_Text'] || 
        record['Note Text'] || 
        record['note_text'] || 
        ''
      ).trim();

      // Only create note if there's actual text content
      if (noteText && noteText.length >= 10) {
        const dosDate = formatDate(
          record['Date of Service (DOS)'] || 
          record['DOS_Date'] || 
          record['dos_date'] || 
          new Date().toISOString()
        );

        const note: InsertNote = {
          patientId,
          dosDate,
          noteText,
          userId,
          providerId: String(record['provider_id'] || '').trim() || null
        };
        
        notes.push(note);
      }

      // Log progress every 1000 records
      if ((i + 1) % 1000 === 0) {
        console.log(`📈 Processed ${i + 1} records, ${patients.length} patients, ${notes.length} notes`);
      }

    } catch (error) {
      console.warn(`⚠️ Error processing record ${i + 1}:`, error);
      // Continue processing other records
    }
  }

  console.log(`✅ Excel processing completed: ${rawData.length} records, ${patients.length} patients, ${notes.length} notes`);

  return {
    patients,
    notes,
    recordCount: rawData.length,
    patientCount: patients.length
  };
}

/**
 * Simple date formatting function
 */
function formatDate(dateInput: any): string {
  try {
    if (!dateInput) {
      return new Date().toISOString().split('T')[0];
    }

    if (dateInput instanceof Date) {
      return dateInput.toISOString().split('T')[0];
    }

    const dateStr = String(dateInput).trim();
    
    // Handle MM/DD/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try parsing as Date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    // Fallback to current date
    return new Date().toISOString().split('T')[0];
    
  } catch (error) {
    console.warn('Date parsing error:', error);
    return new Date().toISOString().split('T')[0];
  }
}