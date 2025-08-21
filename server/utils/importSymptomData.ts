import fs from 'fs';
import { parse } from 'csv-parse';
import path from 'path';
import { db } from '../db';
import { symptomSegments } from '@shared/schema';

/**
 * Import symptom data from CSV file
 */
async function importSymptomData() {
  const csvFilePath = path.join(process.cwd(), '..', 'attached_assets', 'Symptom_Segments_asof_4_30_25_MASTER.csv');
  
  console.log(`Importing symptoms from: ${csvFilePath}`);
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found: ${csvFilePath}`);
    return;
  }
  
  // Read the CSV file
  const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
  
  // Parse the CSV data
  parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }, async (err, records) => {
    if (err) {
      console.error('Error parsing CSV:', err);
      return;
    }
    
    console.log(`Total records to import: ${records.length}`);
    
    try {
      // First, clear existing data
      await db.delete(symptomSegments);
      console.log('Cleared existing symptom_segments data');
      
      // Prepare batch of records for insertion
      const batchSize = 100;
      let insertedCount = 0;
      
      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize).map(record => {
          // Format the date as needed
          const noteDateStr = record.note_date || record.noteDate || record.NOTE_DATE;
          let noteDate;
          
          try {
            if (noteDateStr) {
              // Handle various date formats
              noteDate = new Date(noteDateStr);
              
              // If invalid date, use current date
              if (isNaN(noteDate.getTime())) {
                noteDate = new Date();
              }
            } else {
              noteDate = new Date();
            }
          } catch (e) {
            noteDate = new Date();
          }
          
          // Map CSV columns to database fields
          return {
            patient_id: record.patient_id || record.patientId || record.PATIENT_ID || '1',
            symptom_id: record.symptom_id || record.symptomId || record.SYMPTOM_ID || 'unknown',
            symptom_segment: record.symptom_segment || record.symptomSegment || record.SYMPTOM_SEGMENT || 'Unknown',
            note_date: noteDate,
            diagnosis: record.diagnosis || record.DIAGNOSIS || null,
            diagnosis_icd10_code: record.diagnosis_icd10_code || record.diagnosisIcd10Code || record.DIAGNOSIS_ICD10_CODE || null,
            diagnostic_category: record.diagnostic_category || record.diagnosticCategory || record.DIAGNOSTIC_CATEGORY || null,
            symp_prob: record.symp_prob || record.sympProb || record.SYMP_PROB || 'Symptom',
            zcode_hrsn: record.zcode_hrsn || record.zcodeHrsn || record.ZCODE_HRSN || 'No'
          };
        });
        
        // Insert the batch
        await db.insert(symptomSegments).values(batch);
        
        insertedCount += batch.length;
        console.log(`Imported ${insertedCount} of ${records.length} records...`);
      }
      
      console.log(`Successfully imported ${insertedCount} symptom segment records`);
    } catch (error) {
      console.error('Error importing symptom data:', error);
    }
  });
}

// Execute the import
importSymptomData().catch(err => {
  console.error('Error in import execution:', err);
});